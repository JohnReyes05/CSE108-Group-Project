from app import app, db, User
from getpass import getpass

with app.app_context():
    username = input("Enter username: ").strip()
    password = getpass("Enter password: ")
    role = input("Enter role (student/teacher/admin): ").strip().lower()

    if not username or not password:
        print("Username and password are required.")

    elif role not in ["student", "teacher", "admin"]:
        print("Invalid role.")

    elif User.query.filter_by(username=username).first():
        print("Username already exists.")

    else:
        user = User(username=username, role=role)
        user.set_password(password)

        db.session.add(user)
        db.session.commit()

        print("Account created successfully!")