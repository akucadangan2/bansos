import json
import os
from flask import request, jsonify, flash, redirect, url_for, render_template, current_app
from flask_login import login_required, current_user
from app import logger, DataSubmission, DATA_BENCANA_FILE, DATA_FASILITAS_FILE, DATA_LAYANAN_FILE, DATA_BANSOS_FILE, DATA_LAPORAN_FILE, DATA_POSKO_FILE, UPLOAD_FOLDER, geocode_address
import secrets
# [Perubahan Baru] Tambahkan impor SocketIO untuk notifikasi real-time
from flask_socketio import emit

def register_api_routes(app):
    with app.app_context():
        from app import db, socketio  # [Perubahan Baru] Impor socketio dari app

        # Tambahkan konstanta untuk lansia.json, lansia_individu.json, lansia_komprehensif.json, dan lks_lansia.json
        DATA_LANSIA_FILE = os.path.join(os.path.dirname(__file__), 'data', 'lansia.json')
        DATA_LANSIA_INDIVIDU_FILE = os.path.join(os.path.dirname(__file__), 'data', 'lansia_individu.json')
        # [Perubahan Baru] Tambahkan konstanta untuk lansia_komprehensif.json
        DATA_LANSIA_KOMPREHENSIF_FILE = os.path.join(os.path.dirname(__file__), 'data', 'lansia_komprehensif.json')
        # [Penambahan Baru] Tambahkan konstanta untuk lks_lansia.json
        DATA_LKS_LANSIA_FILE = os.path.join(os.path.dirname(__file__), 'data', 'lks_lansia.json')

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
                # [Perubahan Baru] Tambahkan lansia_komprehensif ke file_path
                'lansia_komprehensif': DATA_LANSIA_KOMPREHENSIF_FILE,
                # [Penambahan Baru] Tambahkan lks_lansia ke file_path
                'lks_lansia': DATA_LKS_LANSIA_FILE
            }.get(feature_type)
            default_data = {
                'type': 'FeatureCollection' if feature_type not in ['lansia_individu', 'lansia_komprehensif', 'lks_lansia'] else 'LansiaCollection',
                'features' if feature_type not in ['lansia_individu', 'lansia_komprehensif', 'lks_lansia'] else 'lansia': [],
                # [Perubahan Baru] Tambahkan struktur default untuk lansia_komprehensif
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
                if os.path.exists(file_path):
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
                            # [Perubahan Baru] Validasi tambahan untuk lansia_komprehensif dan lks_lansia
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
                        # [Perubahan Baru] Emit notifikasi WebSocket saat data dimuat
                        socketio.emit('update_notification', {'message': f'Data {feature_type} dimuat oleh {current_user.username if current_user.is_authenticated else "anonymous"}'})
                        return jsonify(data), 200, {'Cache-Control': 'no-cache, no-store, must-revalidate'}
                else:
                    logger.info(f"{file_path} not found, returning default data")
                    return jsonify(default_data), 200, {'Cache-Control': 'no-cache, no-store, must-revalidate'}
            except json.JSONDecodeError as e:
                logger.error(f"JSON decode error in {file_path}: {str(e)}")
                return jsonify(default_data), 200, {'Cache-Control': 'no-cache, no-store, must-revalidate'}
            except Exception as e:
                logger.error(f"Load {feature_type} error: {str(e)}")
                return jsonify({'error': str(e)}), 500

        @app.route('/api/<feature_type>/save', methods=['POST'])
        @login_required
        def save_data(feature_type):
            if feature_type not in ['bencana', 'fasilitas', 'layanan', 'penerima', 'lansia', 'lansia_individu', 'lansia_komprehensif', 'lks_lansia']:
                logger.error(f"Invalid feature type: {feature_type}")
                return jsonify({'error': 'Invalid feature type'}), 400
            if current_user.role != 'admin':
                logger.warning(f"Unauthorized save attempt by {current_user.username} for {feature_type}")
                return jsonify({'error': 'Hanya admin yang dapat menyimpan data langsung'}), 403
            try:
                data = request.json
                if not isinstance(data, dict) or 'type' not in data or data['type'] != ('LansiaCollection' if feature_type in ['lansia_individu', 'lansia_komprehensif', 'lks_lansia'] else 'FeatureCollection'):
                    logger.error(f"Invalid data format for {feature_type}")
                    return jsonify({'error': 'Invalid data format'}), 400
                file_path = {
                    'bencana': DATA_BENCANA_FILE,
                    'fasilitas': DATA_FASILITAS_FILE,
                    'layanan': DATA_LAYANAN_FILE,
                    'penerima': DATA_BANSOS_FILE,
                    'lansia': DATA_LANSIA_FILE,
                    'lansia_individu': DATA_LANSIA_INDIVIDU_FILE,
                    # [Perubahan Baru] Tambahkan lansia_komprehensif ke file_path
                    'lansia_komprehensif': DATA_LANSIA_KOMPREHENSIF_FILE,
                    # [Penambahan Baru] Tambahkan lks_lansia ke file_path
                    'lks_lansia': DATA_LKS_LANSIA_FILE
                }.get(feature_type)
                if feature_type in ['lansia_individu', 'lansia_komprehensif', 'lks_lansia']:
                    valid_records = [
                        record for record in data.get('lansia', [])
                        if isinstance(record, dict) and
                        'nik' in record and
                        isinstance(record['nik'], str) and
                        'koordinat' in record and
                        isinstance(record['koordinat'], list) and
                        len(record['koordinat']) == 2 and
                        all(isinstance(coord, (int, float)) for coord in record['koordinat'])
                    ]
                    data['lansia'] = valid_records
                    # [Perubahan Baru] Validasi tambahan untuk lansia_komprehensif dan lks_lansia
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
                logger.info(f"{feature_type} data saved to {file_path} by admin {current_user.username}: {len(data.get('lansia' if feature_type in ['lansia_individu', 'lansia_komprehensif', 'lks_lansia'] else 'features', []))} valid {'records' if feature_type in ['lansia_individu', 'lansia_komprehensif', 'lks_lansia'] else 'features'}")
                # [Perubahan Baru] Emit notifikasi WebSocket setelah data disimpan
                socketio.emit('update_notification', {'message': f'Data {feature_type} diperbarui oleh admin {current_user.username}'})
                return jsonify({'message': f'Data {feature_type} berhasil disimpan'})
            except Exception as e:
                logger.error(f"Save {feature_type} error: {str(e)}")
                return jsonify({'error': str(e)}), 500

        @app.route('/api/<feature_type>/delete/<feature_id>', methods=['DELETE'])
        @login_required
        def delete_data(feature_type, feature_id):
            logger.debug(f"Delete request for {feature_type}/{feature_id} by user: {current_user.username}, role: {current_user.role}, is_authenticated: {current_user.is_authenticated}")
            if feature_type not in ['bencana', 'fasilitas', 'layanan', 'penerima', 'lansia', 'lansia_individu', 'lansia_komprehensif', 'lks_lansia']:
                logger.error(f"Invalid feature type: {feature_type}")
                return jsonify({'error': 'Invalid feature type'}), 400
            if not current_user.is_authenticated or current_user.role != 'admin':
                logger.warning(f"Unauthorized delete attempt by {current_user.username if current_user.is_authenticated else 'anonymous'} for {feature_type}/{feature_id}")
                return jsonify({'error': 'Hanya admin yang dapat menghapus data'}), 403
            try:
                file_path = {
                    'bencana': DATA_BENCANA_FILE,
                    'fasilitas': DATA_FASILITAS_FILE,
                    'layanan': DATA_LAYANAN_FILE,
                    'penerima': DATA_BANSOS_FILE,
                    'lansia': DATA_LANSIA_FILE,
                    'lansia_individu': DATA_LANSIA_INDIVIDU_FILE,
                    # [Perubahan Baru] Tambahkan lansia_komprehensif ke file_path
                    'lansia_komprehensif': DATA_LANSIA_KOMPREHENSIF_FILE,
                    # [Penambahan Baru] Tambahkan lks_lansia ke file_path
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
                            isinstance(feature['properties'], dict) and
                            str(feature['properties'].get('id', '')) != str(feature_id)
                        ]
                        if len(data['features']) == original_length:
                            logger.warning(f"Feature {feature_id} not found in {file_path}")
                            return jsonify({'error': 'Data tidak ditemukan'}), 404
                    f.seek(0)
                    json.dump(data, f, indent=2, ensure_ascii=False)
                    f.truncate()
                logger.info(f"Feature {feature_id} deleted from {feature_type} by admin {current_user.username}")
                submission = db.session.execute(
                    db.select(DataSubmission).filter_by(feature_type=feature_type).filter(
                        DataSubmission.data['nik'].astext == str(feature_id) if feature_type in ['lansia_individu', 'lansia_komprehensif', 'lks_lansia']
                        else DataSubmission.data['properties']['id'].astext == str(feature_id)
                    )
                ).scalar_one_or_none()
                if submission:
                    db.session.delete(submission)
                    db.session.commit()
                    logger.info(f"Related submission for feature {feature_id} deleted from DataSubmission")
                # [Perubahan Baru] Emit notifikasi WebSocket setelah data dihapus
                socketio.emit('update_notification', {'message': f'Data {feature_type} dengan ID {feature_id} dihapus oleh admin {current_user.username}'})
                return jsonify({'message': f'Data {feature_type} berhasil dihapus'})
            except Exception as e:
                logger.error(f"Delete {feature_type}/{feature_id} error: {str(e)}")
                return jsonify({'error': str(e)}), 500

        @app.route('/api/submissions', methods=['POST'])
        @login_required
        def submit_data():
            logger.debug(f"Submission attempt by user: {current_user.username}, role: {current_user.role}")
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
                # [Perubahan Baru] Emit notifikasi WebSocket setelah pengajuan data
                socketio.emit('update_notification', {'message': f'Pengajuan data {feature_type} baru dari {current_user.username}'})
                return jsonify({'status': 'success', 'message': 'Data submitted for review'})
            except Exception as e:
                logger.error(f'Error creating submission: {str(e)}')
                return jsonify({'error': str(e)}), 500

        @app.route('/api/submissions', methods=['GET'])
        @login_required
        def get_submissions():
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
            logger.debug(f"Delete submission attempt for {submission_id} by user: {current_user.username}, role: {current_user.role}")
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
                        # [Perubahan Baru] Tambahkan lansia_komprehensif ke file_path
                        'lansia_komprehensif': DATA_LANSIA_KOMPREHENSIF_FILE,
                        # [Penambahan Baru] Tambahkan lks_lansia ke file_path
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
                        # [Perubahan Baru] Emit notifikasi WebSocket setelah pengajuan dihapus
                        socketio.emit('update_notification', {'message': f'Pengajuan {submission.feature_type} dengan ID {submission_id} dihapus oleh admin {current_user.username}'})
                    except Exception as e:
                        logger.error(f'Error deleting submission {submission_id} from {file_path}: {str(e)}')
                        return jsonify({'error': str(e)}), 500
                db.session.delete(submission)
                db.session.commit()
                logger.info(f'Submission {submission_id} deleted from DataSubmission by admin {current_user.username}')
                # [Perubahan Baru] Emit notifikasi WebSocket setelah pengajuan dihapus dari database
                socketio.emit('update_notification', {'message': f'Pengajuan {submission_id} dihapus dari DataSubmission oleh admin {current_user.username}'})
                return jsonify({'message': 'Pengajuan berhasil dihapus'})
            except Exception as e:
                logger.error(f'Delete submission {submission_id} error: {str(e)}')
                return jsonify({'error': str(e)}), 500

        @app.route('/api/upload', methods=['POST'])
        @login_required
        def upload_file():
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
                # [Perubahan Baru] Emit notifikasi WebSocket setelah file diunggah
                socketio.emit('update_notification', {'message': f'File {filename} diunggah oleh {current_user.username}'})
                return jsonify({'filename': filename}), 200
            except Exception as e:
                logger.error(f"Upload error: {str(e)}")
                return jsonify({'error': str(e)}), 500

        @app.route('/api/laporan/save', methods=['POST'])
        @login_required
        def save_laporan_data():
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
                # [Perubahan Baru] Emit notifikasi WebSocket setelah laporan disimpan
                socketio.emit('update_notification', {'message': f'Laporan baru disimpan oleh {current_user.username}'})
                return jsonify({'message': 'Laporan berhasil disimpan'})
            except Exception as e:
                logger.error(f"Save laporan error: {str(e)}")
                return jsonify({'error': str(e)}), 500

        @app.route('/api/posko/save', methods=['POST'])
        @login_required
        def save_posko_data():
            logger.debug(f"Posko save attempt by user: {current_user.username}, role: {current_user.role}")
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
                # [Perubahan Baru] Emit notifikasi WebSocket setelah posko disimpan
                socketio.emit('update_notification', {'message': f'Posko baru disimpan oleh admin {current_user.username}'})
                return jsonify({'message': 'Posko berhasil disimpan'})
            except Exception as e:
                logger.error(f"Save posko error: {str(e)}")
                return jsonify({'error': str(e)}), 500

        @app.route('/api/pengajuan', methods=['GET', 'POST'])
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
                            # [Perubahan Baru] Tambahkan lansia_komprehensif ke file_path
                            'lansia_komprehensif': DATA_LANSIA_KOMPREHENSIF_FILE,
                            # [Penambahan Baru] Tambahkan lks_lansia ke file_path
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
                            # [Perubahan Baru] Emit notifikasi WebSocket setelah pengajuan disetujui
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
                        # [Perubahan Baru] Emit notifikasi WebSocket setelah pengajuan ditolak
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
                                # [Perubahan Baru] Tambahkan lansia_komprehensif ke file_path
                                'lansia_komprehensif': DATA_LANSIA_KOMPREHENSIF_FILE,
                                # [Penambahan Baru] Tambahkan lks_lansia ke file_path
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
                                # [Perubahan Baru] Emit notifikasi WebSocket setelah pengajuan dihapus dari file
                                socketio.emit('update_notification', {'message': f'Pengajuan {submission.feature_type} dihapus dari {submission.feature_type}.json oleh admin {current_user.username}'})
                            except Exception as e:
                                logger.error(f'Error deleting submission {submission_id} from {file_path}: {str(e)}')
                                flash(f'Gagal menghapus data dari {submission.feature_type}.json: {str(e)}')
                                return redirect(url_for('pengajuan'))
                        db.session.delete(submission)
                        logger.info(f'Submission {submission_id} deleted from DataSubmission by admin {current_user.username}')
                        # [Perubahan Baru] Emit notifikasi WebSocket setelah pengajuan dihapus dari database
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

        @app.route('/api/pending_submissions', methods=['GET'])
        def get_pending_submissions_count():
            logger.debug(f"Pending submissions count request by user: {current_user.username if current_user.is_authenticated else 'anonymous'}, role: {current_user.role if current_user.is_authenticated else 'public'}")
            if not current_user.is_authenticated or current_user.role != 'admin':
                logger.warning(f"Unauthorized pending submissions count request by {current_user.username if current_user.is_authenticated else 'anonymous'}")
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
            try:
                data = request.json
                address = data.get('address')
                if not address:
                    logger.error("Geocode failed: No address provided")
                    return jsonify({'error': 'No address provided'}), 400
                lat, lon, error = geocode_address(address)
                if error:
                    logger.error(f"Geocode error: {error}")
                    return jsonify({'error': error}), 400
                logger.info(f"Geocode successful for {address}: {lat}, {lon}")
                # [Perubahan Baru] Emit notifikasi WebSocket saat geokoding berhasil
                socketio.emit('update_notification', {'message': f'Geokoding alamat {address} berhasil oleh {current_user.username if current_user.is_authenticated else "anonymous"}'})
                return jsonify({'lat': lat, 'lon': lon})
            except Exception as e:
                logger.error(f"Geocode API error: {str(e)}")
                return jsonify({'error': str(e)}), 500