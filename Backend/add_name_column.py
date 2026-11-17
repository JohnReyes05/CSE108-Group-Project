from app import app, db
from sqlalchemy import inspect, text

with app.app_context():
    inspector = inspect(db.engine)

    columns = [
        column["name"]
        for column in inspector.get_columns("user")
    ]

    if "name" not in columns:
        db.session.execute(
            text("ALTER TABLE user ADD COLUMN name VARCHAR(100)")
        )
        db.session.commit()
        print("Name column added successfully!")
    else:
        print("Name column already exists.")