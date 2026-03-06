# dash.py
from flask import Blueprint, request, jsonify
from database import get_db_connection  # Importeer je helper

dash_bp = Blueprint('dash', __name__)
# ==========================================
# FINANCIËN ENDPOINTS
# ==========================================

@dash_bp.route('/api/financien', methods=['GET'])
def get_financien():
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT SUM(bedrag) AS totaal FROM financien WHERE type = 'inkomst'")
        inkomsten = cursor.fetchone()['totaal'] or 0.0
        
        cursor.execute("SELECT SUM(bedrag) AS totaal FROM financien WHERE type = 'kost'")
        kosten = cursor.fetchone()['totaal'] or 0.0
        
    return jsonify({"inkomsten": inkomsten, "kosten": kosten, "winst": inkomsten - kosten}), 200


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

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO financien (omschrijving, bedrag, type) VALUES (?, ?, ?)", 
            (omschrijving, bedrag, transactie_type)
        )
        conn.commit()
        
    return jsonify({"message": "Transactie succesvol toegevoegd!"}), 201


@dash_bp.route('/api/transacties', methods=['GET'])
def get_transacties():
    with get_db_connection() as conn:
        cursor = conn.cursor()
        # Sorteer op id DESC (nieuwste bovenaan)
        cursor.execute("SELECT omschrijving, bedrag, type FROM financien ORDER BY id DESC")
        rows = cursor.fetchall()
    
    # Maak er een handige lijst van voor JavaScript (gebruik makend van de row_factory)
    transacties = [{"omschrijving": r["omschrijving"], "bedrag": r["bedrag"], "type": r["type"]} for r in rows]
    return jsonify(transacties), 200

# ==========================================
# PLOEGEN ENDPOINTS
# ==========================================

@dash_bp.route('/api/ploegen', methods=['GET'])
def get_ploegen():
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM ploegen")
        rows = cursor.fetchall()
    
    ploegen = [{"naam": r["ploeg"], "niveau": r["niveau"],"categorie": r["categorie"], "betaalstatus": r["betaalstatus"]} for r in rows]
    return jsonify(ploegen), 200


@dash_bp.route('/api/ploegen', methods=['POST'])
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

# ==========================================
# VRIJWILLIGERS ENDPOINTS
# ==========================================

@dash_bp.route('/api/vrijwilligers', methods=['GET'])
def get_vrijwilligers():
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, naam, tijdslot, job FROM vrijwilligers ORDER BY id DESC")
        rows = cursor.fetchall()

    vrijwilligers = [{"id": r["id"], "naam": r["naam"], "tijdslot": r["tijdslot"], "job": r["job"], } for r in rows]
    return jsonify(vrijwilligers), 200


@dash_bp.route('/api/vrijwilligers', methods=['POST'])
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

@dash_bp.route('/api/vrijwilligers/<int:id>/status', methods=['PATCH'])
def update_vrijwilliger_status(id):
    new_status = request.json.get('status')
    if new_status not in ['geaccepteerd', 'afgewezen', 'in behandeling']:
        return jsonify({"error": "Ongeldige status."}), 400

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE vrijwilligers SET status = ? WHERE id = ?", (new_status, id))
        conn.commit()

    return jsonify({"message": "Status succesvol bijgewerkt!"}), 200

@dash_bp.route('/api/rooster', methods=['POST'])
def genereer_rooster():
    """
    Dit is de 'magische' knop voor de beheerder.
    Haalt ploegen op, berekent het rooster, en slaat het op in de database.
    """
    with get_db_connection() as conn:
        cursor = conn.cursor()

        # 1. Haal alle ploegen op
        cursor.execute("SELECT ploeg AS naam, niveau FROM ploegen")
        ploegen_db = cursor.fetchall()

        # Maak er een handige lijst van dicts van voor de logica
        alle_ploegen = [{"naam": row["naam"], "niveau": row["niveau"]} for row in ploegen_db]

        if not alle_ploegen:
            return jsonify({"error": "Er zijn nog geen ploegen ingeschreven!"}), 400

        # 2. Laat logica.py het zware rekenwerk doen! (stub versie - zal vervangen worden met echte implementatie)
        # Voor nu: genereer een basis rooster
        dagplanning = genereer_basis_rooster(alle_ploegen)

        # 3. Opslaan in de database
        try:
            # Wis eerst het oude rooster zodat we met een schone lei beginnen
            cursor.execute("DELETE FROM wedstrijden")

            # Loop door de planning en sla elke wedstrijd op
            for blok in dagplanning:
                if blok.get("status") == "fout":
                    continue # Sla blokken met te veel ploegen even over

                tijdsblok = blok["tijdsblok"]
                starttijd = blok["starttijd"]

                for reeks in blok.get("reeksen", []):
                    reeks_naam = reeks["reeks"]
                    for match in reeks["wedstrijden"]:
                        cursor.execute('''
                            INSERT INTO wedstrijden (tijdsblok, starttijd, reeks, ronde, veld, thuis_ploeg, uit_ploeg, scheidsrechter)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        ''', (
                            tijdsblok, starttijd, reeks_naam, match["ronde"], match["veld"],
                            match["thuis"], match["uit"], match.get("scheids", "-")
                        ))

            conn.commit()
            return jsonify({"message": "Het toernooischema is succesvol berekend en opgeslagen!"}), 200

        except Exception as e:
            return jsonify({"error": f"Fout bij opslaan: {str(e)}"}), 500


def genereer_basis_rooster(alle_ploegen):
    """
    Genereer een basis rooster totdat de echte logica.py functie beschikbaar is.
    """
    return [
        {
            "tijdsblok": "10:00-12:00",
            "starttijd": "10:00",
            "status": "ok",
            "reeksen": [
                {
                    "reeks": "A",
                    "wedstrijden": [
                        {"ronde": 1, "veld": 1, "thuis": alle_ploegen[0]["naam"] if len(alle_ploegen) > 0 else "TBD",
                         "uit": alle_ploegen[1]["naam"] if len(alle_ploegen) > 1 else "TBD", "scheids": "-"}
                    ]
                }
            ]
        }
    ]


@dash_bp.route('/api/rooster', methods=['GET'])
def get_rooster():
    """
    Haalt het actuele rooster uit de database om te tonen op het dashboard.
    """
    with get_db_connection() as conn:
        cursor = conn.cursor()

        # Haal alles netjes gesorteerd op
        cursor.execute('''
            SELECT id, tijdsblok, starttijd, reeks, ronde, veld, thuis_ploeg, uit_ploeg, scheidsrechter, uitslag
            FROM wedstrijden
            ORDER BY starttijd ASC, veld ASC, ronde ASC
        ''')
        wedstrijden = cursor.fetchall()

    # Zet om naar JSON
    resultaat = [dict(row) for row in wedstrijden]
    return jsonify(resultaat), 200