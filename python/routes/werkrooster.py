from flask import Blueprint, request, jsonify
from database import get_db_connection

werkrooster_bp = Blueprint('werkrooster', __name__)

@werkrooster_bp.route('/werkrooster', methods=['GET'])
def get_werkrooster():
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT w.id, w.vrijwilliger_id, w.tijdslot, w.jobrol, w.opmerking, v.naam
                FROM werkrooster w
                LEFT JOIN vrijwilligers v ON w.vrijwilliger_id = v.id
                ORDER BY w.jobrol, w.tijdslot
            ''')
            rows = cursor.fetchall()
        
        rooster = [dict(row) for row in rows]
        return jsonify(rooster), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@werkrooster_bp.route('/werkrooster/beschikbaar', methods=['GET'])
def get_beschikbare_vrijwilligers():
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, naam FROM vrijwilligers WHERE status = 'geaccepteerd' ORDER BY naam")
        rows = cursor.fetchall()
    
    vrijwilligers = [{"id": r["id"], "naam": r["naam"]} for r in rows]
    return jsonify(vrijwilligers), 200

@werkrooster_bp.route('/werkrooster', methods=['POST'])
def add_werkrooster_toewijzing():
    data = request.json
    vrijwilliger_id = data.get('vrijwilliger_id')
    jobrol = data.get('jobrol')
    tijdslot = data.get('tijdslot')
    opmerking = data.get('opmerking', '')

    if not vrijwilliger_id or not jobrol or not tijdslot:
        return jsonify({"error": "Vul alle velden in."}), 400

    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO werkrooster (vrijwilliger_id, jobrol, tijdslot, opmerking)
                VALUES (?, ?, ?, ?)
            ''', (vrijwilliger_id, jobrol, tijdslot, opmerking))
            conn.commit()
        
        return jsonify({"message": "Toewijzing succesvol toegevoegd!"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@werkrooster_bp.route('/werkrooster/<int:id>', methods=['PATCH'])
def update_werkrooster_toewijzing(id):
    data = request.json
    vrijwilliger_id = data.get('vrijwilliger_id')
    jobrol = data.get('jobrol')
    tijdslot = data.get('tijdslot')
    opmerking = data.get('opmerking', '')

    if not vrijwilliger_id or not jobrol or not tijdslot:
        return jsonify({"error": "Vul alle velden in."}), 400

    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                UPDATE werkrooster
                SET vrijwilliger_id = ?, jobrol = ?, tijdslot = ?, opmerking = ?
                WHERE id = ?
            ''', (vrijwilliger_id, jobrol, tijdslot, opmerking, id))
            conn.commit()
        
        return jsonify({"message": "Toewijzing succesvol bijgewerkt!"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@werkrooster_bp.route('/werkrooster/<int:id>', methods=['DELETE'])
def delete_werkrooster_toewijzing(id):
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM werkrooster WHERE id = ?", (id,))
            conn.commit()
        
        return jsonify({"message": "Toewijzing succesvol verwijderd!"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400
