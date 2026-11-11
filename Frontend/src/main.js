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
        loginSection.hidden = true;
        dashboard.hidden = false;

        await getAllGrades();

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
            return;
        }

        const user = await response.json();

        loginSection.hidden = true;
        dashboard.hidden = false;

        console.log('Already logged in as:', user.username);

        await getAllGrades();

    } catch (error) {
        loginSection.hidden = false;
        dashboard.hidden = true;
    }
}

checkSession();

logoutButton.addEventListener('click', async () => {
    try {
        const response = await fetch('/logout', {
            method: 'POST',
            credentials: 'same-origin'
        });

        if (!response.ok) {
            throw new Error('Logout failed.');
        }

        dashboard.hidden = true;
        loginSection.hidden = false;

        document.getElementById('loginPassword').value = '';
        loginMessage.textContent = '';

    } catch (error) {
        alert('Could not log out. Please try again.');
    }
});