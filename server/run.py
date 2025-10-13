from app import create_app, db
from app.models.user import User
from app.models.issue import Issue, Comment, Upvote
from flask import send_from_directory
import os

app = create_app()

# Initialize database tables
with app.app_context():
    db.create_all()
    print("Database tables created successfully!")

@app.cli.command("init-db")
def init_db():
    """Initialize the database with tables"""
    with app.app_context():
        db.create_all()
        print("Database tables created successfully!")

@app.cli.command("create-admin")
def create_admin():
    """Create an admin user"""
    with app.app_context():
        email = input("Enter admin email: ")
        password = input("Enter admin password: ")
        first_name = input("Enter first name: ")
        last_name = input("Enter last name: ")
        
        # Check if user already exists
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            print("User with this email already exists!")
            return
        
        # Create admin user
        admin = User(
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            role='admin'
        )
        
        db.session.add(admin)
        db.session.commit()
        
        print(f"Admin user {email} created successfully!")

@app.cli.command("seed-data")
def seed_data():
    """Seed database with sample data"""
    with app.app_context():
        # Create sample users
        users = [
            User(
                email="resident1@example.com",
                password="password123",
                first_name="John",
                last_name="Doe",
                role="resident"
            ),
            User(
                email="resident2@example.com",
                password="password123",
                first_name="Jane",
                last_name="Smith",
                role="resident"
            ),
            User(
                email="admin@example.com",
                password="admin123",
                first_name="Admin",
                last_name="User",
                role="admin"
            )
        ]
        
        for user in users:
            existing = User.query.filter_by(email=user.email).first()
            if not existing:
                db.session.add(user)
        
        db.session.commit()
        print("Sample users created!")
        
        # Create sample issues
        issues = [
            Issue(
                title="Large pothole on Main Street",
                description="There's a large pothole on Main Street near the intersection with Oak Avenue. It's causing damage to vehicles.",
                issue_type="pothole",
                latitude=40.7128,
                longitude=-74.0060,
                reporter_id=1,
                address="Main Street & Oak Avenue",
                priority="high"
            ),
            Issue(
                title="Broken street light",
                description="Street light is not working on Elm Street. It's been dark for several days.",
                issue_type="streetlight",
                latitude=40.7130,
                longitude=-74.0062,
                reporter_id=2,
                address="Elm Street",
                priority="medium"
            ),
            Issue(
                title="Garbage not collected",
                description="Garbage bins were not collected on Tuesday. Bins are overflowing.",
                issue_type="garbage",
                latitude=40.7125,
                longitude=-74.0058,
                reporter_id=1,
                address="Maple Street",
                priority="medium"
            )
        ]
        
        for issue in issues:
            existing = Issue.query.filter_by(title=issue.title).first()
            if not existing:
                db.session.add(issue)
        
        db.session.commit()
        print("Sample issues created!")

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    uploads = os.path.join(os.path.dirname(app.root_path), 'uploads')
    full_path = os.path.join(uploads, filename)
    print("Looking for file at:", full_path)
    return send_from_directory(uploads, filename)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000) 