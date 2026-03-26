import csv
import io
from flask import Blueprint, Response
from database import get_db_connection

export_bp = Blueprint('export', __name__)


def maak_csv_response(bestandsnaam, headers, rijen):
    """Helper: bouw een UTF-8 CSV Response."""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(headers)
    writer.writerows(rijen)
    output.seek(0)
    return Response(
        '\ufeff' + output.getvalue(),   # BOM zodat Excel NL correct opent
        mimetype='text/csv; charset=utf-8',
        headers={'Content-Disposition': f'attachment; filename={bestandsnaam}'}
    )


@export_bp.route('/export/ploegen', methods=['GET'])
def export_ploegen():
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT ploeg, reeks, niveau, categorie, betaalstatus FROM ploegen ORDER BY ploeg ASC")
        rijen = cursor.fetchall()
    return maak_csv_response(
        'ploegen.csv',
        ['Ploegnaam', 'Reeks', 'Niveau', 'Categorie', 'Betaalstatus'],
        [(r['ploeg'], r['reeks'] or '', r['niveau'], r['categorie'], r['betaalstatus']) for r in rijen]
    )


@export_bp.route('/export/betaaloverzicht', methods=['GET'])
def export_betaaloverzicht():
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT ploeg, reeks, betaalstatus FROM ploegen ORDER BY betaalstatus ASC, ploeg ASC")
        rijen = cursor.fetchall()
    return maak_csv_response(
        'betaaloverzicht.csv',
        ['Ploegnaam', 'Reeks', 'Betaalstatus'],
        [(r['ploeg'], r['reeks'] or '', r['betaalstatus']) for r in rijen]
    )


@export_bp.route('/export/wedstrijden', methods=['GET'])
def export_wedstrijden():
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT tijdsblok, starttijd, reeks, ronde, veld,
                   thuis_ploeg, uit_ploeg, scheidsrechter,
                   score_thuis, score_uit
            FROM wedstrijden ORDER BY starttijd ASC, veld ASC
        """)
        rijen = cursor.fetchall()
    return maak_csv_response(
        'toernooi_schema.csv',
        ['Tijdsblok', 'Starttijd', 'Reeks', 'Ronde', 'Veld',
         'Thuis', 'Uit', 'Scheidsrechter', 'Score Thuis', 'Score Uit'],
        [(r['tijdsblok'], r['starttijd'], r['reeks'], r['ronde'], r['veld'],
          r['thuis_ploeg'], r['uit_ploeg'], r['scheidsrechter'] or 'TBD',
          r['score_thuis'] if r['score_thuis'] is not None else '',
          r['score_uit']   if r['score_uit']   is not None else '') for r in rijen]
    )


@export_bp.route('/export/vrijwilligers', methods=['GET'])
def export_vrijwilligers():
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT naam, email, tijdslot, job, tijdsblok, status
            FROM vrijwilligers WHERE status != 'afgewezen'
            ORDER BY job ASC, naam ASC
        """)
        rijen = cursor.fetchall()
    return maak_csv_response(
        'vrijwilligers.csv',
        ['Naam', 'Email', 'Tijdslot', 'Job', 'Tijdsblok', 'Status'],
        [(r['naam'], r['email'] or '', r['tijdslot'], r['job'],
          r['tijdsblok'] or '', r['status']) for r in rijen]
    )


@export_bp.route('/export/werkrooster', methods=['GET'])
def export_werkrooster():
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT v.naam, w.jobrol, w.tijdslot, w.opmerking
            FROM werkrooster w
            LEFT JOIN vrijwilligers v ON w.vrijwilliger_id = v.id
            ORDER BY w.jobrol ASC, w.tijdslot ASC
        """)
        rijen = cursor.fetchall()
    return maak_csv_response(
        'werkrooster.csv',
        ['Naam', 'Jobrol', 'Tijdslot', 'Opmerking'],
        [(r['naam'] or '', r['jobrol'], r['tijdslot'], r['opmerking'] or '') for r in rijen]
    )
