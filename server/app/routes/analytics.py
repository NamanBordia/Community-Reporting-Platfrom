from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.user import User
from app.models.admin import Admin
from app.models.issue import Issue, Comment, Upvote
from sqlalchemy import func, and_
from datetime import datetime, timedelta
import calendar

analytics_bp = Blueprint('analytics', __name__)

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

@analytics_bp.route('/overview', methods=['GET'])
@jwt_required()
@admin_required
def get_overview():
    """Get dashboard overview statistics"""
    try:
        # Total counts
        total_issues = Issue.query.count()
        total_users = User.query.filter_by(role='resident').count()
        total_comments = Comment.query.count()
        total_upvotes = Upvote.query.count()
        
        # Status distribution
        status_counts = db.session.query(
            Issue.status, 
            func.count(Issue.id)
        ).group_by(Issue.status).all()
        
        status_distribution = {status: count for status, count in status_counts}
        
        # Recent activity (last 7 days)
        week_ago = datetime.utcnow() - timedelta(days=7)
        recent_issues = Issue.query.filter(Issue.created_at >= week_ago).count()
        recent_comments = Comment.query.filter(Comment.created_at >= week_ago).count()
        
        # Resolution rate
        resolved_issues = Issue.query.filter(Issue.status == 'resolved').count()
        resolution_rate = (resolved_issues / total_issues * 100) if total_issues > 0 else 0
        
        return jsonify({
            'overview': {
                'total_issues': total_issues,
                'total_users': total_users,
                'total_comments': total_comments,
                'total_upvotes': total_upvotes,
                'recent_issues': recent_issues,
                'recent_comments': recent_comments,
                'resolution_rate': round(resolution_rate, 2),
                'status_distribution': status_distribution
            }
        }), 200
        
    except Exception as e:
        print(f"Analytics overview error: {e}")
        return jsonify({'error': 'Failed to fetch overview data'}), 500

@analytics_bp.route('/issues-by-type', methods=['GET'])
@jwt_required()
@admin_required
def get_issues_by_type():
    """Get issues grouped by type for chart visualization"""
    try:
        # Get issues by type
        type_counts = db.session.query(
            Issue.issue_type,
            func.count(Issue.id)
        ).group_by(Issue.issue_type).all()
        
        # Format for Chart.js
        labels = [issue_type for issue_type, count in type_counts]
        data = [count for issue_type, count in type_counts]
        
        return jsonify({
            'chart_data': {
                'labels': labels,
                'datasets': [{
                    'label': 'Issues by Type',
                    'data': data,
                    'backgroundColor': [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
                        '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF',
                        '#4BC0C0', '#FF6384', '#36A2EB'
                    ]
                }]
            }
        }), 200
        
    except Exception as e:
        print(f"Analytics issues by type error: {e}")
        return jsonify({'error': 'Failed to fetch issues by type data'}), 500

@analytics_bp.route('/issues-by-status', methods=['GET'])
@jwt_required()
@admin_required
def get_issues_by_status():
    """Get issues grouped by status for chart visualization"""
    try:
        # Get issues by status
        status_counts = db.session.query(
            Issue.status,
            func.count(Issue.id)
        ).group_by(Issue.status).all()
        
        # Format for Chart.js
        labels = [status.replace('_', ' ').title() for status, count in status_counts]
        data = [count for status, count in status_counts]
        colors = {
            'submitted': '#FFA500',
            'verified': '#0000FF',
            'in_progress': '#FFFF00',
            'resolved': '#00FF00',
            'closed': '#808080'
        }
        background_colors = [colors.get(status, '#C9CBCF') for status, count in status_counts]
        
        return jsonify({
            'chart_data': {
                'labels': labels,
                'datasets': [{
                    'label': 'Issues by Status',
                    'data': data,
                    'backgroundColor': background_colors
                }]
            }
        }), 200
        
    except Exception as e:
        print(f"Analytics issues by status error: {e}")
        return jsonify({'error': 'Failed to fetch issues by status data'}), 500

@analytics_bp.route('/resolution-time', methods=['GET'])
@jwt_required()
@admin_required
def get_resolution_time():
    """Get average resolution time metrics"""
    try:
        # Get resolved issues with resolution dates
        resolved_issues = Issue.query.filter(
            and_(
                Issue.status == 'resolved',
                Issue.actual_resolution_date.isnot(None)
            )
        ).all()
        
        resolution_times = []
        for issue in resolved_issues:
            if issue.created_at and issue.actual_resolution_date:
                # Convert date to datetime for calculation
                resolution_datetime = datetime.combine(issue.actual_resolution_date, datetime.min.time())
                days_to_resolve = (resolution_datetime - issue.created_at).days
                resolution_times.append(days_to_resolve)
        
        if resolution_times:
            avg_resolution_time = sum(resolution_times) / len(resolution_times)
            min_resolution_time = min(resolution_times)
            max_resolution_time = max(resolution_times)
        else:
            avg_resolution_time = min_resolution_time = max_resolution_time = 0
        
        # Resolution time distribution
        time_ranges = {
            '0-1 days': 0,
            '2-7 days': 0,
            '8-30 days': 0,
            '30+ days': 0
        }
        
        for days in resolution_times:
            if days <= 1:
                time_ranges['0-1 days'] += 1
            elif days <= 7:
                time_ranges['2-7 days'] += 1
            elif days <= 30:
                time_ranges['8-30 days'] += 1
            else:
                time_ranges['30+ days'] += 1
        
        return jsonify({
            'resolution_metrics': {
                'average_days': round(avg_resolution_time, 1),
                'min_days': min_resolution_time,
                'max_days': max_resolution_time,
                'total_resolved': len(resolution_times),
                'time_distribution': time_ranges
            }
        }), 200
        
    except Exception as e:
        print(f"Analytics resolution time error: {e}")
        return jsonify({'error': 'Failed to fetch resolution time data'}), 500

@analytics_bp.route('/monthly-trends', methods=['GET'])
@jwt_required()
@admin_required
def get_monthly_trends():
    """Get monthly trends for issues and resolutions"""
    try:
        # Get current year
        current_year = datetime.utcnow().year
        
        # Monthly data for current year
        monthly_data = []
        
        for month in range(1, 13):
            # Issues created in this month
            issues_created = Issue.query.filter(
                and_(
                    func.extract('year', Issue.created_at) == current_year,
                    func.extract('month', Issue.created_at) == month
                )
            ).count()
            
            # Issues resolved in this month
            issues_resolved = Issue.query.filter(
                and_(
                    func.extract('year', Issue.actual_resolution_date) == current_year,
                    func.extract('month', Issue.actual_resolution_date) == month
                )
            ).count()
            
            monthly_data.append({
                'month': calendar.month_name[month],
                'issues_created': issues_created,
                'issues_resolved': issues_resolved
            })
        
        # Format for Chart.js
        labels = [data['month'] for data in monthly_data]
        created_data = [data['issues_created'] for data in monthly_data]
        resolved_data = [data['issues_resolved'] for data in monthly_data]
        
        return jsonify({
            'chart_data': {
                'labels': labels,
                'datasets': [
                    {
                        'label': 'Issues Created',
                        'data': created_data,
                        'borderColor': '#36A2EB',
                        'backgroundColor': 'rgba(54, 162, 235, 0.1)',
                        'tension': 0.1
                    },
                    {
                        'label': 'Issues Resolved',
                        'data': resolved_data,
                        'borderColor': '#4BC0C0',
                        'backgroundColor': 'rgba(75, 192, 192, 0.1)',
                        'tension': 0.1
                    }
                ]
            }
        }), 200
        
    except Exception as e:
        print(f"Analytics monthly trends error: {e}")
        return jsonify({'error': 'Failed to fetch monthly trends data'}), 500

@analytics_bp.route('/user-activity', methods=['GET'])
@jwt_required()
@admin_required
def get_user_activity():
    """Get user activity statistics"""
    try:
        # Most active users (by issues reported)
        active_users = db.session.query(
            User.first_name,
            User.last_name,
            func.count(Issue.id).label('issue_count')
        ).join(Issue, User.id == Issue.reporter_id)\
         .group_by(User.id)\
         .order_by(func.count(Issue.id).desc())\
         .limit(10).all()
        
        # Users with most comments
        comment_users = db.session.query(
            User.first_name,
            User.last_name,
            func.count(Comment.id).label('comment_count')
        ).join(Comment, User.id == Comment.author_id)\
         .group_by(User.id)\
         .order_by(func.count(Comment.id).desc())\
         .limit(10).all()
        
        return jsonify({
            'user_activity': {
                'most_active_reporters': [
                    {
                        'name': f"{user.first_name} {user.last_name}",
                        'issue_count': user.issue_count
                    } for user in active_users
                ],
                'most_active_commenters': [
                    {
                        'name': f"{user.first_name} {user.last_name}",
                        'comment_count': user.comment_count
                    } for user in comment_users
                ]
            }
        }), 200
        
    except Exception as e:
        print(f"Analytics user activity error: {e}")
        return jsonify({'error': 'Failed to fetch user activity data'}), 500

@analytics_bp.route('/heatmap-data', methods=['GET'])
@jwt_required()
@admin_required
def get_heatmap_data():
    """Get issue density data for heatmap visualization"""
    try:
        # Get all issues with coordinates
        issues = Issue.query.filter(
            and_(
                Issue.latitude.isnot(None),
                Issue.longitude.isnot(None)
            )
        ).all()
        
        # Group issues by location (rounded coordinates)
        location_counts = {}
        for issue in issues:
            # Round to 3 decimal places for grouping
            lat_rounded = round(issue.latitude, 3)
            lng_rounded = round(issue.longitude, 3)
            key = (lat_rounded, lng_rounded)
            
            if key in location_counts:
                location_counts[key] += 1
            else:
                location_counts[key] = 1
        
        # Format for heatmap
        heatmap_data = [
            {
                'lat': lat,
                'lng': lng,
                'weight': count
            } for (lat, lng), count in location_counts.items()
        ]
        
        return jsonify({
            'heatmap_data': heatmap_data
        }), 200
        
    except Exception as e:
        print(f"Analytics heatmap error: {e}")
        return jsonify({'error': 'Failed to fetch heatmap data'}), 500 