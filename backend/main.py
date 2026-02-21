import html
import os
import shutil
from typing import Optional, List

from fastapi.staticfiles import StaticFiles
from fastapi import FastAPI, Form, UploadFile, File, BackgroundTasks, Response, Cookie
import mysql.connector
from mysql.connector import Error
from starlette.middleware.cors import CORSMiddleware
from email.mime.text import MIMEText
import random
import requests
import smtplib
import secrets

import config
from auth import user_telegram_verification
from whitelist import whilelist

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://petitions.sepcode.ru", "https://www.sepcode.ru", "https://sepcode.ru"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("../uploads", exist_ok=True)


class DownloadStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope):
        response = await super().get_response(path, scope)
        response.headers["Content-Disposition"] = "attachment" 
        return response


app.mount("/uploads", DownloadStaticFiles(directory="../uploads"), name="uploads")

def get_db_connection():
    connection = None
    try:
        connection = mysql.connector.connect(**config.config)
        print("Connection to MySQL DB successful")
    except Error as e:
        print(f"The error '{e}' occurred")
    return connection

@app.get('/api/petitions')
def read_petitions(user_id: int, auth_token: str = Cookie(default=None)):
    connection = get_db_connection()
    if connection is None:
        return {"status": "error", "message": "Ошибка подключения к базе данных"}
    cursor = connection.cursor(dictionary=True)

    actual_user_id = 0
    
    if user_id != 0 and auth_token:
        cursor.execute("SELECT id FROM users WHERE id = %s AND token = %s", (user_id, auth_token))
        if cursor.fetchone():
            actual_user_id = user_id

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
    cursor.execute(query, (actual_user_id, ))
    data = cursor.fetchall()
    cursor.close()
    connection.close()
    return data

@app.get('/api/petitions/count')
def petitions_count():
    connection = get_db_connection()
    if connection is None:
        return {"status": "error", "message": "Ошибка подключения к базе данных"}
    cursor = connection.cursor(dictionary=True)
    cursor.execute("SELECT COUNT(*) as total FROM `petitions` WHERE status ='ongoing'")
    data = cursor.fetchone()
    cursor.close()
    connection.close()
    return data['total'] if data else 0

def send_telegram_notify(text: str):
    url = f"https://api.telegram.org/bot{config.TOKEN}/sendMessage"
    payload = {
        "chat_id": config.admin_id,
        "text": text,
        "parse_mode": "HTML"
    }
    try:
        requests.post(url, json=payload)
    except Exception as e:
        print(f"Ошибка отправки уведомления администратору: {e}")

def telegram_send_telegram_notify_call(petition_id: int, title: str):

    safe_title = html.escape(title)

    send_telegram_notify("Создана новая петиция!\n\n" +
                                         "Название: " + safe_title + "\n\n" +
                                         "Ссылка на петицию: https://petitions.sepcode.ru/petition/"+ str(petition_id))

    return {"status": "success", "message": f"Отправлено!"}


@app.post('/api/petitions/submit')
def handle_submit_petition(
    background_tasks: BackgroundTasks,
    auth_token: str = Cookie(default=None),
    header: str = Form(...),
    text: str = Form(...),
    location: str = Form(...),
    author_id: str = Form(...),
    files: List[UploadFile] = File(None)
):
    connection = get_db_connection()
    if connection is None:
        return {"status": "error", "message": "Ошибка подключения к базе данных"}
    cursor = connection.cursor(dictionary=True)

    try:
        cursor.execute("SELECT id FROM users WHERE id = %s AND token = %s", (author_id, auth_token))
        if not cursor.fetchone():
            cursor.close()
            connection.close()
            return {"status": "error", "code": "USER_NOT_FOUND",
                    "message": "Пользователь не найден. Пожалуйста, войдите заново."}
        
        clean_author_id = ''.join(c for c in str(author_id) if c.isalnum())
        if not clean_author_id or clean_author_id != str(author_id):
            return {"status": "error", "message": "Некорректный ID пользователя"}

        file_metadata = []
        print(f"Received {len(files) if files else 0} files for petition submission by user {author_id}")
        print(files)
        if files:
            valid_files = [file for file in (files or []) if file.filename]
            
            if valid_files:

                MAX_TOTAL_SIZE = 50 * 1024 * 1024
                SAFE_EXTENSIONS = {'.pdf', '.txt', '.jpg', '.jpeg', '.png', '.gif'}
                total_size = 0

                for file in files:
                    if not file.filename:
                        return {"status": "error", "message": "Обнаружен файл без имени"}
                    file.file.seek(0, 2)
                    file_size = file.file.tell()
                    file.file.seek(0)

                    total_size += file_size

                    original_ext = os.path.splitext(file.filename.lower())[1] if file.filename else ''
                    original_name = html.escape(file.filename)

                    if original_ext in SAFE_EXTENSIONS:
                        secure_filename = f"safe_{secrets.token_hex(8)}{original_ext}"
                    else:
                        secure_filename = f"data_{secrets.token_hex(8)}.dat"
                    
                    file_metadata.append({
                        'original_name': original_name,
                        'secure_filename': secure_filename,
                        'file_size': file_size,
                        'mime_type': file.content_type,
                        'file_object': file
                    })

                if total_size > MAX_TOTAL_SIZE:
                    return {"status": "error", "code": "MAX_SIZE",
                            "message": f"Общий размер файлов превышает {MAX_TOTAL_SIZE / (1024 * 1024)} МБ"}

        safe_header = html.escape(header)
        safe_text = html.escape(text)
        if len(safe_header) > 200 or len(safe_text) > 1000000:
            return {"status": "error", "message": "Превышено максимальное количество символов для заголовка или текста"}

        VALID_LOCATIONS = ["NSU", "IRK", "SPB", "other", "Any"]
        if location not in VALID_LOCATIONS:
            return {"status": "error", "message": "Некорректная локация."}
        safe_location = html.escape(location)

        query = """
            INSERT INTO `petitions`
            (`author_id`, `title`, `content`, `status`, `pdf_url`, `location`, `time_created`) 
            VALUES 
            (%s, %s, %s, %s, %s, %s, NOW())
            """
        values = (clean_author_id, safe_header, safe_text, "ongoing", "pending" if files else "", safe_location)

        cursor.execute(query, values)
        connection.commit()
        new_id = cursor.lastrowid

        if valid_files:
            clean_petition_id = ''.join(c for c in str(new_id) if c.isalnum())
            pdf_path = f"../uploads/{clean_author_id}/{clean_petition_id}"
            
            real_path = os.path.realpath(pdf_path)
            uploads_path = os.path.realpath("../uploads")
            if not real_path.startswith(uploads_path):
                return {"status": "error", "message": "Ошибка безопасности пути"}
            
            os.makedirs(pdf_path, exist_ok=True)

            files_info = []
            for file_info in file_metadata:
                filelocation = f"{pdf_path}/{file_info['secure_filename']}"

                with open(filelocation, "wb+") as file_object:
                    shutil.copyfileobj(file_info['file_object'].file, file_object)

                files_info.append(f"{file_info['secure_filename']}|{file_info['original_name']}|{file_info['file_size']}")

            update_query = "UPDATE petitions SET pdf_url = %s WHERE id = %s"
            cursor.execute(update_query, (f"{pdf_path}", new_id))
        else:
            update_query = "UPDATE petitions SET pdf_url = %s WHERE id = %s"
            cursor.execute(update_query, ("", new_id))

        connection.commit()

        background_tasks.add_task(telegram_send_telegram_notify_call, new_id, header)

        return {"status": "success", "message": "Petition submitted successfully"}
    except Error as e:
        print(f"Error: {e}")
        return {"status": "error", "message": "Unknown error. Try later"}
    finally:
        cursor.close()
        connection.close()

@app.get('/api/petitions/{petition_id}')
def get_petition_id(
    user_id: int,
    petition_id : int,
    auth_token: str = Cookie(default=None)
):
    connection = get_db_connection()
    if connection is None:
        return {"status": "error", "message": "Ошибка подключения к базе данных"}
    cursor = connection.cursor(dictionary=True)

    is_admin = False
    if auth_token and user_id != 0:
        try:
            cursor.execute("SELECT tg_id FROM users WHERE id = %s AND token = %s", (user_id, auth_token))
            user = cursor.fetchone()
            
            if user and str(user['tg_id']) == str(config.admin_id):
                is_admin = True
        except Error as e:
            print(f"Auth check error: {e}")

    query = """
    SELECT id, author_id, title as header, location, content as text, status,
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
                if not is_admin: 
                     return {"status": "error", "message": "Нет такой петиции", "code": "NO_PETITION"}
            return data
        else:
            return {"status": "error", "message": "Нет такой петиции", "code": "NO_PETITION"}
    except Error as e:
        print(f"SQL Error: {e}")
        return {"status": "error", "message": "Неизвестная ошибка. Попробуйте позже"}
    finally:
        cursor.close()
        connection.close()

@app.post('/api/sign')
def sign_petition(petition_id: int, user_id: int, auth_token: str = Cookie(default=None)):
    connection = get_db_connection()
    if connection is None:
        return {"status": "error", "message": "Ошибка подключения к базе данных"}
    cursor = connection.cursor(dictionary=True)

    try:
        cursor.execute("SELECT id FROM users WHERE id = %s AND token = %s", (user_id, auth_token))
        if not cursor.fetchone():
            return {"status": "error", "message": "Ошибка авторизации"}

        cursor.execute("SELECT status, location FROM petitions WHERE petitions.id = %s", (petition_id, ))
        petition = cursor.fetchone()
        if not petition:
            return {"status": "error", "message": "Нет такой петиции", "code": "NO_PETITION"}

        cursor.execute("SELECT region FROM users WHERE users.id = %s", (user_id, ))
        user_region = cursor.fetchone()
        if not user_region:
            return {"status": "error", "message": "Нет пользователя"}

        if petition['status'] == "draft":
            return {"status": "error", "message": "Нет такой петиции", "code": "NO_PETITION"}

        user_region = user_region['region']
        location = petition['location']

        if user_region != location and location != "Any":
            return {"status": "error", "code": "ERROR_LOCATION", "message": "Петицию можно подписать только если ваша локация совпадает с локацией петиции"}

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
        return {"status": "success", "message": "Петиция подписана успешно"}
    except Error as e:
        print(f"SQL Error: {e}")
        if e.errno == 1062:
            return {"status": "error", "code": "ALREADY_SIGNED", "message": "Вы уже подписали эту петицию"}
        return {"status": "error", "message": "Неизвестная ошибка. Попробуйте позже"}
    finally:
        cursor.close()
        connection.close()


def send_email(to_email, code):
    try:
        server = smtplib.SMTP_SSL(config.email_config['SMTP_SERVER'], config.email_config['SMTP_PORT'])
        server.login(config.email_config['SMTP_USER'], config.email_config['SMTP_PASSWORD'])

        subject = "Код подтверждения"
        body = f"Код: {code}"

        msg = MIMEText(body, "plain", "utf-8")
        msg['Subject'] = subject
        msg['From'] = config.email_config['SMTP_USER']
        msg['To'] = to_email

        server.sendmail(config.email_config['SMTP_USER'], to_email, msg.as_string())
        server.quit()
        return True
    except Exception as e:
        print(f"Ошибка отправки email: {e}")
        return False


@app.post('/api/verify/request')
def request_verification(
        user_id: int = Form(...),
        email: str = Form(...),
        location: str = Form(...),
        auth_token: str = Cookie(default=None)
):
    VALID_LOCATIONS = ["NSU", "IRK", "SPB", "other"]
    if location not in VALID_LOCATIONS:
        return {"status": "error", "message": "Некорректная локация"}
    
    domain = email.split('@')[-1].lower()
    if domain not in ["nsu.ru", "g.nsu.ru", "stud.nsu.ru"] and location == "NSU":
        return {"status": "error", "message": "Нужна почта @nsu.ru"}

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:
        cursor.execute("SELECT * FROM users WHERE token = %s AND id = %s", (auth_token, user_id))
        if not cursor.fetchone():
            return {"status": "error", "message": "Ошибка авторизации. Токен неверный"}

        new_code = str(random.randint(100000, 999999))

        cursor.execute("UPDATE users SET email = %s, verification_code = %s, region = %s WHERE id = %s", (email, new_code, location, user_id))
        connection.commit()

        if send_email(email, new_code):
            return {"status": "success", "message": "Код отправлен на почту"}
        else:
            return {"status": "error", "message": "Ошибка отправки кода. Проверьте почтовый адрес или попробуйте позже"}
    except Error as e:
        return {"status": "error", "message": "Неизвестная ошибка. Попробуйте позже"}
    finally:
        cursor.close()
        connection.close()


@app.post('/api/verify/confirm')
def confirm_verification(
        response: Response,
        user_id: int = Form(...),
        code: str = Form(...),
        auth_token: str = Cookie(default=None)
):
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:
        cursor.execute("SELECT * FROM users WHERE token = %s AND id = %s", (auth_token, user_id))
        if not cursor.fetchone():
            return {"status": "error", "message": "Ошибка авторизации. Токен неверный"}

        cursor.execute("SELECT verification_code FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()

        if user and str(user['verification_code']) == str(code):
            new_token = secrets.token_hex(16)
            cursor.execute("UPDATE users SET is_verified = 1, token = %s WHERE id = %s", (new_token, user_id))
            connection.commit()
            response.set_cookie(key="auth_token", value=new_token, httponly=True, secure=True, samesite='Lax', max_age=30*24*60*60)
            return {"status": "success", "message": "Authorized"}
        else:
            return {"status": "error", "message": "Неверный код подтверждения"}
    finally:
        cursor.close()
        connection.close()


@app.post('/api/login')
def login(data: dict, response: Response):
    connection = get_db_connection()
    if connection is None:
        return {"status": "error", "message": "Ошибка подключения к базе данных"}
    cursor = connection.cursor(dictionary=True)
    try:
        is_valid = user_telegram_verification(data, config.TOKEN)

        if not is_valid:
            return {"status": "error", "message": "Неавторизованный запрос"}

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

        new_token = secrets.token_hex(16)

        if user:
            upd_query = "UPDATE users SET token = %s WHERE id = %s"
            cursor.execute(upd_query, (new_token, user['id']))
            connection.commit()

            response.set_cookie(key="auth_token", value=new_token, httponly=True, secure=True, samesite='Lax', max_age=30*24*60*60)

            return {
                "status": "success",
                "user_id": user['id'],
                "is_verified": bool(user['is_verified']),
                "region": user['region']
            }

        ins_query = """
            INSERT INTO 
            `users`
            (`tg_id`, `is_verified`, `verification_code`, `exist_from`, `email`, `full_name`, `region`, `token`)
            VALUES
            (%s, %s, %s, NOW(), %s, %s, %s, %s)
        """
        values = (tg_id,
                  1 if tg_id in whilelist else 0,
                  str(random.randint(100000,999999)),
                  "",
                  full_name,
                  whilelist[tg_id] if tg_id in whilelist else "",
                  new_token)

        cursor.execute(ins_query, values)
        connection.commit()
        new_user_id = cursor.lastrowid
        is_whitelisted = tg_id in whilelist
        is_verified = 1 if is_whitelisted else 0

        response.set_cookie(key="auth_token", value=new_token, httponly=True, secure=True, samesite='Lax', max_age=30*24*60*60)

        return {"status": "success", "user_id": new_user_id, "is_verified": is_verified, "region": whilelist[tg_id] if tg_id in whilelist else ""}
    except Error as e:
        print(f"SQL Error: {e}")
        return {"status": "error", "message": "Неизвестная ошибка. Попробуйте позже"}
    finally:
        cursor.close()
        connection.close()

def send_telegram_message(tg_id:int, text: str):
    url = f"https://api.telegram.org/bot{config.TOKEN}/sendMessage"
    payload = {
        "chat_id": tg_id,
        "text": text,
        "parse_mode": "HTML"
    }
    try:
        response = requests.post(url, json=payload)
        response_data = response.json()
        if not response_data.get("ok"):
            print(f"Ошибка отправки сообщения пользователю {tg_id}: {response_data.get('description')}")
    except Exception as e:
        print(f"Ошибка отправки пользователю {tg_id}: {e}")

def telegram_author_call(petition_id: int, message: str):
    connection = get_db_connection()
    if connection is None:
        return {"status": "error", "message": "Ошибка подключения к базе данных"}
    cursor = connection.cursor(dictionary=True)

    try:
        cursor.execute("SELECT users.tg_id FROM signatures JOIN users ON signatures.user_id = users.id WHERE petition_id = %s", (petition_id, ))
        tg_id_list = cursor.fetchall()

        safe_message = html.escape(message)

        count = 0
        for row in tg_id_list:
            tg_id = row['tg_id']
            send_telegram_message(tg_id, "По одной из подписанных вами петиций есть уведомление!\n\n" +
                                         "Сообщение от автора: " + safe_message + "\n\n" +
                                         "Ссылка на петицию: https://petitions.sepcode.ru/petition/"+ str(petition_id))
            count += 1

        return {"status": "success", "message": f"Отправлено {count} уведомлений"}

    except Error as e:
        print(f"SQL Error: {e}")
        return {"status": "error", "message": "Неизвестная ошибка. Попробуйте позже"}
    finally:
        cursor.close()
        connection.close()

@app.post('/api/petitions/{petition_id}/notify')
def petition_notify(
    background_tasks: BackgroundTasks,
    petition_id: int,
    user_id: int,
    message: str,
    auth_token: str = Cookie(default=None)
):
    connection = get_db_connection()
    if connection is None:
        return {"status": "error", "message": "Database connection failed"}
    cursor = connection.cursor(dictionary=True)

    try:
        cursor.execute("SELECT id FROM users WHERE id = %s AND token = %s", (user_id, auth_token))
        if not cursor.fetchone():
            return {"status": "error", "message": "Ошибка авторизации"}

        cursor.execute("""
            SELECT id FROM
            petitions
            WHERE petitions.id = %s AND petitions.author_id = %s
        """, (petition_id, user_id))
        data = cursor.fetchone()

        if not data:
            return {"status": "error", "message": "Вы не являетесь автором этой петиции"}

        if len(message) > 3500:
            return {"status": "error", "message": "Сообщение слишком длинное"}

    except Error as e:
        print(f"SQL Error: {e}")
        return {"status": "error", "message": "Неизвестная ошибка. Попробуйте позже"}
    finally:
        cursor.close()
        connection.close()

    background_tasks.add_task(telegram_author_call, petition_id, message)
    
    return {"status": "success", "message": "Рассылка запущена"}