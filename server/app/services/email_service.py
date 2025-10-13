from flask import current_app
from flask_mail import Message
from app import mail
from app.models.user import User
from app.models.issue import Issue, Comment
import os

def _is_email_configured():
    """Check if email is properly configured"""
    return (current_app.config.get('MAIL_SERVER') and 
            current_app.config.get('MAIL_USERNAME') and 
            current_app.config.get('MAIL_PASSWORD'))

def send_welcome_email(user):
    """Send welcome email to new user"""
    if not _is_email_configured():
        print("Email not configured, skipping welcome email")
        return True
        
    try:
        msg = Message(
            subject='Welcome to Community Reporting Platform',
            sender=current_app.config['MAIL_USERNAME'],
            recipients=[user.email]
        )
        
        msg.html = f"""
        <html>
            <body>
                <h2>Welcome to the Community Reporting Platform!</h2>
                <p>Hello {user.first_name} {user.last_name},</p>
                <p>Thank you for registering with our community reporting platform. 
                You can now report local issues and help make our community better.</p>
                
                <h3>What you can do:</h3>
                <ul>
                    <li>Report issues like potholes, broken street lights, and garbage</li>
                    <li>Track the status of your reports</li>
                    <li>Comment and upvote on other residents' reports</li>
                    <li>View issues on an interactive map</li>
                </ul>
                
                <p>If you have any questions, please don't hesitate to contact us.</p>
                
                <p>Best regards,<br>
                Community Reporting Team</p>
            </body>
        </html>
        """
        
        mail.send(msg)
        return True
        
    except Exception as e:
        print(f"Failed to send welcome email: {e}")
        return False

def send_issue_status_update(issue):
    """Send email notification when issue status changes"""
    if not _is_email_configured():
        print("Email not configured, skipping status update email")
        return True
        
    try:
        if not issue.reporter:
            return False
        
        status_messages = {
            'verified': 'Your issue has been verified and is being reviewed.',
            'in_progress': 'Work has begun on your reported issue.',
            'resolved': 'Your reported issue has been resolved!',
            'closed': 'Your issue has been closed.'
        }
        
        status_message = status_messages.get(issue.status, 'Your issue status has been updated.')
        
        msg = Message(
            subject=f'Issue Status Update - {issue.title}',
            sender=current_app.config['MAIL_USERNAME'],
            recipients=[issue.reporter.email]
        )
        
        msg.html = f"""
        <html>
            <body>
                <h2>Issue Status Update</h2>
                <p>Hello {issue.reporter.first_name},</p>
                
                <p>Your reported issue has been updated:</p>
                
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <h3>{issue.title}</h3>
                    <p><strong>Status:</strong> {issue.status.replace('_', ' ').title()}</p>
                    <p><strong>Type:</strong> {issue.issue_type.replace('_', ' ').title()}</p>
                    <p><strong>Location:</strong> {issue.address or 'Location marked on map'}</p>
                    <p><strong>Description:</strong> {issue.description}</p>
                </div>
                
                <p>{status_message}</p>
                
                {f'<p><strong>Assigned to:</strong> {issue.assigned_to}</p>' if issue.assigned_to else ''}
                
                {f'<p><strong>Estimated Resolution:</strong> {issue.estimated_resolution_date}</p>' if issue.estimated_resolution_date else ''}
                
                <p>You can view the full details and track progress on our platform.</p>
                
                <p>Thank you for helping improve our community!</p>
                
                <p>Best regards,<br>
                Community Reporting Team</p>
            </body>
        </html>
        """
        
        mail.send(msg)
        return True
        
    except Exception as e:
        print(f"Failed to send status update email: {e}")
        return False

def send_comment_notification(issue, comment):
    """Send email notification when someone comments on an issue"""
    if not _is_email_configured():
        print("Email not configured, skipping comment notification")
        return True
        
    try:
        if not issue.reporter or not comment.author:
            return False
        
        # Don't send notification if the commenter is the issue reporter
        if comment.author_id == issue.reporter_id:
            return True
        
        msg = Message(
            subject=f'New Comment on Your Issue - {issue.title}',
            sender=current_app.config['MAIL_USERNAME'],
            recipients=[issue.reporter.email]
        )
        
        commenter_name = f"{comment.author.first_name} {comment.author.last_name}"
        if comment.is_admin_comment:
            commenter_name += " (Admin)"
        
        msg.html = f"""
        <html>
            <body>
                <h2>New Comment on Your Issue</h2>
                <p>Hello {issue.reporter.first_name},</p>
                
                <p>Someone has commented on your reported issue:</p>
                
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <h3>{issue.title}</h3>
                    <p><strong>Comment by:</strong> {commenter_name}</p>
                    <p><strong>Comment:</strong> {comment.content}</p>
                    <p><strong>Posted:</strong> {comment.created_at.strftime('%B %d, %Y at %I:%M %p')}</p>
                </div>
                
                <p>You can view all comments and respond on our platform.</p>
                
                <p>Best regards,<br>
                Community Reporting Team</p>
            </body>
        </html>
        """
        
        mail.send(msg)
        return True
        
    except Exception as e:
        print(f"Failed to send comment notification: {e}")
        return False

def send_admin_notification(issue, action_type):
    """Send notification to admins about issue actions"""
    if not _is_email_configured():
        print("Email not configured, skipping admin notification")
        return True
        
    try:
        # Get all admin users
        admin_users = User.query.filter_by(role='admin', is_active=True).all()
        
        if not admin_users:
            return False
        
        admin_emails = [admin.email for admin in admin_users]
        
        action_messages = {
            'assigned': f'Issue "{issue.title}" has been assigned to {issue.assigned_to}',
            'status_changed': f'Issue "{issue.title}" status changed to {issue.status}',
            'new_urgent': f'New urgent issue reported: "{issue.title}"'
        }
        
        message = action_messages.get(action_type, f'Issue "{issue.title}" has been updated')
        
        msg = Message(
            subject=f'Admin Notification - {action_type.replace("_", " ").title()}',
            sender=current_app.config['MAIL_USERNAME'],
            recipients=admin_emails
        )
        
        msg.html = f"""
        <html>
            <body>
                <h2>Admin Notification</h2>
                <p>{message}</p>
                
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <h3>Issue Details</h3>
                    <p><strong>Title:</strong> {issue.title}</p>
                    <p><strong>Type:</strong> {issue.issue_type.replace('_', ' ').title()}</p>
                    <p><strong>Priority:</strong> {issue.priority.title()}</p>
                    <p><strong>Status:</strong> {issue.status.replace('_', ' ').title()}</p>
                    <p><strong>Reporter:</strong> {issue.reporter.first_name} {issue.reporter.last_name}</p>
                    <p><strong>Location:</strong> {issue.address or 'Location marked on map'}</p>
                </div>
                
                <p>Please review and take appropriate action.</p>
                
                <p>Best regards,<br>
                Community Reporting Team</p>
            </body>
        </html>
        """
        
        mail.send(msg)
        return True
        
    except Exception as e:
        print(f"Failed to send admin notification: {e}")
        return False

def send_password_reset_email(user, reset_token):
    """Send password reset email"""
    try:
        reset_url = f"http://localhost:3000/reset-password?token={reset_token}"
        
        msg = Message(
            subject='Password Reset Request',
            sender=current_app.config['MAIL_USERNAME'],
            recipients=[user.email]
        )
        
        msg.html = f"""
        <html>
            <body>
                <h2>Password Reset Request</h2>
                <p>Hello {user.first_name},</p>
                
                <p>You have requested to reset your password for the Community Reporting Platform.</p>
                
                <p>Click the link below to reset your password:</p>
                
                <p><a href="{reset_url}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
                
                <p>If you didn't request this password reset, please ignore this email.</p>
                
                <p>This link will expire in 1 hour.</p>
                
                <p>Best regards,<br>
                Community Reporting Team</p>
            </body>
        </html>
        """
        
        mail.send(msg)
        return True
        
    except Exception as e:
        print(f"Failed to send password reset email: {e}")
        return False 