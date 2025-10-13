from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.user import User
from app.models.admin import Admin
from app.models.issue import Issue, Comment, Upvote
from app.services.email_service import send_issue_status_update
from app.utils.file_upload import save_image
from app.utils.cloudinary_upload import upload_image_to_cloudinary
from app.utils.validators import validate_issue_data
from datetime import datetime
import os

issues_bp = Blueprint('issues', __name__)

def admin_required(f):
    """Decorator to check if user is admin"""
    def decorated_function(*args, **kwargs):
        identity = get_jwt_identity()
        
        # Check if it's an admin token (format: "admin:id")
        if isinstance(identity, str) and identity.startswith('admin:'):
            admin_id = identity.split(':')[1]
            admin = Admin.query.get(admin_id)
            if admin:
                return f(*args, **kwargs)
        
        # Check if it's a regular user with admin role
        try:
            user_id = int(identity)
            user = User.query.get(user_id)
            if user and user.role == 'admin':
                return f(*args, **kwargs)
        except (ValueError, TypeError):
            pass
        
        return jsonify({'error': 'Admin access required'}), 403
    
    decorated_function.__name__ = f.__name__
    return decorated_function

@issues_bp.route('/', methods=['GET', 'OPTIONS'])
def get_issues():
    """Get all issues with optional filtering"""
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        issue_type = request.args.get('issue_type')
        status = request.args.get('status')
        priority = request.args.get('priority')
        user_id = request.args.get('user_id', type=int)
        
        # Build query
        query = Issue.query
        
        if issue_type:
            query = query.filter(Issue.issue_type == issue_type)
        if status:
            query = query.filter(Issue.status == status)
        if priority:
            query = query.filter(Issue.priority == priority)
        if user_id:
            query = query.filter(Issue.reporter_id == user_id)
        
        # Order by creation date (newest first)
        query = query.order_by(Issue.created_at.desc())
        
        # Paginate results
        pagination = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        issues = [issue.to_dict() for issue in pagination.items]
        
        return jsonify({
            'issues': issues,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': pagination.total,
                'pages': pagination.pages,
                'has_next': pagination.has_next,
                'has_prev': pagination.has_prev
            }
        }), 200
        
    except Exception as e:
        print(f"ERROR in get_issues: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'error': 'Failed to fetch issues',
            'details': str(e)
        }), 500

@issues_bp.route('/', methods=['POST', 'OPTIONS'])
@jwt_required()
def create_issue():
    """Create a new issue"""
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        user_id = int(get_jwt_identity())
        print(f"Debug: user_id from JWT: {user_id} (type: {type(user_id)})")
        
        user = User.query.get(user_id)
        print(f"Debug: user found: {user is not None}")
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Handle form data with file upload
        if request.content_type and 'multipart/form-data' in request.content_type:
            data = request.form.to_dict()
            image_file = request.files.get('image')
        else:
            data = request.get_json()
            image_file = None
        
        print(f"Debug: received data: {data}")
        
        # Validate required fields
        required_fields = ['title', 'description', 'issue_type', 'latitude', 'longitude']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Validate issue data
        validation_error = validate_issue_data(data)
        if validation_error:
            return jsonify({'error': validation_error}), 400
        
        # Save image if provided
        image_url = None
        if image_file:
            try:
                # Try Cloudinary first, fallback to local storage
                cloudinary_enabled = os.getenv('CLOUDINARY_CLOUD_NAME') and \
                                   os.getenv('CLOUDINARY_API_KEY') and \
                                   os.getenv('CLOUDINARY_API_SECRET')
                
                if cloudinary_enabled:
                    image_url = upload_image_to_cloudinary(image_file)
                    print(f"✓ Image uploaded to Cloudinary: {image_url}")
                else:
                    image_url = save_image(image_file, current_app.config['UPLOAD_FOLDER'])
                    print(f"⚠️  Image saved locally (Cloudinary not configured): {image_url}")
            except Exception as e:
                print(f"Image upload error: {str(e)}")
                return jsonify({'error': f'Failed to upload image: {str(e)}'}), 400
        
        # Create issue
        issue = Issue(
            title=data['title'].strip(),
            description=data['description'].strip(),
            issue_type=data['issue_type'],
            latitude=float(data['latitude']),
            longitude=float(data['longitude']),
            reporter_id=user_id,
            address=data.get('address', '').strip(),
            image_url=image_url,
            priority=data.get('priority', 'medium')
        )
        
        db.session.add(issue)
        db.session.commit()
        
        # Send notification email to admins (optional)
        try:
            # This could be implemented to notify admins of new issues
            pass
        except Exception as e:
            print(f"Failed to send admin notification: {e}")
        
        return jsonify({
            'message': 'Issue created successfully',
            'issue': issue.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Debug: Exception in create_issue: {e}")
        return jsonify({'error': 'Failed to create issue'}), 500

@issues_bp.route('/<int:issue_id>', methods=['GET', 'OPTIONS'])
def get_issue(issue_id):
    """Get a specific issue by ID"""
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        issue = Issue.query.get(issue_id)
        
        if not issue:
            return jsonify({'error': 'Issue not found'}), 404
        
        return jsonify({
            'issue': issue.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Failed to fetch issue'}), 500

@issues_bp.route('/<int:issue_id>', methods=['PUT', 'OPTIONS'])
@jwt_required()
@admin_required
def update_issue(issue_id):
    """Update an issue (admin only)"""
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        identity = get_jwt_identity()
        issue = Issue.query.get(issue_id)
        
        if not issue:
            return jsonify({'error': 'Issue not found'}), 404
        
        data = request.get_json()
        
        # Update allowed fields
        if data.get('title'):
            issue.title = data['title'].strip()
        
        if data.get('description'):
            issue.description = data['description'].strip()
        
        if data.get('issue_type'):
            issue.issue_type = data['issue_type']
        
        if data.get('priority'):
            issue.priority = data['priority']
        
        if data.get('address'):
            issue.address = data['address'].strip()
        
        # Update status (admin only)
        if data.get('status'):
            old_status = issue.status
            issue.status = data['status']
            
            # Set resolution date if status is resolved
            if data['status'] == 'resolved' and not issue.actual_resolution_date:
                issue.actual_resolution_date = datetime.utcnow().date()
            
            # Send email notification for status change
            if old_status != data['status']:
                try:
                    send_issue_status_update(issue)
                except Exception as e:
                    print(f"Failed to send status update email: {e}")
        
        # Update assignment
        if data.get('assigned_to'):
            issue.assigned_to = data['assigned_to']
        
        db.session.commit()
        
        return jsonify({
            'message': 'Issue updated successfully',
            'issue': issue.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error updating issue: {e}")
        return jsonify({'error': 'Failed to update issue'}), 500

@issues_bp.route('/<int:issue_id>', methods=['DELETE'])
@jwt_required()
def delete_issue(issue_id):
    """Delete an issue (admin only or issue owner)"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        issue = Issue.query.get(issue_id)
        
        if not issue:
            return jsonify({'error': 'Issue not found'}), 404
        
        # Check permissions
        if not user.is_admin() and issue.reporter_id != user_id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Delete associated image file
        if issue.image_url:
            try:
                image_path = os.path.join(current_app.config['UPLOAD_FOLDER'], issue.image_url)
                if os.path.exists(image_path):
                    os.remove(image_path)
            except Exception as e:
                print(f"Failed to delete image file: {e}")
        
        db.session.delete(issue)
        db.session.commit()
        
        return jsonify({
            'message': 'Issue deleted successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to delete issue'}), 500

@issues_bp.route('/<int:issue_id>/upvote', methods=['POST'])
@jwt_required()
def upvote_issue(issue_id):
    """Upvote an issue"""
    try:
        user_id = int(get_jwt_identity())
        issue = Issue.query.get(issue_id)
        
        if not issue:
            return jsonify({'error': 'Issue not found'}), 404
        
        # Check if user already upvoted
        existing_upvote = Upvote.query.filter_by(
            issue_id=issue_id, 
            user_id=user_id
        ).first()
        
        if existing_upvote:
            return jsonify({'error': 'Already upvoted this issue'}), 400
        
        # Create upvote
        upvote = Upvote(issue_id=issue_id, user_id=user_id)
        db.session.add(upvote)
        db.session.commit()
        
        return jsonify({
            'message': 'Issue upvoted successfully',
            'upvote_count': len(issue.upvotes)
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to upvote issue'}), 500

@issues_bp.route('/<int:issue_id>/upvote', methods=['DELETE'])
@jwt_required()
def remove_upvote(issue_id):
    """Remove upvote from an issue"""
    try:
        user_id = int(get_jwt_identity())
        
        upvote = Upvote.query.filter_by(
            issue_id=issue_id, 
            user_id=user_id
        ).first()
        
        if not upvote:
            return jsonify({'error': 'Upvote not found'}), 404
        
        db.session.delete(upvote)
        db.session.commit()
        
        return jsonify({
            'message': 'Upvote removed successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to remove upvote'}), 500

@issues_bp.route('/types', methods=['GET'])
def get_issue_types():
    """Get available issue types"""
    issue_types = [
        'pothole',
        'streetlight',
        'garbage',
        'traffic_signal',
        'sidewalk',
        'drainage',
        'tree_maintenance',
        'street_sign',
        'graffiti',
        'noise_complaint',
        'other'
    ]
    
    return jsonify({
        'issue_types': issue_types
    }), 200

@issues_bp.route('/statuses', methods=['GET'])
def get_issue_statuses():
    """Get available issue statuses"""
    statuses = [
        'submitted',
        'verified',
        'in_progress',
        'resolved',
        'closed'
    ]
    
    return jsonify({
        'statuses': statuses
    }), 200 