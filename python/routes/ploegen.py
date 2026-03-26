from flask import Blueprint, request, jsonify
from database import get_db_connection

ploegen_bp = Blueprint('ploegen', __name__)

@ploegen_bp.route('/ploegen', methods=['GET'])
def get_ploegen():
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM ploegen")
        rows = cursor.fetchall()
    
    ploegen = [{"naam": r["ploeg"], "niveau": r["niveau"],"categorie": r["categorie"], "betaalstatus": r["betaalstatus"]} for r in rows]
    return jsonify(ploegen), 200

@ploegen_bp.route('/ploegen', methods=['POST'])
def add_ploeg():
    naam         = request.json.get('naam')
    reeks_naam   = request.json.get('reeks')
    betaalstatus = request.json.get('betaalstatus', 'niet-betaald')

    if not naam or not reeks_naam:
        return jsonify({"error": "Vul alle velden in."}), 400

    if betaalstatus not in ('betaald', 'niet-betaald'):
        return jsonify({"error": "Ongeldige betaalstatus."}), 400

    # Controleer dat de reeks actief is
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, geslacht, categorie FROM reeksen WHERE naam = ? AND actief = 1", (reeks_naam,))
        reeks = cursor.fetchone()

    if not reeks:
        return jsonify({"error": "Ongeldige of inactieve reeks."}), 400

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO ploegen (ploeg, niveau, categorie, betaalstatus, reeks) VALUES (?, ?, ?, ?, ?)",
            (naam, reeks['categorie'], reeks['geslacht'], betaalstatus, reeks_naam)
        )
        conn.commit()

    return jsonify({"message": f"Ploeg '{naam}' is succesvol ingeschreven!"}), 201