from app import app, db, User

with app.app_context():
    print("TEST DATABASE:", db.engine.url.database)

    user = User.query.filter_by(username="john123").first()

    if user is None:
        print("User does not exist!")
    else:
        print("User found!")
        print("Password matches:", user.check_password("hello123"))