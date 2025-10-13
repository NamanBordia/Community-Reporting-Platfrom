from app import db
from datetime import datetime

class Issue(db.Model):
    """Issue model for community problem reports"""
    __tablename__ = 'issues'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    issue_type = db.Column(db.String(50), nullable=False)  # pothole, streetlight, garbage, etc.
    status = db.Column(db.String(20), default='submitted')  # submitted, verified, in_progress, resolved, closed
    priority = db.Column(db.String(20), default='medium')  # low, medium, high, urgent
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    address = db.Column(db.String(255))
    image_url = db.Column(db.String(500))
    reporter_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    assigned_to = db.Column(db.String(100))  # Department or person assigned
    estimated_resolution_date = db.Column(db.Date)
    actual_resolution_date = db.Column(db.Date)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    comments = db.relationship('Comment', backref='issue', lazy=True, cascade='all, delete-orphan')
    upvotes = db.relationship('Upvote', backref='issue', lazy=True, cascade='all, delete-orphan')
    
    def __init__(self, title, description, issue_type, latitude, longitude, reporter_id, 
                 address=None, image_url=None, priority='medium'):
        self.title = title
        self.description = description
        self.issue_type = issue_type
        self.latitude = latitude
        self.longitude = longitude
        self.reporter_id = reporter_id
        self.address = address
        self.image_url = image_url
        self.priority = priority
    
    def to_dict(self):
        """Convert issue to dictionary"""
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'issue_type': self.issue_type,
            'status': self.status,
            'priority': self.priority,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'address': self.address,
            'image_url': self.image_url,
            'reporter': self.reporter.to_dict() if self.reporter else None,
            'assigned_to': self.assigned_to,
            'estimated_resolution_date': self.estimated_resolution_date.isoformat() if self.estimated_resolution_date else None,
            'actual_resolution_date': self.actual_resolution_date.isoformat() if self.actual_resolution_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'comment_count': len(self.comments),
            'upvote_count': len(self.upvotes)
        }
    
    def update_status(self, new_status, assigned_to=None):
        """Update issue status and set resolution date if resolved"""
        self.status = new_status
        self.assigned_to = assigned_to
        
        if new_status == 'resolved' and not self.actual_resolution_date:
            self.actual_resolution_date = datetime.utcnow().date()
        
        self.updated_at = datetime.utcnow()
    
    def get_status_color(self):
        """Get color for status display"""
        status_colors = {
            'submitted': '#FFA500',  # Orange
            'verified': '#0000FF',   # Blue
            'in_progress': '#FFFF00', # Yellow
            'resolved': '#00FF00',   # Green
            'closed': '#808080'      # Gray
        }
        return status_colors.get(self.status, '#000000')
    
    def __repr__(self):
        return f'<Issue {self.title}>'

class Comment(db.Model):
    """Comment model for issue discussions"""
    __tablename__ = 'comments'
    
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    issue_id = db.Column(db.Integer, db.ForeignKey('issues.id'), nullable=False)
    author_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    is_admin_comment = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        """Convert comment to dictionary"""
        return {
            'id': self.id,
            'content': self.content,
            'issue_id': self.issue_id,
            'author': self.author.to_dict() if self.author else None,
            'is_admin_comment': self.is_admin_comment,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def __repr__(self):
        return f'<Comment {self.id}>'

class Upvote(db.Model):
    """Upvote model for issue voting"""
    __tablename__ = 'upvotes'
    
    id = db.Column(db.Integer, primary_key=True)
    issue_id = db.Column(db.Integer, db.ForeignKey('issues.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Ensure one upvote per user per issue
    __table_args__ = (db.UniqueConstraint('issue_id', 'user_id', name='unique_user_issue_upvote'),)
    
    def to_dict(self):
        """Convert upvote to dictionary"""
        return {
            'id': self.id,
            'issue_id': self.issue_id,
            'user_id': self.user_id,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return f'<Upvote {self.id}>' 