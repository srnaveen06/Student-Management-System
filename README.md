# 🎓 Student Management System

A full-stack web application for managing student records with a modern, responsive UI. Built with React 19, Node.js, Express.js, and MySQL.

![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react)
![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=flat&logo=node.js)
![Express](https://img.shields.io/badge/Express-4-000000?style=flat&logo=express)
![MySQL](https://img.shields.io/badge/MySQL-8-4479A1?style=flat&logo=mysql)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 📸 Features

### Dashboard
- Total, Active, Inactive student counts
- Total branches count
- Recently added students list
- Quick statistics with animated cards

### Student Management
- Full CRUD operations (Create, Read, Update, Delete)
- Profile photo upload with preview
- Responsive data table with sticky headers
- Search by name, student ID, email, or phone
- Filter by branch, semester, gender, and status
- Sort by name (A-Z, Z-A), newest, or oldest
- Pagination (10 students per page)

### Authentication
- JWT-based admin login
- Protected routes
- Auto-redirect on token expiry

### UI/UX
- Modern, minimal design with CSS variables
- Dark mode toggle
- Toast notifications
- Loading spinners
- Confirmation modals for delete
- Responsive across desktop, tablet, and mobile
- Print-friendly styles

### Extra Features
- Export student data to CSV
- 404 page
- Image upload with Multer
- Form validation (client-side and server-side)

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, React Router DOM, Axios, CSS3 |
| Backend | Node.js, Express.js, JWT, Multer |
| Database | MySQL 8 |
| Tools | VS Code, Postman, Git |

---

## 📁 Project Structure

```
student-management-system/
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar/Navbar.jsx
│   │   │   ├── Sidebar/Sidebar.jsx
│   │   │   ├── DashboardCard/DashboardCard.jsx
│   │   │   ├── StudentTable/StudentTable.jsx
│   │   │   ├── StudentForm/StudentForm.jsx
│   │   │   ├── Pagination/Pagination.jsx
│   │   │   ├── SearchBar/SearchBar.jsx
│   │   │   ├── Loader/Loader.jsx
│   │   │   ├── Modal/Modal.jsx
│   │   │   └── ProtectedRoute.jsx
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Students.jsx
│   │   │   ├── AddStudent.jsx
│   │   │   ├── EditStudent.jsx
│   │   │   ├── Login.jsx
│   │   │   └── NotFound.jsx
│   │   ├── services/
│   │   │   ├── studentApi.js
│   │   │   └── authApi.js
│   │   ├── context/
│   │   │   ├── ThemeContext.jsx
│   │   │   └── ToastContext.jsx
│   │   ├── styles/
│   │   │   ├── variables.css
│   │   │   ├── App.css
│   │   │   ├── navbar.css
│   │   │   ├── sidebar.css
│   │   │   ├── dashboard.css
│   │   │   ├── table.css
│   │   │   ├── form.css
│   │   │   ├── layout.css
│   │   │   └── responsive.css
│   │   ├── App.jsx
│   │   └── index.js
│   └── package.json
├── backend/
│   ├── config/db.js
│   ├── controllers/
│   │   ├── studentController.js
│   │   └── authController.js
│   ├── routes/
│   │   ├── studentRoutes.js
│   │   └── authRoutes.js
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   └── uploadMiddleware.js
│   ├── models/studentModel.js
│   ├── uploads/
│   ├── server.js
│   ├── package.json
│   └── .env
├── database/
│   └── schema.sql
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **MySQL** (v8 or higher)
- **npm** or **yarn**

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/student-management-system.git
cd student-management-system
```

### 2. Set Up MySQL Database

Open MySQL workbench or terminal and run:

```sql
-- Run the SQL script from the database folder
source database/schema.sql;
```

Or manually copy-paste the contents of `database/schema.sql` into MySQL.

> **Note:** Update the admin password hash if needed. The default login is `admin` / `admin123`.

### 3. Set Up Backend

```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=student_management
DB_PORT=3306
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRES_IN=24h
PORT=5000
```

Start the backend server:

```bash
npm run dev
```

The API will run at `http://localhost:5000`.

### 4. Set Up Frontend

```bash
cd frontend
npm install
npm start
```

The frontend will run at `http://localhost:3000`.

### 5. Login

Navigate to `http://localhost:3000/login` and use:

- **Username:** `admin`
- **Password:** `admin123`

---

## 📡 API Endpoints

### Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/login` | Admin login | No |
| GET | `/api/auth/verify` | Verify JWT token | Yes |

### Students

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/students` | Get all students (with query params) | Yes |
| GET | `/api/students/stats` | Get dashboard statistics | Yes |
| GET | `/api/students/branches` | Get unique branches | Yes |
| GET | `/api/students/:id` | Get single student | Yes |
| POST | `/api/students` | Create student (multipart/form-data) | Yes |
| PUT | `/api/students/:id` | Update student (multipart/form-data) | Yes |
| DELETE | `/api/students/:id` | Delete student | Yes |

### Query Parameters for GET /api/students

| Param | Type | Description |
|-------|------|-------------|
| search | string | Search by name, student_id, email, phone |
| branch | string | Filter by branch name |
| semester | number | Filter by semester |
| gender | string | Filter by gender |
| status | string | Filter by Active/Inactive |
| sort | string | name_asc, name_desc, oldest (default: newest) |
| page | number | Page number (default: 1) |
| limit | number | Results per page (default: 10) |

### Postman Testing

**Login:**
```json
POST http://localhost:5000/api/auth/login
{
  "username": "admin",
  "password": "admin123"
}
```

**Get Students (with token):**
```
GET http://localhost:5000/api/students?page=1&search=aro
Headers: Authorization: Bearer <your_token>
```

**Create Student:**
```
POST http://localhost:5000/api/students
Headers: Authorization: Bearer <your_token>
Body: form-data with fields + image file
```

---

## 🎨 UI Theme

| Element | Color |
|---------|-------|
| Primary | `#2563EB` |
| Success | `#16A34A` |
| Danger | `#DC2626` |
| Background | `#F8FAFC` |
| Cards | `#FFFFFF` |
| Sidebar | `#1E293B` |
| Text | `#1E293B` |

---

## 🚢 Deployment

### Backend — Render

1. Push your code to GitHub
2. Go to [render.com](https://render.com) → New Web Service
3. Connect your GitHub repo
4. Settings:
   - **Build Command:** `cd backend && npm install`
   - **Start Command:** `cd backend && node server.js`
   - **Environment Variables:**
     - `DB_HOST` = your MySQL host (e.g., from PlanetScale, Railway, or Clever Cloud)
     - `DB_USER` = your MySQL username
     - `DB_PASSWORD` = your MySQL password
     - `DB_NAME` = student_management
     - `JWT_SECRET` = your_secret_key
     - `PORT` = 5000
5. Deploy

### Frontend — Vercel

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your GitHub repo
3. Settings:
   - **Framework:** Create React App
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `build`
   - **Environment Variable:**
     - `REACT_APP_API_URL` = `https://your-backend-url.onrender.com/api`
4. Deploy

### MySQL Database — Free Options

- **PlanetScale** (MySQL-compatible, free tier)
- **Railway** (MySQL hosting, free tier)
- **Clever Cloud** (MySQL, free tier)

---

## 🐛 Common Bugs & Fixes

| Issue | Solution |
|-------|----------|
| `ECONNREFUSED` MySQL | Make sure MySQL is running and `.env` credentials are correct |
| `CORS error` in browser | Add frontend URL to CORS origin in `server.js` |
| `Token expired` errors | Clear localStorage and login again |
| Images not loading | Make sure `uploads/` folder exists in backend |
| `Module not found` errors | Run `npm install` in the correct directory |
| Port already in use | Change PORT in `.env` or stop the other process |
| Form validation not showing | Check if state is being updated correctly |
| Dark mode not persisting | Clear browser cache and check localStorage |

---

## 📂 Folder Structure (Quick Reference)

- **`database/schema.sql`** — SQL script to create database and tables
- **`backend/`** — Express.js REST API server
- **`frontend/`** — React 19 SPA with routing
- **`frontend/src/styles/`** — All CSS files organized by component
- **`frontend/src/context/`** — Theme and Toast notification providers
- **`frontend/src/services/`** — Axios API service functions

---

## 📄 License

This project is licensed under the MIT License — feel free to use it for learning and portfolio purposes.

---

## 👨‍💻 Author

Built as a portfolio-ready full-stack project.

**Tech Stack:** React 19 · Node.js · Express.js · MySQL · JWT · Multer
