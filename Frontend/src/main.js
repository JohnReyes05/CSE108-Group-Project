import './style.css';

const API_URL = '';

const gradesTable = document.getElementById('gradesTable');
const message = document.getElementById('message');
const editMessage = document.getElementById('editMessage');
const loginButton = document.getElementById('loginButton');
const loginMessage = document.getElementById('loginMessage');
const loginSection = document.getElementById('loginSection');
const dashboard = document.getElementById('dashboard');
const logoutButton = document.getElementById('logoutButton');

async function getAllGrades() {
  try{
    message.textContent = 'Loading grades...';
    const response = await fetch(`${API_URL}/grades`);
    if (!response.ok) {
      throw new Error('Could not retrieve grades!');
    }
    const data = await response.json();

    displayGrades(data);
    message.textContent = '';
  } catch (error) {
    message.textContent = error.message;
  }
}

function displayGrades(data) {
  gradesTable.replaceChildren();

  let students;

  if (Array.isArray(data)) {
    students = data;
  } else if (data && typeof data === 'object') {
    students = Object.entries(data).map(([name, value]) => {
      if (value && typeof value === 'object') {
        return { name, ...value };
      }
      return { name, grade: value };
    });
  } else {
    message.textContent = 'Unexpected response from the server.';
    return;
  }

  students.forEach(student => {
    const row = document.createElement('tr');
    const nameCell = document.createElement('td');
    nameCell.textContent = student.name ?? 'Unknown';
    
    const gradeCell = document.createElement('td');
    gradeCell.textContent = student.grade ?? 'No grade';

    
const actionsCell = document.createElement('td');

const deleteButton = document.createElement('button');
deleteButton.textContent = 'Delete';

deleteButton.addEventListener('click', () => {
  deleteStudent(student.name ?? nameCell.textContent);
});

actionsCell.appendChild(deleteButton);

row.append(nameCell, gradeCell, actionsCell);
gradesTable.appendChild(row);

  });
}

document.getElementById('refreshButton')
  .addEventListener('click', getAllGrades);


document.getElementById('searchButton')
  .addEventListener('click', async () => {
    const name = document.getElementById('searchName').value.trim();
    const searchResult = document.getElementById('searchResult');

    if (!name) {
      searchResult.textContent = 'Please enter a student name.';
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/grades/${encodeURIComponent(name)}`
      );

      if (!response.ok) {
        searchResult.textContent = 'Student not found.';
        return;
      }

      
const student = await response.json();

let nameToShow;
let gradeToShow;

if (Array.isArray(student)) {
  nameToShow = student[0]?.name ?? name;
  gradeToShow = student[0]?.grade ?? 'No grade';
} else if (student && typeof student === 'object') {
  // Handle an object containing the student's information
  if (student[name] !== undefined) {
    nameToShow = name;
    gradeToShow = student[name];
  } else {
    nameToShow = student.name ?? name;
    gradeToShow = student.grade ?? 'No grade';
  }
} else {
  searchResult.textContent = 'Unexpected response from server.';
  return;
}

searchResult.textContent = `${nameToShow}: ${gradeToShow}`;
    } catch (error) {
      searchResult.textContent = 'Could not connect to the server.';
    }
  });


document.getElementById('addButton')
  .addEventListener('click', async () => {
    const name = document.getElementById('newName').value.trim();
    const gradeInput = document.getElementById('newGrade').value;
    const grade = Number(gradeInput);

    if (!name || gradeInput === '') {
      message.textContent = 'Please enter a name and grade.';
      return;
    }

    if (!Number.isFinite(grade) || grade < 0 || grade > 100) {
      message.textContent = 'Grade must be between 0 and 100.';
      return;
    }

    try {
      const response = await fetch(`${API_URL}/grades`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, grade })
      });

      if (!response.ok) {
        throw new Error('Could not add student.');
      }

      await response.json();

      message.textContent = `Added ${name} successfully!`;

      document.getElementById('newName').value = '';
      document.getElementById('newGrade').value = '';

      await getAllGrades();
    } catch (error) {
      message.textContent = error.message;
    }
  });


document.getElementById('editButton')
  .addEventListener('click', async () => {
    const name = document.getElementById('editName').value.trim();
    const gradeInput = document.getElementById('editGrade').value;
    const grade = Number(gradeInput);

    if (!name || gradeInput === '') {
      editMessage.textContent = 'Please enter a student name and grade.';
      return;
    }

    if (!Number.isFinite(grade) || grade < 0 || grade > 100) {
      editMessage.textContent = 'Grade must be between 0 and 100.';
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/grades/${encodeURIComponent(name)}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ grade })
        }
      );

      if (!response.ok) {
        throw new Error('Could not update grade. Check the student name.');
      }

      await response.json();

      editMessage.textContent = `Updated ${name}'s grade successfully!`;

      document.getElementById('editName').value = '';
      document.getElementById('editGrade').value = '';

      await getAllGrades();
    } catch (error) {
      editMessage.textContent = error.message;
    }
  });


async function deleteStudent(name) {
  const confirmed = window.confirm(
    `Are you sure you want to delete ${name}?`
  );

  if (!confirmed) {
    return;
  }

  try {
    const response = await fetch(
      `${API_URL}/grades/${encodeURIComponent(name)}`,
      {
        method: 'DELETE'
      }
    );

    if (!response.ok) {
      throw new Error('Could not delete student.');
    }

    await response.json();

    message.textContent = `Deleted ${name} successfully!`;

    await getAllGrades();
  } catch (error) {
    message.textContent = error.message;
  }
}


loginButton.addEventListener('click', async () => {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!username || !password) {
        loginMessage.textContent = 'Please enter a username and password.';
        return;
    }

    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'same-origin',
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (!response.ok) {
            loginMessage.textContent = data.error || 'Login failed.';
            return;
        }

        loginMessage.textContent = '';
        showLoggedInUser(data);

        console.log('Logged in as:', data.username);
        console.log('Role:', data.role);

    } catch (error) {
        loginMessage.textContent = 'Could not connect to the server.';
    }
});
async function checkSession() {
    try {
        const response = await fetch('/me');

        if (!response.ok) {
            loginSection.hidden = false;
            dashboard.hidden = true;
            document.getElementById('welcomeSection').hidden = true;
            return;
        }

        const user = await response.json();

        showLoggedInUser(user);

        console.log('Already logged in as:', user.username);

    } catch (error) {
        loginSection.hidden = false;
        dashboard.hidden = true;
        document.getElementById('welcomeSection').hidden = true;
    }
}

checkSession();

async function logout() {
    try {
        const response = await fetch('/logout', {
            method: 'POST',
            credentials: 'same-origin'
        });

        if (!response.ok) {
            throw new Error('Logout failed.');
        }

        dashboard.hidden = true;
        document.getElementById('welcomeSection').hidden = true;
        document.getElementById('studentDashboard').hidden = true;
        hideTeacherDashboard();
        loginSection.hidden = false;

        document.getElementById('loginPassword').value = '';
        loginMessage.textContent = '';

    } catch (error) {
        console.error('Logout error:', error);
        alert('Could not log out. Please try again.');
    }
}

logoutButton.addEventListener('click', logout);

document.getElementById('welcomeLogoutButton')
    .addEventListener('click', logout);

function showLoggedInUser(user) {
    loginSection.hidden = true;

    dashboard.hidden = true;
    teacherDashboard.hidden = true;
    document.getElementById('studentDashboard').hidden = true;
    document.getElementById('welcomeSection').hidden = true;

    if (user.role === 'admin') {
        dashboard.hidden = false;

        getAllGrades();
        getAllUsers();
        getAllCourses();
        loadTeachers();

    } else if (user.role === 'teacher') {
        showTeacherDashboard(user);

    } else if (user.role === 'student') {
        document.getElementById('studentDashboard').hidden = false;

        document.getElementById('yourCoursesView').hidden = false;
        document.getElementById('addCoursesView').hidden = true;

        refreshStudentTables();

    } else {
        loginSection.hidden = false;
        loginMessage.textContent = 'Unknown account role.';
    }
}

// ==========================================
// ADMIN DASHBOARD
// ==========================================

// getAllGrades()
// displayGrades()
// Add, edit, delete, and search
const usersTable = document.getElementById('usersTable');
const usersMessage = document.getElementById('usersMessage');

async function getAllUsers() {
    try {
        usersMessage.textContent = 'Loading users...';

        const response = await fetch('/admin/users');

        if (!response.ok) {
            throw new Error('Could not retrieve users.');
        }

        const users = await response.json();

        displayUsers(users);
        usersMessage.textContent = '';

    } catch (error) {
        usersMessage.textContent = error.message;
    }
}
function displayUsers(users) {
    usersTable.replaceChildren();

    users.forEach(user => {
        const row = document.createElement('tr');

        const idCell = document.createElement('td');
        idCell.textContent = user.id;

        const usernameCell = document.createElement('td');
        usernameCell.textContent = user.username;

        const roleCell = document.createElement('td');
        roleCell.textContent = user.role;

        const actionsCell = document.createElement('td');

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';

        deleteButton.addEventListener('click', () => {
            deleteUser(user.id, user.username);
        });
        const editButton = document.createElement('button');
        editButton.textContent = 'Edit';

        editButton.addEventListener('click', () => {
            editUser(user);
        });

        actionsCell.appendChild(editButton);

        actionsCell.appendChild(deleteButton);

        row.append(idCell, usernameCell, roleCell, actionsCell);

        usersTable.appendChild(row);
    });
}
async function deleteUser(userId, username) {
    const confirmed = window.confirm(
        `Are you sure you want to delete ${username}?`
    );

    if (!confirmed) {
        return;
    }

    try {
        const response = await fetch(`/admin/users/${userId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (!response.ok) {
            usersMessage.textContent =
                data.error || 'Could not delete user.';
            return;
        }

        usersMessage.textContent =
            `Deleted ${username} successfully!`;

        await getAllUsers();

    } catch (error) {
        usersMessage.textContent =
            'Could not connect to the server.';
    }
}
async function editUser(user) {
    const username = window.prompt(
        'Enter new username:',
        user.username
    );

    if (username === null) {
        return;
    }

    const role = window.prompt(
        'Enter role (student, teacher, admin):',
        user.role
    );

    if (role === null) {
        return;
    }

    try {
        const response = await fetch(`/admin/users/${user.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username.trim(),
                role: role.trim().toLowerCase()
            })
        });

        const data = await response.json();

        if (!response.ok) {
            usersMessage.textContent =
                data.error || 'Could not update user.';
            return;
        }

        await getAllUsers();

        usersMessage.textContent =
            `Updated ${data.username} successfully!`;

    } catch (error) {
        usersMessage.textContent =
            'Could not connect to the server.';
    }
}
document.getElementById('refreshUsersButton')
    .addEventListener('click', getAllUsers);

document.getElementById('createUserButton')
    .addEventListener('click', async () => {

        const username = document.getElementById('createUsername').value.trim();
        const password = document.getElementById('createPassword').value;
        const role = document.getElementById('createRole').value;
        const createUserMessage = document.getElementById('createUserMessage');

        if (!username || !password) {
            createUserMessage.textContent = 'Please enter a username and password.';
            return;
        }

        try {
            const response = await fetch('/admin/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password, role })
            });

            const data = await response.json();

            if (!response.ok) {
                createUserMessage.textContent = data.error || 'Could not create user.';
                return;
            }

            createUserMessage.textContent = `Created ${data.username} successfully!`;

            document.getElementById('createUsername').value = '';
            document.getElementById('createPassword').value = '';

            await getAllUsers();

        } catch (error) {
            createUserMessage.textContent = 'Could not connect to the server.';
        }
    });
const coursesTable = document.getElementById('coursesTable');
const coursesMessage = document.getElementById('coursesMessage');

async function getAllCourses() {
    try {
        coursesMessage.textContent = 'Loading courses...';

        const response = await fetch('/admin/courses');

        if (!response.ok) {
            throw new Error('Could not retrieve courses.');
        }

        const courses = await response.json();

        displayCourses(courses);

        coursesMessage.textContent =
            courses.length === 0 ? 'No courses available.' : '';

    } catch (error) {
        coursesMessage.textContent = error.message;
    }
}
function displayCourses(courses) {
    coursesTable.replaceChildren();

    courses.forEach(course => {
        const row = document.createElement('tr');

        const idCell = document.createElement('td');
        idCell.textContent = course.id;

        const nameCell = document.createElement('td');
        nameCell.textContent = course.name;

        const teacherCell = document.createElement('td');
        teacherCell.textContent = course.teacher;

        const timeCell = document.createElement('td');
        timeCell.textContent = course.time;

        const enrolledCell = document.createElement('td');
        enrolledCell.textContent =
            `${course.enrolled}/${course.capacity}`;
        const actionsCell = document.createElement('td');

        const editButton = document.createElement('button');
        editButton.textContent = 'Edit';

        editButton.addEventListener('click', () => {
            editCourse(course);
        });

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';

        deleteButton.addEventListener('click', () => {
            deleteCourse(course);
        });

        actionsCell.append(editButton, deleteButton);
        row.append(
            idCell,
            nameCell,
            teacherCell,
            timeCell,
            enrolledCell,
            actionsCell
        );

        coursesTable.appendChild(row);
    });
}
async function editCourse(course) {
    const name = window.prompt('Course name:', course.name);
    if (name === null) return;

    const time = window.prompt('Course schedule:', course.time);
    if (time === null) return;

    const capacityInput = window.prompt('Course capacity:', course.capacity);
    if (capacityInput === null) return;

    const teacherInput = window.prompt('Teacher ID:', course.teacher_id);
    if (teacherInput === null) return;

    const capacity = Number(capacityInput);
    const teacher_id = Number(teacherInput);

    if (!name.trim() || !time.trim() ||
        !Number.isInteger(capacity) || capacity <= 0 ||
        !Number.isInteger(teacher_id) || teacher_id <= 0) {
        coursesMessage.textContent = 'Please enter valid course information.';
        return;
    }

    try {
        const response = await fetch(`/admin/courses/${course.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: name.trim(),
                time: time.trim(),
                capacity,
                teacher_id
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Could not update course.');
        }

        await getAllCourses();
        coursesMessage.textContent = data.message;

    } catch (error) {
        coursesMessage.textContent = error.message;
    }
}
async function deleteCourse(course) {
    const confirmed = window.confirm(
        `Are you sure you want to delete ${course.name}?`
    );

    if (!confirmed) return;

    try {
        const response = await fetch(`/admin/courses/${course.id}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Could not delete course.');
        }

        await getAllCourses();
        coursesMessage.textContent = data.message;

    } catch (error) {
        coursesMessage.textContent = error.message;
    }
}
document.getElementById('refreshCoursesButton')
    .addEventListener('click', getAllCourses);

const createCourseForm = document.getElementById('createCourseForm');
const courseTeacher = document.getElementById('courseTeacher');
const createCourseMessage = document.getElementById('createCourseMessage');

async function loadTeachers() {
    try {
        const response = await fetch('/admin/users');

        if (!response.ok) {
            throw new Error('Could not load teachers.');
        }

        const users = await response.json();

        const teachers = users.filter(user => user.role === 'teacher');

        courseTeacher.replaceChildren();

        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Select a teacher';
        courseTeacher.appendChild(placeholder);

        teachers.forEach(teacher => {
            const option = document.createElement('option');

            option.value = teacher.id;
            option.textContent = teacher.username;

            courseTeacher.appendChild(option);
        });

    } catch (error) {
        createCourseMessage.textContent = error.message;
    }
}
createCourseForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const name = document.getElementById('courseName').value.trim();
    const time = document.getElementById('courseTime').value.trim();
    const capacity = Number(document.getElementById('courseCapacity').value);
    const teacher_id = Number(courseTeacher.value);

    createCourseMessage.textContent = '';

    try {
        const response = await fetch('/admin/courses', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: name,
                time: time,
                capacity: capacity,
                teacher_id: teacher_id
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Could not create course.');
        }

        createCourseMessage.textContent = result.message;

        createCourseForm.reset();

        await getAllCourses();

    } catch (error) {
        createCourseMessage.textContent = error.message;
    }
});

// ==========================================
// STUDENT DASHBOARD
// ==========================================

// Teammate 1 adds student functions here

async function loadMyClasses() {
  const tbody = document.getElementById('myClassesTable');
  const res = await fetch('/my-classes', { credentials: 'same-origin' });
  if (!res.ok)return;

  tbody.replaceChildren();
  (await res.json()).forEach(c => {
    const row = document.createElement('tr');
    [c.name, c.teacher, c.time, `${c.enrolled}/${c.capacity}`].forEach(text => {
      const td =document.createElement('td');
      td.textContent = text;
      row.appendChild(td);
    });
    tbody.appendChild(row);
  });
}

async function loadAllClasses() {
  const tbody = document.getElementById('addCoursesTable');
  const [allRes, myRes] = await Promise.all([
    fetch('/classes', { credentials: 'same-origin' }),
    fetch('/my-classes', { credentials: 'same-origin' })
  ]);
  if (!allRes.ok || !myRes.ok) return;

  const myIds = new Set((await myRes.json()).map(c => c.id));
  tbody.replaceChildren();

  (await allRes.json()).forEach(c => {
    const row = document.createElement('tr');
    row.dataset.courseId = c.id;

    [c.name, c.teacher, c.time, `${c.enrolled}/${c.capacity}`].forEach(text => {
      const td = document.createElement('td');
      td.textContent = text;
      row.appendChild(td);
    });

    const btn = document.createElement('button');
      if (myIds.has(c.id)) {
        btn.textContent = 'Remove';
        btn.style.backgroundColor = 'red';
        btn.style.color = 'white';
      } else if (c.enrolled >= c.capacity) {
        btn.textContent = 'Full';
        btn.disabled = true;
      } else {
        btn.textContent = 'Add class';
      }

      const actionTd = document.createElement('td');
        actionTd.appendChild(btn);
        row.appendChild(actionTd);
        tbody.appendChild(row);
      });
}

async function refreshStudentTables() {
  await loadMyClasses();
  await loadAllClasses();  
}


document.getElementById('addCoursesView').addEventListener('click', async (e) => {
  const btn = e.target.closest('button');
  if (!btn || btn.disabled) return;

  const courseId = btn.closest('tr').dataset.courseId;
  const method = btn.textContent === 'Remove' ? 'DELETE' : 'POST';

  const res = await fetch(`/enroll/${courseId}`, { method, credentials: 'same-origin' });
  const msg = document.getElementById('addCoursesMessage');
  msg.textContent = res.ok ? '' : (await res.json()).error;

  await refreshStudentTables();
});



document.getElementById('studentLogoutButton').addEventListener('click', logout);


document.getElementById('yourCoursesTab').addEventListener('click', () => {
  document.getElementById('yourCoursesView').hidden = false;
  document.getElementById('addCoursesView').hidden = true;
});

document.getElementById('addCoursesTab').addEventListener('click', () => {
  document.getElementById('addCoursesView').hidden = false;
  document.getElementById('yourCoursesView').hidden = true;
});


// ==========================================
// TEACHER DASHBOARD
// ==========================================

const teacherDashboard = document.getElementById('teacherDashboard');
const teacherCoursesView = document.getElementById('teacherCoursesView');
const teacherCourseView = document.getElementById('teacherCourseView');
const teacherCoursesTable = document.getElementById('teacherCoursesTable');
const teacherStudentsTable = document.getElementById('teacherStudentsTable');
const teacherCoursesMessage = document.getElementById('teacherCoursesMessage');
const teacherGradeMessage = document.getElementById('teacherGradeMessage');
const teacherCourseTitle = document.getElementById('teacherCourseTitle');

// Called by showLoggedInUser() when a teacher logs in
function showTeacherDashboard(user) {
  teacherDashboard.hidden = false;
  document.getElementById('teacherWelcome').textContent =
    `Welcome ${user.name ?? user.username}!`;

  showTeacherCourses();
}

// Called by logout() so the teacher view doesn't stay on screen
function hideTeacherDashboard() {
  teacherDashboard.hidden = true;
  teacherCoursesTable.replaceChildren();
  teacherStudentsTable.replaceChildren();
  teacherCoursesMessage.textContent = '';
  teacherGradeMessage.textContent = '';
}

// "Your Courses" table
async function showTeacherCourses() {
  teacherCourseView.hidden = true;
  teacherCoursesView.hidden = false;
  teacherCoursesMessage.textContent = 'Loading courses...';

  try {
    const response = await fetch(`${API_URL}/teacher/courses`, {
      credentials: 'same-origin'
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Could not load your courses.');
    }

    displayTeacherCourses(data);
    teacherCoursesMessage.textContent =
      data.length === 0 ? 'You are not teaching any courses yet.' : '';
  } catch (error) {
    teacherCoursesMessage.textContent = error.message;
  }
}

function displayTeacherCourses(courses) {
  teacherCoursesTable.replaceChildren();

  courses.forEach(course => {
    const row = document.createElement('tr');

    // Course name is a link that opens the student list
    const nameCell = document.createElement('td');
    const courseLink = document.createElement('button');
    courseLink.className = 'acme-link';
    courseLink.textContent = course.name;
    courseLink.addEventListener('click', () => showTeacherCourse(course.id));
    nameCell.appendChild(courseLink);

    const teacherCell = document.createElement('td');
    teacherCell.textContent = course.teacher;

    const timeCell = document.createElement('td');
    timeCell.textContent = course.time;

    const enrolledCell = document.createElement('td');
    enrolledCell.textContent = `${course.enrolled}/${course.capacity}`;

    row.append(nameCell, teacherCell, timeCell, enrolledCell);
    teacherCoursesTable.appendChild(row);
  });
}

// One course: students and their editable grades

async function showTeacherCourse(courseId) {
  teacherCoursesView.hidden = true;
  teacherCourseView.hidden = false;
  teacherCourseTitle.textContent = 'Loading...';
  teacherStudentsTable.replaceChildren();
  teacherGradeMessage.textContent = '';

  try {
    const response = await fetch(
      `${API_URL}/teacher/courses/${courseId}/students`,
      { credentials: 'same-origin' }
    );
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Could not load this course.');
    }

    teacherCourseTitle.textContent = data.course.name;
    displayTeacherStudents(courseId, data.students);

    if (data.students.length === 0) {
      teacherGradeMessage.textContent = 'No students are enrolled yet.';
    }
  } catch (error) {
    teacherCourseTitle.textContent = '';
    teacherGradeMessage.textContent = error.message;
  }
}

function displayTeacherStudents(courseId, students) {
  teacherStudentsTable.replaceChildren();

  students.forEach(student => {
    const row = document.createElement('tr');

    const nameCell = document.createElement('td');
    nameCell.textContent = student.name;

    const gradeCell = document.createElement('td');
    const gradeInput = document.createElement('input');
    gradeInput.type = 'number';
    gradeInput.min = '0';
    gradeInput.max = '100';
    gradeInput.step = 'any';
    gradeInput.className = 'acme-grade-input';
    gradeInput.placeholder = '—';
    gradeInput.value = student.grade ?? '';
    gradeInput.setAttribute('aria-label', `Grade for ${student.name}`);

    // Remember the last saved value so we can undo if necessary
    gradeInput.dataset.saved = gradeInput.value;

    // 'change' happens when you clicked away, or Enter is pressed
    gradeInput.addEventListener('change', () => {
      saveTeacherGrade(courseId, student, gradeInput);
    });

    gradeInput.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        gradeInput.blur();
      }
    });

    gradeCell.appendChild(gradeInput);
    row.append(nameCell, gradeCell);
    teacherStudentsTable.appendChild(row);
  });
}

async function saveTeacherGrade(courseId, student, gradeInput) {
  const gradeText = gradeInput.value;
  const grade = Number(gradeText);

  if (gradeText === '' || !Number.isFinite(grade) || grade < 0 || grade > 100) {
    teacherGradeMessage.textContent = 'Grade must be between 0 and 100.';
    gradeInput.value = gradeInput.dataset.saved;
    return;
  }

  teacherGradeMessage.textContent = `Saving ${student.name}'s grade...`;

  try {
    const response = await fetch(
      `${API_URL}/teacher/courses/${courseId}/students/${student.student_id}/grade`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'same-origin',
        body: JSON.stringify({ grade })
      }
    );
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Could not save the grade.');
    }

    gradeInput.value = data.grade;
    gradeInput.dataset.saved = gradeInput.value;
    teacherGradeMessage.textContent =
      `Saved ${student.name}'s grade as ${data.grade}.`;
  } catch (error) {
    gradeInput.value = gradeInput.dataset.saved;
    teacherGradeMessage.textContent = error.message;
  }
}

document.getElementById('teacherBackButton')
  .addEventListener('click', showTeacherCourses);

document.getElementById('teacherLogoutButton')
  .addEventListener('click', logout);