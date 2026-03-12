from flask import Blueprint, request, jsonify
from database import get_db_connection

vrijwilligers_bp = Blueprint('vrijwilligers', __name__)

@vrijwilligers_bp.route('/vrijwilligers', methods=['GET'])
def get_vrijwilligers():
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT v.id, v.naam, v.tijdslot, v.job, v.status, v.wedstrijd_id,
                   CASE 
                       WHEN v.job = 'Scheidsrechter' AND v.wedstrijd_id IS NOT NULL 
                       THEN w.starttijd || ' - ' || w.thuis_ploeg || ' vs ' || w.uit_ploeg || ' (Veld ' || w.veld || ')'
                       ELSE NULL
                   END as wedstrijd_info
            FROM vrijwilligers v
            LEFT JOIN wedstrijden w ON v.wedstrijd_id = w.id
            WHERE v.status != 'afgewezen' 
            ORDER BY v.id DESC
        """)
        rows = cursor.fetchall()

    vrijwilligers = [{
        "id": r["id"], 
        "naam": r["naam"], 
        "tijdslot": r["tijdslot"], 
        "job": r["job"], 
        "status": r["status"],
        "wedstrijd_id": r["wedstrijd_id"],
        "wedstrijd_info": r["wedstrijd_info"]
    } for r in rows]
    return jsonify(vrijwilligers), 200

@vrijwilligers_bp.route('/vrijwilligers', methods=['POST'])
def add_vrijwilliger():
    data = request.json
    naam = data.get('naam')
    email = data.get('email')  # Automatisch meegestuurd vanuit frontend via localStorage
    tijdslot = data.get('tijdslot')
    job = data.get('job')
    wedstrijd_id = data.get('wedstrijd_id', None)

    if not naam or not tijdslot or not job:
        return jsonify({"error": "Vul alle velden in."}), 400

    if job == 'Scheidsrechter' and not wedstrijd_id:
        return jsonify({"error": "Kies een wedstrijd voor scheidsrechter rollen."}), 400

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO vrijwilligers (naam, email, tijdslot, job, wedstrijd_id) VALUES (?, ?, ?, ?, ?)", 
            (naam, email, tijdslot, job, wedstrijd_id if job == 'Scheidsrechter' else None)
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
        
        # Haal vrijwilliger info op inclusief email
        cursor.execute("SELECT id, naam, email, tijdslot, job, wedstrijd_id FROM vrijwilligers WHERE id = ?", (id,))
        vrijwilliger = cursor.fetchone()
        
        if not vrijwilliger:
            return jsonify({"error": "Vrijwilliger niet gevonden."}), 404
        
        # Update status
        cursor.execute("UPDATE vrijwilligers SET status = ? WHERE id = ?", (new_status, id))
        
        message = "Status succesvol bijgewerkt!"
        
        # Als geaccepteerd: update rol naar 'hulp' en logica voor werkrooster/scheidsrechter
        if new_status == 'geaccepteerd':
            # Update rol naar hulp als email beschikbaar is
            if vrijwilliger['email']:
                cursor.execute("UPDATE users SET role = ? WHERE email = ?", ('hulp', vrijwilliger['email']))
                if cursor.rowcount == 0:
                    print(f"[WAARSCHUWING] Geen gebruiker gevonden met email: {vrijwilliger['email']}")
            
            # Als scheidsrechter met wedstrijd_id: update scheidsrechter in wedstrijden
            if vrijwilliger['job'] == 'Scheidsrechter' and vrijwilliger['wedstrijd_id']:
                cursor.execute(
                    "SELECT scheidsrechter FROM wedstrijden WHERE id = ?",
                    (vrijwilliger['wedstrijd_id'],)
                )
                wedstrijd = cursor.fetchone()
                
                if wedstrijd:
                    if wedstrijd['scheidsrechter'] is None or wedstrijd['scheidsrechter'] == 'TBD':
                        cursor.execute(
                            "UPDATE wedstrijden SET scheidsrechter = ? WHERE id = ?",
                            (vrijwilliger['naam'], vrijwilliger['wedstrijd_id'])
                        )
                        message = f"Status geaccepteerd! {vrijwilliger['naam']} toegewezen als scheidsrechter."
                    else:
                        message = f"Status geaccepteerd, maar deze wedstrijd heeft al scheidsrechter '{wedstrijd['scheidsrechter']}' - handmatig aanpassen nodig!"
            else:
                # Niet-scheidsrechter: probeer werkrooster in te plannen
                cursor.execute(
                    "SELECT id FROM werkrooster WHERE tijdslot = ? AND jobrol = ?",
                    (vrijwilliger['tijdslot'], vrijwilliger['job'])
                )
                
                if cursor.fetchone() is None:
                    cursor.execute(
                        "INSERT INTO werkrooster (vrijwilliger_id, jobrol, tijdslot) VALUES (?, ?, ?)",
                        (id, vrijwilliger['job'], vrijwilliger['tijdslot'])
                    )
                    message = f"Status geaccepteerd en automatisch ingepland op {vrijwilliger['tijdslot']}!"
                else:
                    message = f"Status geaccepteerd maar {vrijwilliger['tijdslot']} is al bezet - handmatig inplannen nodig."
        
        # Als afgewezen: update rol naar 'gebruiker' en verwijder uit werkrooster/wedstrijden
        elif new_status == 'afgewezen':
            # Update rol naar gebruiker als email beschikbaar is
            if vrijwilliger['email']:
                cursor.execute("UPDATE users SET role = ? WHERE email = ?", ('gebruiker', vrijwilliger['email']))
            
            # Verwijder uit werkrooster als ingepland
            cursor.execute("SELECT id FROM werkrooster WHERE vrijwilliger_id = ?", (id,))
            
            if cursor.fetchone() is not None:
                cursor.execute("DELETE FROM werkrooster WHERE vrijwilliger_id = ?", (id,))
                message = "Status afgewezen en verwijderd uit werkrooster!"
            
            # Als scheidsrechter: verwijder uit wedstrijden scheidsrechter veld
            if vrijwilliger['job'] == 'Scheidsrechter' and vrijwilliger['wedstrijd_id']:
                cursor.execute(
                    "UPDATE wedstrijden SET scheidsrechter = 'TBD' WHERE id = ? AND scheidsrechter = ?",
                    (vrijwilliger['wedstrijd_id'], vrijwilliger['naam'])
                )
        
        conn.commit()

    return jsonify({"message": message}), 200

@vrijwilligers_bp.route('/wedstrijden/beschikbaar', methods=['GET'])
def get_beschikbare_wedstrijden():
    """Retourneert alle wedstrijden zonder scheidsrechter (NULL of TBD)"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, starttijd, thuis_ploeg, uit_ploeg, reeks, veld
            FROM wedstrijden
            WHERE scheidsrechter IS NULL OR scheidsrechter = 'TBD'
            ORDER BY starttijd ASC
        """)
        rows = cursor.fetchall()
    
    wedstrijden = [{
        "id": r["id"],
        "display": f"{r['starttijd']} - {r['thuis_ploeg']} vs {r['uit_ploeg']} ({r['reeks']}, Veld {r['veld']})"
    } for r in rows]
    
    return jsonify(wedstrijden), 200