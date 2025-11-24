# QBox Backend API

Backend API server for QBox - Anonymous Q&A Platform for Students

## 🚀 Tech Stack

- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB ODM
- **Socket.io** - Real-time WebSocket communication
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **Nodemailer** - Email service for password reset

## 📁 Project Structure

```
QBox-Backend/
├── models/
│   ├── User.js          # User schema (lecturers/admins)
│   ├── Room.js          # Room schema with unique codes
│   └── Question.js      # Question schema with upvotes/reports
├── routes/
│   ├── auth.js          # Authentication routes
│   ├── rooms.js         # Room management routes
│   ├── questions.js     # Question CRUD routes
│   └── users.js         # User profile routes
├── middleware/
│   └── auth.js          # JWT authentication middleware
├── server.js            # Main server file
├── .env.example         # Environment variables template
└── package.json         # Dependencies
```

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Pasiduchamod/QBox.git
   cd QBox-Backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**
   ```bash
   cp .env.example .env
   ```

4. **Configure `.env` file**
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/qbox
   JWT_SECRET=your_jwt_secret_key_here
   JWT_EXPIRE=30d
   
   # Email Configuration (for password reset)
   EMAIL_SERVICE=gmail
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASSWORD=your_app_password
   
   # Frontend URL (for password reset link)
   FRONTEND_URL=http://localhost:3000
   ```

5. **Start MongoDB** (if running locally)
   ```bash
   mongod
   ```

6. **Run the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

Server will run on `http://localhost:5000`

## 📡 API Endpoints

### Authentication Routes (`/api/auth`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/signup` | Register new lecturer/admin | Public |
| POST | `/login` | Login user | Public |
| POST | `/forgot-password` | Send password reset email | Public |
| POST | `/reset-password/:resetToken` | Reset password | Public |

### Room Routes (`/api/rooms`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/` | Create new room | Private (Lecturer) |
| GET | `/` | Get all rooms for logged-in lecturer | Private (Lecturer) |
| GET | `/:id` | Get single room by ID | Private (Lecturer) |
| POST | `/join` | Join room with code | Public (Students) |
| PUT | `/:id/toggle-visibility` | Toggle public/private questions | Private (Lecturer) |
| PUT | `/:id/close` | Close room | Private (Lecturer) |
| DELETE | `/:id` | Delete room | Private (Lecturer) |

### Question Routes (`/api/questions`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/` | Create new question | Public (Students) |
| GET | `/room/:roomId` | Get all questions for a room | Public |
| GET | `/:id` | Get single question | Public |
| PUT | `/:id/upvote` | Upvote/remove upvote | Public (Students) |
| PUT | `/:id/report` | Report question | Public (Students) |
| PUT | `/:id/approve` | Approve reported question | Private (Lecturer) |
| PUT | `/:id/answer` | Mark question as answered | Private (Lecturer) |
| DELETE | `/:id` | Delete question | Private (Lecturer) |

### User Routes (`/api/users`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/profile` | Get current user profile | Private |
| PUT | `/profile` | Update profile (name/email) | Private |
| PUT | `/change-password` | Change password | Private |

## 🔌 Socket.io Events

### Client → Server Events

| Event | Data | Description |
|-------|------|-------------|
| `join-room` | `roomCode` | Join a room |
| `leave-room` | `roomCode` | Leave a room |
| `question-added` | `{ roomCode, question }` | New question created |
| `question-upvoted` | `{ roomCode, questionId, upvotes }` | Question upvoted |
| `question-approved` | `{ roomCode, questionId }` | Question approved |
| `question-answered` | `{ roomCode, questionId }` | Question marked answered |
| `question-deleted` | `{ roomCode, questionId }` | Question deleted |
| `room-closed` | `{ roomCode }` | Room closed |
| `visibility-toggled` | `{ roomCode, questionsVisible }` | Visibility changed |

### Server → Client Events

| Event | Data | Description |
|-------|------|-------------|
| `user-joined` | `{ message, timestamp }` | Student joined room |
| `user-left` | `{ message, timestamp }` | Student left room |
| `new-question` | `question` | New question broadcast |
| `question-upvote-update` | `{ questionId, upvotes }` | Upvote count updated |
| `question-approval` | `{ questionId }` | Question approved |
| `question-marked-answered` | `{ questionId }` | Question answered |
| `question-removed` | `{ questionId }` | Question deleted |
| `room-status-changed` | `{ status, message }` | Room closed |
| `room-visibility-changed` | `{ questionsVisible }` | Visibility toggled |

## 🗄️ Database Models

### User Model
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  role: String (lecturer/admin),
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  createdAt: Date
}
```

### Room Model
```javascript
{
  roomName: String,
  roomCode: String (unique, 6 chars),
  lecturer: ObjectId (ref: User),
  lecturerName: String,
  questionsVisible: Boolean,
  status: String (active/closed),
  questionCount: Number,
  studentsCount: Number,
  createdAt: Date,
  closedAt: Date
}
```

### Question Model
```javascript
{
  questionText: String,
  room: ObjectId (ref: Room),
  studentTag: String (e.g., "Student 1"),
  upvotes: Number,
  upvotedBy: [String],
  status: String (pending/approved/answered/rejected),
  isReported: Boolean,
  reportedBy: [String],
  reportCount: Number,
  createdAt: Date,
  answeredAt: Date
}
```

## 🔐 Authentication

Protected routes require JWT token in Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## 🧪 Testing the API

### 1. Health Check
```bash
curl http://localhost:5000/api/health
```

### 2. Register Lecturer
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dr. Smith",
    "email": "smith@example.com",
    "password": "password123"
  }'
```

### 3. Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "smith@example.com",
    "password": "password123"
  }'
```

### 4. Create Room (with JWT token)
```bash
curl -X POST http://localhost:5000/api/rooms \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "roomName": "CS101 Lecture",
    "questionsVisible": true
  }'
```

### 5. Join Room (Student)
```bash
curl -X POST http://localhost:5000/api/rooms/join \
  -H "Content-Type: application/json" \
  -d '{
    "roomCode": "ABC123"
  }'
```

### 6. Ask Question (Student)
```bash
curl -X POST http://localhost:5000/api/questions \
  -H "Content-Type: application/json" \
  -d '{
    "questionText": "What is polymorphism?",
    "roomId": "ROOM_ID_HERE",
    "studentTag": "Student 1"
  }'
```

## 📝 Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "error": "Detailed error (dev mode only)"
}
```

## 🔒 Security Features

- **bcryptjs** password hashing with salt rounds
- **JWT** token-based authentication
- **Protected routes** with middleware
- **Role-based access control** (lecturer/admin)
- **Password reset** via email with expiring tokens
- **CORS** enabled for cross-origin requests

## 🚀 Deployment

### Environment Variables (Production)
- Set `MONGODB_URI` to your MongoDB Atlas connection string
- Use strong `JWT_SECRET` (32+ random characters)
- Configure `EMAIL_SERVICE`, `EMAIL_USER`, `EMAIL_PASSWORD`
- Set `FRONTEND_URL` to your deployed frontend URL
- Set `NODE_ENV=production`

### Deploy to Heroku
```bash
heroku create qbox-backend
heroku addons:create mongolab
git push heroku main
```

### Deploy to Railway
1. Connect GitHub repository
2. Add environment variables
3. Deploy automatically

## 📄 License

This project is licensed under the MIT License.

## 👥 Contributors

- Pasidu Chamod - Full Stack Developer

## 📧 Contact

For questions or support, contact: your_email@example.com

---

Built with ❤️ for students and educators
#   Q B o x - B a c k e n d  
 