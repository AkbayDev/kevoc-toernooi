from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3
import random
import resend
# NIEUW: Importeer de blueprint vanuit dash.py
from dash import dash_bp 


app = Flask(__name__)
# CORS zorgt ervoor dat je frontend mag praten met deze backend
CORS(app) 

# NIEUW: Registreer de blueprint zodat app.py weet dat deze routes bestaan
app.register_blueprint(dash_bp)

# --- Database Setup ---
def init_db():
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL
        )
    ''')
    
    # Probeer de reset_code kolom toe te voegen (als deze al bestaat, negeert Python de fout)
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN reset_code TEXT")
    except sqlite3.OperationalError:
        pass # Kolom bestaat al
        
    conn.commit()
    conn.close()

# Initialiseer de database zodra de server start
init_db()

# --- 1. Registratie Endpoint ---
@app.route('/api/register', methods=['POST'])
def register():
    # Haal de JSON data op die de JavaScript Fetch API stuurt
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    role = data.get('role')

    # Simpele check of alles is ingevuld
    if not email or not password or not role:
        return jsonify({"error": "Vul alle velden in."}), 400

    # Wachtwoorden mag je NOOIT als platte tekst opslaan. We 'hashen' het.
    hashed_password = generate_password_hash(password)

    try:
        conn = sqlite3.connect('users.db')
        cursor = conn.cursor()
        # Voeg de nieuwe gebruiker toe aan de database
        cursor.execute(
            "INSERT INTO users (email, password, role) VALUES (?, ?, ?)", 
            (email, hashed_password, role)
        )
        conn.commit()
    except sqlite3.IntegrityError:
        # De database geeft een error als het e-mailadres al bestaat (vanwege UNIQUE in de setup)
        return jsonify({"error": "Dit e-mailadres is al in gebruik."}), 400
    finally:
        conn.close()

    # Stuur een succesbericht terug naar JavaScript
    return jsonify({"message": f"Account succesvol aangemaakt als {role}!"}), 201


# --- 2. Login Endpoint ---
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"error": "Vul e-mail en wachtwoord in."}), 400

    # Zoek de gebruiker op in de database
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    cursor.execute("SELECT password, role FROM users WHERE email = ?", (email,))
    user = cursor.fetchone()
    conn.close()

    # Check of de gebruiker bestaat én of het ingevulde wachtwoord klopt met de hash
    if user and check_password_hash(user[0], password):
        return jsonify({
            "message": "Succesvol ingelogd!", 
            "role": user[1]
        }), 200
    else:
        # Als we hier zijn, klopt de e-mail óf het wachtwoord niet
        return jsonify({"error": "Ongeldig e-mailadres of wachtwoord."}), 401


# --- 3. Wachtwoord Vergeten (Stuur Code) ---
resend.api_key = "re_Kayys5Ze_LqCLdKQMQuY2hQH8Aau1SVTh"

@app.route('/api/forgot-password', methods=['POST'])
def forgot_password():
    email = request.json.get('email')
    
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
    
    if cursor.fetchone():
        code = str(random.randint(100000, 999999))
        cursor.execute("UPDATE users SET reset_code = ? WHERE email = ?", (code, email))
        conn.commit()
        
        # --- NIEUW: VERSTUUR DE E-MAIL VIA RESEND ---
        try:
            r = resend.Emails.send({
                "from": "Acme <onboarding@resend.dev>", # Gebruik hier je geverifieerde domein
                "to": email,
                "subject": "Je wachtwoord herstellen",
                "html": f"""
                    <h2>Wachtwoord Herstel</h2>
                    <p>Je hebt aangegeven dat je je wachtwoord bent vergeten.</p>
                    <p>Vul de volgende 6-cijferige code in op de website:</p>
                    <h1 style="color: #764ba2; letter-spacing: 5px;">{code}</h1>
                    <p>Heb je dit niet aangevraagd? Negeer deze e-mail dan.</p>
                """
            })
            print("Mail succesvol verzonden via Resend!")
        except Exception as e:
            print(f"Fout bij verzenden: {e}")
        # ---------------------------------------------
        
        conn.close()
        return jsonify({"message": "Als dit e-mailadres bestaat, hebben we een code gestuurd."}), 200
    
    conn.close()
    return jsonify({"message": "Als dit e-mailadres bestaat, hebben we een code gestuurd."}), 200


# --- 4. Verifieer Code ---
@app.route('/api/verify-code', methods=['POST'])
def verify_code():
    data = request.json
    email = data.get('email')
    code = data.get('code')
    
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    cursor.execute("SELECT reset_code FROM users WHERE email = ?", (email,))
    user = cursor.fetchone()
    conn.close()
    
    if user and user[0] == code:
        return jsonify({"message": "Code goedgekeurd!"}), 200
    else:
        return jsonify({"error": "Ongeldige of verlopen code."}), 400


# --- 5. Reset Wachtwoord ---
@app.route('/api/reset-password', methods=['POST'])
def reset_password():
    data = request.json
    email = data.get('email')
    code = data.get('code')
    new_password = data.get('new_password')
    
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    
    # Extra check of de code NOG STEEDS klopt
    cursor.execute("SELECT reset_code FROM users WHERE email = ?", (email,))
    user = cursor.fetchone()
    
    if user and user[0] == code:
        hashed_password = generate_password_hash(new_password)
        # Update wachtwoord en verwijder de herstelcode zodat deze niet nog eens gebruikt kan worden
        cursor.execute("UPDATE users SET password = ?, reset_code = NULL WHERE email = ?", (hashed_password, email))
        conn.commit()
        conn.close()
        return jsonify({"message": "Wachtwoord succesvol gewijzigd!"}), 200
    else:
        conn.close()
        return jsonify({"error": "Er is iets misgegaan. Probeer het opnieuw."}), 400


# --- Server Starten ---
if __name__ == '__main__':
    # debug=True zorgt ervoor dat de server automatisch herstart bij wijzigingen
    app.run(debug=True, port=5000)