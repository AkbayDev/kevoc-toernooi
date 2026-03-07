from flask import Blueprint, request, jsonify
from database import get_db_connection

financien_bp = Blueprint('financien', __name__)

@financien_bp.route('/financien', methods=['GET'])
def get_financien():
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT SUM(bedrag) AS totaal FROM financien WHERE type = 'inkomst'")
        inkomsten = cursor.fetchone()['totaal'] or 0.0
        
        cursor.execute("SELECT SUM(bedrag) AS totaal FROM financien WHERE type = 'kost'")
        kosten = cursor.fetchone()['totaal'] or 0.0
        
    return jsonify({"inkomsten": inkomsten, "kosten": kosten, "winst": inkomsten - kosten}), 200


@financien_bp.route('/financien', methods=['POST'])
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

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO financien (omschrijving, bedrag, type) VALUES (?, ?, ?)", 
            (omschrijving, bedrag, transactie_type)
        )
        conn.commit()
        
    return jsonify({"message": "Transactie succesvol toegevoegd!"}), 201


@financien_bp.route('/transacties', methods=['GET'])
def get_transacties():
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT omschrijving, bedrag, type FROM financien ORDER BY id DESC")
        rows = cursor.fetchall()
    
    transacties = [{"omschrijving": r["omschrijving"], "bedrag": r["bedrag"], "type": r["type"]} for r in rows]
    return jsonify(transacties), 200