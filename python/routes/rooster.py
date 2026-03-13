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

def verdeel_in_poules(ploegen):
    """
    Verdeelt een grote lijst met ploegen in kleinere poules van 3 of 4.
    Bijv: 8 ploegen = 4 en 4. 9 ploegen = 3, 3 en 3. 10 ploegen = 4, 3 en 3.
    """
    n = len(ploegen)
    # Als het er 5 of minder zijn, houden we het gewoon in 1 poule
    if n <= 5:
        return [ploegen]
    
    poules = []
    aantal_4 = n // 4
    rest = n % 4
    
    # Wiskundige correctie voor perfecte 3- en 4-hoek toernooien
    if rest == 0:
        pass # Perfect te delen door 4
    elif rest == 3:
        pass # Bijv 7 ploegen = 1x4 en 1x3
    elif rest == 2:
        aantal_4 -= 1 # Bijv 10 ploegen: niet 8+2, maar 4+3+3
    elif rest == 1:
        aantal_4 -= 2 # Bijv 9 ploegen: niet 8+1, maar 3+3+3
        
    idx = 0
    # Vul eerst de vierhoeken
    for _ in range(aantal_4):
        poules.append(ploegen[idx:idx+4])
        idx += 4
        
    # Vul de overgebleven teams in driehoeken
    while idx < n:
        poules.append(ploegen[idx:idx+3])
        idx += 3
        
    return poules

def plan_wedstrijden_in(rondes_per_reeks, scheidsrechters):
    start_tijd = datetime.strptime("10:00", "%H:%M")
    wedstrijd_duur = timedelta(minutes=45) 
    opwarming_duur = timedelta(minutes=10)
    
    aantal_velden = 3 
    
    velden_beschikbaar = {veld_nr: start_tijd for veld_nr in range(1, aantal_velden + 1)}
    team_beschikbaar = {} 
    
    # --- STAP 1: GROEPEER OP PRIORITEIT ---
    def sorteer_prioriteit(reeks_naam):
        naam_lower = reeks_naam.lower()
        if 'jeugd' in naam_lower: return 1  
        elif 'senior' in naam_lower: return 3 
        return 2 

    gesorteerde_reeksen = sorted(rondes_per_reeks.keys(), key=sorteer_prioriteit)

    # --- NIEUW: VELD SPREIDING (Mannen Veld 1, Vrouwen Veld 3, Deel 2) ---
    voorkeurs_velden = {}
    # We sturen de eerste reeks naar Veld 1, de tweede naar Veld 3, derde naar Veld 2
    veld_volgorde = [1, 3, 2] 
    
    for i, reeks in enumerate(gesorteerde_reeksen):
        voorkeurs_velden[reeks] = {v: 0 for v in range(1, aantal_velden + 1)}
        thuis_veld = veld_volgorde[i % len(veld_volgorde)]
        # Geef dit thuisveld een gigantische voorsprong (+50)
        voorkeurs_velden[reeks][thuis_veld] = 50 

    # --- STAP 2: BOUW DE WACHTRIJ IN FASES ---
    reeksen_per_prio = {1: [], 2: [], 3: []}
    for reeks in gesorteerde_reeksen:
        reeksen_per_prio[sorteer_prioriteit(reeks)].append(reeks)

    wachtrij = []
    
    for prio in [1, 2, 3]:
        groep_reeksen = reeksen_per_prio[prio]
        if not groep_reeksen: continue 
            
        max_rondes_groep = max((len(rondes_per_reeks[r]) for r in groep_reeksen), default=0)
        
        for ronde_idx in range(max_rondes_groep):
            for reeks in groep_reeksen:
                rondes = rondes_per_reeks[reeks]
                if ronde_idx < len(rondes):
                    for match in rondes[ronde_idx]:
                        match["reeks"] = reeks
                        wachtrij.append(match)

    geplande_wedstrijden = []
    scheids_teller = 0

    # --- STAP 3: PLAN DE WACHTRIJ IN ---
    for match in wachtrij:
        thuis = match["thuis"]
        uit = match["uit"]
        reeks = match["reeks"]
        
        if thuis not in team_beschikbaar: team_beschikbaar[thuis] = start_tijd
        if uit not in team_beschikbaar: team_beschikbaar[uit] = start_tijd
        
        # (Let op: de regel "if reeks not in voorkeurs_velden" is verwijderd, want dat doen we nu al bovenaan!)
        
        vroegste_team_tijd = max(team_beschikbaar[thuis], team_beschikbaar[uit])
        
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

        # De rest van je functie blijft exact hetzelfde! 
        start_opwarming = beste_starttijd
        aftrap = start_opwarming + opwarming_duur
        eind_match = aftrap + wedstrijd_duur
        
        match_dagdeel = "voormiddag" if start_opwarming.hour < 13 else "namiddag"
        beschikbare_scheids = [s["naam"] for s in scheidsrechters if s["tijdslot"] in [match_dagdeel, "hele_dag"]]
        
        toegewezen_scheids = "TBD"
        if beschikbare_scheids:
            toegewezen_scheids = beschikbare_scheids[scheids_teller % len(beschikbare_scheids)]
            scheids_teller += 1

        tijdsblok_str = f"{start_opwarming.strftime('%H:%M')} - {eind_match.strftime('%H:%M')}"
        
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
        
        velden_beschikbaar[beste_veld] = eind_match
        team_beschikbaar[thuis] = eind_match
        team_beschikbaar[uit] = eind_match
        
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

       # 3. Genereer de rondes per REEKS en verdeel in POULES
        rondes_per_reeks = {}
        for reeks_naam, ploegen in ploegen_per_reeks.items():
            poules = verdeel_in_poules(ploegen)
            
            if len(poules) == 1:
                # Gewoon 1 toernooi
                rondes_per_reeks[reeks_naam] = genereer_round_robin(poules[0])
            else:
                # Meerdere poules! Noem ze Poule A, Poule B, etc.
                for i, poule in enumerate(poules):
                    letter = chr(65 + i) # 65 is de letter 'A'
                    poule_naam = f"{reeks_naam} (Poule {letter})"
                    rondes_per_reeks[poule_naam] = genereer_round_robin(poule)
        
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
            
            # 6. Automatisch scheidsrechters toevoegen aan werkrooster
            # Verzamel alle unieke scheidsrechters uit het rooster
            toegewezen_scheidsrechters = set()
            for match in compleet_rooster:
                if match["scheidsrechter"] and match["scheidsrechter"] != "TBD":
                    toegewezen_scheidsrechters.add(match["scheidsrechter"])
            
            # Verwijder oude scheidsrechter entries uit werkrooster
            cursor.execute("DELETE FROM werkrooster WHERE jobrol = 'Scheidsrechter'")
            
            # Voeg alle toegewezen scheidsrechters toe aan werkrooster
            for scheids_naam in toegewezen_scheidsrechters:
                # Haal vrijwilliger_id en tijdslot op
                cursor.execute('''
                    SELECT id, tijdslot 
                    FROM vrijwilligers 
                    WHERE naam = ? AND job = 'scheids' AND status = 'geaccepteerd'
                ''', (scheids_naam,))
                scheids_info = cursor.fetchone()
                
                if scheids_info:
                    cursor.execute('''
                        INSERT INTO werkrooster (vrijwilliger_id, jobrol, tijdslot, opmerking)
                        VALUES (?, ?, ?, ?)
                    ''', (scheids_info["id"], "Scheidsrechter", scheids_info["tijdslot"], f"Automatisch ingeplaatst voor rooster"))
            
            conn.commit()
            return jsonify({"message": f"Succes! {len(compleet_rooster)} wedstrijden berekend en ingepland. Scheidsrechters automatisch ingeplaatst in werkrooster."}), 200

        except Exception as e:
            return jsonify({"error": f"Fout bij opslaan: {str(e)}"}), 500

@rooster_bp.route('/rooster', methods=['GET'])
def get_rooster():
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # Check of score kolommen bestaan, zoniet voeg ze toe (Lazy Migration)
            try:
                cursor.execute("SELECT score_thuis FROM wedstrijden LIMIT 1")
            except Exception:
                cursor.execute("ALTER TABLE wedstrijden ADD COLUMN score_thuis INTEGER")
                cursor.execute("ALTER TABLE wedstrijden ADD COLUMN score_uit INTEGER")
                conn.commit()

            # Haal het rooster netjes gesorteerd op tijd en dan op veld op
            cursor.execute("SELECT * FROM wedstrijden ORDER BY starttijd ASC, veld ASC")
            rows = cursor.fetchall()
        
        rooster = [dict(row) for row in rows]
        return jsonify(rooster), 200
    except Exception as e:
        return jsonify({"error": f"Kon rooster niet laden: {str(e)}"}), 500

@rooster_bp.route('/wedstrijden/<int:id>/score', methods=['PATCH'])
def update_wedstrijd_score(id):
    data = request.json
    score_thuis = data.get('score_thuis')
    score_uit = data.get('score_uit')

    if score_thuis is None or score_uit is None:
        return jsonify({"error": "Vul beide scores in."}), 400

    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                UPDATE wedstrijden
                SET score_thuis = ?, score_uit = ?
                WHERE id = ?
            ''', (score_thuis, score_uit, id))
            conn.commit()
        
        return jsonify({"message": "Uitslag succesvol opgeslagen!"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400