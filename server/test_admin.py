from app import create_app, db
from app.models.admin import Admin

def test_admin():
    app = create_app()
    with app.app_context():
        try:
            # Check if admin table exists
            print("Testing admin functionality...")
            
            # Try to query admin
            admin = Admin.query.filter_by(username='adminuser').first()
            if admin:
                print(f"✓ Admin found: {admin.username}")
                print(f"✓ Admin email: {admin.email}")
                
                # Test password check
                if admin.check_password('YourSecurePassword'):
                    print("✓ Password check successful")
                else:
                    print("✗ Password check failed")
            else:
                print("✗ Admin user not found")
                
                # List all admins
                all_admins = Admin.query.all()
                print(f"Total admins in database: {len(all_admins)}")
                for a in all_admins:
                    print(f"  - {a.username} ({a.email})")
                    
        except Exception as e:
            print(f"✗ Error: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    test_admin() 