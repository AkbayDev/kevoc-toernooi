from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3
import random
import resend
import contextlib
from database import get_db_connection  # Importeer je helper

# Importeer de Blueprint vanuit dash.py
from dash import dash_bp 

app = Flask(__name__)
CORS(app) 
app.register_blueprint(dash_bp)

# --- CONFIGURATIE ---
DB_NAME = 'users.db'  # Verander dit hier 1x om overal de naam aan te passen
resend.api_key = "re_123456789_VUL_DIT_IN"


def init_db():
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('''CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            email TEXT UNIQUE NOT NULL, 
            password TEXT NOT NULL, 
            role TEXT NOT NULL, 
            reset_code TEXT
        )''')
        
          
        cursor.execute('''CREATE TABLE IF NOT EXISTS financien (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            omschrijving TEXT NOT NULL, 
            bedrag REAL NOT NULL, 
            type TEXT NOT NULL, 
            datum TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')
        cursor.execute('''CREATE TABLE IF NOT EXISTS ploegen (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            ploeg TEXT NOT NULL, 
            betaalstatus TEXT NOT NULL,
            niveau TEXT NOT NULL,
            categorie TEXT NOT NULL
        )''')
        cursor.execute('''CREATE TABLE IF NOT EXISTS rollen (
                id INTEGER PRIMARY KEY AUTOINCREMENT, 
                rol TEXT UNIQUE NOT NULL
            )''')
            
            # 2. Gebruik INSERT OR IGNORE om duplicaten te voorkomen
        cursor.execute('''
                INSERT OR IGNORE INTO rollen (rol) 
                VALUES ('beheerder'), ('gebruiker'), ('hulp')
            ''')
        
        
            # 3. maak een vrijwilligers  tabel
        cursor.execute("""
                CREATE TABLE IF NOT EXISTS vrijwilligers (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    naam TEXT NOT NULL,
                    tijdslot TEXT NOT NULL,
                    job TEXT NOT NULL,
                    inschrijfdatum  DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
        conn.commit()
          
init_db()

# --- ROUTES ---

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    email, password, role = data.get('email'), data.get('password'), data.get('role')
    
    if not email or not password or not role: 
        return jsonify({"error": "Vul alle velden in."}), 400
        
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO users (email, password, role) VALUES (?, ?, ?)", 
                (email, generate_password_hash(password), role)
            )
            conn.commit()
    except sqlite3.IntegrityError:
        return jsonify({"error": "E-mailadres is al in gebruik."}), 400
        
    return jsonify({"message": f"Account aangemaakt als {role}!"}), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    email, password = data.get('email'), data.get('password')
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT password, role FROM users WHERE email = ?", (email,))
        user = cursor.fetchone()
    
    if user and check_password_hash(user['password'], password):
        return jsonify({"message": "Succesvol ingelogd!", "role": user['role']}), 200
        
    return jsonify({"error": "Ongeldig e-mailadres of wachtwoord."}), 401

@app.route('/api/forgot-password', methods=['POST'])
def forgot_password():
    email = request.json.get('email')
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
        
        if cursor.fetchone():
            code = str(random.randint(100000, 999999))
            cursor.execute("UPDATE users SET reset_code = ? WHERE email = ?", (code, email))
            conn.commit()
            try:
                resend.Emails.send({
                    "from": "Acme <onboarding@resend.dev>", 
                    "to": email, 
                    "subject": "Wachtwoord herstellen",
                    "html": f"<h2>Wachtwoord Herstel</h2><p>Je code is: <b>{code}</b></p>"
                })
            except Exception as e: 
                print(f"Mail fout: {e}")
                
    return jsonify({"message": "Als dit adres bestaat, is er een mail gestuurd."}), 200

@app.route('/api/verify-code', methods=['POST'])
def verify_code():
    data = request.json
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT reset_code FROM users WHERE email = ?", (data.get('email'),))
        user = cursor.fetchone()
        
    if user and user['reset_code'] == data.get('code'): 
        return jsonify({"message": "Code goedgekeurd!"}), 200
        
    return jsonify({"error": "Ongeldige code."}), 400

@app.route('/api/reset-password', methods=['POST'])
def reset_password():
    data = request.json
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT reset_code FROM users WHERE email = ?", (data.get('email'),))
        user = cursor.fetchone()
        
        if user and user['reset_code'] == data.get('code'):
            cursor.execute(
                "UPDATE users SET password = ?, reset_code = NULL WHERE email = ?", 
                (generate_password_hash(data.get('new_password')), data.get('email'))
            )
            conn.commit()
            return jsonify({"message": "Wachtwoord gewijzigd!"}), 200
            
    return jsonify({"error": "Fout. Probeer opnieuw."}), 400

if __name__ == '__main__':
    app.run(debug=True, port=5000)