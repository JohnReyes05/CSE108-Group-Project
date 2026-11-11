CSE 108 Group Project

Project setup

1. Clone the repository

    git clone https://github.com/JohnReyes05/CSE108-Group-Project.git

2. Set up Python virtual enviorment

    py -m venv venv
    venv\Scripts\activate

3. Install backend dependencies

    python -m pip install -r Backend/requirements.txt

4. Install frontend dependencies

    cd Frontend
    npm install
    npm run build

5. Set Up Flask Secret Key

    Generate a secret key:

    python -c "import secrets; print(secrets.token_hex(32))"

    Copy the generated value and set it using:

    set "FLASK_SECRET_KEY=YOUR_GENERATED_KEY"

    Replace YOUR_GENERATED_KEY with your generated key.

    The secret key is required for Flask login sessions. Each group member can generate their own key.

    Important: Set the key in the same terminal where you will run Flask. Do not upload secret  keys to GitHub.
    
6. Running the Project

    From the project root run:
    python Backend/app.py

    Open your browser and go to:
    http://127.0.0.1:5000

7. Create Test Accounts
    Each group member has their own local SQLite database because database files are not uploaded to GitHub.

    To create a test account, run:
    python Backend/create_user.py

    Enter a username, password, and role when prompted. (password might seem like youre not typing anything it is just hidden)

    
Important Notes

