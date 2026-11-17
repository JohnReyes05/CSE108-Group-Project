from flask import Flask, jsonify, request, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from pathlib import Path
import math
from werkzeug.security import generate_password_hash, check_password_hash
from flask import Flask, jsonify, request, send_from_directory, session
import os

app = Flask(__name__)

app.config["SECRET_KEY"] = os.environ["FLASK_SECRET_KEY"]
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"

DIST_DIR = Path(__file__).resolve().parent.parent / "Frontend" / "dist"

BASE_DIR = Path(__file__).resolve().parent

DATABASE_PATH = BASE_DIR / "instance" / "grades.db"

app.config["SQLALCHEMY_DATABASE_URI"] = (
    f"sqlite:///{DATABASE_PATH.as_posix()}"
)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)


# Define the student grade table
class Grade(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    grade = db.Column(db.Float, nullable=False)

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    username = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

# Create the database table if it does not exist
with app.app_context():
    db.create_all()

@app.route("/login", methods=["POST"])
def login():
    print("DEBUG - Database:", db.engine.url.database)
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "Please provide a username and password."}), 400

    username = data.get("username")
    password = data.get("password")

    if (
        not isinstance(username, str)
        or not isinstance(password, str)
        or not username
        or not password
    ):
        return jsonify({"error": "Please provide username and password."}), 400
    user = User.query.filter_by(username=username).first()

    print("DEBUG - Username received:", repr(username))
    print("DEBUG - User found:", user is not None)

    if user is not None:
        print("DEBUG - Password matches:", user.check_password(password))

    if user is None or not user.check_password(password):
        return jsonify({"error": "Invalid username or password."}), 401
    session.clear()
    session["user_id"] = user.id

    return jsonify({
        "username": user.username,
        "role": user.role
    }), 200
@app.route("/logout", methods=["POST"])
def logout():
    session.clear()

    return jsonify({
        "message": "Logged out successfully."
    }), 200
@app.route("/me", methods=["GET"])
def current_user():
    user_id = session.get("user_id")

    if user_id is None:
        return jsonify({"error": "Not logged in."}), 401

    user = db.session.get(User, user_id)

    if user is None:
        session.clear()
        return jsonify({"error": "Not logged in."}), 401

    return jsonify({
        "username": user.username,
        "role": user.role
    }), 200
@app.route("/")
def home():
    return send_from_directory(DIST_DIR, "index.html")


@app.route("/<path:path>")
def frontend_files(path):
    requested_file = DIST_DIR / path

    if requested_file.is_file():
        return send_from_directory(DIST_DIR, path)

    return send_from_directory(DIST_DIR, "index.html")


# Get all students and grades
@app.route("/grades", methods=["GET"])
def get_all_grades():
    students = Grade.query.order_by(Grade.name).all()

    return jsonify([
        {"name": student.name, "grade": student.grade}
        for student in students
    ])


# Get one student's grade
@app.route("/grades/<string:name>", methods=["GET"])
def get_grade(name):
    student = Grade.query.filter_by(name=name).first()

    if student is None:
        return jsonify({"error": "Student not found."}), 404

    return jsonify({
        "name": student.name,
        "grade": student.grade
    })


# Validate the submitted grade
def read_grade():
    data = request.get_json(silent=True)

    if not isinstance(data, dict) or "grade" not in data:
        return None, (jsonify({"error": "Please provide a grade."}), 400)

    grade = data["grade"]

    if (
        isinstance(grade, bool)
        or not isinstance(grade, (int, float))
        or not math.isfinite(grade)
        or not 0 <= grade <= 100
    ):
        return None, (
            jsonify({"error": "Grade must be between 0 and 100."}),
            400
        )

    return grade, None


# Add a new student
@app.route("/grades", methods=["POST"])
def add_grade():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "error": "Please provide a student name and grade."
        }), 400

    name = data.get("name")

    if not isinstance(name, str) or not name.strip():
        return jsonify({"error": "Please provide a student name."}), 400

    name = name.strip()

    if Grade.query.filter_by(name=name).first() is not None:
        return jsonify({"error": "That student already exists."}), 409

    grade, error = read_grade()

    if error:
        return error

    student = Grade(name=name, grade=grade)
    db.session.add(student)
    db.session.commit()

    return jsonify({
        "message": "Student added successfully.",
        "name": student.name,
        "grade": student.grade
    }), 201


# Update a student's grade
@app.route("/grades/<string:name>", methods=["PUT"])
def update_grade(name):
    student = Grade.query.filter_by(name=name).first()

    if student is None:
        return jsonify({"error": "Student not found."}), 404

    grade, error = read_grade()

    if error:
        return error

    student.grade = grade
    db.session.commit()

    return jsonify({
        "message": "Grade updated successfully.",
        "name": student.name,
        "grade": student.grade
    }), 200


# Delete a student and their grade
@app.route("/grades/<string:name>", methods=["DELETE"])
def delete_grade(name):
    student = Grade.query.filter_by(name=name).first()

    if student is None:
        return jsonify({"error": "Student not found."}), 404

    db.session.delete(student)
    db.session.commit()

    return jsonify({
        "message": "Student deleted successfully."
    }), 200
# ==========================================
# ADMIN ROUTES
# ==========================================

# Existing grade management routes
# Additional admin routes will go here

def require_admin():
    user_id = session.get("user_id")

    if user_id is None:
        return None, (jsonify({"error": "Not logged in."}), 401)

    user = db.session.get(User, user_id)

    if user is None:
        session.clear()
        return None, (jsonify({"error": "Not logged in."}), 401)

    if user.role != "admin":
        return None, (jsonify({"error": "Admin access required."}), 403)

    return user, None

@app.route("/admin/users", methods=["GET"])
def admin_get_users():
    admin, error = require_admin()

    if error:
        return error

    users = User.query.order_by(User.username).all()

    return jsonify([
        {
            "id": user.id,
            "username": user.username,
            
            "role": user.role
        }
        for user in users
    ]), 200
@app.route("/admin/users", methods=["POST"])
def admin_create_user():
    admin, error = require_admin()

    if error:
        return error
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "Invalid request data."}), 400

    username = data.get("username")
    password = data.get("password")
    role = data.get("role")
    if (
        not isinstance(username, str)
        or not username.strip()
        or not isinstance(password, str)
        or not password
    ):
        return jsonify({
            "error": "Username and password are required."
        }), 400

    username = username.strip()

    if role not in ("student", "teacher", "admin"):
        return jsonify({"error": "Invalid role."}), 400

    if len(password) < 8:
        return jsonify({
            "error": "Password must contain at least 8 characters."
        }), 400
    existing_user = User.query.filter_by(username=username).first()

    if existing_user is not None:
        return jsonify({
            "error": "Username already exists."
        }), 409
    new_user = User(
        username=username,
        role=role
    )

    new_user.set_password(password)

    db.session.add(new_user)
    db.session.commit()
    

    return jsonify({
        "message": "User created successfully.",
        "id": new_user.id,
        "username": new_user.username,
        "role": new_user.role
    }), 201
@app.route("/admin/users/<int:user_id>", methods=["DELETE"])
def admin_delete_user(user_id):
    admin, error = require_admin()

    if error:
        return error

    user = db.session.get(User, user_id)

    if user is None:
        return jsonify({"error": "User not found."}), 404

    if user.id == admin.id:
        return jsonify({
            "error": "You cannot delete your own account."
        }), 403

    db.session.delete(user)
    db.session.commit()

    return jsonify({
        "message": "User deleted successfully."
    }), 200
@app.route("/admin/users/<int:user_id>", methods=["PUT"])
def admin_update_user(user_id):
    admin, error = require_admin()

    if error:
        return error

    user = db.session.get(User, user_id)

    if user is None:
        return jsonify({"error": "User not found."}), 404

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "Invalid request data."}), 400

    username = data.get("username")
    role = data.get("role")

    if not isinstance(username, str) or not username.strip():
        return jsonify({"error": "Username is required."}), 400

    username = username.strip()

    if role not in ("student", "teacher", "admin"):
        return jsonify({"error": "Invalid role."}), 400

    if user.id == admin.id and role != "admin":
        return jsonify({
            "error": "You cannot remove your own admin role."
        }), 403

    existing_user = User.query.filter_by(username=username).first()

    if existing_user is not None and existing_user.id != user.id:
        return jsonify({"error": "Username already exists."}), 409

    user.username = username
    user.role = role

    db.session.commit()

    return jsonify({
        "message": "User updated successfully.",
        "id": user.id,
        "username": user.username,
        "role": user.role
    }), 200
# ==========================================
# STUDENT ROUTES
# ==========================================

# Teammate 1 adds student routes here


# ==========================================
# TEACHER ROUTES
# ==========================================

# Teammate 2 adds teacher routes here

if __name__ == "__main__":
    app.run(debug=True, port=5000)
