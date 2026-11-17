# THE PURPOSE OF THIS FILE IS TO USE THE DEMO DATA THAT WE WERE GIVEN.
# Every account it creates uses DEMO_PASSWORD
# Teacher logins:  ahepworth (CS 106, CS 162), swalker, rjenkins

from app import app, db, User, Course, Enrollment

DEMO_PASSWORD = "acme-demo-123"

# username, full name, role
USERS = [
    # Teachers
    ("ahepworth", "Ammon Hepworth", "teacher"),
    ("swalker", "Susan Walker", "teacher"),
    ("rjenkins", "Ralph Jenkins", "teacher"),

    # Students
    ("jsantos", "Jose Santos", "student"),
    ("bbrown", "Betty Brown", "student"),
    ("jstuart", "John Stuart", "student"),
    ("lcheng", "Li Cheng", "student"),
    ("nlittle", "Nancy Little", "student"),
    ("mnorris", "Mindy Norris", "student"),
    ("aranganath", "Aditya Ranganath", "student"),
    ("ychen", "Yi Wen Chen", "student"),
]

# course name, teacher username, time, capacity,
# then [(student username, grade), ...]
COURSES = [
    ("Math 101", "rjenkins", "MWF 10:00-10:50 AM", 8, [
        ("jsantos", 92),
        ("bbrown", 65),
        ("jstuart", 86),
        ("lcheng", 77),
    ]),
    ("Physics 121", "swalker", "TR 11:00-11:50 AM", 10, [
        ("nlittle", 53),
        ("lcheng", 85),
        ("mnorris", 94),
        ("jstuart", 91),
        ("bbrown", 88),
    ]),
    ("CS 106", "ahepworth", "MWF 2:00-2:50 PM", 10, [
        ("aranganath", 93),
        ("ychen", 85),
        ("nlittle", 57),
        ("mnorris", 68),
    ]),
    ("CS 162", "ahepworth", "TR 3:00-3:50 PM", 4, [
        ("aranganath", 99),
        ("nlittle", 87),
        ("ychen", 92),
        ("jstuart", 67),
    ]),
]


with app.app_context():
    users = {}

    for username, name, role in USERS:
        user = User.query.filter_by(username=username).first()

        if user is None:
            user = User(username=username, name=name, role=role)
            user.set_password(DEMO_PASSWORD)
            db.session.add(user)
            print(f"Created {role}: {username} ({name})")

        users[username] = user

    db.session.flush()

    for name, teacher_username, time, capacity, roster in COURSES:
        course = Course.query.filter_by(name=name).first()

        if course is None:
            course = Course(
                name=name,
                teacher=users[teacher_username],
                time=time,
                capacity=capacity
            )
            db.session.add(course)
            db.session.flush()
            print(f"Created course: {name}")

        for student_username, grade in roster:
            student = users[student_username]

            exists = Enrollment.query.filter_by(
                course_id=course.id,
                student_id=student.id
            ).first()

            if exists is None:
                db.session.add(
                    Enrollment(course=course, student=student, grade=grade)
                )

    db.session.commit()

    print()
    print("Done! Example teacher login:")
    print(f"    username: ahepworth    password: {DEMO_PASSWORD}")
