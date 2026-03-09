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

    # Een 'Rust' ploeg toevoegen bij een oneven aantal
    if len(ploegenlijst) % 2 != 0:
        ploegenlijst.append({"naam": "Rust (Vrij)"})

    aantal_ploegen = len(ploegenlijst)
    rondes = []

    for ronde in range(aantal_ploegen - 1):
        wedstrijden_in_ronde = []
        for i in range(aantal_ploegen // 2):
            thuis = ploegenlijst[i]
            uit = ploegenlijst[aantal_ploegen - 1 - i]
            
            if thuis["naam"] != "Rust (Vrij)" and uit["naam"] != "Rust (Vrij)":
                wedstrijden_in_ronde.append({
                    "ronde": ronde + 1,
                    "thuis": thuis["naam"],
                    "uit": uit["naam"]
                })
        
        rondes.append(wedstrijden_in_ronde)
        ploegenlijst.insert(1, ploegenlijst.pop())

    return rondes

def plan_wedstrijden_in(rondes_per_reeks, scheidsrechters):
    """
    Verdeelt de gemaakte rondes over de tijd en beschikbare velden,
    inclusief opwarming en slimme veldtoewijzing (voorkeursvelden per reeks).
    """
    start_tijd = datetime.strptime("10:00", "%H:%M")
    wedstrijd_duur = timedelta(minutes=45) 
    opwarming_duur = timedelta(minutes=10)
    # Totaal is nu 55 minuten per slot
    
    aantal_velden = 3 
    
    # Trackers: We houden de klok bij per veld én per team
    velden_beschikbaar = {veld_nr: start_tijd for veld_nr in range(1, aantal_velden + 1)}
    team_beschikbaar = {} 
    voorkeurs_velden = {} 
    
    # 1. Haal alle wedstrijden uit elkaar, maar mix ze netjes per ronde
    wachtrij = []
    max_rondes = max((len(r) for r in rondes_per_reeks.values()), default=0)
    
    for ronde_idx in range(max_rondes):
        for reeks, rondes in rondes_per_reeks.items():
            if ronde_idx < len(rondes):
                for match in rondes[ronde_idx]:
                    match["reeks"] = reeks
                    wachtrij.append(match)

    geplande_wedstrijden = []
    scheids_teller = 0

    # 2. Plan elke wedstrijd slim in
    for match in wachtrij:
        thuis = match["thuis"]
        uit = match["uit"]
        reeks = match["reeks"]
        
        # Initialiseer trackers voor nieuwe teams of reeksen
        if thuis not in team_beschikbaar: team_beschikbaar[thuis] = start_tijd
        if uit not in team_beschikbaar: team_beschikbaar[uit] = start_tijd
        if reeks not in voorkeurs_velden: voorkeurs_velden[reeks] = {v: 0 for v in range(1, aantal_velden + 1)}
        
        # Wanneer kunnen BEIDE teams op zijn vroegst weer spelen?
        vroegste_team_tijd = max(team_beschikbaar[thuis], team_beschikbaar[uit])
        
        # We zoeken nu het beste veld
        beste_veld = 1
        beste_starttijd = datetime.max
        
        for veld_id, v_tijd in velden_beschikbaar.items():
            mogelijke_start = max(v_tijd, vroegste_team_tijd)
            
            if mogelijke_start < beste_starttijd:
                beste_starttijd = mogelijke_start
                beste_veld = veld_id
            elif mogelijke_start == beste_starttijd:
                if voorkeurs_velden[reeks][veld_id] > voorkeurs_velden[reeks][beste_veld]:
                    beste_veld = veld_id

        # Veld is gekozen, nu de tijden definitief berekenen
        start_opwarming = beste_starttijd
        aftrap = start_opwarming + opwarming_duur
        eind_match = aftrap + wedstrijd_duur
        
        # Bepaal dagdeel voor de scheidsrechter
        match_dagdeel = "voormiddag" if start_opwarming.hour < 13 else "namiddag"
        
        # Filter beschikbare scheidsrechters
        beschikbare_scheids = [s["naam"] for s in scheidsrechters if s["tijdslot"] in [match_dagdeel, "hele_dag"]]
        
        toegewezen_scheids = "TBD"
        if beschikbare_scheids:
            toegewezen_scheids = beschikbare_scheids[scheids_teller % len(beschikbare_scheids)]
            scheids_teller += 1

        tijdsblok_str = f"{start_opwarming.strftime('%H:%M')} - {eind_match.strftime('%H:%M')}"
        
        # DE ENIGE APPEND (de "TBD" kopie is nu verwijderd!)
        geplande_wedstrijden.append({
            "tijdsblok": tijdsblok_str,
            "starttijd": start_opwarming.strftime('%H:%M'), 
            "reeks": reeks,
            "ronde": match["ronde"],
            "veld": beste_veld,
            "thuis_ploeg": thuis,
            "uit_ploeg": uit,
            "scheidsrechter": toegewezen_scheids 
        })
        
        # Klokken updaten voor de volgende ronde in de loop
        velden_beschikbaar[beste_veld] = eind_match
        team_beschikbaar[thuis] = eind_match
        team_beschikbaar[uit] = eind_match
        
        # Geef deze reeks "punten" voor dit veld
        voorkeurs_velden[reeks][beste_veld] += 1

    return geplande_wedstrijden

@rooster_bp.route('/rooster', methods=['POST'])
def genereer_rooster():
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # 1. Haal alle ploegen op
        cursor.execute("SELECT ploeg AS naam, niveau, categorie FROM ploegen")
        ploegen_db = cursor.fetchall()
        
        if len(ploegen_db) < 2:
            return jsonify({"error": "Er zijn te weinig ploegen ingeschreven om een rooster te maken!"}), 400
        
        cursor.execute('''
            SELECT naam, tijdslot 
            FROM vrijwilligers 
            WHERE job = 'scheids' AND status = 'geaccepteerd'
        ''')
        scheidsrechters_db = cursor.fetchall()
        scheidsrechters_lijst = [{"naam": row["naam"], "tijdslot": row["tijdslot"]} for row in scheidsrechters_db]

        # 2. Groepeer ploegen op hun gender en niveau (zodat competitiespelers niet tegen recreanten spelen)
        ploegen_per_reeks = {}
        for row in ploegen_db:
            niv = row["niveau"]
            cat = row["categorie"] # Bijv. "Heren" of "Dames"
            
            # Maak een mooie label aan, bijv: "Heren - Competitie"
            reeks_naam = f"{cat} - {niv}".title() 
            
            if reeks_naam not in ploegen_per_reeks:
                ploegen_per_reeks[reeks_naam] = []
                
            ploegen_per_reeks[reeks_naam].append({"naam": row["naam"]})

        # 3. Genereer de rondes per REEKS (dus Heren en Dames blijven strak gescheiden)
        rondes_per_reeks = {}
        for reeks_naam, ploegen in ploegen_per_reeks.items():
            rondes_per_reeks[reeks_naam] = genereer_round_robin(ploegen)

        # 4. Plan alles in op tijd en veld
        compleet_rooster = plan_wedstrijden_in(rondes_per_reeks, scheidsrechters_lijst)

        # 5. Opslaan in de database
        try:
            cursor.execute("DELETE FROM wedstrijden") 
            
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