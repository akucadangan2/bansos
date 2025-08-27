import os
import logging
import json
import re
import urllib.parse
import time
import secrets
from datetime import datetime, timedelta
from dotenv import load_dotenv
from flask import Flask, Blueprint, jsonify, render_template, request, flash, redirect, url_for, session
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from flask_jwt_extended import JWTManager
from flask_socketio import SocketIO
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy.sql import func
import requests

# Load environment variables
load_dotenv()

# Inisialisasi Flask
app = Flask(__name__)
socketio = SocketIO(app, async_mode='threading')  # jangan pakai eventlet/gevent di Streamlit

# Path database portable (bisa Linux/Windows/Cloud)
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
db_path = os.path.join(BASE_DIR, "data", "webgis.db")

# Konfigurasi dari .env
app.config['SECRET_KEY'] = os.getenv("SECRET_KEY", "default-secret")
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv(
    "DATABASE_URL", f"sqlite:///{db_path}"
)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['BREVO_API_KEY'] = os.getenv("BREVO_API_KEY")
app.config['BREVO_SENDER_EMAIL'] = os.getenv("BREVO_SENDER_EMAIL")
app.config['MAPBOX_API_KEY'] = os.getenv("MAPBOX_API_KEY")
app.config['JWT_SECRET_KEY'] = os.getenv("JWT_SECRET_KEY", "default-jwt")

# Session config
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_SECURE'] = False
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=24)
app.config['SESSION_REFRESH_EACH_REQUEST'] = True

# Logging
if not os.path.exists("logs"):
    os.makedirs("logs")
logging.basicConfig(
    filename=os.path.join("logs", "app.log"),
    level=logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Inisialisasi ekstensi
db = SQLAlchemy(app)
login_manager = LoginManager(app)
login_manager.login_view = 'auth.login'
jwt = JWTManager(app)

# Import models agar bisa dibuat di DB
with app.app_context():
    db.create_all()

# api_routes.py
from flask import Blueprint, jsonify

api_bp = Blueprint("api", __name__)

@api_bp.route("/ping")
def ping():
    return jsonify({"msg": "pong"})

# SocketIO event
@socketio.on("connect")
def handle_connect():
    logger.info("Client connected via SocketIO")
    print("Client connected")

@socketio.on("disconnect")
def handle_disconnect():
    logger.info("Client disconnected from SocketIO")
    print("Client disconnected")

DATA_BANSOS_FILE = os.path.join(os.path.dirname(__file__), 'data', 'penerima.json')
DATA_BENCANA_FILE = os.path.join(os.path.dirname(__file__), 'data', 'bencana.json')
DATA_FASILITAS_FILE = os.path.join(os.path.dirname(__file__), 'data', 'fasilitas.json')
DATA_LAYANAN_FILE = os.path.join(os.path.dirname(__file__), 'data', 'layanan.json')
DATA_LANSIA_FILE = os.path.join(os.path.dirname(__file__), 'data', 'lansia.json')
DATA_LANSIA_INDIVIDU_FILE = os.path.join(os.path.dirname(__file__), 'data', 'lansia_individu.json')
DATA_LAPORAN_FILE = os.path.join(os.path.dirname(__file__), 'data', 'laporan.json')
DATA_POSKO_FILE = os.path.join(os.path.dirname(__file__), 'data', 'posko.json')
DATA_LANSIA_KOMPREHENSIF_FILE = os.path.join(os.path.dirname(__file__), 'data', 'lansia_komprehensif.json')
DATA_LKS_LANSIA_FILE = os.path.join(os.path.dirname(__file__), 'data', 'lks_lansia.json')
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'static', 'Uploads')
ACCOUNTS_LOG_FILE = os.path.join(os.path.dirname(__file__), 'logs', 'accounts.log')
GEOCACHE_FILE = os.path.join(os.path.dirname(__file__), 'data', 'geocache.json')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(os.path.dirname(DATA_BANSOS_FILE), exist_ok=True)
os.makedirs(os.path.dirname(ACCOUNTS_LOG_FILE), exist_ok=True)
os.makedirs(os.path.dirname(DATA_LANSIA_KOMPREHENSIF_FILE), exist_ok=True)
os.makedirs(os.path.dirname(DATA_LKS_LANSIA_FILE), exist_ok=True)
os.makedirs(os.path.dirname(GEOCACHE_FILE), exist_ok=True)

class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    role = db.Column(db.String(20), nullable=False)
    region_id = db.Column(db.Integer, db.ForeignKey('region.id'), nullable=True)
    active = db.Column(db.Boolean, default=True)
    region = db.relationship('Region', backref='users')
    reset_tokens = db.relationship('PasswordResetToken', backref='user', lazy=True)

    def set_password(self, password):
        logger.info(f"Setting password for user {self.username}")
        self.password_hash = generate_password_hash(password, method='pbkdf2:sha256')
        logger.debug(f"Password hash generated: {self.password_hash}")

    def check_password(self, password):
        logger.debug(f"Checking password for user {self.username}")
        result = check_password_hash(self.password_hash, password)
        logger.debug(f"Password check result: {result}")
        return result

class Region(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)

class PasswordResetToken(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    token = db.Column(db.String(64), unique=True, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    used = db.Column(db.Boolean, default=False)

class DataSubmission(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    data = db.Column(db.JSON, nullable=False)
    feature_type = db.Column(db.String(50), nullable=False)
    status = db.Column(db.String(20), default='pending')
    admin_comment = db.Column(db.Text, nullable=True)
    submitted_at = db.Column(db.DateTime, default=datetime.utcnow)
    user = db.relationship('User', backref='submissions')

@login_manager.user_loader
def load_user(user_id):
    with db.session() as session:
        user = session.get(User, int(user_id))
        logger.debug(f"Loaded user: {user.username if user else None}, session: {session}")
        return user

@app.context_processor
def inject_rbac_script():
    user_info = {
        'is_authenticated': current_user.is_authenticated,
        'role': current_user.role if current_user.is_authenticated else 'public',
        'username': current_user.username if current_user.is_authenticated else 'anonymous'
    }
    logger.debug(f"Injecting user_info: {user_info}")
    return dict(rbac_script='<script src="/static/js/rbac.js"></script>', user_info=user_info)

def send_reset_email(user, token):
    try:
        reset_url = url_for('auth', tab='reset_password', token=token, _external=True)
        email_data = {
            "sender": {"email": app.config['BREVO_SENDER_EMAIL'], "name": "WebGIS Bansos"},
            "to": [{"email": user.email, "name": user.username}],
            "subject": "Reset Password - WebGIS Bansos",
            "htmlContent": f"""
            <html>
                <body>
                    <h2>Halo {user.username},</h2>
                    <p>Klik link berikut untuk mengatur ulang kata sandi Anda:</p>
                    <a href="{reset_url}" style="background-color: #f6ad55; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Kata Sandi</a>
                    <p>Link ini akan kedaluwarsa dalam 1 jam.</p>
                    <p>Terima kasih,<br>Tim WebGIS Bansos</p>
                </body>
            </html>
            """
        }
        headers = {
            'api-key': app.config['BREVO_API_KEY'],
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
        response = requests.post('https://api.brevo.com/v3/smtp/email', headers=headers, json=email_data)
        if response.status_code != 201:
            logger.error(f'Brevo API error: {response.text}')
            raise Exception(f'Failed to send email: {response.text}')
        logger.info(f'Reset password email sent to {user.email}')
    except Exception as e:
        logger.error(f'Failed to send reset email to {user.email}: {str(e)}')
        raise Exception('Gagal mengirim email reset')

def clean_address(address):
    """Membersihkan alamat untuk meningkatkan kemungkinan pencocokan di API."""
    if not address or not isinstance(address, str):
        return None
    address = re.sub(r'\s+', ' ', address.strip())
    replacements = {
        r'Jl\.?\s': 'Jalan ',
        r'No\.?\s': 'Nomor ',
        r'RT\.?\s': 'RT ',
        r'RW\.?\s': 'RW ',
        r'Kec\.?\s': 'Kecamatan ',
        r'Kab\.?\s': 'Kabupaten ',
        r'Kota\s': '',
        r'Daerah\sKhusus\sIbukota\s': 'DKI ',
        r'No\.\d+\s+\d+': lambda m: f"No.{m.group(0).split()[1]}",
        r'Daerah\sKhusus\sJakarta': 'DKI Jakarta',
        r'Jakarta\sTimur': 'Jakarta Timur',
        r'Jakarta\sSelatan': 'Jakarta Selatan',
        r'Palmeriam': 'Palmerah',
        r'Jawa\sTengah': 'Jawa Tengah',
        r'Cilacap\sSel\.': 'Cilacap Selatan'
    }
    for pattern, replacement in replacements.items():
        if callable(replacement):
            address = re.sub(pattern, replacement, address, flags=re.IGNORECASE)
        else:
            address = re.sub(pattern, replacement, address, flags=re.IGNORECASE)
    return address.strip()

def load_geocache():
    """Memuat cache geocoding dari file."""
    try:
        if os.path.exists(GEOCACHE_FILE):
            with open(GEOCACHE_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {}
    except Exception as e:
        logger.error(f"Error loading geocache: {str(e)}")
        return {}

def save_geocache(geocache):
    """Menyimpan cache geocoding ke file."""
    try:
        with open(GEOCACHE_FILE, 'w', encoding='utf-8') as f:
            json.dump(geocache, f, indent=2, ensure_ascii=False)
    except Exception as e:
        logger.error(f"Error saving geocache: {str(e)}")

def geocode_address(address, max_retries=2):
    """Geocode alamat menggunakan Mapbox Geocoding API dengan caching dan fallback ke Nominatim."""
    try:
        if not address or not isinstance(address, str) or address.strip() == '':
            logger.error("Geocoding failed: Invalid or empty address")
            return None, None, "Geocoding failed: Invalid or empty address"

        cleaned_address = clean_address(address)
        if not cleaned_address:
            logger.error("Geocoding failed: Cleaned address is empty")
            return None, None, "Geocoding failed: Invalid or empty address after cleaning"

        # Cek cache
        geocache = load_geocache()
        if cleaned_address in geocache:
            logger.info(f"Geocache hit for {cleaned_address}")
            return geocache[cleaned_address]['lat'], geocache[cleaned_address]['lon'], None

        headers = {'User-Agent': 'WebGIS-Bansos/1.0 (contact: bansos-webgis@example.com)'}
        mapbox_url = "https://api.mapbox.com/geocoding/v5/mapbox.places/{}.json"
        mapbox_params = {
            'access_token': app.config['MAPBOX_API_KEY'],
            'limit': 1,
            'country': 'ID',
            'types': 'address,place,locality,region'
        }

        # Buat varian alamat
        address_variants = [cleaned_address]
        simplified = re.sub(r'Jalan\s[\w\s]+?\sNomor\s\d+,\sRT\s\d+/\s*RW\s\d+,\s*', '', cleaned_address)
        if simplified != cleaned_address:
            address_variants.append(simplified)
        match = re.search(r'([\w\s]+),\s*Kecamatan\s([\w\s]+),\s*(?:Kabupaten|Kota)\s([\w\s]+)', cleaned_address)
        if match:
            address_variants.append(f"{match.group(1)}, {match.group(2)}, {match.group(3)}, Indonesia")
        match = re.search(r'Kecamatan\s([\w\s]+),\s*(?:Kabupaten|Kota)\s([\w\s]+)', cleaned_address)
        if match:
            address_variants.append(f"{match.group(1)}, {match.group(2)}, Indonesia")
        match = re.search(r'(?:Kabupaten|Kota)\s([\w\s]+)', cleaned_address)
        if match:
            address_variants.append(f"{match.group(1)}, Indonesia")

        # Coba Mapbox Geocoding API
        for addr in address_variants:
            for attempt in range(max_retries + 1):
                try:
                    response = requests.get(mapbox_url.format(urllib.parse.quote(addr)), headers=headers, params=mapbox_params, timeout=10)
                    logger.debug(f"Mapbox response status: {response.status_code}, content: {response.text}")
                    if response.status_code == 401:
                        logger.error(f"Mapbox geocoding failed for {addr}: Unauthorized API key")
                        return None, None, "Geocoding failed: Unauthorized API key"
                    elif response.status_code == 429:
                        logger.error(f"Mapbox geocoding failed for {addr}: API rate limit exceeded")
                        if attempt < max_retries:
                            time.sleep(2 ** attempt)
                            continue
                        return None, None, "Geocoding failed: API rate limit exceeded"
                    elif response.status_code != 200:
                        logger.error(f"Mapbox geocoding failed for {addr}: HTTP {response.status_code}")
                        break
                    data = response.json()
                    if data.get('features') and len(data['features']) > 0:
                        lon = float(data['features'][0]['center'][0])
                        lat = float(data['features'][0]['center'][1])
                        logger.info(f"Mapbox geocoding successful for {addr}: lat={lat}, lon={lon}")
                        geocache[cleaned_address] = {'lat': lat, 'lon': lon}
                        save_geocache(geocache)
                        return lat, lon, None
                    else:
                        logger.warning(f"Mapbox geocoding failed for {addr}: No results found")
                        break
                except requests.exceptions.RequestException as e:
                    logger.error(f"Mapbox geocoding network error for {addr}: {str(e)}")
                    if attempt < max_retries:
                        time.sleep(2 ** attempt)
                        continue
                    return None, None, f"Geocoding failed: Network error - {str(e)}"

        # Fallback ke Nominatim
        logger.info(f"Mapbox failed for all variants of {address}, trying Nominatim")
        nominatim_url = "https://nominatim.openstreetmap.org/search"
        nominatim_variants = [cleaned_address]
        if simplified != cleaned_address:
            nominatim_variants.append(simplified)
        match = re.search(r'Kecamatan\s([\w\s]+),\s*(?:Kabupaten|Kota)\s([\w\s]+)', cleaned_address)
        if match:
            nominatim_variants.append(f"{match.group(1)}, {match.group(2)}, Indonesia")
        match = re.search(r'(?:Kabupaten|Kota)\s([\w\s]+)', cleaned_address)
        if match:
            nominatim_variants.append(f"{match.group(1)}, Indonesia")

        for addr in nominatim_variants:
            nominatim_params = {
                'q': addr,
                'format': 'json',
                'limit': 1,
                'countrycodes': 'id'
            }
            try:
                time.sleep(1)  # Hormati batas 1 permintaan per detik Nominatim
                response = requests.get(nominatim_url, headers=headers, params=nominatim_params, timeout=10)
                logger.debug(f"Nominatim response status: {response.status_code}, content: {response.text}")
                if response.status_code != 200:
                    logger.error(f"Nominatim geocoding failed for {addr}: HTTP {response.status_code}")
                    continue
                data = response.json()
                if data and len(data) > 0:
                    lat = float(data[0]['lat'])
                    lon = float(data[0]['lon'])
                    logger.info(f"Nominatim geocoding successful for {addr}: lat={lat}, lon={lon}")
                    geocache[cleaned_address] = {'lat': lat, 'lon': lon}
                    save_geocache(geocache)
                    return lat, lon, None
                else:
                    logger.warning(f"Nominatim geocoding failed for {addr}: No results found")
            except Exception as e:
                logger.error(f"Nominatim geocoding error for {addr}: {str(e)}")
                continue

        # Fallback ke koordinat default
        default_coordinates = {
            'Kabupaten Cilacap': {'lat': -7.7161, 'lon': 109.0096},
            'DKI Jakarta': {'lat': -6.1754, 'lon': 106.8272},
            'Jawa Tengah': {'lat': -6.9907, 'lon': 110.4103},
            'Jakarta Timur': {'lat': -6.2145, 'lon': 106.8456},
            'Bandar Lampung': {'lat': -5.425, 'lon': 105.258}
        }
        for key, coords in default_coordinates.items():
            if key.lower() in address.lower():
                logger.info(f"Fallback ke koordinat default untuk {key}: lat={coords['lat']}, lon={coords['lon']}")
                geocache[cleaned_address] = {'lat': coords['lat'], 'lon': coords['lon']}
                save_geocache(geocache)
                return coords['lat'], coords['lon'], f"Geocoding menggunakan koordinat default untuk {key}"
        return None, None, "Geocoding gagal: Tidak ada hasil untuk alamat atau variannya."
    except Exception as e:
        logger.error(f"Geocoding unexpected error for {address}: {str(e)}")
        return None, None, f"Geocoding failed: Unexpected error - {str(e)}"

@app.route('/')
def index():
    logger.info("Rendering index.html")
    role = current_user.role if current_user.is_authenticated else 'public'
    region_id = current_user.region_id if current_user.is_authenticated else None
    logger.debug(f"Index accessed by user: {current_user.username if current_user.is_authenticated else 'anonymous'}, role: {role}")
    return render_template('index.html', role=role, region_id=region_id)

@app.route('/bencana')
def bencana():
    logger.info("Rendering bencana.html")
    role = current_user.role if current_user.is_authenticated else 'public'
    region_id = current_user.region_id if current_user.is_authenticated else None
    logger.debug(f"Bencana accessed by user: {current_user.username if current_user.is_authenticated else 'anonymous'}, role: {role}")
    return render_template('bencana.html', role=role, region_id=region_id)

@app.route('/fasilitas')
def fasilitas():
    logger.info("Rendering fasilitas.html")
    role = current_user.role if current_user.is_authenticated else 'public'
    region_id = current_user.region_id if current_user.is_authenticated else None
    logger.debug(f"Fasilitas accessed by user: {current_user.username if current_user.is_authenticated else 'anonymous'}, role: {role}")
    return render_template('fasilitas.html', role=role, region_id=region_id)

@app.route('/layanan')
def layanan():
    logger.info("Rendering layanan.html")
    role = current_user.role if current_user.is_authenticated else 'public'
    region_id = current_user.region_id if current_user.is_authenticated else None
    logger.debug(f"Layanan accessed by user: {current_user.username if current_user.is_authenticated else 'anonymous'}, role: {role}")
    return render_template('layanan.html', role=role, region_id=region_id)

@app.route('/lansia')
def lansia():
    logger.info("Rendering lansia.html")
    role = current_user.role if current_user.is_authenticated else 'public'
    region_id = current_user.region_id if current_user.is_authenticated else None
    logger.debug(f"Lansia accessed by user: {current_user.username if current_user.is_authenticated else 'anonymous'}, role: {role}")
    return render_template('lansia.html', role=role, region_id=region_id)

@app.route('/lansia_individu')
def lansia_individu():
    logger.info("Rendering lansia_individu.html")
    role = current_user.role if current_user.is_authenticated else 'public'
    region_id = current_user.region_id if current_user.is_authenticated else None
    logger.debug(f"Lansia individu accessed by user: {current_user.username if current_user.is_authenticated else 'anonymous'}, role: {role}")
    return render_template('lansia_individu.html', role=role, region_id=region_id)

@app.route('/lansia_komprehensif')
def lansia_komprehensif():
    logger.info("Rendering lansia_komprehensif.html")
    role = current_user.role if current_user.is_authenticated else 'public'
    region_id = current_user.region_id if current_user.is_authenticated else None
    logger.debug(f"Lansia komprehensif accessed by user: {current_user.username if current_user.is_authenticated else 'anonymous'}, role: {role}")
    return render_template('lansia_komprehensif.html', role=role, region_id=region_id)

@app.route('/lks_lansia')
def lks_lansia():
    logger.info("Rendering lks_lansia.html")
    role = current_user.role if current_user.is_authenticated else 'public'
    region_id = current_user.region_id if current_user.is_authenticated else None
    logger.debug(f"LKS Lansia accessed by user: {current_user.username if current_user.is_authenticated else 'anonymous'}, role: {role}")
    return render_template('lks_lansia.html', role=role, region_id=region_id)

@app.route('/pengajuan', methods=['GET', 'POST'])
@login_required
def pengajuan():
    logger.debug(f"Pengajuan accessed by user: {current_user.username}, role: {current_user.role}")
    if current_user.role != 'admin':
        logger.warning(f'Unauthorized pengajuan access by {current_user.username}')
        flash('Hanya Admin yang dapat meninjau pengajuan.')
        return redirect(url_for('index'))
    try:
        if request.method == 'POST':
            action = request.form.get('action')
            submission_id = request.form.get('submission_id')
            submission = db.session.get(DataSubmission, submission_id)
            if not submission:
                logger.error(f"Submission {submission_id} not found")
                flash('Pengajuan tidak ditemukan.')
                return redirect(url_for('pengajuan'))
            if action == 'approve':
                status = 'approved'
                comment = request.form.get('comment')
                submission.status = status
                submission.admin_comment = comment
                file_path = {
                    'bencana': DATA_BENCANA_FILE,
                    'fasilitas': DATA_FASILITAS_FILE,
                    'layanan': DATA_LAYANAN_FILE,
                    'penerima': DATA_BANSOS_FILE,
                    'lansia': DATA_LANSIA_FILE,
                    'lansia_individu': DATA_LANSIA_INDIVIDU_FILE,
                    'lansia_komprehensif': DATA_LANSIA_KOMPREHENSIF_FILE,
                    'lks_lansia': DATA_LKS_LANSIA_FILE
                }.get(submission.feature_type)
                try:
                    with open(file_path, 'r+', encoding='utf-8') as f:
                        data = json.load(f)
                        if submission.feature_type in ['lansia_individu', 'lansia_komprehensif', 'lks_lansia']:
                            data['lansia'].append(submission.data)
                        else:
                            data['features'].append(submission.data)
                        f.seek(0)
                        json.dump(data, f, indent=2, ensure_ascii=False)
                        f.truncate()
                    logger.info(f'Submission {submission_id} approved and added to {submission.feature_type}.json')
                    socketio.emit('update_notification', {'message': f'Pengajuan {submission.feature_type} disetujui oleh admin {current_user.username}'})
                except Exception as e:
                    logger.error(f'Error saving approved submission {submission_id} to {file_path}: {str(e)}')
                    flash(f'Gagal menyimpan data ke {submission.feature_type}.json: {str(e)}')
                    return redirect(url_for('pengajuan'))
            elif action == 'reject':
                status = 'rejected'
                comment = request.form.get('comment')
                submission.status = status
                submission.admin_comment = comment
                logger.info(f'Submission {submission_id} rejected')
                socketio.emit('update_notification', {'message': f'Pengajuan {submission.feature_type} ditolak oleh admin {current_user.username}'})
            elif action == 'delete':
                if submission.status == 'approved':
                    file_path = {
                        'bencana': DATA_BENCANA_FILE,
                        'fasilitas': DATA_FASILITAS_FILE,
                        'layanan': DATA_LAYANAN_FILE,
                        'penerima': DATA_BANSOS_FILE,
                        'lansia': DATA_LANSIA_FILE,
                        'lansia_individu': DATA_LANSIA_INDIVIDU_FILE,
                        'lansia_komprehensif': DATA_LANSIA_KOMPREHENSIF_FILE,
                        'lks_lansia': DATA_LKS_LANSIA_FILE
                    }.get(submission.feature_type)
                    try:
                        with open(file_path, 'r+', encoding='utf-8') as f:
                            data = json.load(f)
                            if submission.feature_type in ['lansia_individu', 'lansia_komprehensif', 'lks_lansia']:
                                data['lansia'] = [
                                    record for record in data['lansia']
                                    if isinstance(record, dict) and str(record.get('nik', '')) != str(submission.data.get('nik'))
                                ]
                            else:
                                data['features'] = [
                                    feature for feature in data['features']
                                    if isinstance(feature, dict) and
                                    'properties' in feature and
                                    str(feature['properties'].get('id', '')) != str(submission.data['properties']['id'])
                                ]
                            f.seek(0)
                            json.dump(data, f, indent=2, ensure_ascii=False)
                            f.truncate()
                        logger.info(f'Submission {submission_id} deleted from {submission.feature_type}.json')
                        socketio.emit('update_notification', {'message': f'Pengajuan {submission.feature_type} dihapus oleh admin {current_user.username}'})
                    except Exception as e:
                        logger.error(f'Error deleting submission {submission_id} from {file_path}: {str(e)}')
                        flash(f'Gagal menghapus data dari {submission.feature_type}.json: {str(e)}')
                        return redirect(url_for('pengajuan'))
                db.session.delete(submission)
                logger.info(f'Submission {submission_id} deleted from DataSubmission by admin {current_user.username}')
                socketio.emit('update_notification', {'message': f'Pengajuan {submission_id} dihapus dari DataSubmission oleh admin {current_user.username}'})
            else:
                flash('Aksi tidak valid.')
                return redirect(url_for('pengajuan'))
            db.session.commit()
            flash(f'Pengajuan {submission_id} telah {status or "dihapus"}.')
            return redirect(url_for('pengajuan'))
        submissions = db.session.execute(db.select(DataSubmission)).scalars().all()
        logger.debug(f"Rendering pengajuan.html with {len(submissions)} submissions")
        return render_template('pengajuan.html', submissions=submissions)
    except Exception as e:
        logger.error(f'Pengajuan error: {str(e)}')
        flash(f'Gagal memuat halaman pengajuan: {str(e)}')
        return redirect(url_for('index'))

@app.route('/auth', methods=['GET', 'POST'])
def auth():
    logger.debug(f"Auth accessed with tab: {request.args.get('tab', 'login')}, user: {current_user.username if current_user.is_authenticated else 'anonymous'}")
    tab = request.args.get('tab', 'login')
    if tab not in ['login', 'forgot_password', 'reset_password', 'register', 'submit_data', 'submissions']:
        tab = 'login'

    if request.method == 'POST':
        if tab == 'login':
            username = request.form['username']
            password = request.form['password']
            logger.debug(f"Login attempt for username: {username}")
            user = db.session.execute(db.select(User).filter_by(username=username)).scalar_one_or_none()
            if user:
                logger.debug(f"User found: {user.username}, active: {user.active}")
                if user.check_password(password) and user.active:
                    login_user(user, remember=True)
                    session['user_id'] = user.id
                    logger.info(f'User {username} logged in, session: {session}')
                    return redirect(url_for('index'))
                else:
                    logger.warning(f'Failed login attempt for {username}: Incorrect password or inactive account')
                    flash('Username atau password salah, atau akun tidak aktif')
            else:
                logger.warning(f'Failed login attempt: Username {username} not found')
                flash('Username atau password salah, atau akun tidak aktif')
            return redirect(url_for('auth', tab='login'))

        elif tab == 'forgot_password':
            username = request.form['username']
            user = db.session.execute(db.select(User).filter_by(username=username)).scalar_one_or_none()
            if user:
                token = secrets.token_hex(32)
                expires_at = datetime.utcnow() + timedelta(hours=1)
                reset_token = PasswordResetToken(user_id=user.id, token=token, expires_at=expires_at)
                db.session.add(reset_token)
                db.session.commit()
                try:
                    send_reset_email(user, token)
                    flash('Link reset kata sandi telah dikirim ke email Anda.')
                except Exception as e:
                    flash('Gagal mengirim email reset. Silakan coba lagi nanti.')
                    logger.error(f'Failed to send reset email: {str(e)}')
            else:
                flash('Username tidak ditemukan.')
            return redirect(url_for('auth', tab='forgot_password'))

        elif tab == 'reset_password':
            token = request.form['token']
            reset_token = db.session.execute(db.select(PasswordResetToken).filter_by(token=token, used=False)).scalar_one_or_none()
            if not reset_token or reset_token.expires_at < datetime.utcnow():
                flash('Link reset kata sandi tidak valid atau telah kedaluwarsa.')
                return redirect(url_for('auth', tab='forgot_password'))
            password = request.form['password']
            confirm_password = request.form['confirm_password']
            if password != confirm_password:
                flash('Kata sandi tidak cocok.')
                return redirect(url_for('auth', tab='reset_password', token=token))
            user = db.session.get(User, reset_token.user_id)
            user.set_password(password)
            reset_token.used = True
            db.session.commit()
            flash('Kata sandi berhasil direset. Silakan login.')
            return redirect(url_for('auth', tab='login'))

        elif tab == 'register':
            username = request.form['username']
            email = request.form['email']
            password = request.form['password']
            role = 'public'
            region_id = request.form.get('region_id')
            if db.session.execute(db.select(User).filter_by(username=username)).scalar_one_or_none():
                flash('Username sudah ada')
                return redirect(url_for('auth', tab='register'))
            if db.session.execute(db.select(User).filter_by(email=email)).scalar_one_or_none():
                flash('Email sudah digunakan')
                return redirect(url_for('auth', tab='register'))
            user = User(username=username, email=email, role=role, region_id=region_id if region_id else None)
            user.set_password(password)
            db.session.add(user)
            db.session.commit()
            logger.info(f'New user {username} registered')
            flash('Registrasi berhasil. Silakan login.')
            return redirect(url_for('auth', tab='login'))

        elif tab == 'submit_data':
            if not current_user.is_authenticated:
                flash('Silakan login terlebih dahulu.')
                return redirect(url_for('auth', tab='login'))
            if current_user.role != 'public':
                flash('Hanya Pengguna Umum yang dapat mengajukan data.')
                return redirect(url_for('index'))
            feature_type = request.form['feature_type']
            if feature_type not in ['bencana', 'fasilitas', 'layanan', 'penerima', 'lansia', 'lansia_individu', 'lansia_komprehensif', 'lks_lansia']:
                flash('Jenis data tidak valid.')
                return redirect(url_for('auth', tab='submit_data'))
            data = {
                'nik': request.form.get('nik'),
                'nama': request.form.get('nama'),
                'usia': request.form.get('usia'),
                'kondisi_kesehatan': request.form.get('kondisi_kesehatan', '').split(',') if request.form.get('kondisi_kesehatan') else [],
                'status_sosial': request.form.get('status_sosial'),
                'alamat': request.form.get('alamat'),
                'status_monitoring': request.form.get('status_monitoring'),
                'evaluasi_layanan': request.form.get('evaluasi_layanan'),
                'dtks_status': request.form.get('dtks_status'),
                'koordinat': [float(request.form.get('longitude', 0)), float(request.form.get('latitude', 0))]
            } if feature_type in ['lansia_individu', 'lansia_komprehensif', 'lks_lansia'] else {
                'type': 'Feature',
                'geometry': {'type': 'Point', 'coordinates': [float(request.form.get('longitude', 0)), float(request.form.get('latitude', 0))]},
                'properties': {
                    'id': secrets.token_hex(16),
                    'nama': request.form.get('nama'),
                    'alamat': request.form.get('alamat'),
                    'waktu_kejadian': request.form.get('waktu_kejadian') or None,
                    'jenis_bencana': request.form.get('jenis_bencana'),
                    'tingkat_keparahan': request.form.get('tingkat_keparahan'),
                    'luas_terdampak': request.form.get('luas_terdampak'),
                    'kebutuhan_mendesak': request.form.get('kebutuhan_mendesak'),
                    'korban_meninggal': request.form.get('korban_meninggal'),
                    'korban_luka_berat': request.form.get('korban_luka_berat'),
                    'korban_luka_ringan': request.form.get('korban_luka_ringan'),
                    'korban_pengungsi': request.form.get('korban_pengungsi'),
                    'rumah_rusak_berat': request.form.get('rumah_rusak_berat'),
                    'rumah_rusak_sedang': request.form.get('rumah_rusak_sedang'),
                    'rumah_rusak_ringan': request.form.get('rumah_rusak_ringan'),
                    'fasilitas_umum': request.form.get('fasilitas_umum'),
                    'bantuan': request.form.get('bantuan_jenis') or None,
                    'nama_program': request.form.get('nama_program'),
                    'jenis_program': request.form.get('jenis_program'),
                    'kebutuhan_khusus': request.form.get('kebutuhan_khusus'),
                    'jadwal_mulai': request.form.get('jadwal_mulai'),
                    'jadwal_selesai': request.form.get('jadwal_selesai'),
                    'peserta': request.form.get('peserta'),
                    'anggaran': request.form.get('anggaran'),
                    'status': request.form.get('status')
                }
            }
            submission = DataSubmission(user_id=current_user.id, data=data, feature_type=feature_type)
            db.session.add(submission)
            db.session.commit()
            logger.info(f'Data submission created by user {current_user.username} for {feature_type}')
            socketio.emit('update_notification', {'message': f'Pengajuan data {feature_type} baru dari {current_user.username}'})
            flash('Data berhasil diajukan untuk ditinjau.')
            return redirect(url_for('auth', tab='submissions'))

    if tab == 'submissions':
        if not current_user.is_authenticated:
            flash('Silakan login terlebih dahulu.')
            return redirect(url_for('auth', tab='login'))
        submissions = db.session.execute(db.select(DataSubmission).filter_by(user_id=current_user.id)).scalars().all()
        logger.debug(f"Rendering auth.html with {len(submissions)} submissions")
        return render_template('auth.html', tab=tab, regions=db.session.execute(db.select(Region)).scalars().all(), submissions=submissions)

    regions = db.session.execute(db.select(Region)).scalars().all()
    logger.debug(f"Rendering auth.html with tab: {tab}, regions: {len(regions)}")
    return render_template('auth.html', tab=tab, regions=regions)

@app.route('/akun', methods=['GET', 'POST'])
@login_required
def akun():
    logger.debug(f"Akun accessed by user: {current_user.username}, role: {current_user.role}")
    if request.method == 'POST':
        username = request.form.get('username', current_user.username)
        email = request.form.get('email', current_user.email)
        password = request.form.get('password')
        if db.session.execute(db.select(User).filter_by(username=username)).scalar_one_or_none() and username != current_user.username:
            flash('Username sudah ada')
            return redirect(url_for('akun'))
        if db.session.execute(db.select(User).filter_by(email=email)).scalar_one_or_none() and email != current_user.email:
            flash('Email sudah digunakan')
            return redirect(url_for('akun'))
        current_user.username = username
        current_user.email = email
        if password:
            current_user.set_password(password)
        db.session.commit()
        logger.info(f'User {current_user.username} updated account')
        flash('Akun berhasil diperbarui')
        return redirect(url_for('akun'))
    return render_template('akun.html', user=current_user)

@app.route('/api/user', methods=['GET'])
def get_user():
    logger.debug(f"API /api/user accessed by user: {current_user.username if current_user.is_authenticated else 'anonymous'}, session: {session}")
    user_info = {
        'is_authenticated': current_user.is_authenticated,
        'role': current_user.role if current_user.is_authenticated else 'public',
        'username': current_user.username if current_user.is_authenticated else 'anonymous'
    }
    return jsonify(user_info)

@app.route('/api/<feature_type>/load', methods=['GET'])
def load_data(feature_type):
    if feature_type not in ['bencana', 'fasilitas', 'layanan', 'penerima', 'lansia', 'lansia_individu', 'lansia_komprehensif', 'lks_lansia']:
        logger.error(f"Invalid feature type: {feature_type}")
        return jsonify({'error': 'Invalid feature type'}), 400
    file_path = {
        'bencana': DATA_BENCANA_FILE,
        'fasilitas': DATA_FASILITAS_FILE,
        'layanan': DATA_LAYANAN_FILE,
        'penerima': DATA_BANSOS_FILE,
        'lansia': DATA_LANSIA_FILE,
        'lansia_individu': DATA_LANSIA_INDIVIDU_FILE,
        'lansia_komprehensif': DATA_LANSIA_KOMPREHENSIF_FILE,
        'lks_lansia': DATA_LKS_LANSIA_FILE
    }.get(feature_type)
    default_data = {
        'type': 'FeatureCollection' if feature_type not in ['lansia_individu', 'lansia_komprehensif', 'lks_lansia'] else 'LansiaCollection',
        'features' if feature_type not in ['lansia_individu', 'lansia_komprehensif', 'lks_lansia'] else 'lansia': [],
        'policies': [] if feature_type in ['lansia_komprehensif', 'lks_lansia'] else None,
        'rehabilitations': [] if feature_type in ['lansia_komprehensif', 'lks_lansia'] else None,
        'monitorings': [] if feature_type in ['lansia_komprehensif', 'lks_lansia'] else None,
        'partnerships': [] if feature_type in ['lansia_komprehensif', 'lks_lansia'] else None,
        'disasters': [] if feature_type in ['lansia_komprehensif', 'lks_lansia'] else None,
        'productives': [] if feature_type in ['lansia_komprehensif', 'lks_lansia'] else None,
        'advocacies': [] if feature_type in ['lansia_komprehensif', 'lks_lansia'] else None,
        'hluns': [] if feature_type in ['lansia_komprehensif', 'lks_lansia'] else None,
        'trainings': [] if feature_type in ['lansia_komprehensif', 'lks_lansia'] else None,
        'researches': [] if feature_type in ['lansia_komprehensif', 'lks_lansia'] else None
    }
    try:
        if not os.path.exists(file_path):
            logger.info(f"{file_path} not found, creating default file")
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(default_data, f, indent=2, ensure_ascii=False)
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read().strip()
            if not content:
                logger.warning(f"{file_path} is empty, returning default data")
                return jsonify(default_data), 200, {'Cache-Control': 'no-cache, no-store, must-revalidate'}
            data = json.loads(content)
            if feature_type in ['lansia_individu', 'lansia_komprehensif', 'lks_lansia']:
                if not isinstance(data, dict) or data.get('type') != 'LansiaCollection' or not isinstance(data.get('lansia'), list):
                    logger.warning(f"{file_path} is invalid, returning default data")
                    return jsonify(default_data), 200, {'Cache-Control': 'no-cache, no-store, must-revalidate'}
                valid_records = [
                    record for record in data['lansia']
                    if isinstance(record, dict) and
                    'nik' in record and
                    isinstance(record['nik'], str) and
                    'koordinat' in record and
                    isinstance(record['koordinat'], list) and
                    len(record['koordinat']) == 2 and
                    all(isinstance(coord, (int, float)) for coord in record['koordinat'])
                ]
                if len(valid_records) < len(data['lansia']):
                    logger.warning(f"Found {len(data['lansia']) - len(valid_records)} invalid records in {file_path}, filtering")
                    data['lansia'] = valid_records
                    with open(file_path, 'w', encoding='utf-8') as f:
                        json.dump(data, f, indent=2, ensure_ascii=False)
                if feature_type in ['lansia_komprehensif', 'lks_lansia']:
                    data['policies'] = [p for p in data.get('policies', []) if isinstance(p, dict) and 'judul' in p and 'deskripsi' in p]
                    data['rehabilitations'] = [r for r in data.get('rehabilitations', []) if isinstance(r, dict) and 'nama' in r and 'layanan' in r]
                    data['monitorings'] = [m for m in data.get('monitorings', []) if isinstance(m, dict) and 'program' in m and 'progres' in m]
                    data['partnerships'] = [p for p in data.get('partnerships', []) if isinstance(p, dict) and 'nama' in p and 'kontak' in p]
                    data['disasters'] = [d for d in data.get('disasters', []) if isinstance(d, dict) and 'kejadian' in d and 'lokasi' in d and 'kebutuhan' in d]
                    data['productives'] = [p for p in data.get('productives', []) if isinstance(p, dict) and 'nama' in p and 'tanggal' in p]
                    data['advocacies'] = [a for a in data.get('advocacies', []) if isinstance(a, dict) and 'nama' in a and 'jadwal' in a]
                    data['hluns'] = [h for h in data.get('hluns', []) if isinstance(h, dict) and 'nama' in h and 'tanggal' in h]
                    data['trainings'] = [t for t in data.get('trainings', []) if isinstance(t, dict) and 'nama' in t and 'tanggal' in t]
                    data['researches'] = [r for r in data.get('researches', []) if isinstance(r, dict) and 'judul' in r and 'ringkasan' in r]
            else:
                if not isinstance(data, dict) or data.get('type') != 'FeatureCollection' or not isinstance(data.get('features'), list):
                    logger.warning(f"{file_path} is invalid, returning default data")
                    return jsonify(default_data), 200, {'Cache-Control': 'no-cache, no-store, must-revalidate'}
                valid_features = [
                    feature for feature in data['features']
                    if isinstance(feature, dict) and
                    feature.get('type') == 'Feature' and
                    'geometry' in feature and
                    isinstance(feature['geometry'], dict) and
                    feature['geometry'].get('type') == 'Point' and
                    'coordinates' in feature['geometry'] and
                    isinstance(feature['geometry']['coordinates'], list) and
                    len(feature['geometry']['coordinates']) == 2 and
                    all(isinstance(coord, (int, float)) for coord in feature['geometry']['coordinates']) and
                    'properties' in feature and
                    isinstance(feature['properties'], dict) and
                    'id' in feature['properties'] and
                    isinstance(feature['properties']['id'], str)
                ]
                if len(valid_features) < len(data['features']):
                    logger.warning(f"Found {len(data['features']) - len(valid_features)} invalid features in {file_path}, filtering")
                    data['features'] = valid_features
                    with open(file_path, 'w', encoding='utf-8') as f:
                        json.dump(data, f, indent=2, ensure_ascii=False)
            logger.info(f"Loaded {feature_type} data from {file_path}: {len(data.get('lansia' if feature_type in ['lansia_individu', 'lansia_komprehensif', 'lks_lansia'] else 'features', []))} valid {'records' if feature_type in ['lansia_individu', 'lansia_komprehensif', 'lks_lansia'] else 'features'}")
            socketio.emit('update_notification', {'message': f'Data {feature_type} dimuat oleh {current_user.username if current_user.is_authenticated else "anonymous"}'})
            return jsonify(data), 200, {'Cache-Control': 'no-cache, no-store, must-revalidate'}
    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error in {file_path}: {str(e)}")
        return jsonify(default_data), 200, {'Cache-Control': 'no-cache, no-store, must-revalidate'}
    except Exception as e:
        logger.error(f"Load {feature_type} error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/<feature_type>/save', methods=['POST'])
@login_required
def save_data(feature_type):
    logger.debug(f"Save attempt for {feature_type} by user: {current_user.username}, role: {current_user.role}, session: {session}")
    if feature_type not in ['bencana', 'fasilitas', 'layanan', 'penerima', 'lansia', 'lansia_individu', 'lansia_komprehensif', 'lks_lansia']:
        logger.error(f"Invalid feature type: {feature_type}")
        return jsonify({'error': 'Invalid feature type'}), 400
    if not current_user.is_authenticated:
        logger.warning(f"Unauthorized save attempt: User not authenticated")
        return jsonify({'error': 'Silakan login terlebih dahulu'}), 401
    if current_user.role != 'admin':
        logger.warning(f"Unauthorized save attempt by {current_user.username} for {feature_type}")
        return jsonify({'error': 'Hanya admin yang dapat menyimpan data langsung'}), 403
    try:
        # Ambil data dari request.json, mendukung format langsung atau bersarang
        raw_data = request.json
        logger.debug(f"Raw data received: {json.dumps(raw_data, indent=2)}")
        data = raw_data.get('data', raw_data) if isinstance(raw_data, dict) else {}
        logger.debug(f"Processed data: {json.dumps(data, indent=2)}")

        if not isinstance(data, dict):
            logger.error(f"Invalid data format for {feature_type}: Data must be a dictionary")
            return jsonify({'error': 'Invalid data format'}), 400

        file_path = {
            'bencana': DATA_BENCANA_FILE,
            'fasilitas': DATA_FASILITAS_FILE,
            'layanan': DATA_LAYANAN_FILE,
            'penerima': DATA_BANSOS_FILE,
            'lansia': DATA_LANSIA_FILE,
            'lansia_individu': DATA_LANSIA_INDIVIDU_FILE,
            'lansia_komprehensif': DATA_LANSIA_KOMPREHENSIF_FILE,
            'lks_lansia': DATA_LKS_LANSIA_FILE
        }.get(feature_type)

        if feature_type in ['lansia_individu', 'lansia_komprehensif', 'lks_lansia']:
            # Inisialisasi data default
            current_data = {
                'type': 'LansiaCollection',
                'lansia': [],
                'policies': [] if feature_type in ['lansia_komprehensif', 'lks_lansia'] else None,
                'rehabilitations': [] if feature_type in ['lansia_komprehensif', 'lks_lansia'] else None,
                'monitorings': [] if feature_type in ['lansia_komprehensif', 'lks_lansia'] else None,
                'partnerships': [] if feature_type in ['lansia_komprehensif', 'lks_lansia'] else None,
                'disasters': [] if feature_type in ['lansia_komprehensif', 'lks_lansia'] else None,
                'productives': [] if feature_type in ['lansia_komprehensif', 'lks_lansia'] else None,
                'advocacies': [] if feature_type in ['lansia_komprehensif', 'lks_lansia'] else None,
                'hluns': [] if feature_type in ['lansia_komprehensif', 'lks_lansia'] else None,
                'trainings': [] if feature_type in ['lansia_komprehensif', 'lks_lansia'] else None,
                'researches': [] if feature_type in ['lansia_komprehensif', 'lks_lansia'] else None
            }
            if os.path.exists(file_path):
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read().strip()
                    if content:
                        try:
                            current_data = json.loads(content)
                            if not isinstance(current_data, dict) or current_data.get('type') != 'LansiaCollection':
                                logger.warning(f"Invalid JSON structure in {file_path}, resetting to default")
                                current_data = {
                                    'type': 'LansiaCollection',
                                    'lansia': [],
                                    'policies': [] if feature_type in ['lansia_komprehensif', 'lks_lansia'] else None,
                                    'rehabilitations': [] if feature_type in ['lansia_komprehensif', 'lks_lansia'] else None,
                                    'monitorings': [] if feature_type in ['lansia_komprehensif', 'lks_lansia'] else None,
                                    'partnerships': [] if feature_type in ['lansia_komprehensif', 'lks_lansia'] else None,
                                    'disasters': [] if feature_type in ['lansia_komprehensif', 'lks_lansia'] else None,
                                    'productives': [] if feature_type in ['lansia_komprehensif', 'lks_lansia'] else None,
                                    'advocacies': [] if feature_type in ['lansia_komprehensif', 'lks_lansia'] else None,
                                    'hluns': [] if feature_type in ['lansia_komprehensif', 'lks_lansia'] else None,
                                    'trainings': [] if feature_type in ['lansia_komprehensif', 'lks_lansia'] else None,
                                    'researches': [] if feature_type in ['lansia_komprehensif', 'lks_lansia'] else None
                                }
                        except json.JSONDecodeError as e:
                            logger.warning(f"Invalid JSON in {file_path}: {str(e)}, using default data")

            # Validasi dan gabungkan data lansia
            new_lansia = data.get('lansia', [])
            valid_lansia = [
                record for record in new_lansia
                if isinstance(record, dict) and
                'nik' in record and isinstance(record['nik'], str) and
                'koordinat' in record and isinstance(record['koordinat'], list) and
                len(record['koordinat']) == 2 and
                all(isinstance(coord, (int, float)) for coord in record['koordinat'])
            ]
            # Gabungkan lansia baru dengan yang sudah ada, hindari duplikasi berdasarkan NIK
            current_niks = {record['nik'] for record in current_data['lansia'] if isinstance(record, dict)}
            current_data['lansia'] = [
                record for record in current_data['lansia']
                if isinstance(record, dict) and record.get('nik') not in {r['nik'] for r in valid_lansia}
            ] + valid_lansia

            # Update kategori lain untuk lansia_komprehensif dan lks_lansia
            if feature_type in ['lansia_komprehensif', 'lks_lansia']:
                for category in ['policies', 'rehabilitations', 'monitorings', 'partnerships', 'disasters', 
                               'productives', 'advocacies', 'hluns', 'trainings', 'researches']:
                    new_items = data.get(category, [])
                    valid_items = [
                        item for item in new_items
                        if isinstance(item, dict) and 'id' in item and isinstance(item['id'], str)
                    ]
                    # Gabungkan item baru dengan yang sudah ada, hindari duplikasi berdasarkan ID
                    current_ids = {item['id'] for item in current_data.get(category, []) if isinstance(item, dict)}
                    current_data[category] = [
                        item for item in current_data.get(category, [])
                        if isinstance(item, dict) and item.get('id') not in {i['id'] for i in valid_items}
                    ] + valid_items

            # Simpan ke file
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(current_data, f, indent=2, ensure_ascii=False)
            logger.info(f"{feature_type} data saved to {file_path} by admin {current_user.username}: {len(current_data['lansia'])} valid records")
            socketio.emit('update_notification', {'message': f'Data {feature_type} diperbarui oleh admin {current_user.username}'})
            return jsonify({'message': f'Data {feature_type} berhasil disimpan'})

        else:
            # Penanganan untuk feature_type lain (non-lansia_komprehensif, non-lansia_individu, non-lks_lansia)
            if not isinstance(data, dict) or 'type' not in data or data['type'] != 'FeatureCollection':
                logger.error(f"Invalid data format for {feature_type}")
                return jsonify({'error': 'Invalid data format'}), 400
            valid_features = [
                feature for feature in data.get('features', [])
                if isinstance(feature, dict) and
                feature.get('type') == 'Feature' and
                'geometry' in feature and
                isinstance(feature['geometry'], dict) and
                feature['geometry'].get('type') == 'Point' and
                'coordinates' in feature['geometry'] and
                isinstance(feature['geometry']['coordinates'], list) and
                len(feature['geometry']['coordinates']) == 2 and
                all(isinstance(coord, (int, float)) for coord in feature['geometry']['coordinates']) and
                'properties' in feature and
                isinstance(feature['properties'], dict) and
                'id' in feature['properties'] and
                isinstance(feature['properties']['id'], str)
            ]
            data['features'] = valid_features
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            logger.info(f"{feature_type} data saved to {file_path} by admin {current_user.username}: {len(data.get('features', []))} valid features")
            socketio.emit('update_notification', {'message': f'Data {feature_type} diperbarui oleh admin {current_user.username}'})
            return jsonify({'message': f'Data {feature_type} berhasil disimpan'})
    except PermissionError as e:
        logger.error(f"Permission error saving {feature_type} to {file_path}: {str(e)}")
        return jsonify({'error': 'Gagal menyimpan data: Izin ditolak untuk file'}), 500
    except Exception as e:
        logger.error(f"Save {feature_type} error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/<feature_type>/delete/<feature_id>', methods=['DELETE'])
@login_required
def delete_data(feature_type, feature_id):
    logger.debug(f"Delete request for {feature_type}/{feature_id} by user: {current_user.username}, role: {current_user.role}, session: {session}")
    if feature_type not in ['bencana', 'fasilitas', 'layanan', 'penerima', 'lansia', 'lansia_individu', 'lansia_komprehensif', 'lks_lansia']:
        logger.error(f"Invalid feature type: {feature_type}")
        return jsonify({'error': 'Invalid feature type'}), 400
    if not current_user.is_authenticated:
        logger.warning(f"Unauthorized delete attempt: User not authenticated")
        return jsonify({'error': 'Silakan login terlebih dahulu'}), 401
    if current_user.role != 'admin':
        logger.warning(f"Unauthorized delete attempt by {current_user.username} for {feature_type}/{feature_id}")
        return jsonify({'error': 'Hanya admin yang dapat menghapus data'}), 403
    try:
        file_path = {
            'bencana': DATA_BENCANA_FILE,
            'fasilitas': DATA_FASILITAS_FILE,
            'layanan': DATA_LAYANAN_FILE,
            'penerima': DATA_BANSOS_FILE,
            'lansia': DATA_LANSIA_FILE,
            'lansia_individu': DATA_LANSIA_INDIVIDU_FILE,
            'lansia_komprehensif': DATA_LANSIA_KOMPREHENSIF_FILE,
            'lks_lansia': DATA_LKS_LANSIA_FILE
        }.get(feature_type)
        with open(file_path, 'r+', encoding='utf-8') as f:
            data = json.load(f)
            logger.debug(f"Data before delete: {json.dumps(data, indent=2)}")
            if feature_type in ['lansia_individu', 'lansia_komprehensif', 'lks_lansia']:
                if not isinstance(data, dict) or 'lansia' not in data:
                    logger.error(f"Invalid data structure in {file_path}")
                    return jsonify({'error': 'Invalid data structure'}), 400
                original_length = len(data['lansia'])
                data['lansia'] = [
                    record for record in data['lansia']
                    if isinstance(record, dict) and str(record.get('nik', '')) != str(feature_id)
                ]
                if len(data['lansia']) == original_length:
                    logger.warning(f"Record {feature_id} not found in {file_path}")
                    return jsonify({'error': 'Data tidak ditemukan'}), 404
            else:
                if not isinstance(data, dict) or 'features' not in data:
                    logger.error(f"Invalid data structure in {file_path}")
                    return jsonify({'error': 'Invalid data structure'}), 400
                original_length = len(data['features'])
                data['features'] = [
                    feature for feature in data['features']
                    if isinstance(feature, dict) and
                    'properties' in feature and
                    str(feature['properties'].get('id', '')) != str(feature_id)
                ]
                if len(data['features']) == original_length:
                    logger.warning(f"Feature {feature_id} not found in {file_path}")
                    return jsonify({'error': 'Data tidak ditemukan'}), 404
            f.seek(0)
            json.dump(data, f, indent=2, ensure_ascii=False)
            f.truncate()
        logger.info(f"Feature {feature_id} deleted from {feature_type} by admin {current_user.username}")
        # Perbaikan untuk akses JSON di SQLite
        if feature_type in ['lansia_individu', 'lansia_komprehensif', 'lks_lansia']:
            submission = db.session.execute(
                db.select(DataSubmission).filter_by(feature_type=feature_type).filter(
                    func.json_extract(DataSubmission.data, '$.nik') == str(feature_id)
                )
            ).scalar_one_or_none()
        else:
            submission = db.session.execute(
                db.select(DataSubmission).filter_by(feature_type=feature_type).filter(
                    func.json_extract(DataSubmission.data, '$.properties.id') == str(feature_id)
                )
            ).scalar_one_or_none()
        if submission:
            db.session.delete(submission)
            db.session.commit()
            logger.info(f"Related submission for feature {feature_id} deleted from DataSubmission")
        socketio.emit('update_notification', {'message': f'Data {feature_type} dengan ID {feature_id} dihapus oleh admin {current_user.username}'})
        return jsonify({'message': f'Data {feature_type} berhasil dihapus'})
    except Exception as e:
        logger.error(f"Delete {feature_type}/{feature_id} error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/submissions', methods=['POST'])
@login_required
def submit_data():
    logger.debug(f"Submission attempt by user: {current_user.username}, role: {current_user.role}, session: {session}")
    if not current_user.is_authenticated:
        logger.warning(f"Unauthorized submission attempt: User not authenticated")
        return jsonify({'error': 'Silakan login terlebih dahulu'}), 401
    if current_user.role != 'public':
        logger.warning(f'Unauthorized submission attempt by {current_user.username}')
        return jsonify({'error': 'Only public users can submit data'}), 403
    try:
        data = request.json['data']
        feature_type = request.json['feature_type']
        if feature_type not in ['bencana', 'fasilitas', 'layanan', 'penerima', 'lansia', 'lansia_individu', 'lansia_komprehensif', 'lks_lansia']:
            logger.error(f"Invalid feature type: {feature_type}")
            return jsonify({'error': 'Invalid feature type'}), 400
        if feature_type in ['lansia_individu', 'lansia_komprehensif', 'lks_lansia']:
            if not isinstance(data, dict) or 'nik' not in data:
                logger.error(f"Invalid submission data format for {feature_type}")
                return jsonify({'error': 'Invalid submission data format'}), 400
        else:
            if not isinstance(data, dict) or data.get('type') != 'Feature' or 'properties' not in data or 'id' not in data['properties']:
                logger.error(f"Invalid submission data format for {feature_type}")
                return jsonify({'error': 'Invalid submission data format'}), 400
        submission = DataSubmission(user_id=current_user.id, data=data, feature_type=feature_type)
        db.session.add(submission)
        db.session.commit()
        logger.info(f'Data submission created by user {current_user.username} for {feature_type}')
        socketio.emit('update_notification', {'message': f'Pengajuan data {feature_type} baru dari {current_user.username}'})
        return jsonify({'status': 'success', 'message': 'Data submitted for review'})
    except Exception as e:
        logger.error(f'Error creating submission: {str(e)}')
        return jsonify({'error': str(e)}), 500

@app.route('/api/submissions', methods=['GET'])
@login_required
def get_submissions():
    logger.debug(f"Fetch submissions by user: {current_user.username}, session: {session}")
    try:
        if current_user.role == 'admin':
            submissions = db.session.execute(db.select(DataSubmission)).scalars().all()
        else:
            submissions = db.session.execute(db.select(DataSubmission).filter_by(user_id=current_user.id)).scalars().all()
        logger.debug(f"Fetched {len(submissions)} submissions for user: {current_user.username}")
        return jsonify([{
            'id': s.id,
            'user_id': s.user_id,
            'username': s.user.username,
            'data': s.data,
            'feature_type': s.feature_type,
            'status': s.status,
            'admin_comment': s.admin_comment,
            'submitted_at': s.submitted_at.isoformat()
        } for s in submissions])
    except Exception as e:
        logger.error(f'Error fetching submissions: {str(e)}')
        return jsonify({'error': str(e)}), 500

@app.route('/api/submissions/delete/<submission_id>', methods=['POST'])
@login_required
def delete_submission(submission_id):
    logger.debug(f"Delete submission attempt for {submission_id} by user: {current_user.username}, role: {current_user.role}, session: {session}")
    if not current_user.is_authenticated:
        logger.warning(f"Unauthorized submission delete attempt: User not authenticated")
        return jsonify({'error': 'Silakan login terlebih dahulu'}), 401
    if current_user.role != 'admin':
        logger.warning(f'Unauthorized submission delete attempt by {current_user.username}')
        return jsonify({'error': 'Hanya admin yang dapat menghapus pengajuan'}), 403
    try:
        submission = db.session.get(DataSubmission, submission_id)
        if not submission:
            logger.error(f"Submission {submission_id} not found")
            return jsonify({'error': 'Pengajuan tidak ditemukan'}), 404
        if submission.status == 'approved':
            file_path = {
                'bencana': DATA_BENCANA_FILE,
                'fasilitas': DATA_FASILITAS_FILE,
                'layanan': DATA_LAYANAN_FILE,
                'penerima': DATA_BANSOS_FILE,
                'lansia': DATA_LANSIA_FILE,
                'lansia_individu': DATA_LANSIA_INDIVIDU_FILE,
                'lansia_komprehensif': DATA_LANSIA_KOMPREHENSIF_FILE,
                'lks_lansia': DATA_LKS_LANSIA_FILE
            }.get(submission.feature_type)
            try:
                with open(file_path, 'r+', encoding='utf-8') as f:
                    data = json.load(f)
                    if submission.feature_type in ['lansia_individu', 'lansia_komprehensif', 'lks_lansia']:
                        data['lansia'] = [
                            record for record in data['lansia']
                            if isinstance(record, dict) and str(record.get('nik', '')) != str(submission.data.get('nik'))
                        ]
                    else:
                        data['features'] = [
                            feature for feature in data['features']
                            if isinstance(feature, dict) and
                            'properties' in feature and
                            str(feature['properties'].get('id', '')) != str(submission.data['properties']['id'])
                        ]
                    f.seek(0)
                    json.dump(data, f, indent=2, ensure_ascii=False)
                    f.truncate()
                logger.info(f'Submission {submission_id} deleted from {submission.feature_type}.json')
                socketio.emit('update_notification', {'message': f'Pengajuan {submission.feature_type} dengan ID {submission_id} dihapus oleh admin {current_user.username}'})
            except Exception as e:
                logger.error(f'Error deleting submission {submission_id} from {file_path}: {str(e)}')
                return jsonify({'error': str(e)}), 500
        db.session.delete(submission)
        db.session.commit()
        logger.info(f'Submission {submission_id} deleted from DataSubmission by admin {current_user.username}')
        return jsonify({'message': 'Pengajuan berhasil dihapus'})
    except Exception as e:
        logger.error(f'Delete submission {submission_id} error: {str(e)}')
        return jsonify({'error': str(e)}), 500

@app.route('/api/upload', methods=['POST'])
@login_required
def upload_file():
    logger.debug(f"Upload attempt by user: {current_user.username}, session: {session}")
    if not current_user.is_authenticated:
        logger.warning(f"Unauthorized upload attempt: User not authenticated")
        return jsonify({'error': 'Silakan login terlebih dahulu'}), 401
    try:
        if 'file' not in request.files:
            logger.error("Upload failed: No file provided")
            return jsonify({'error': 'No file provided'}), 400
        file = request.files['file']
        if file.filename == '':
            logger.error("Upload failed: No file selected")
            return jsonify({'error': 'No file selected'}), 400
        filename = secrets.token_hex(8) + '_' + file.filename
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        file.save(file_path)
        logger.info(f"File uploaded successfully: {filename}")
        socketio.emit('update_notification', {'message': f'File {filename} diunggah oleh {current_user.username}'})
        return jsonify({'filename': filename}), 200
    except Exception as e:
        logger.error(f"Upload error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/laporan/save', methods=['POST'])
@login_required
def save_laporan_data():
    logger.debug(f"Laporan save attempt by user: {current_user.username}, session: {session}")
    if not current_user.is_authenticated:
        logger.warning(f"Unauthorized laporan save attempt: User not authenticated")
        return jsonify({'error': 'Silakan login terlebih dahulu'}), 401
    try:
        data = request.json
        logger.debug(f"Saving laporan data: {json.dumps(data, indent=2)}")
        laporan_data = []
        if os.path.exists(DATA_LAPORAN_FILE):
            with open(DATA_LAPORAN_FILE, 'r', encoding='utf-8') as f:
                content = f.read().strip()
                if content:
                    laporan_data = json.loads(content)
        laporan_data.append(data)
        with open(DATA_LAPORAN_FILE, 'w', encoding='utf-8') as f:
            json.dump(laporan_data, f, indent=2, ensure_ascii=False)
        logger.info(f"Laporan data saved to {DATA_LAPORAN_FILE}")
        socketio.emit('update_notification', {'message': f'Laporan baru disimpan oleh {current_user.username}'})
        return jsonify({'message': 'Laporan berhasil disimpan'})
    except Exception as e:
        logger.error(f"Save laporan error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/posko/save', methods=['POST'])
@login_required
def save_posko_data():
    logger.debug(f"Posko save attempt by user: {current_user.username}, role: {current_user.role}, session: {session}")
    if not current_user.is_authenticated:
        logger.warning(f"Unauthorized posko save attempt: User not authenticated")
        return jsonify({'error': 'Silakan login terlebih dahulu'}), 401
    if current_user.role != 'admin':
        logger.warning(f'Unauthorized posko save attempt by {current_user.username}')
        return jsonify({'error': 'Hanya admin yang dapat menyimpan posko'}), 403
    try:
        data = request.json
        logger.debug(f"Saving posko data: {json.dumps(data, indent=2)}")
        posko_data = []
        if os.path.exists(DATA_POSKO_FILE):
            with open(DATA_POSKO_FILE, 'r', encoding='utf-8') as f:
                content = f.read().strip()
                if content:
                    posko_data = json.loads(content)
        posko_data.append(data)
        with open(DATA_POSKO_FILE, 'w', encoding='utf-8') as f:
            json.dump(posko_data, f, indent=2, ensure_ascii=False)
        logger.info(f"Posko data saved to {DATA_POSKO_FILE}")
        socketio.emit('update_notification', {'message': f'Posko baru disimpan oleh admin {current_user.username}'})
        return jsonify({'message': 'Posko berhasil disimpan'})
    except Exception as e:
        logger.error(f"Save posko error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/pending_submissions', methods=['GET'])
@login_required
def get_pending_submissions_count():
    logger.debug(f"Pending submissions count request by user: {current_user.username if current_user.is_authenticated else 'anonymous'}, role: {current_user.role if current_user.is_authenticated else 'public'}, session: {session}")
    if not current_user.is_authenticated:
        logger.warning(f"Unauthorized pending submissions count request: User not authenticated")
        return jsonify({'count': 0, 'error': 'Silakan login terlebih dahulu'}), 401
    if current_user.role != 'admin':
        logger.warning(f"Unauthorized pending submissions count request by {current_user.username}")
        return jsonify({'count': 0})
    try:
        count = db.session.execute(db.select(db.func.count()).select_from(DataSubmission).filter_by(status='pending')).scalar_one()
        logger.debug(f"Pending submissions count: {count}")
        return jsonify({'count': count})
    except Exception as e:
        logger.error(f'Error fetching pending submissions count: {str(e)}')
        return jsonify({'count': 0, 'error': str(e)}), 500

@app.route('/api/geocode', methods=['POST'])
def geocode():
    logger.debug(f"Geocode request by user: {current_user.username if current_user.is_authenticated else 'anonymous'}, session: {session}")
    try:
        data = request.json
        logger.debug(f"Geocode request data: {json.dumps(data, indent=2)}")
        address = data.get('address')
        if not address:
            logger.error("Geocode failed: No address provided")
            return jsonify({'error': 'No address provided', 'lat': 0, 'lon': 0, 'message': 'Masukkan alamat terlebih dahulu.'}), 400
        lat, lon, error = geocode_address(address)
        if error:
            logger.error(f"Geocode error for address {address}: {error}")
            return jsonify({'error': error, 'lat': 0, 'lon': 0, 'message': 'Alamat tidak ditemukan. Coba gunakan alamat yang lebih umum, periksa ejaan, atau pastikan alamat berada di Indonesia.'}), 400
        logger.info(f"Geocode successful for {address}: lat={lat}, lon={lon}")
        return jsonify({'lat': lat, 'lon': lon, 'message': 'Geocoding successful'})
    except Exception as e:
        logger.error(f"Geocode API error: {str(e)}")
        return jsonify({'error': f"Geocode API error: {str(e)}", 'lat': 0, 'lon': 0}), 500

@app.route('/logout')
def logout():
    username = current_user.username if current_user.is_authenticated else 'anonymous'
    logger.info(f'User {username} logged out')
    logout_user()
    session.clear()
    return redirect(url_for('auth', tab='login'))

if __name__ == '__main__':
    os.makedirs(os.path.join(BASE_DIR, 'logs'), exist_ok=True)
    with app.app_context():
        db.create_all()
        if not db.session.execute(db.select(Region)).scalars().first():
            regions = [Region(name='Jakarta'), Region(name='Bandar Lampung'), Region(name='Bandung')]
            db.session.bulk_save_objects(regions)
            db.session.commit()
            logger.info("Regions initialized: Jakarta, Bandar Lampung, Bandung")
        if not db.session.execute(db.select(User).filter_by(role='admin')).scalars().first():
            admin_accounts = [
                {'username': 'admin01', 'password': 'Y7w$Lp9@Kd3!', 'email': 'admin01@webgis-bansos.com'},
                {'username': 'admin02', 'password': 'Qr6@Vn2#Xc8%', 'email': 'admin02@webgis-bansos.com'},
                {'username': 'admin03', 'password': 'Wm4^Zp7!Rf1&', 'email': 'admin03@webgis-bansos.com'},
                {'username': 'admin04', 'password': 'Gt2&Lx5*Mk9@', 'email': 'admin04@webgis-bansos.com'},
                {'username': 'admin05', 'password': 'Vb3#Nk6!Yq7$', 'email': 'admin05@webgis-bansos.com'},
                {'username': 'admin06', 'password': 'Lp8$Qd3^Ts4!', 'email': 'admin06@webgis-bansos.com'},
                {'username': 'admin07', 'password': 'Xm1^Jv9&Ub2@', 'email': 'admin07@webgis-bansos.com'},
                {'username': 'admin08', 'password': 'Rw5!Zk8@Ln6^', 'email': 'admin08@webgis-bansos.com'},
                {'username': 'admin09', 'password': 'Ns6*Tm3$Qv4&', 'email': 'admin09@webgis-bansos.com'},
                {'username': 'admin10', 'password': 'Kz2&Vp7#Gw1!', 'email': 'admin10@webgis-bansos.com'},
            ]
            accounts_log = []
            for acc in admin_accounts:
                user = User(username=acc['username'], email=acc['email'], role='admin')
                user.set_password(acc['password'])
                db.session.add(user)
                accounts_log.append(acc)
                logger.info(f"Created admin account: {acc['username']}")
            db.session.commit()
            with open(ACCOUNTS_LOG_FILE, 'w', encoding='utf-8') as f:
                f.write("Akun Admin WebGIS Bansos (Dibuat pada: {})\n\n".format(datetime.now().strftime('%Y-%m-%d %H:%M:%S')))
                for acc in accounts_log:
                    f.write(f"Username: {acc['username']}\nEmail: {acc['email']}\nPassword: {acc['password']}\nRole: admin\n\n")
            logger.info("10 akun admin telah dibuat dan disimpan di {}".format(ACCOUNTS_LOG_FILE))
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)
