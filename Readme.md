# 🎬 Video Streaming Platform Backend

A full-featured backend for a **video streaming platform** with user authentication, email verification, password reset via OTP, and advanced video management using **caching, pagination, indexing, and aggregation pipelines**.

---

## 🚀 Features

### **User Module**
- User registration & login  
- Logout  
- Email verification  
- Forgot password using OTP  
- JWT authentication & middleware for protected routes  

### **Video Module**
- Fetch video by ID with **LRU caching** for frequent access  
- Incremental **views update** for videos  
- Fetch all videos with **pagination, indexing, and aggregation pipelines**  
- Performance logging (cache hits/misses & response time)  
- Supports **random video selection** for testing  

### **General**
- Centralized **error handling middleware**  
- Modular and scalable project structure  
- Easy integration with a frontend  

---

## 🛠️ Tech Stack

- **Backend:** Node.js, Express.js  
- **Database:** MongoDB & Mongoose  
- **Authentication:** JWT  
- **Email Service:** Nodemailer  
- **Caching:** LRU cache (`lru-cache` package)  
- **Testing:** Postman  

---

## 📁 Project Structure
video-platform-backend/
│
├─ src/
│ ├─ controllers/
│ │ ├─ user.controller.js # Register, login, logout, email verification, OTP
│ │ └─ video.controller.js # Fetch video, caching, aggregation, indexing,
│ ├─ models/
│ │ ├─ user.model.js
│ │ └─ video.model.js
│ ├─ routes/
│ │ ├─ user.routes.js
│ │ └─ video.routes.js
│ ├─ middleware/
│ │ ├─ auth.js # Auth & role verification
│ │ └─ errorHandler.js # Centralized error handler
│ ├─ utils/
│ │ ├─ cache.js # LRU cache logic
│ │ ├─ email.js # Email sending
│ │ └─ passwordValidator.js # Strong password validator
│ └─ db/
|   └─ index.js
│
├─ tests/ # Optional: Postman collection / Jest tests
├─ .env.example
├─ package.json
├─ package-lock.json
├─ README.md
├─ .gitignore
├─ .prettierrc
└─ .prettierignore

---

## ⚙️ Setup Instructions

```bash
# Clone the repository
git clone https://github.com/phophaliakhushdeep0291-ux/video-platform-backend.git
cd video-platform-backend

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env

# Run development server
npm run dev
