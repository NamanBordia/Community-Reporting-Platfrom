import os
from app import create_app, db
from app.models.admin import Admin

# Create admin account
app = create_app()

with app.app_context():
    # Check if admin exists
    existing_admin = Admin.query.filter_by(username='admin').first()
    
    if existing_admin:
        print("✓ Admin user already exists")
        print(f"  Username: {existing_admin.username}")
        print(f"  Email: {existing_admin.email}")
    else:
        # Create new admin
        admin = Admin(
            username='admin',
            email='admin@community-reporting.com'
        )
        admin.set_password('Admin@123')  # Change this password!
        
        db.session.add(admin)
        db.session.commit()
        
        print("✓ Admin user created successfully!")
        print(f"  Username: admin")
        print(f"  Password: Admin@123")
        print(f"  Email: admin@community-reporting.com")
        print("\n⚠️  Please change the password after first login!")
