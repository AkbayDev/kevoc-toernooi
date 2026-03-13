from flask import Blueprint, request, jsonify
from database import get_db_connection

vrijwilligers_bp = Blueprint('vrijwilligers', __name__)

@vrijwilligers_bp.route('/vrijwilligers', methods=['GET'])
def get_vrijwilligers():
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT v.id, v.naam, v.tijdslot, v.job, v.status, v.wedstrijd_id, v.tijdsblok,
                   CASE 
                       WHEN v.job = 'Scheidsrechter' AND v.tijdsblok IS NOT NULL
                       THEN v.tijdsblok
                       ELSE NULL
                   END as wedstrijd_info
            FROM vrijwilligers v
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
    naam      = data.get('naam')
    email     = data.get('email')
    tijdslot  = data.get('tijdslot')   # het werktijdslot (08:00, 10:00, ...)
    job       = data.get('job')
    tijdsblok = data.get('tijdsblok')  # alleen voor Scheidsrechter (bv. "10:00 - 10:55")

    if not naam or not tijdslot or not job:
        return jsonify({"error": "Vul alle velden in."}), 400

    if job == 'Scheidsrechter':
        if not tijdsblok:
            return jsonify({"error": "Kies een tijdsblok voor de scheidsrechter rol."}), 400

        # Max 3 scheids per tijdsblok
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT COUNT(*) FROM vrijwilligers WHERE job = 'Scheidsrechter' AND tijdsblok = ? AND status != 'afgewezen'",
                (tijdsblok,)
            )
            aantal = cursor.fetchone()[0]

        if aantal >= 3:
            return jsonify({"error": "Dit tijdsblok heeft al 3 scheidsrechters."}), 400

        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO vrijwilligers (naam, email, tijdslot, job, tijdsblok, wedstrijd_id) VALUES (?, ?, ?, ?, ?, NULL)",
                (naam, email, tijdslot, job, tijdsblok)
            )
            conn.commit()
    else:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO vrijwilligers (naam, email, tijdslot, job) VALUES (?, ?, ?, ?)",
                (naam, email, tijdslot, job)
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
        
        cursor.execute("SELECT id, naam, email, tijdslot, job, wedstrijd_id, tijdsblok FROM vrijwilligers WHERE id = ?", (id,))
        vrijwilliger = cursor.fetchone()
        
        if not vrijwilliger:
            return jsonify({"error": "Vrijwilliger niet gevonden."}), 404
        
        cursor.execute("UPDATE vrijwilligers SET status = ? WHERE id = ?", (new_status, id))
        
        message = "Status succesvol bijgewerkt!"
        
        if new_status == 'geaccepteerd':
            if vrijwilliger['email']:
                # Scheidsrechter krijgt rol 'scheids', anderen krijgen 'hulp'
                nieuwe_rol = 'scheids' if vrijwilliger['job'] == 'Scheidsrechter' else 'hulp'
                cursor.execute("UPDATE users SET role = ? WHERE email = ?", (nieuwe_rol, vrijwilliger['email']))
                if cursor.rowcount == 0:
                    print(f"[WAARSCHUWING] Geen gebruiker gevonden met email: {vrijwilliger['email']}")

            if vrijwilliger['job'] == 'Scheidsrechter':
                # Scheids kiest zelf later welke wedstrijd via claim-wedstrijd endpoint
                message = f"Status geaccepteerd! {vrijwilliger['naam']} kan nu zelf een wedstrijd claimen in het tijdsblok {vrijwilliger['tijdsblok']}."
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
        
        elif new_status == 'afgewezen':
            if vrijwilliger['email']:
                cursor.execute("UPDATE users SET role = ? WHERE email = ?", ('gebruiker', vrijwilliger['email']))
            
            cursor.execute("SELECT id FROM werkrooster WHERE vrijwilliger_id = ?", (id,))
            if cursor.fetchone() is not None:
                cursor.execute("DELETE FROM werkrooster WHERE vrijwilliger_id = ?", (id,))
                message = "Status afgewezen en verwijderd uit werkrooster!"
            
            # Als scheids een wedstrijd had geclaimd, zet die terug op TBD
            if vrijwilliger['job'] == 'Scheidsrechter':
                cursor.execute(
                    "UPDATE wedstrijden SET scheidsrechter = 'TBD' WHERE scheidsrechter = ?",
                    (vrijwilliger['naam'],)
                )
        
        conn.commit()

    return jsonify({"message": message}), 200


@vrijwilligers_bp.route('/scheids/beschikbare-blokken', methods=['GET'])
def get_beschikbare_blokken():
    """Tijdsblokken waarvoor nog minder dan 3 scheids ingeschreven zijn."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT DISTINCT tijdsblok FROM wedstrijden
            WHERE tijdsblok NOT IN (
                SELECT tijdsblok FROM vrijwilligers
                WHERE job = 'Scheidsrechter' AND status != 'afgewezen' AND tijdsblok IS NOT NULL
                GROUP BY tijdsblok HAVING COUNT(*) >= 3
            )
            ORDER BY tijdsblok ASC
        """)
        rows = cursor.fetchall()

    blokken = [{"tijdsblok": r["tijdsblok"]} for r in rows if r["tijdsblok"]]
    return jsonify(blokken), 200


@vrijwilligers_bp.route('/scheids/mijn-blok', methods=['GET'])
def get_mijn_blok():
    """Geeft het tijdsblok en bijbehorende wedstrijden van de ingelogde scheids."""
    email = request.args.get('email')
    if not email:
        return jsonify({"error": "Email is verplicht."}), 400

    with get_db_connection() as conn:
        cursor = conn.cursor()

        # Zoek het tijdsblok van de geaccepteerde scheids
        cursor.execute(
            "SELECT naam, tijdsblok FROM vrijwilligers WHERE email = ? AND job = 'Scheidsrechter' AND status = 'geaccepteerd' LIMIT 1",
            (email,)
        )
        vrijwilliger = cursor.fetchone()

        if not vrijwilliger or not vrijwilliger['tijdsblok']:
            return jsonify({"tijdsblok": None, "wedstrijden": []}), 200

        tijdsblok = vrijwilliger['tijdsblok']

        # Haal alle wedstrijden in dat tijdsblok op
        cursor.execute(
            "SELECT * FROM wedstrijden WHERE tijdsblok = ? ORDER BY veld ASC",
            (tijdsblok,)
        )
        rows = cursor.fetchall()

    wedstrijden = [dict(r) for r in rows]
    return jsonify({"tijdsblok": tijdsblok, "naam": vrijwilliger['naam'], "wedstrijden": wedstrijden}), 200


@vrijwilligers_bp.route('/scheids/claim-wedstrijd', methods=['POST'])
def claim_wedstrijd():
    """Scheids claimt een specifieke wedstrijd in zijn/haar tijdsblok."""
    data = request.json
    email       = data.get('email')
    wedstrijd_id = data.get('wedstrijd_id')

    if not email or not wedstrijd_id:
        return jsonify({"error": "Email en wedstrijd_id zijn verplicht."}), 400

    with get_db_connection() as conn:
        cursor = conn.cursor()

        # Haal naam en tijdsblok op van de scheids
        cursor.execute(
            "SELECT naam, tijdsblok FROM vrijwilligers WHERE email = ? AND job = 'Scheidsrechter' AND status = 'geaccepteerd' LIMIT 1",
            (email,)
        )
        vrijwilliger = cursor.fetchone()

        if not vrijwilliger:
            return jsonify({"error": "Geen geaccepteerde scheidsrechter gevonden voor dit account."}), 404

        naam      = vrijwilliger['naam']
        tijdsblok = vrijwilliger['tijdsblok']

        # Controleer dat de wedstrijd in het tijdsblok van de scheids valt
        cursor.execute("SELECT id, tijdsblok, scheidsrechter FROM wedstrijden WHERE id = ?", (wedstrijd_id,))
        wedstrijd = cursor.fetchone()

        if not wedstrijd:
            return jsonify({"error": "Wedstrijd niet gevonden."}), 404

        if wedstrijd['tijdsblok'] != tijdsblok:
            return jsonify({"error": "Deze wedstrijd valt niet in jouw tijdsblok."}), 400

        if wedstrijd['scheidsrechter'] and wedstrijd['scheidsrechter'] not in (None, 'TBD'):
            return jsonify({"error": f"Deze wedstrijd heeft al een scheidsrechter: {wedstrijd['scheidsrechter']}."}), 400

        # Claim de wedstrijd
        cursor.execute(
            "UPDATE wedstrijden SET scheidsrechter = ? WHERE id = ?",
            (naam, wedstrijd_id)
        )
        conn.commit()

    return jsonify({"message": f"{naam} is toegewezen als scheidsrechter!"}), 200


@vrijwilligers_bp.route('/wedstrijden/beschikbaar', methods=['GET'])
def get_beschikbare_wedstrijden():
    """Wedstrijden zonder scheidsrechter (voor legacy gebruik)."""
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