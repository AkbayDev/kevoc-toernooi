from flask import Blueprint
from database import get_db_connection

financien_bp = Blueprint('financien', __name__)