from typing import Optional

from fastapi import FastAPI, Form, UploadFile, File
import mysql.connector
from mysql.connector import Error
from starlette.middleware.cors import CORSMiddleware
import random

import config
from auth import user_telegram_verification
from whitelist import whilelist

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db_connection():
    connection = None
    try:
        connection = mysql.connector.connect(**config.config)
        print("Connection to MySQL DB successful")
    except Error as e:
        print(f"The error '{e}' occurred")
    return connection

@app.get('/api/petitions')
def read_petitions(user_id: int):
    connection = get_db_connection()
    if connection is None:
        return {"error": "Database connection failed"}
    cursor = connection.cursor(dictionary=True)
    query = """
        SELECT 
            id, 
            title as header, 
            content as text, 
            pdf_url,
            EXISTS(
                SELECT 1 FROM signatures 
                WHERE signatures.petition_id = petitions.id AND signatures.user_id = %s
            ) as is_signed,
            (SELECT COUNT(*) FROM signatures WHERE signatures.petition_id = petitions.id) as signatures_count
        FROM petitions 
        WHERE status ='ongoing' OR status ='ready_for_paper'
    """
    cursor.execute(query, (user_id, ))
    data = cursor.fetchall()
    cursor.close()
    connection.close()
    return data

@app.get('/api/petitions/count')
def petitions_count():
    connection = get_db_connection()
    if connection is None:
        return 0
    cursor = connection.cursor(dictionary=True)
    cursor.execute("SELECT COUNT(*) as total FROM `petitions` WHERE status ='ongoing'")
    data = cursor.fetchone()
    cursor.close()
    connection.close()
    return data['total'] if data else 0

@app.post('/api/petitions/submit')
def handle_submit_petition(
    header: str = Form(...),
    text: str = Form(...),
    location: str = Form(...),
    author_id: str = Form(...),
    file: Optional[UploadFile] = File(None)
):
    connection = get_db_connection()
    if connection is None:
        return {"error": "Database connection failed"}
    cursor = connection.cursor(dictionary=True)

    cursor.execute("SELECT id FROM users WHERE id = %s", (author_id,))
    if not cursor.fetchone():
        cursor.close()
        connection.close()
        return {"status": "error", "code": "USER_NOT_FOUND",
                "message": "Пользователь не найден. Пожалуйста, войдите заново."}

    query = """
        INSERT INTO `petitions`
        (`author_id`, `title`, `content`, `status`, `pdf_url`, `location`, `time_created`) 
        VALUES 
        (%s, %s, %s, %s, %s, %s, NOW())
        """
    values = (author_id, header, text, "draft", "", location)
    try:
        cursor.execute(query, values)
        connection.commit()
        return {"status": "success", "message": "Petition submitted successfully"}
    except Error as e:
        print(f"Error: {e}")
        return {"status": "error", "message": str(e)}
    finally:
        cursor.close()
        connection.close()

@app.get('/api/petitions/{petition_id}')
def get_position_id(user_id: int, petition_id : int):
    connection = get_db_connection()
    if connection is None:
        return {"error": "No DB connection"}
    cursor = connection.cursor(dictionary=True)


    query = """
    SELECT title as header, content as text, status,
    EXISTS(
        SELECT 1 FROM signatures 
        WHERE signatures.petition_id = petitions.id AND signatures.user_id = %s
    ) as is_signed,
    (SELECT COUNT(*) FROM signatures WHERE petitions.id = signatures.petition_id) as signatures_count
    FROM petitions
    WHERE petitions.id = %s"""
    value = (user_id, petition_id, )
    try:
        cursor.execute(query, value)
        data = cursor.fetchone()
        if data:
            if data['status'] == "draft":
                return {"error": "No petition"}
            return data
        else:
            return {"error": "No petition"}
    except Error as e:
        print(f"SQL Error: {e}")
        return {"error": str(e)}
    finally:
        cursor.close()
        connection.close()

@app.post('/api/sign')
def sign_petition(petition_id: int, user_id: int):
    connection = get_db_connection()
    if connection is None:
        return {"error": "Database connection failed"}
    cursor = connection.cursor(dictionary=True)

    try:
        cursor.execute("SELECT status, location FROM petitions WHERE petitions.id = %s", (petition_id, ))
        petition = cursor.fetchone()
        if not petition:
            return {"status": "error", "message": "No petition"}

        cursor.execute("SELECT region FROM users WHERE users.id = %s", (user_id, ))
        user_region = cursor.fetchone()
        if not user_region:
            return {"status": "error", "message": "No user"}

        if petition['status'] == "draft":
            return {"status": "error", "message": "No petition"}

        user_region = user_region['region']
        location = petition['location']

        if user_region != location:
            return {"status": "error", "message": "Different locations"}

        query = """
            INSERT INTO
            signatures
            (`user_id`, `petition_id`, `verification_code`, `status`)
            VALUES 
            (%s, %s, %s, %s)
        """
        values = (user_id, petition_id, "", "digital")
        cursor.execute(query, values)
        connection.commit()
        return {"status": "success", "message": "Petition signed successfully"}
    except Error as e:
        print(f"SQL Error: {e}")
        if e.errno == 1062:
            return {"status": "error1062", "message": "Вы уже подписали эту петицию"}
        return {"status": "error", "message": str(e)}
    finally:
        cursor.close()
        connection.close()

@app.post('/api/login')
def login(data: dict):
    connection = get_db_connection()
    if connection is None:
        return {"status": "error", "message": "Database connection failed"}
    cursor = connection.cursor(dictionary=True)
    try:
        is_valid = user_telegram_verification(data, config.TOKEN)

        if not is_valid:
            return {"error": "Неавторизованный запрос"}

        tg_id = data['id']
        first_name = data.get('first_name', '')
        last_name = data.get('last_name', '')
        full_name = f"{first_name} {last_name}".strip()

        chk_query = """
            SELECT * FROM
            `users`
            WHERE
            tg_id = %s
        """
        values = (data['id'], )
        cursor.execute(chk_query, values)
        user = cursor.fetchone()

        if user:
            return {"status": "success", "user_id": user['id'], "is_new": False}

        ins_query = """
            INSERT INTO 
            `users`
            (`tg_id`, `is_verified`, `verification_code`, `exist_from`, `email`, `full_name`, `region`)
            VALUES
            (%s, %s, %s, NOW(), %s, %s, %s)
        """
        values = (tg_id,
                  1 if tg_id in whilelist else 0,
                  str(random.randint(100000,999999)),
                  "",
                  full_name,
                  whilelist[tg_id] if tg_id in whilelist else "ы")

        cursor.execute(ins_query, values)
        connection.commit()
        new_user_id = cursor.lastrowid

        return {"status": "success", "user_id": new_user_id, "is_new": True}
    except Error as e:
        print(f"SQL Error: {e}")
        return {"status": "error", "message": str(e)}
    finally:
        cursor.close()
        connection.close()