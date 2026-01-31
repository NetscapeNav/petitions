from typing import Optional

from fastapi import FastAPI, Form, UploadFile, File
import mysql.connector
from mysql.connector import Error
from starlette.middleware.cors import CORSMiddleware

import config

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
    cursor.execute("""
        SELECT 
            id, 
            title as header, 
            content as text, 
            pdf_url,
            EXISTS(
                SELECT 1 FROM signatures 
                WHERE signatures.petition_id = petitions.id AND signatures.user_id = """ + str(user_id) + """
            ) as is_signed,
            (SELECT COUNT(*) FROM signatures WHERE signatures.petition_id = petitions.id) as signatures_count
        FROM petitions 
        WHERE status ='ongoing'
    """)
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
    feedback: str = Form(...),
    file: Optional[UploadFile] = File(None)
):
    connection = get_db_connection()
    if connection is None:
        return 0
    cursor = connection.cursor(dictionary=True)
    query = """
        INSERT INTO `petitions`
        (`author_id`, `title`, `content`, `status`, `pdf_url`, `location`, `time_created`) 
        VALUES 
        (%s, %s, %s, %s, %s, %s, NOW())
        """
    values = (0, header, text, "pending", "", location)
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
def get_position_id(petition_id : int, user_id: int):
    connection = get_db_connection()
    if connection is None:
        return {"error": "No DB connection"}
    cursor = connection.cursor(dictionary=True)
    query = """
    SELECT title as header, content as text,
    EXISTS(
        SELECT 1 FROM signatures 
        WHERE signatures.petition_id = petitions.id AND signatures.user_id = """ + str(user_id) + """
    ) as is_signed,
    (SELECT COUNT(*) FROM signatures WHERE petitions.id = signatures.petition_id) as signatures_count
    FROM petitions
    WHERE petitions.id = %s"""
    value = (petition_id, )
    try:
        cursor.execute(query, value)
        data = cursor.fetchone()
        if data:
            return data
        else:
            return {"Error": "No petition"}
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
        return 0
    cursor = connection.cursor()
    query = """
        INSERT INTO
        signatures
        (`user_id`, `petition_id`, `verification_code`, `status`)
        VALUES 
        (%s, %s, %s, %s)
    """
    values = (user_id, petition_id, "", "digital")
    try:
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
