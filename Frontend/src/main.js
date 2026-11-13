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

    if (user.role === 'admin') {
        dashboard.hidden = false;
        document.getElementById('welcomeSection').hidden = true;
        getAllGrades();
    } else if (user.role === 'teacher') {
        dashboard.hidden = true;
        document.getElementById('welcomeSection').hidden = true;
        showTeacherDashboard(user);
    } else {
        dashboard.hidden = true;
        document.getElementById('welcomeSection').hidden = false;

        document.getElementById('welcomeMessage').textContent =
            `Welcome, ${user.username}!`;
    }
}
// ==========================================
// ADMIN DASHBOARD
// ==========================================

// getAllGrades()
// displayGrades()
// Add, edit, delete, and search


// ==========================================
// STUDENT DASHBOARD
// ==========================================

// Teammate 1 adds student functions here


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