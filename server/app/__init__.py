from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_mail import Mail
import os
from dotenv import load_dotenv
from urllib.parse import quote_plus

# Load environment variables
load_dotenv()

# Initialize extensions
db = SQLAlchemy()
jwt = JWTManager()
mail = Mail()

def create_app():
    """Application factory pattern"""
    app = Flask(__name__)
    
    # Configuration
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')
    
    # Database configuration - use DATABASE_URL from environment or fallback to local
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        # Local development fallback
        password = quote_plus('Naman@123')
        database_url = f'mysql+pymysql://root:{password}@localhost/community_reporting'
    
    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', os.getenv('SECRET_KEY', 'jwt-secret-key'))
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = False  # For development
    
    # Mail configuration - set defaults if not provided
    app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
    app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT', 587))
    app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS', 'True').lower() == 'true'
    app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME', '')
    app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD', '')
    
    # File upload configuration
    app.config['UPLOAD_FOLDER'] = os.getenv('UPLOAD_FOLDER', 'uploads')
    app.config['MAX_CONTENT_LENGTH'] = int(os.getenv('MAX_CONTENT_LENGTH', 16 * 1024 * 1024))  # 16MB
    
    # Get frontend URL from environment
    FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3000')
    
    # Initialize extensions with CORS
    CORS(app, 
         resources={r"/*": {
             "origins": [FRONTEND_URL, "http://localhost:3000"],
             "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
             "allow_headers": ["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"],
             "expose_headers": ["Content-Type", "Authorization"],
             "supports_credentials": False,
             "max_age": 3600
         }}
    )
    
    db.init_app(app)
    jwt.init_app(app)
    
    # JWT error handlers
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({'error': 'Token has expired'}), 401
    
    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({'error': f'Invalid token: {error}'}), 422
    
    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return jsonify({'error': 'Missing authorization token'}), 401
    
    @jwt.needs_fresh_token_loader
    def token_not_fresh_callback(jwt_header, jwt_payload):
        return jsonify({'error': 'Fresh token required'}), 401
    
    # Only initialize mail if credentials are provided
    if app.config['MAIL_USERNAME'] and app.config['MAIL_PASSWORD']:
        mail.init_app(app)
    else:
        print("Warning: Email credentials not configured. Email notifications will be disabled.")
    
    # Create upload directory if it doesn't exist
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    
    # Register blueprints
    from .routes.auth import auth_bp
    from .routes.issues import issues_bp
    from .routes.comments import comments_bp
    from .routes.analytics import analytics_bp
    from .routes.admin import admin_bp
    from .routes.map import map_bp
    from .routes.admin_auth import admin_auth_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(issues_bp, url_prefix='/api/issues')
    app.register_blueprint(comments_bp, url_prefix='/api/comments')
    app.register_blueprint(analytics_bp, url_prefix='/api/analytics')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(map_bp, url_prefix='/api')
    app.register_blueprint(admin_auth_bp, url_prefix='/api')
    
    # Add OPTIONS handling for all routes
    @app.before_request
    def handle_preflight():
        if request.method == "OPTIONS":
            response = jsonify({'status': 'ok'})
            response.headers.add('Access-Control-Allow-Origin', FRONTEND_URL)
            response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,Accept,Origin,X-Requested-With')
            response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
            response.headers.add('Access-Control-Max-Age', '3600')
            return response
    
    # Favicon route to prevent proxy errors
    @app.route('/favicon.ico')
    def favicon():
        return app.send_static_file('favicon.ico') if os.path.exists(os.path.join(app.static_folder, 'favicon.ico')) else ('', 204)
    
    # Health check endpoint
    @app.route('/health')
    def health_check():
        try:
            # Test database connection
            db.session.execute(db.text('SELECT 1'))
            db_status = 'connected'
        except Exception as e:
            db_status = f'error: {str(e)}'
        
        return jsonify({
            'status': 'ok',
            'database': db_status,
            'environment': os.getenv('FRONTEND_URL', 'not set')
        })
    
    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return {'error': 'Not found'}, 404
    
    @app.errorhandler(500)
    def internal_error(error):
        return {'error': 'Internal server error'}, 500
    
    @app.errorhandler(413)
    def too_large(error):
        return {'error': 'File too large'}, 413
    
    return app 