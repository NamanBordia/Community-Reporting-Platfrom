from app import create_app, db

app = create_app()

with app.app_context():
    db.create_all()
    print("✅ Database tables created successfully!")
    
    # Print table names
    from sqlalchemy import inspect
    inspector = inspect(db.engine)
    tables = inspector.get_table_names()
    print(f"\n📋 Created {len(tables)} tables:")
    for table in tables:
        print(f"  - {table}")
