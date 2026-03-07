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
    naam = request.json.get('naam')
    niveau = request.json.get('niveau')
    categorie = request.json.get('categorie')
    betaalstatus = request.json.get('betaalstatus')

    if not naam or not niveau or not categorie:
        return jsonify({"error": "Vul alle velden in."}), 400

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO ploegen (ploeg, niveau, categorie, betaalstatus) VALUES (?, ?, ?, ?)", 
            (naam, niveau, categorie, betaalstatus)
        )
        conn.commit()

    return jsonify({"message": f"Ploeg '{naam}' is succesvol ingeschreven!"}), 201