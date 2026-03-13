from flask import Blueprint, request, jsonify
from database import get_db_connection

acties_bp = Blueprint('acties', __name__)

@acties_bp.route('/acties', methods=['GET'])
def get_acties():
    with get_db_connection() as conn:
        cursor = conn.cursor()
        # Sorteer zodat 'bezig' bovenaan staat, daarna nieuwe items
        cursor.execute("SELECT * FROM acties ORDER BY CASE WHEN status = 'bezig' THEN 0 ELSE 1 END, id DESC")
        rows = cursor.fetchall()
        
    acties = [dict(row) for row in rows]
    return jsonify(acties), 200

@acties_bp.route('/acties', methods=['POST'])
def add_actie():
    data = request.json
    omschrijving = data.get('omschrijving')
    
    if not omschrijving:
        return jsonify({"error": "Omschrijving is verplicht"}), 400

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("INSERT INTO acties (omschrijving, status) VALUES (?, 'open')", (omschrijving,))
        conn.commit()

    return jsonify({"message": "Actie toegevoegd"}), 201

@acties_bp.route('/acties/<int:id>/status', methods=['PATCH'])
def update_actie_status(id):
    data = request.json
    new_status = data.get('status') # 'open', 'bezig' of 'verwijder'
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        if new_status == 'verwijder':
            cursor.execute("DELETE FROM acties WHERE id = ?", (id,))
            message = "Actie verwijderd"
        else:
            cursor.execute("UPDATE acties SET status = ? WHERE id = ?", (new_status, id))
            message = f"Status gewijzigd naar {new_status}"
        
        conn.commit()

    return jsonify({"message": message}), 200