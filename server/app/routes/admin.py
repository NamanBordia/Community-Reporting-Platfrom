from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.user import User
from app.models.issue import Issue, Comment
from app.services.email_service import send_admin_notification
from sqlalchemy import func
from datetime import datetime, timedelta

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/', methods=['GET'])
def admin_info():
    """Admin API info endpoint"""
    return jsonify({
        'message': 'Admin API',
        'version': '1.0',
        'endpoints': {
            'users': '/api/admin/users',
            'pending_issues': '/api/admin/issues/pending',
            'dashboard_stats': '/api/admin/dashboard/stats',
            'bulk_update': '/api/admin/issues/bulk-update',
            'assign_issue': '/api/admin/issues/<id>/assign',
            'generate_report': '/api/admin/reports/generate'
        }
    }), 200

def admin_required(f):
    """Decorator to check if user is admin"""
    def decorated_function(*args, **kwargs):
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user or not user.is_admin():
            return jsonify({'error': 'Admin access required'}), 403
        
        return f(*args, **kwargs)
    
    decorated_function.__name__ = f.__name__
    return decorated_function

@admin_bp.route('/users', methods=['GET'])
@jwt_required()
@admin_required
def get_users():
    """Get all users with pagination"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        role = request.args.get('role')
        search = request.args.get('search')
        
        # Build query
        query = User.query
        
        if role:
            query = query.filter(User.role == role)
        
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                db.or_(
                    User.first_name.ilike(search_term),
                    User.last_name.ilike(search_term),
                    User.email.ilike(search_term)
                )
            )
        
        # Order by creation date
        query = query.order_by(User.created_at.desc())
        
        # Paginate results
        pagination = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        users = [user.to_dict() for user in pagination.items]
        
        return jsonify({
            'users': users,
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
        return jsonify({'error': 'Failed to fetch users'}), 500

@admin_bp.route('/users/<int:user_id>', methods=['GET'])
@jwt_required()
@admin_required
def get_user(user_id):
    """Get specific user details"""
    try:
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Get user statistics
        issue_count = Issue.query.filter_by(reporter_id=user_id).count()
        comment_count = Comment.query.filter_by(author_id=user_id).count()
        
        user_data = user.to_dict()
        user_data.update({
            'issue_count': issue_count,
            'comment_count': comment_count
        })
        
        return jsonify({
            'user': user_data
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Failed to fetch user'}), 500

@admin_bp.route('/users/<int:user_id>', methods=['PUT'])
@jwt_required()
@admin_required
def update_user(user_id):
    """Update user (admin only)"""
    try:
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.get_json()
        
        # Update allowed fields
        if data.get('first_name'):
            user.first_name = data['first_name'].strip()
        
        if data.get('last_name'):
            user.last_name = data['last_name'].strip()
        
        if data.get('role'):
            user.role = data['role']
        
        if data.get('is_active') is not None:
            user.is_active = data['is_active']
        
        db.session.commit()
        
        return jsonify({
            'message': 'User updated successfully',
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to update user'}), 500

@admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def delete_user(user_id):
    """Delete user (admin only)"""
    try:
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Check if user has admin role
        if user.role == 'admin':
            return jsonify({'error': 'Cannot delete admin user'}), 400
        
        # Delete user's issues and comments (cascade)
        db.session.delete(user)
        db.session.commit()
        
        return jsonify({
            'message': 'User deleted successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to delete user'}), 500

@admin_bp.route('/issues/pending', methods=['GET'])
@jwt_required()
@admin_required
def get_pending_issues():
    """Get pending issues that need admin attention"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        
        # Get issues that are submitted or verified
        query = Issue.query.filter(
            Issue.status.in_(['submitted', 'verified'])
        ).order_by(Issue.created_at.asc())
        
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
        return jsonify({'error': 'Failed to fetch pending issues'}), 500

@admin_bp.route('/issues/bulk-update', methods=['POST'])
@jwt_required()
@admin_required
def bulk_update_issues():
    """Bulk update multiple issues"""
    try:
        data = request.get_json()
        
        if not data.get('issue_ids') or not data.get('updates'):
            return jsonify({'error': 'Issue IDs and updates are required'}), 400
        
        issue_ids = data['issue_ids']
        updates = data['updates']
        
        # Validate updates
        allowed_fields = ['status', 'priority', 'assigned_to']
        for field in updates.keys():
            if field not in allowed_fields:
                return jsonify({'error': f'Invalid field: {field}'}), 400
        
        # Update issues
        updated_count = 0
        for issue_id in issue_ids:
            issue = Issue.query.get(issue_id)
            if issue:
                for field, value in updates.items():
                    setattr(issue, field, value)
                updated_count += 1
        
        db.session.commit()
        
        return jsonify({
            'message': f'Successfully updated {updated_count} issues',
            'updated_count': updated_count
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to bulk update issues'}), 500

@admin_bp.route('/issues/<int:issue_id>/assign', methods=['POST'])
@jwt_required()
@admin_required
def assign_issue(issue_id):
    """Assign issue to department or person"""
    try:
        issue = Issue.query.get(issue_id)
        
        if not issue:
            return jsonify({'error': 'Issue not found'}), 404
        
        data = request.get_json()
        
        if not data.get('assigned_to'):
            return jsonify({'error': 'Assignment target is required'}), 400
        
        issue.assigned_to = data['assigned_to']
        
        if data.get('status'):
            issue.update_status(data['status'], data['assigned_to'])
        
        if data.get('estimated_resolution_date'):
            issue.estimated_resolution_date = datetime.strptime(
                data['estimated_resolution_date'], '%Y-%m-%d'
            ).date()
        
        db.session.commit()
        
        # Send notification
        try:
            send_admin_notification(issue, 'assigned')
        except Exception as e:
            print(f"Failed to send assignment notification: {e}")
        
        return jsonify({
            'message': 'Issue assigned successfully',
            'issue': issue.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to assign issue'}), 500

@admin_bp.route('/dashboard/stats', methods=['GET'])
@jwt_required()
@admin_required
def get_admin_dashboard_stats():
    """Get admin dashboard statistics"""
    try:
        # Today's stats
        today = datetime.utcnow().date()
        today_start = datetime.combine(today, datetime.min.time())
        today_end = datetime.combine(today, datetime.max.time())
        
        new_issues_today = Issue.query.filter(
            Issue.created_at.between(today_start, today_end)
        ).count()
        
        resolved_today = Issue.query.filter(
            and_(
                Issue.status == 'resolved',
                Issue.actual_resolution_date == today
            )
        ).count()
        
        new_users_today = User.query.filter(
            and_(
                User.role == 'resident',
                User.created_at.between(today_start, today_end)
            )
        ).count()
        
        # Pending issues by priority
        urgent_pending = Issue.query.filter(
            and_(
                Issue.status.in_(['submitted', 'verified']),
                Issue.priority == 'urgent'
            )
        ).count()
        
        high_pending = Issue.query.filter(
            and_(
                Issue.status.in_(['submitted', 'verified']),
                Issue.priority == 'high'
            )
        ).count()
        
        return jsonify({
            'today_stats': {
                'new_issues': new_issues_today,
                'resolved_issues': resolved_today,
                'new_users': new_users_today
            },
            'pending_by_priority': {
                'urgent': urgent_pending,
                'high': high_pending
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Failed to fetch dashboard stats'}), 500

@admin_bp.route('/reports/generate', methods=['POST'])
@jwt_required()
@admin_required
def generate_report():
    """Generate custom reports"""
    try:
        data = request.get_json()
        
        report_type = data.get('type')
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        
        if not report_type:
            return jsonify({'error': 'Report type is required'}), 400
        
        # Parse dates
        if start_date:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
        if end_date:
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
        
        if report_type == 'issue_summary':
            # Generate issue summary report
            query = Issue.query
            
            if start_date:
                query = query.filter(Issue.created_at >= datetime.combine(start_date, datetime.min.time()))
            if end_date:
                query = query.filter(Issue.created_at <= datetime.combine(end_date, datetime.max.time()))
            
            issues = query.all()
            
            report_data = {
                'total_issues': len(issues),
                'by_status': {},
                'by_type': {},
                'by_priority': {}
            }
            
            for issue in issues:
                # Status breakdown
                status = issue.status
                report_data['by_status'][status] = report_data['by_status'].get(status, 0) + 1
                
                # Type breakdown
                issue_type = issue.issue_type
                report_data['by_type'][issue_type] = report_data['by_type'].get(issue_type, 0) + 1
                
                # Priority breakdown
                priority = issue.priority
                report_data['by_priority'][priority] = report_data['by_priority'].get(priority, 0) + 1
            
            return jsonify({
                'report_type': report_type,
                'date_range': {
                    'start_date': start_date.isoformat() if start_date else None,
                    'end_date': end_date.isoformat() if end_date else None
                },
                'data': report_data
            }), 200
        
        else:
            return jsonify({'error': 'Invalid report type'}), 400
        
    except Exception as e:
        return jsonify({'error': 'Failed to generate report'}), 500 