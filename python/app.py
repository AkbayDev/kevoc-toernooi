from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3
import random
import resend
import contextlib
import os
from database import get_db_connection  # Importeer je helper

# Importeer al je opgesplitste Blueprints
from routes.financien import financien_bp
from routes.ploegen import ploegen_bp
from routes.vrijwilligers import vrijwilligers_bp
from routes.rooster import rooster_bp
from routes.werkrooster import werkrooster_bp
from routes.login import login_bp
from routes.acties import acties_bp

app = Flask(__name__)
CORS(app)

# Registreer de blueprints en plak er in één keer '/api' voor!
app.register_blueprint(financien_bp, url_prefix='/api')
app.register_blueprint(ploegen_bp, url_prefix='/api')
app.register_blueprint(vrijwilligers_bp, url_prefix='/api')
app.register_blueprint(rooster_bp, url_prefix='/api')
app.register_blueprint(werkrooster_bp, url_prefix='/api')
app.register_blueprint(login_bp, url_prefix='/api')
app.register_blueprint(acties_bp, url_prefix='/api')

if __name__ == '__main__':
    app.run(debug=True, port=5000)

# --- CONFIGURATIE ---
DB_NAME = 'users.db'  # Verander dit hier 1x om overal de naam aan te passen
# API key uit environment variable lezen
resend.api_key = os.getenv('RESEND_API_KEY', 're_NLShZa9R_Ej6QqqpgTqEYTjw178HssxUr')
