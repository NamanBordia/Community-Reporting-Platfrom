from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.user import User
from app.models.issue import Issue, Comment
from app.services.email_service import send_comment_notification

comments_bp = Blueprint('comments', __name__)

@comments_bp.route('/issues/<int:issue_id>/comments', methods=['GET'])
def get_issue_comments(issue_id):
    """Get all comments for a specific issue"""
    try:
        issue = Issue.query.get(issue_id)
        
        if not issue:
            return jsonify({'error': 'Issue not found'}), 404
        
        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        # Query comments with pagination
        pagination = Comment.query.filter_by(issue_id=issue_id)\
            .order_by(Comment.created_at.asc())\
            .paginate(
                page=page,
                per_page=per_page,
                error_out=False
            )
        
        comments = [comment.to_dict() for comment in pagination.items]
        
        return jsonify({
            'comments': comments,
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
        return jsonify({'error': 'Failed to fetch comments'}), 500

@comments_bp.route('/issues/<int:issue_id>/comments', methods=['POST'])
@jwt_required()
def add_comment(issue_id):
    """Add a comment to an issue"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        issue = Issue.query.get(issue_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        if not issue:
            return jsonify({'error': 'Issue not found'}), 404
        
        data = request.get_json()
        
        if not data.get('content'):
            return jsonify({'error': 'Comment content is required'}), 400
        
        content = data['content'].strip()
        if len(content) < 1:
            return jsonify({'error': 'Comment cannot be empty'}), 400
        
        if len(content) > 1000:
            return jsonify({'error': 'Comment too long (max 1000 characters)'}), 400
        
        # Create comment
        comment = Comment(
            content=content,
            issue_id=issue_id,
            author_id=user_id,
            is_admin_comment=user.is_admin()
        )
        
        db.session.add(comment)
        db.session.commit()
        
        # Send notification to issue reporter (if not the same user)
        if issue.reporter_id != user_id:
            try:
                send_comment_notification(issue, comment)
            except Exception as e:
                print(f"Failed to send comment notification: {e}")
        
        return jsonify({
            'message': 'Comment added successfully',
            'comment': comment.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to add comment'}), 500

@comments_bp.route('/comments/<int:comment_id>', methods=['GET'])
def get_comment(comment_id):
    """Get a specific comment by ID"""
    try:
        comment = Comment.query.get(comment_id)
        
        if not comment:
            return jsonify({'error': 'Comment not found'}), 404
        
        return jsonify({
            'comment': comment.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Failed to fetch comment'}), 500

@comments_bp.route('/comments/<int:comment_id>', methods=['PUT'])
@jwt_required()
def update_comment(comment_id):
    """Update a comment (author only)"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        comment = Comment.query.get(comment_id)
        
        if not comment:
            return jsonify({'error': 'Comment not found'}), 404
        
        # Check permissions
        if comment.author_id != user_id and not user.is_admin():
            return jsonify({'error': 'Unauthorized'}), 403
        
        data = request.get_json()
        
        if not data.get('content'):
            return jsonify({'error': 'Comment content is required'}), 400
        
        content = data['content'].strip()
        if len(content) < 1:
            return jsonify({'error': 'Comment cannot be empty'}), 400
        
        if len(content) > 1000:
            return jsonify({'error': 'Comment too long (max 1000 characters)'}), 400
        
        # Update comment
        comment.content = content
        db.session.commit()
        
        return jsonify({
            'message': 'Comment updated successfully',
            'comment': comment.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to update comment'}), 500

@comments_bp.route('/comments/<int:comment_id>', methods=['DELETE'])
@jwt_required()
def delete_comment(comment_id):
    """Delete a comment (author or admin only)"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        comment = Comment.query.get(comment_id)
        
        if not comment:
            return jsonify({'error': 'Comment not found'}), 404
        
        # Check permissions
        if comment.author_id != user_id and not user.is_admin():
            return jsonify({'error': 'Unauthorized'}), 403
        
        db.session.delete(comment)
        db.session.commit()
        
        return jsonify({
            'message': 'Comment deleted successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to delete comment'}), 500

@comments_bp.route('/user/<int:user_id>/comments', methods=['GET'])
def get_user_comments(user_id):
    """Get all comments by a specific user"""
    try:
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        # Query comments with pagination
        pagination = Comment.query.filter_by(author_id=user_id)\
            .order_by(Comment.created_at.desc())\
            .paginate(
                page=page,
                per_page=per_page,
                error_out=False
            )
        
        comments = [comment.to_dict() for comment in pagination.items]
        
        return jsonify({
            'comments': comments,
            'user': user.to_dict(),
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
        return jsonify({'error': 'Failed to fetch user comments'}), 500 