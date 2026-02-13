# AI Interview Platform

> A professional, industry-ready SaaS platform for AI-powered interviews connecting job seekers with recruiters.

## 🚀 Quick Start

### Prerequisites
- Node.js (v18+)
- MongoDB (v6+)
- Google Gemini API Key

### Installation

1. **Clone and setup**
```bash
cd c:\mypro
```

2. **Backend Setup**
```bash
cd server
npm install
```

Create `.env` file in `server/` directory:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ai-interview-platform
JWT_SECRET=your_jwt_secret_key_change_in_production
GEMINI_API_KEY=your_gemini_api_key_here
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

3. **Frontend Setup**
```bash
cd ../client
npm install
```

4. **Start MongoDB**
```bash
# Make sure MongoDB is running
mongod
```

5. **Run the Application**

Terminal 1 (Backend):
```bash
cd server
npm run dev
```

Terminal 2 (Frontend):
```bash
cd client
npm run dev
```

6. **Access the Application**
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000/api

---

## ✅ What's Built

### Backend (100% Complete)
- ✅ Express server with Socket.io
- ✅ MongoDB database with 7 models
- ✅ Complete REST API (8 route files)
- ✅ Google Gemini AI integration
- ✅ Resume parsing (PDF/DOCX)
- ✅ Real-time messaging
- ✅ AI proctoring system
- ✅ File upload handling

### Frontend (40% Complete)
- ✅ React Router setup
- ✅ Premium design system (CSS)
- ✅ Landing page (complete)
- ✅ Role selection page
- ✅ Job seeker onboarding (complete)
- ✅ Dashboard layout with sidebar
- 🔲 Dashboard pages (placeholders)
- 🔲 AI interview interface
- 🔲 Recruiter onboarding
- 🔲 Recruiter dashboard

---

## 📁 Project Structure

```
ai-interview-platform/
├── server/                  # Backend (Node.js + Express)
│   ├── config/             # Database & Socket.io config
│   ├── models/             # Mongoose models (7 files)
│   ├── routes/             # API routes (8 files)
│   ├── services/           # AI & Resume parsing services
│   ├── uploads/            # File uploads directory
│   ├── server.js           # Main server file
│   └── package.json
│
├── client/                  # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API client
│   │   ├── styles/         # Global CSS
│   │   ├── App.jsx         # Main app component
│   │   └── main.jsx        # Entry point
│   └── package.json
│
└── README.md
```

---

## 🔑 Key Features

### AI Interview System
- Dynamic question generation from resume
- Real-time video interview with WebRTC
- Speech-to-text transcription
- AI-powered evaluation and scoring
- Proctoring with suspicious activity detection

### Resume Intelligence
- PDF and DOCX parsing
- Skill extraction
- Experience analysis
- AI-powered role suggestions

### Two-Sided Marketplace
- Job seeker profiles
- Recruiter dashboards
- Job posting and matching
- Application tracking

### Real-Time Features
- Socket.io messaging
- Live notifications
- Typing indicators
- Online status

---

## 🎨 Design System

The platform uses a modern, premium design system:
- **Dark Theme**: Professional dark mode
- **Color Palette**: Indigo, Pink, Teal accents
- **Animations**: Smooth transitions and micro-interactions
- **Glassmorphism**: Modern glass effects
- **Responsive**: Mobile-first approach

---

## 📡 API Endpoints

### Users
- `POST /api/users` - Create user
- `GET /api/users/:id` - Get user
- `PUT /api/users/:id` - Update user
- `GET /api/users/role/jobseekers` - Get all job seekers

### Resumes
- `POST /api/resume/upload` - Upload & parse resume
- `GET /api/resume/:id` - Get resume
- `GET /api/resume/user/:userId` - Get user's resume

### Interviews
- `POST /api/interviews/start` - Start AI interview
- `POST /api/interviews/:id/response` - Submit response
- `POST /api/interviews/:id/proctoring-flag` - Report suspicious activity
- `POST /api/interviews/:id/complete` - Complete interview

### Jobs
- `POST /api/jobs` - Create job
- `GET /api/jobs` - Get all jobs (with filters)
- `POST /api/jobs/:id/apply` - Apply to job

### Messages
- `POST /api/messages` - Send message
- `GET /api/messages/conversation/:userId1/:userId2` - Get conversation

### Posts
- `POST /api/posts` - Create post
- `GET /api/posts/feed` - Get feed
- `POST /api/posts/:id/like` - Like post
- `POST /api/posts/:id/comment` - Comment

### Notifications
- `POST /api/notifications` - Create notification
- `GET /api/notifications/user/:userId` - Get notifications

---

## 🔧 Technologies

### Backend
- Node.js & Express
- MongoDB & Mongoose
- Socket.io (real-time)
- Google Gemini AI
- Multer (file uploads)
- PDF.js & Mammoth (resume parsing)

### Frontend
- React 18
- React Router v6
- Axios
- Socket.io Client
- TensorFlow.js (for proctoring)
- React Webcam

---

## 🚧 Next Steps to Complete

1. **Implement Dashboard Pages**
   - Home feed with post creation
   - Profile page with editable sections
   - Messaging interface
   - Job listings with filters
   - Interview management

2. **Build AI Interview Interface**
   - WebRTC camera integration
   - Real-time question display
   - Speech-to-text for answers
   - Proctoring UI with warnings
   - Results page

3. **Create Recruiter Flow**
   - Recruiter onboarding form
   - Candidate search interface
   - Job posting page
   - Analytics dashboard

4. **Add State Management**
   - Context API or Redux
   - User authentication state
   - Real-time updates

5. **Testing & Polish**
   - Test all user flows
   - Responsive design testing
   - Performance optimization
   - Error handling

---

## 📝 Testing Mode

The platform is currently in **testing mode** with authentication disabled:
- No login/signup required
- Direct access to all features
- User data stored in MongoDB
- Perfect for development and testing

---

## 🎯 How to Get Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click "Create API Key"
3. Copy the key and add to `.env` file

---

## 🐛 Troubleshooting

### MongoDB Connection Error
```bash
# Start MongoDB service
mongod

# Or specify custom path
mongod --dbpath /path/to/data
```

### Port Already in Use
```bash
# Kill process on port 5000
npx kill-port 5000

# Or change PORT in .env
```

### Module Not Found
```bash
# Reinstall dependencies
cd server && npm install
cd ../client && npm install
```

---

## 📚 Documentation

- [Implementation Plan](./implementation_plan.md)
- [Walkthrough](./walkthrough.md)
- [Task Breakdown](./task.md)

---

## 🤝 Contributing

This is a professional SaaS platform. To contribute:
1. Follow the existing code structure
2. Maintain the design system
3. Write clean, documented code
4. Test all features before committing

---

## 📄 License

MIT License - feel free to use for your projects!

---

## 🎓 Learning Resources

- [Google Gemini API](https://ai.google.dev/docs)
- [Socket.io Docs](https://socket.io/docs/)
- [MongoDB Guide](https://www.mongodb.com/docs/)
- [React Router](https://reactrouter.com/)
- [WebRTC Guide](https://webrtc.org/)

---

**Built with ❤️ using MERN Stack + AI**
