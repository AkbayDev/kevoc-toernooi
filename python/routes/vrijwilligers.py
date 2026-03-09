from flask import Blueprint, request, jsonify
from database import get_db_connection

vrijwilligers_bp = Blueprint('vrijwilligers', __name__)

@vrijwilligers_bp.route('/vrijwilligers', methods=['GET'])
def get_vrijwilligers():
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, naam, tijdslot, job, status FROM vrijwilligers ORDER BY id DESC")
        rows = cursor.fetchall()

    vrijwilligers = [{"id": r["id"], "naam": r["naam"], "tijdslot": r["tijdslot"], "job": r["job"], "status": r["status"]} for r in rows]
    return jsonify(vrijwilligers), 200

@vrijwilligers_bp.route('/vrijwilligers', methods=['POST'])
def add_vrijwilliger():
    data = request.json
    naam = data.get('naam')
    tijdslot = data.get('tijdslot')
    job = data.get('job')

    if not naam or not tijdslot or not job:
        return jsonify({"error": "Vul alle velden in."}), 400

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO vrijwilligers (naam, tijdslot, job) VALUES (?, ?, ?)", 
            (naam, tijdslot, job)
        )
        conn.commit()

    return jsonify({"message": f"{naam} is succesvol ingeschreven!"}), 201

@vrijwilligers_bp.route('/vrijwilligers/<int:id>/status', methods=['PATCH'])
def update_vrijwilliger_status(id):
    new_status = request.json.get('status')
    if new_status not in ['afwachtend', 'geaccepteerd', 'afgewezen', 'in behandeling']:
        return jsonify({"error": "Ongeldige status."}), 400

    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Haal vrijwilliger info op
        cursor.execute("SELECT id, naam, tijdslot, job FROM vrijwilligers WHERE id = ?", (id,))
        vrijwilliger = cursor.fetchone()
        
        if not vrijwilliger:
            return jsonify({"error": "Vrijwilliger niet gevonden."}), 404
        
        # Update status
        cursor.execute("UPDATE vrijwilligers SET status = ? WHERE id = ?", (new_status, id))
        
        # Als geaccepteerd: probeer automatisch in werkrooster in te plannen
        message = "Status succesvol bijgewerkt!"
        if new_status == 'geaccepteerd':
            # Check of deze combinatie al bezet is
            cursor.execute(
                "SELECT id FROM werkrooster WHERE tijdslot = ? AND jobrol = ?",
                (vrijwilliger['tijdslot'], vrijwilliger['job'])
            )
            
            if cursor.fetchone() is None:
                # Vrij dus toevoegen aan werkrooster
                cursor.execute(
                    "INSERT INTO werkrooster (vrijwilliger_id, jobrol, tijdslot) VALUES (?, ?, ?)",
                    (id, vrijwilliger['job'], vrijwilliger['tijdslot'])
                )
                message = f"Status geaccepteerd en automatisch ingepland op {vrijwilliger['tijdslot']}!"
            else:
                message = f"Status geaccepteerd maar {vrijwilliger['tijdslot']} is al bezet - handmatig inplannen nodig."
        
        conn.commit()

    return jsonify({"message": message}), 200