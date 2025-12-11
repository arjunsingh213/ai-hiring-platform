# AI Hiring Platform - Complete Documentation

## 📋 Project Overview

**Project Name:** AI Hiring Platform  
**Type:** Full-Stack MERN Application  
**Purpose:** AI-powered recruitment platform connecting job seekers with employers through intelligent screening and automated interviews  
**Deployment:** Vercel (Frontend & Backend)

---

## 🎯 Core Concept

An AI-first hiring platform that automates the initial screening process using advanced AI models for:
- Resume parsing and analysis
- Dynamic AI-powered interviews
- Coding assessments
- Automated candidate evaluation
- Intelligent job matching

---

## 🏗️ Technical Architecture

### **Frontend Stack**
- **Framework:** React 18 with Vite
- **Routing:** React Router v6
- **State Management:** React Context API + Hooks
- **Styling:** CSS Modules with CSS Variables
- **UI Components:** Custom components with professional design
- **Code Editor:** Monaco Editor (VS Code editor)
- **HTTP Client:** Axios

### **Backend Stack**
- **Runtime:** Node.js with Express.js
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** JWT (JSON Web Tokens)
- **File Storage:** Cloudinary (for resumes and media)
- **AI Services:**
  - DeepSeek R1 (via OpenRouter) - Interview questions, answer validation
  - Llama 3.1 8B (via OpenRouter) - Resume parsing, JD matching, recruiter reports
  - Qwen3 235B (via OpenRouter) - Question generation, answer evaluation
  - Mistral 7B (via OpenRouter) - Fast scoring
  - Google Gemini 2.0 Flash - Fallback AI service
- **Code Execution:** Piston API (supports 50+ languages)

### **Deployment**
- **Platform:** Vercel Serverless Functions
- **Structure:** Monorepo with separate frontend/backend deployments
- **Environment:** Production-ready with environment variables

---

## 🚀 Key Features

### **1. User Management**
- Dual role system: Job Seekers & Employers
- JWT-based authentication
- Profile management with resume upload
- Cloudinary integration for file storage

### **2. Platform Interview System (Gating Mechanism)**
**Purpose:** Screen candidates before they can apply for jobs

**Features:**
- **Dynamic Question Generation:** 10 questions (5 technical + 5 HR)
- **AI-Powered Validation:** Real-time answer validation
  - Blocks gibberish, off-topic, or non-English answers
  - Allows wrong technical answers (scored later)
- **Adaptive Questioning:** Questions adapt based on resume and desired role
- **Strict Scoring:**
  - Pass criteria: Overall ≥60%, Technical ≥50%, HR ≥50%, Communication ≥40%
  - Harsh evaluation of gibberish/empty answers (0-15 points)
- **Retry Mechanism:** 
  - Failed candidates can retry after 2 days
  - Attempts tracked and limited
- **Scorecard System:**
  - Detailed breakdown of technical, communication, confidence scores
  - Strengths and weaknesses identified
  - Improvement suggestions provided
  - Available for both passed AND failed candidates

### **3. Job-Specific Interviews**
- **Resume-JD Matching:** AI analyzes fit between resume and job description
- **Smart Question Generation:** Questions based on:
  - Job requirements
  - Candidate skills
  - Missing skills (adaptive learning)
  - Job-specific scenarios
- **Real-time Evaluation:** Instant scoring and feedback
- **Recruiter Reports:** Comprehensive AI-generated assessment reports

### **4. Coding Assessment System**
**Features:**
- **Language Detection:** Automatically detects programming languages from resume
- **Monaco IDE Integration:** Full VS Code editor experience
- **Multi-Language Support:** Python, JavaScript, Java, C++, C, C#, Go, Ruby, TypeScript
- **Real-Time Execution:** Code runs via Piston API
- **Detailed Error Messages:** 
  - Syntax errors with line numbers
  - Indentation errors
  - Variable not found errors
  - Compilation errors
  - Runtime errors
- **Problem Generation:** AI generates coding problems based on:
  - Candidate skills
  - Difficulty level (easy/medium/hard)
  - Programming language
- **Auto-Evaluation:** AI evaluates code for:
  - Correctness
  - Code quality
  - Efficiency
  - Best practices
- **Test Cases:** Automated test case execution
- **Integrated Scorecard:** Coding results included in final evaluation

### **5. Interview Results & Scorecards**
**Platform Interview Scorecard:**
- Overall score (0-100)
- Technical Accuracy (0-100)
- Communication Skills (0-100)
- Confidence Level (0-100)
- Relevance to Role (0-100)
- Pass/Fail status
- Detailed strengths and weaknesses
- Personalized improvement recommendations

**Job Interview Scorecard:**
- All platform interview metrics
- Job-specific match score
- Coding test results (if applicable)
- Recruiter recommendations
- Suggested next steps
- Salary recommendations
- Risk factors identified

**Accessibility:**
- Failed candidates can view scorecards to learn from mistakes
- Scorecards available in "Completed Interviews" tab
- Detailed breakdown helps candidates upskill for retry

### **6. Job Management**
**For Employers:**
- Post job listings with detailed requirements
- Define required skills, experience levels, education
- Set job-specific interview criteria
- Review candidate applications with AI-generated reports

**For Job Seekers:**
- Browse available jobs
- Apply with one click (after passing platform interview)
- Track application status
- View interview schedules

### **7. Smart Resume Parser**
**Capabilities:**
- Text extraction from PDF and DOCX files
- AI-powered parsing via Llama 3.1 8B
- Extracts:
  - Personal information
  - Skills (technical and soft)
  - Work experience with achievements
  - Education details
  - Projects with technologies
  - Certifications
  - Languages
- Cloudinary storage for serverless compatibility
- URL-based parsing for cloud-stored resumes

---

## 💡 AI Models & Their Roles

| AI Model | Purpose | Use Cases |
|----------|---------|-----------|
| **DeepSeek R1** | Primary interview AI | Question generation, answer validation, follow-up questions |
| **Llama 3.1 8B** | Resume & matching | Resume parsing, JD-resume matching, recruiter reports |
| **Qwen3 235B** | Advanced reasoning | Complex question generation, detailed answer evaluation |
| **Mistral 7B** | Fast operations | Quick scoring, rapid assessments |
| **Gemini 2.0 Flash** | Fallback | When primary models fail or are unavailable |

---

## 🎨 UI/UX Features

### **Professional Design**
- Clean, modern interface with subtle gradients
- Professional color palette (soft blues, greens)
- No emojis (removed for professional appearance)
- Glassmorphism effects
- Smooth transitions and animations
- Responsive design for all devices

### **User-Friendly Components**
- Intuitive navigation
- Real-time feedback with toast notifications
- Loading states for better UX
- Error handling with helpful messages
- Progress indicators
- Timer displays for time-limited tests

### **Accessibility**
- High contrast text
- Clear button labels
- Keyboard navigation support
- Screen reader compatible

---

## 🔒 Security Features

- **JWT Authentication:** Secure token-based auth
- **Password Hashing:** bcrypt for password security
- **CORS Protection:** Configured allowed origins
- **Input Validation:** Server-side validation for all inputs
- **Rate Limiting:** Prevents abuse of AI endpoints
- **Environment Variables:** Sensitive data in .env files
- **MongoDB Atlas:** Network-level security with IP whitelisting

---

## 📊 Database Models

### **User Model**
```javascript
{
  name, email, password,
  role: 'jobseeker' | 'employer',
  jobSeekerProfile: {
    resume, skills, experience, education,
    onboardingInterview: { questions, answers, score },
    interviewScore
  },
  platformInterview: {
    status: 'pending' | 'passed' | 'failed',
    score, attempts, canRetry, retryAfter,
    completedAt, lastAttemptAt
  },
  employerProfile: { company details }
}
```

### **Interview Model**
```javascript
{
  userId, resumeId, jobId,
  interviewType: 'technical' | 'hr' | 'combined',
  questions: [{ question, category, difficulty, timeLimit }],
  responses: [{ answer, evaluation, score }],
  scoring: {
    technicalAccuracy, communication, confidence,
    overallScore, strengths, weaknesses
  },
  recruiterReport: { recommendations, assessments },
  status: 'scheduled' | 'in_progress' | 'completed',
  passed: boolean
}
```

### **Job Model**
```javascript
{
  title, description, company,
  requirements: {
    skills, minExperience, maxExperience,
    education, experienceLevel
  },
  location, salary, jobType,
  status: 'active' | 'closed',
  postedBy: employer_id
}
```

---

## 🔄 Key Workflows

### **Job Seeker Onboarding**
1. Sign up / Login
2. Upload resume (parsed by AI)
3. Complete platform interview (10 questions)
4. Receive scorecard
5. If passed: Can apply for jobs
6. If failed: View scorecard, wait 2 days, retry

### **Job Application Process**
1. Browse available jobs
2. Click "Apply"
3. AI matches resume to JD
4. Job-specific interview generated
5. Complete interview (with optional coding test)
6. Receive final evaluation
7. Employer reviews AI-generated report

### **Employer Workflow**
1. Sign up / Login
2. Post job with requirements
3. Receive applications
4. Review AI-generated candidate reports
5. Access detailed scorecards
6. Make hiring decisions

---

## 🌟 Unique Selling Points

1. **AI-First Approach:** Every step powered by advanced AI
2. **Adaptive Interviews:** Questions change based on candidate responses
3. **Coding Integration:** Seamless coding tests for tech roles
4. **Detailed Analytics:** Comprehensive scorecards for learning
5. **Fair Retry System:** Failed candidates can improve and retry
6. **Professional UI:** Enterprise-grade design without childish elements
7. **Serverless Architecture:** Scalable and cost-effective
8. **Multi-Model AI:** Uses best AI for each specific task

---

## 📁 Project Structure

```
ai-hiring-platform/
├── client/                 # Frontend React app
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   │   ├── CodeIDE/   # Coding test interface
│   │   │   └── ...
│   │   ├── pages/          # Page components
│   │   │   ├── jobseeker/
│   │   │   ├── employer/
│   │   │   └── onboarding/
│   │   ├── services/       # API clients
│   │   └── App.jsx
│   └── package.json
│
├── server/                 # Backend Express app
│   ├── models/            # Mongoose models
│   ├── routes/            # API endpoints
│   ├── services/          # Business logic
│   │   └── ai/           # AI service integrations
│   ├── config/           # Configuration files
│   └── server.js
│
├── api/                   # Vercel serverless entry
│   └── index.js
│
└── vercel.json           # Deployment configuration
```

---

## 🔧 Environment Variables

### **Backend (.env)**
```
MONGODB_URI=
JWT_SECRET=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
OPENROUTER_LLAMA_KEY=
OPENROUTER_QWEN_KEY=
OPENROUTER_MISTRAL_KEY=
OPENROUTER_CHIMERA_KEY=
DEEPSEEK_API_KEY=
GEMINI_API_KEY=
CLIENT_URL=
```

### **Frontend (Environment Variables in Vercel)**
```
VITE_API_URL=<backend-vercel-url>/api
```

---

## 🚀 Deployment Details

### **Vercel Configuration**
- **Frontend Project:** ai-hiring-platform-cm5t.vercel.app
- **Backend Project:** ai-hiring-platform-sootv.vercel.app
- **Monorepo Structure:** Single repo, two deployments
- **CORS:** Configured for both URLs

### **Build Commands**
- Frontend: `npm run build` (Vite)
- Backend: Serverless functions (no build needed)

---

## 📈 Recent Improvements & Bug Fixes

1. ✅ Fixed CORS errors between frontend and backend
2. ✅ Replaced local disk storage with Cloudinary for serverless
3. ✅ Removed :free suffix from DeepSeek model name
4. ✅ Added 401 auth errors to fallback retry logic
5. ✅ Fixed answer validation (now allows wrong answers, blocks gibberish)
6. ✅ Implemented strict 10-question limit
7. ✅ Added Interview document creation for failed candidates
8. ✅ Removed all emojis for professional appearance
9. ✅ Fixed banner text visibility with proper contrast
10. ✅ Replaced Gemma with Llama (Gemma endpoints unavailable)
11. ✅ Fixed IDE error messages (now shows syntax, indentation errors)
12. ✅ Removed duplicate coding scorecard modal
13. ✅ Improved score synchronization across components

---

## 🎓 Learning Outcomes

Candidates benefit from:
- **Detailed Scorecards:** Understand strengths and weaknesses
- **Error Messages:** Learn from coding mistakes
- **Retry Opportunities:** Improve and try again
- **AI Feedback:** Personalized improvement suggestions
- **Real Interview Practice:** Gain confidence for actual interviews

---

## 🔜 Future Enhancements (Potential)

- Video interview integration
- Proctoring system with face detection
- Advanced analytics dashboard for employers
- Candidate ranking system
- Interview scheduling system
- Email notifications
- Multi-language support for interviews
- Mobile app version
- Integration with LinkedIn, GitHub
- Blockchain-verified credentials

---

## 📞 Technical Support

**Stack:** MERN (MongoDB, Express, React, Node.js)  
**AI Integration:** OpenRouter API, Gemini API  
**Cloud Services:** Vercel, Cloudinary, MongoDB Atlas, Piston API  
**Version Control:** Git & GitHub

---

## ✨ Summary

The AI Hiring Platform is a production-ready, enterprise-grade recruitment solution that leverages cutting-edge AI to automate and enhance the hiring process. With its comprehensive interview system, intelligent matching, and detailed analytics, it provides value to both job seekers (learning and improvement) and employers (efficient screening and quality hires).

**Last Updated:** December 11, 2025  
**Version:** 1.0  
**Status:** Production Ready ✅
