from flask import Blueprint, request, jsonify
from database import get_db_connection
from datetime import datetime, timedelta

rooster_bp = Blueprint('rooster', __name__)

def genereer_round_robin(ploegenlijst):
    """
    Genereert een reeks wedstrijden waarbij iedereen 1x tegen elkaar speelt.
    """
    if len(ploegenlijst) < 2:
        return []

    # Als het aantal ploegen oneven is, voegen we een 'Rust' ploeg toe
    if len(ploegenlijst) % 2 != 0:
        ploegenlijst.append({"naam": "Rust (Vrij)", "niveau": ploegenlijst[0]["niveau"]})

    aantal_ploegen = len(ploegenlijst)
    rondes = []

    for ronde in range(aantal_ploegen - 1):
        wedstrijden_in_ronde = []
        for i in range(aantal_ploegen // 2):
            thuis = ploegenlijst[i]
            uit = ploegenlijst[aantal_ploegen - 1 - i]
            
            # Voeg de wedstrijd toe (sla over als iemand tegen 'Rust' speelt)
            if thuis["naam"] != "Rust (Vrij)" and uit["naam"] != "Rust (Vrij)":
                wedstrijden_in_ronde.append({
                    "ronde": ronde + 1,
                    "thuis": thuis["naam"],
                    "uit": uit["naam"]
                })
        
        rondes.append(wedstrijden_in_ronde)
        # Roteer ploegen voor de volgende ronde (de eerste ploeg blijft staan)
        ploegenlijst.insert(1, ploegenlijst.pop())

    return rondes

def plan_wedstrijden_in(rondes_per_niveau):
    """
    Verdeelt de gemaakte rondes over de tijd en beschikbare velden.
    """
    start_tijd = datetime.strptime("10:00", "%H:%M")
    wedstrijd_duur = timedelta(minutes=30) # Elke wedstrijd duurt 30 min
    aantal_velden = 4 # Pas dit aan naar hoeveel velden jullie hebben!
    
    geplande_wedstrijden = []
    huidige_tijd = start_tijd
    
    # We voegen alle wedstrijden uit alle reeksen (niveaus) samen in 1 grote wachtrij
    wachtrij = []
    for niveau, rondes in rondes_per_niveau.items():
        for ronde_wedstrijden in rondes:
            for match in ronde_wedstrijden:
                match["reeks"] = niveau # Label toevoegen
                wachtrij.append(match)

    # Wedstrijden inplannen op velden
    while wachtrij:
        eind_tijd = huidige_tijd + wedstrijd_duur
        tijdsblok_str = f"{huidige_tijd.strftime('%H:%M')}-{eind_tijd.strftime('%H:%M')}"
        starttijd_str = huidige_tijd.strftime('%H:%M')

        # Vul de velden voor dit tijdsblok (1 t/m max aantal velden)
        for veld_nr in range(1, aantal_velden + 1):
            if not wachtrij:
                break # Geen wedstrijden meer over
            
            match = wachtrij.pop(0)
            geplande_wedstrijden.append({
                "tijdsblok": tijdsblok_str,
                "starttijd": starttijd_str,
                "reeks": match["reeks"],
                "ronde": match["ronde"],
                "veld": veld_nr,
                "thuis_ploeg": match["thuis"],
                "uit_ploeg": match["uit"],
                "scheidsrechter": "TBD" # Kan later handmatig ingevuld worden
            })
            
        # Schuif de tijd op voor de volgende lichting wedstrijden
        huidige_tijd += wedstrijd_duur

    return geplande_wedstrijden

@rooster_bp.route('/rooster', methods=['POST'])
def genereer_rooster():
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # 1. Haal alle ploegen op
        cursor.execute("SELECT ploeg AS naam, niveau FROM ploegen")
        ploegen_db = cursor.fetchall()
        
        if len(ploegen_db) < 2:
            return jsonify({"error": "Er zijn te weinig ploegen ingeschreven om een rooster te maken!"}), 400

        # 2. Groepeer ploegen op hun niveau (zodat competitiespelers niet tegen recreanten spelen)
        ploegen_per_niveau = {}
        for row in ploegen_db:
            niv = row["niveau"]
            if niv not in ploegen_per_niveau:
                ploegen_per_niveau[niv] = []
            ploegen_per_niveau[niv].append({"naam": row["naam"], "niveau": niv})

        # 3. Genereer de rondes per niveau
        rondes_per_niveau = {}
        for niv, ploegen in ploegen_per_niveau.items():
            rondes_per_niveau[niv] = genereer_round_robin(ploegen)

        # 4. Plan alles in op tijd en veld
        compleet_rooster = plan_wedstrijden_in(rondes_per_niveau)

        # 5. Opslaan in de database
        try:
            cursor.execute("DELETE FROM wedstrijden") # Oude rooster wissen
            
            for match in compleet_rooster:
                cursor.execute('''
                    INSERT INTO wedstrijden (tijdsblok, starttijd, reeks, ronde, veld, thuis_ploeg, uit_ploeg, scheidsrechter)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    match["tijdsblok"], match["starttijd"], match["reeks"], match["ronde"], match["veld"],
                    match["thuis_ploeg"], match["uit_ploeg"], match["scheidsrechter"]
                ))
            conn.commit()
            return jsonify({"message": f"Succes! {len(compleet_rooster)} wedstrijden berekend en ingepland."}), 200

        except Exception as e:
            return jsonify({"error": f"Fout bij opslaan: {str(e)}"}), 500

@rooster_bp.route('/rooster', methods=['GET'])
def get_rooster():
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            # Haal het rooster netjes gesorteerd op tijd en dan op veld op
            cursor.execute("SELECT * FROM wedstrijden ORDER BY starttijd ASC, veld ASC")
            rows = cursor.fetchall()
        
        rooster = [dict(row) for row in rows]
        return jsonify(rooster), 200
    except Exception as e:
        return jsonify({"error": f"Kon rooster niet laden: {str(e)}"}), 500