# dash.py
from flask import Blueprint, request, jsonify
import sqlite3

# 1. Maak de Blueprint aan
# De naam 'dash_bp' gebruiken we straks om hem te koppelen in app.py
dash_bp = Blueprint('dash', __name__)

# 2. Haal de financiële totalen op
@dash_bp.route('/api/financien', methods=['GET'])
def get_financien():
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    
    # Bereken totale inkomsten
    cursor.execute("SELECT SUM(bedrag) FROM financien WHERE type = 'inkomst'")
    inkomsten = cursor.fetchone()[0] or 0.0
    
    # Bereken totale kosten
    cursor.execute("SELECT SUM(bedrag) FROM financien WHERE type = 'kost'")
    kosten = cursor.fetchone()[0] or 0.0
    
    conn.close()
    
    return jsonify({
        "inkomsten": inkomsten,
        "kosten": kosten,
        "winst": inkomsten - kosten
    }), 200

# 3. Voeg een nieuwe kost/inkomst toe
@dash_bp.route('/api/financien', methods=['POST'])
def add_financien():
    data = request.json
    omschrijving = data.get('omschrijving')
    bedrag = data.get('bedrag')
    transactie_type = data.get('type')
    
    if not omschrijving or not bedrag or not transactie_type:
        return jsonify({"error": "Vul alle velden in."}), 400
        
    try:
        bedrag = float(bedrag)
    except ValueError:
        return jsonify({"error": "Ongeldig bedrag."}), 400

    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO financien (omschrijving, bedrag, type) VALUES (?, ?, ?)", 
        (omschrijving, bedrag, transactie_type)
    )
    conn.commit()
    conn.close()
    
    return jsonify({"message": "Transactie succesvol toegevoegd!"}), 201