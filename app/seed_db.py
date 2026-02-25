from app.database.session import SessionLocal, engine, Base
from app.models.db_models import User
from app.auth.service import get_password_hash

def seed_database():
    print("Seeding database...")
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Check if admin user exists
        admin_user = db.query(User).filter(User.username == "admin").first()
        if not admin_user:
            print("Creating default admin user...")
            new_user = User(
                username="admin",
                email="admin@leakwatch.ai",
                hashed_password=get_password_hash("admin123"), # Default password
                role="admin"
            )
            db.add(new_user)
            db.commit()
            print("Admin user created: admin / admin123")
        else:
            print("Admin user already exists.")
    except Exception as e:
        print(f"Error seeding DB: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
