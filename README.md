# FarmPilot AI

AI-powered hydroponic and mushroom farming planner.

---

## Prerequisites

Install these first if not already installed:

| Tool | Download |
|---|---|
| Python 3.11+ | https://www.python.org/downloads/ |
| MySQL 8.0+ | https://dev.mysql.com/downloads/installer/ |
| Node.js 18+ | https://nodejs.org/en/download |

---

## Full Setup — Run These Commands Exactly

Open PowerShell and run each block in order.

---

### STEP 1 — Install Python dependencies

```powershell
cd "C:\Users\aditi\OneDrive\Desktop\Capstone\farmpilot\backend"
pip install -r requirements.txt
```

This installs FastAPI, uvicorn, SQLAlchemy, PyMySQL, JWT, Groq, ChromaDB, sentence-transformers, and everything else.

---

### STEP 2 — Create the .env file

```powershell
cd "C:\Users\aditi\OneDrive\Desktop\Capstone\farmpilot\backend"
copy .env.example .env
```

Then open `.env` in Notepad and fill in your MySQL root password:

```
DATABASE_URL=mysql+pymysql://root:YOUR_MYSQL_PASSWORD_HERE@localhost:3306/farmpilot
SECRET_KEY=anyRandomLongStringAtLeast32CharactersLong
GROQ_API_KEY=your_groq_key_here
```

---

### STEP 3 — Create MySQL database (run once ever)

Make sure MySQL is running, then in PowerShell:

```powershell
mysql -u root -p < "C:\Users\aditi\OneDrive\Desktop\Capstone\farmpilot\backend\setup_db.sql"
```

It will ask for your MySQL root password.

---

### STEP 4 — Create all tables (run once ever)

```powershell
cd "C:\Users\aditi\OneDrive\Desktop\Capstone\farmpilot\backend"
python scripts/setup_database.py
```

You should see:
```
✓ users
✓ projects
✓ activities
✓ reminders
✓ chat_messages
✓ Database setup complete!
```

---

### STEP 5 — Start the backend

```powershell
cd "C:\Users\aditi\OneDrive\Desktop\Capstone\farmpilot\backend"
uvicorn main:app --reload
```

Backend runs at: http://localhost:8000
API docs at:     http://localhost:8000/docs

---

### STEP 6 — Install frontend packages (run once ever)

Open a NEW PowerShell window:

```powershell
cd "C:\Users\aditi\OneDrive\Desktop\Capstone\farmpilot\frontend"
npm install
```

---

### STEP 7 — Start the frontend

```powershell
cd "C:\Users\aditi\OneDrive\Desktop\Capstone\farmpilot\frontend"
npm run dev
```

App runs at: http://localhost:5173

---

## Every time you want to run the app

**Terminal 1 — Backend:**
```powershell
cd "C:\Users\aditi\OneDrive\Desktop\Capstone\farmpilot\backend"
uvicorn main:app --reload
```

**Terminal 2 — Frontend:**
```powershell
cd "C:\Users\aditi\OneDrive\Desktop\Capstone\farmpilot\frontend"
npm run dev
```

Then open http://localhost:5173

---

## Troubleshooting

**uvicorn not recognized:**
```powershell
pip install uvicorn
```

**pip not recognized:**
```powershell
python -m pip install -r requirements.txt
```
and use `python -m uvicorn main:app --reload`

**MySQL connection error:**
- Make sure MySQL service is running (search "Services" in Windows Start menu)
- Check your password in `.env` matches your MySQL root password

**ChromaDB / torch install takes long:**
- Normal — sentence-transformers downloads a ~90MB model on first run
- Just wait, it only downloads once
