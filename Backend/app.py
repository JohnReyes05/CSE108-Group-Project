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

    name = db.Column(db.String(100), nullable=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def display_name(self):
        return self.name or self.username


# class offered by school taught by teacher
# student can see and enroll in classes, teachers see their own classes and students and can edit grades
class Course(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    name = db.Column(db.String(100), unique=True, nullable=False)
    time = db.Column(db.String(100), nullable=False)
    capacity = db.Column(db.Integer, nullable=False)
    teacher_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)

    teacher = db.relationship("User")
    enrollments = db.relationship(
        "Enrollment",
        back_populates="course",
        cascade="all, delete-orphan"
    )


# table showing which students are enrolled in which classes, and their grades
# grade is empty until one is
class Enrollment(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    student_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    course_id = db.Column(db.Integer, db.ForeignKey("course.id"), nullable=False)
    grade = db.Column(db.Float, nullable=True)

    student = db.relationship("User")
    course = db.relationship("Course", back_populates="enrollments")

    # a student can only be enrolled in the same course once
    __table_args__ = (
        db.UniqueConstraint("student_id", "course_id"),
    )

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
        "name": user.display_name(),
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
        "name": user.display_name(),
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
    admin, error = require_admin()

    if error:
        return error

    students = Grade.query.order_by(Grade.name).all()

    return jsonify([
        {"name": student.name, "grade": student.grade}
        for student in students
    ])


# Get one student's grade
@app.route("/grades/<string:name>", methods=["GET"])
def get_grade(name):
    admin, error = require_admin()

    if error:
        return error
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
    admin, error = require_admin()

    if error:
        return error
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
    admin, error = require_admin()

    if error:
        return error
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
    admin, error = require_admin()

    if error:
        return error
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
@app.route("/admin/courses", methods=["GET"])
def admin_get_courses():
    admin, error = require_admin()

    if error:
        return error

    courses = Course.query.order_by(Course.name).all()

    return jsonify([
        {
            "id": course.id,
            "name": course.name,
            "teacher_id": course.teacher_id,
            "teacher": course.teacher.display_name(),
            "time": course.time,
            "capacity": course.capacity,
            "enrolled": len(course.enrollments)
        }
        for course in courses
    ]), 200
@app.route("/admin/courses", methods=["POST"])
def admin_create_course():
    admin, error = require_admin()

    if error:
        return error

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "Invalid request data."}), 400

    name = data.get("name")
    time = data.get("time")
    capacity = data.get("capacity")
    teacher_id = data.get("teacher_id")
    if not isinstance(name, str) or not name.strip():
        return jsonify({"error": "Course name is required."}), 400

    if not isinstance(time, str) or not time.strip():
        return jsonify({"error": "Course time is required."}), 400

    if type(capacity) is not int or capacity <= 0:
        return jsonify({"error": "Capacity must be a positive integer."}), 400

    if type(teacher_id) is not int:
        return jsonify({"error": "Invalid teacher ID."}), 400

    name = name.strip()
    time = time.strip()
    teacher = db.session.get(User, teacher_id)

    if teacher is None or teacher.role != "teacher":
        return jsonify({
            "error": "Please select a valid teacher."
        }), 400
    existing_course = Course.query.filter_by(name=name).first()

    if existing_course is not None:
        return jsonify({
            "error": "A course with that name already exists."
        }), 409
    new_course = Course(
        name=name,
        time=time,
        capacity=capacity,
        teacher_id=teacher_id
    )

    db.session.add(new_course)
    db.session.commit()

    return jsonify({
        "message": "Course created successfully.",
        "id": new_course.id,
        "name": new_course.name,
        "teacher": teacher.display_name(),
        "time": new_course.time,
        "capacity": new_course.capacity
    }), 201
@app.route("/admin/courses/<int:course_id>", methods=["PUT"])
def admin_update_course(course_id):
    admin, error = require_admin()

    if error:
        return error

    course = db.session.get(Course, course_id)

    if course is None:
        return jsonify({"error": "Course not found."}), 404

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "Invalid request data."}), 400

    name = data.get("name")
    time = data.get("time")
    capacity = data.get("capacity")
    teacher_id = data.get("teacher_id")

    if not isinstance(name, str) or not name.strip():
        return jsonify({"error": "Course name is required."}), 400

    if not isinstance(time, str) or not time.strip():
        return jsonify({"error": "Course time is required."}), 400

    if type(capacity) is not int or capacity <= 0:
        return jsonify({"error": "Capacity must be a positive integer."}), 400

    if type(teacher_id) is not int:
        return jsonify({"error": "Invalid teacher ID."}), 400

    teacher = db.session.get(User, teacher_id)

    if teacher is None or teacher.role != "teacher":
        return jsonify({"error": "Please select a valid teacher."}), 400

    name = name.strip()
    time = time.strip()

    existing_course = Course.query.filter_by(name=name).first()

    if existing_course is not None and existing_course.id != course.id:
        return jsonify({"error": "Course name already exists."}), 409

    if capacity < len(course.enrollments):
        return jsonify({
            "error": "Capacity cannot be smaller than current enrollment."
        }), 400

    course.name = name
    course.time = time
    course.capacity = capacity
    course.teacher_id = teacher_id

    db.session.commit()

    return jsonify({
        "message": "Course updated successfully.",
        "id": course.id,
        "name": course.name,
        "time": course.time,
        "capacity": course.capacity,
        "teacher_id": course.teacher_id
    }), 200
@app.route("/admin/courses/<int:course_id>", methods=["DELETE"])
def admin_delete_course(course_id):
    admin, error = require_admin()

    if error:
        return error

    course = db.session.get(Course, course_id)

    if course is None:
        return jsonify({"error": "Course not found."}), 404

    if len(course.enrollments) > 0:
        return jsonify({
            "error": "Cannot delete a course with enrolled students."
        }), 409

    db.session.delete(course)
    db.session.commit()

    return jsonify({
        "message": "Course deleted successfully."
    }), 200
# ==========================================
# STUDENT ROUTES
# ==========================================

# Teammate 1 adds student routes here


class Course(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    teacher = db.Column(db.String(100), nullable=False)
    time = db.Column(db.String(100), nullable=False)
    capacity = db.Column(db.Integer, nullable=False)
    #students = db.relationship('User', secondary=student_classes, backref='enrolled_classes')

class Enrollment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    course_id = db.Column(db.Integer, db.ForeignKey('course.id'), nullable=False)
    grade = db.Column(db.Float, nullable=True)

    user = db.relationship('User', backref='enrollments')
    course = db.relationship('Course', backref='enrollments')

    __table_args__= (
        db.UniqueConstraint('user_id', 'course_id', name='one_enrollment_per_class'),
    )

with app.app_context():
    db.create_all()

    #if Course.query.count() == 0:
    #    courses = [
    #        Course(name="j", teacher="j", time="11:00-12:00", capacity=10),
    #        Course(name="k", teacher="k", time="12:00-13:00", capacity=10),
    #        Course(name="l", teacher="l", time="13:00-14:00", capacity=10),   
    #    ]
    #    db.session.add_all(courses)
    #    for s in User.query.filter_by(role="student").all():
    #        s.enrolled_classes.extend(courses[:2])
    #    db.session.commit()

@app.route("/my-classes", methods=["GET"])
def get_my_classes():
    user_id = session.get("user_id")
    if user_id is None:
        return jsonify({"error": "Not logged in"}), 401

    user = db.session.get(User, user_id)
    if user is None or user.role != "student":
        return jsonify({"error": "Students only."}), 403

    return jsonify([
        {
            "id": e.course.id,
            "name": e.course.name,
            "teacher": e.course.teacher,
            "time": e.course.time,
            "enrolled": len(e.course.enrollments),
            "capacity": e.course.capacity
        }
        for e in user.enrollments
    ])

@app.route("/classes", methods=["GET"])
def get_all_classes():
    if session.get("user_id") is None:
        return jsonify({"error": "Not logged in"}), 401
    courses = Course.query.order_by(Course.name).all()
    return jsonify([
        {
            "id": c.id,
            "name": c.name,
            "teacher": c.teacher,
            "time": c.time,
            "enrolled": len(c.enrollments),
            "capacity": c.capacity
        }
        for c in courses
    ])


@app.route("/enroll/<int:course_id>", methods=["POST"])
def enroll(course_id):
    user_id = session.get("user_id")
    if user_id is None:
        return jsonify({"error": "Not logged in"}), 401

    user = db.session.get(User, user_id)
    if user is None or user.role != "student":
        return jsonify({"error": "Students only."}), 403

    course = db.session.get(Course, course_id)
    if course is None:
        return jsonify({"error": "Class not found."}), 404

    if Enrollment.query.filter_by(user_id=user.id, course_id=course.id).first():
        return jsonify({"error": "Already enrolled."}), 409

    count = Enrollment.query.filter_by(course_id=course.id).count()
    if count >= course.capacity:
        return jsonify({"error": "Class is full."}), 409

    db.session.add(Enrollment(user_id=user.id, course_id=course.id))
    db.session.commit()
    return jsonify({"message": "Enrolled."}), 201


@app.route("/enroll/<int:course_id>", methods=["DELETE"])
def drop(course_id):
    user_id = session.get("user_id")
    if user_id is None:
        return jsonify({"error": "Not logged in"}), 401

    user = db.session.get(User, user_id)
    if user is None or user.role != "student":
        return jsonify({"error": "Students only."}), 403

    enrollment = Enrollment.query.filter_by(user_id=user.id, course_id=course_id).first()
    if enrollment is None:
        return jsonify({"error": "Not enrolled in that class."}), 404

    db.session.delete(enrollment)
    db.session.commit()
    return jsonify({"message": "Dropped."}), 200

# ==========================================
# TEACHER ROUTES
# ==========================================

# returns (user, None) if the logged-in user has the given role
# (None, error_response) if they are not logged in / not allowed
# The student routes can reuse this with require_role("student")
def require_role(role):
    user_id = session.get("user_id")

    if user_id is None:
        return None, (jsonify({"error": "Not logged in."}), 401)

    user = db.session.get(User, user_id)

    if user is None:
        session.clear()
        return None, (jsonify({"error": "Not logged in."}), 401)

    if user.role != role:
        return None, (jsonify({"error": "You do not have access to this."}), 403)

    return user, None


# finds a course by ID and checks that the given teacher teaches it
def get_teacher_course(teacher, course_id):
    course = db.session.get(Course, course_id)

    if course is None:
        return None, (jsonify({"error": "Course not found."}), 404)

    if course.teacher_id != teacher.id:
        return None, (jsonify({"error": "You do not teach this course."}), 403)

    return course, None


def course_to_dict(course):
    return {
        "id": course.id,
        "name": course.name,
        "teacher": course.teacher.display_name(),
        "time": course.time,
        "enrolled": len(course.enrollments),
        "capacity": course.capacity
    }


# teacher can see all of their courses
@app.route("/teacher/courses", methods=["GET"])
def teacher_courses():
    teacher, error = require_role("teacher")

    if error:
        return error

    courses = (
        Course.query
        .filter_by(teacher_id=teacher.id)
        .order_by(Course.name)
        .all()
    )

    return jsonify([course_to_dict(course) for course in courses]), 200


# see students in course, with their grades
@app.route("/teacher/courses/<int:course_id>/students", methods=["GET"])
def teacher_course_students(course_id):
    teacher, error = require_role("teacher")

    if error:
        return error

    course, error = get_teacher_course(teacher, course_id)

    if error:
        return error

    enrollments = sorted(
        course.enrollments,
        key=lambda enrollment: enrollment.student.display_name().lower()
    )

    return jsonify({
        "course": course_to_dict(course),
        "students": [
            {
                "student_id": enrollment.student_id,
                "name": enrollment.student.display_name(),
                "grade": enrollment.grade
            }
            for enrollment in enrollments
        ]
    }), 200


# this edits student grades
# Body: {"grade": 92}  (reuses read_grade() for the 0-100 check)
@app.route(
    "/teacher/courses/<int:course_id>/students/<int:student_id>/grade",
    methods=["PUT"]
)
def teacher_update_grade(course_id, student_id):
    teacher, error = require_role("teacher")

    if error:
        return error

    course, error = get_teacher_course(teacher, course_id)

    if error:
        return error

    enrollment = Enrollment.query.filter_by(
        course_id=course.id,
        student_id=student_id
    ).first()

    if enrollment is None:
        return jsonify({"error": "That student is not in this course."}), 404

    grade, error = read_grade()

    if error:
        return error

    enrollment.grade = grade
    db.session.commit()

    return jsonify({
        "message": "Grade updated successfully.",
        "student_id": enrollment.student_id,
        "name": enrollment.student.display_name(),
        "grade": enrollment.grade
    }), 200

if __name__ == "__main__":
    app.run(debug=True, port=5000)
