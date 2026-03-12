from flask import Flask, Blueprint, request, jsonify
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3
import random
import resend
import contextlib
import os
from database import get_db_connection

login_bp = Blueprint('login', __name__)

@login_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    email, password = data.get('email'), data.get('password')
    role = 'gebruiker'  # Altijd instellen op 'gebruiker'
    
    if not email or not password: 
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
        
    return jsonify({"message": "Account aangemaakt!"}), 201

@login_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email, password = data.get('email'), data.get('password')
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT password, role FROM users WHERE email = ?", (email,))
        user = cursor.fetchone()
    
    if user and check_password_hash(user['password'], password):
        return jsonify({"message": "Succesvol ingelogd!", "role": user['role'], "email": email}), 200
        
    return jsonify({"error": "Ongeldig e-mailadres of wachtwoord."}), 401

# NIEUW: endpoint om de huidige rol op te halen vanuit de database
@login_bp.route('/mijn-rol', methods=['GET'])
def get_mijn_rol():
    email = request.args.get('email')
    if not email:
        return jsonify({"error": "Email is verplicht."}), 400
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT role FROM users WHERE email = ?", (email,))
        user = cursor.fetchone()
    
    if not user:
        return jsonify({"error": "Gebruiker niet gevonden."}), 404
    
    return jsonify({"role": user['role'], "email": email}), 200

@login_bp.route('/forgot-password', methods=['POST'])
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

@login_bp.route('/verify-code', methods=['POST'])
def verify_code():
    data = request.json
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT reset_code FROM users WHERE email = ?", (data.get('email'),))
        user = cursor.fetchone()
        
    if user and user['reset_code'] == data.get('code'): 
        return jsonify({"message": "Code goedgekeurd!"}), 200
        
    return jsonify({"error": "Ongeldige code."}), 400

@login_bp.route('/reset-password', methods=['POST'])
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

@login_bp.route('/users/<email>/role', methods=['PATCH'])
def update_user_role(email):
    data = request.json
    new_role = data.get('role')
    
    if new_role not in ['beheerder', 'hulp', 'gebruiker', 'dev']:
        return jsonify({"error": "Ongeldige rol."}), 400
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE users SET role = ? WHERE email = ?", (new_role, email))
        conn.commit()
    
    return jsonify({"message": f"Rol voor {email} gewijzigd naar {new_role}!"}), 200