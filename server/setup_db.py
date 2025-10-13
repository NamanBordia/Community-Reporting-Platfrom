from app import create_app, db
from app.models.user import User
from app.models.issue import Issue
from app.models.admin import Admin

def setup_database():
    app = create_app()
    with app.app_context():
        try:
            print("Creating database tables...")
            db.create_all()
            print("✓ Database tables created successfully")
            
            # Check if admin user exists
            admin = Admin.query.filter_by(username='adminuser').first()
            if not admin:
                print("Creating admin user...")
                admin = Admin(username='adminuser', email='admin@example.com')
                admin.set_password('YourSecurePassword')
                db.session.add(admin)
                db.session.commit()
                print("✓ Admin user created successfully")
            else:
                print("✓ Admin user already exists")
                
            print("Database setup complete!")
            
        except Exception as e:
            print(f"✗ Error setting up database: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    setup_database() 