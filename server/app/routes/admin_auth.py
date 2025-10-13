from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token
from app import db
from app.models.admin import Admin
import traceback

admin_auth_bp = Blueprint('admin_auth', __name__)

@admin_auth_bp.route('/admin/login', methods=['POST'])
def admin_login():
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')

        if not username or not password:
            return jsonify({'error': 'Username and password are required'}), 400

        admin = Admin.query.filter_by(username=username).first()
        if not admin or not admin.check_password(password):
            return jsonify({'error': 'Invalid username or password'}), 401

        access_token = create_access_token(identity=f"admin:{admin.id}")
        return jsonify({
            'message': 'Admin login successful',
            'admin': {
                'id': admin.id,
                'username': admin.username,
                'email': admin.email
            },
            'access_token': access_token
        }), 200
        
    except Exception as e:
        print(f"Admin login error: {e}")
        print(traceback.format_exc())
        return jsonify({'error': 'Internal server error'}), 500 