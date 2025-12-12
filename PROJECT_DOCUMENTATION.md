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

### **7. Home Feed & Social Features**
**Purpose:** LinkedIn-style professional networking and content sharing

**Post Types:**
- **Text Posts:** Share thoughts, achievements, updates
- **Media Posts:** Images, videos, documents (Cloudinary storage)
- **Achievement Posts:** Celebrate milestones, certifications
- **Job Updates:** Share career changes, promotions
- **Open to Work:** Signal job search status

**Engagement Features:**
- **Likes:** Express appreciation
- **Dislikes:** Show disagreement
- **Comments:** threaded discussions
- **Shares:** Spread content to your network
- **Reposts:** Quote and add your thoughts
- **Mentions:** @mention other users
- **Tags:** Categorize content with hashtags

**Post Visibility:**
- **Public:** Everyone can see
- **Connections:** Only your network
- **Private:** Only you

**Feed Algorithm:**
- Chronological timeline
- Engagement-based ranking
- View tracking and analytics

### **8. Profile Management System**
**Comprehensive Job Seeker Profile:**

**Basic Information:**
- Name, email, location
- Profile photo (croppable upload)
- Cover photo (banner image)
- Professional headline
- About/Bio section
- Contact information

**Professional Details:**
- **Work Experience:**
  - Company name, logo
  - Position/role
  - Duration (start/end dates)
  - Description and achievements
  - Add/edit/delete multiple entries
- **Education:**
  - Institution name
  - Degree and field of study
  - Graduation year
  - GPA/honors
  - Add/edit/delete multiple entries
- **Skills:**
  - Technical skills
  - Soft skills
  - Skill endorsements (future feature)
  - Add/remove dynamically

**Additional Sections:**
- **Certifications:** Professional credentials
- **Projects:** Portfolio items with descriptions
- **Languages:** Proficiency levels
- **Achievements:** Awards, recognitions
- **Interests:** Professional and personal

**Privacy Controls:**
- Profile visibility settings
- What recruiters can see
- Connection preferences

**Profile Completion:**
- Progress indicator
- Suggestions for improvement
- Motivational prompts

### **9. Messaging System**
**Real-Time Communication:**

**Features:**
- One-on-one messaging
- Message history persistence
- Read receipts
- Typing indicators
- File attachments support

**Message Types:**
- Text messages
- File attachments (resumes, documents)
- System notifications
- Automated messages

**Message Management:**
- Mark as read/unread
- Delete messages
- Edit sent messages (metadata tracked)
- Search conversations
- Archive chats

**Use Cases:**
- Recruiter-candidate communication
- Interview coordination
- Offer negotiation
- Follow-up questions

### **10. Notification System**
**Multi-Channel Alerts:**

**Notification Types:**
1. **Job Alerts:** New matching jobs posted
2. **Interview Reminders:** Upcoming schedule
3. **Profile Completion:** Suggestions to improve profile
4. **Message Received:** New unread messages
5. **Application Status:** Updates on job applications
6. **Job Recommendations:** AI-suggested positions
7. **Post Engagement:** Likes, comments on your posts
8. **Motivational:** Encouragement to stay active
9. **System:** Platform updates, announcements
10. **Social:** Follows, mentions, tags
11. **Hiring Workflow:** Hired, rejected status
12. **Interview Completed:** Results available

**Notification Features:**
- Real-time in-app notifications
- Notification badges on icons
- Mark as read
- Priority levels (low/medium/high)
- Action buttons (quick links)
- Popup notifications for important events
- Notification preferences

**Analytics:**
- Track view rates
- Click-through rates
- Engagement metrics

### **11. Hiring Pipeline & Offer Management**
**Complete Recruitment Workflow:**

**Hiring Process Stages:**
1. **Offer Extended:**
   - Generate offer letter
   - Set expiry date
   - Send to candidate
2. **Offer Accepted/Declined:**
   - Digital signature collection
   - Decline reason tracking
3. **Documents Pending:**
   - Required document checklist
   - Upload interface
   - Progress tracking
4. **Documents Complete:**
   - Verification status
   - Compliance checks
5. **Onboarding Complete:**
   - Final confirmation
   - Access granted
6. **Cancelled:**
   - Process termination with reason

**Offer Letter Details:**
- Position title
- Salary (amount, currency, period)
- Start date
- Location (on-site/remote/hybrid)
- Employment type (full-time/part-time/contract/internship)
- Department
- Reporting manager
- Benefits package
- Custom terms and conditions
- Offer expiry date
- Digital signature field

**Progress Tracking:**
- Visual progress bar
- Document completion percentage
- Timeline milestones
- Automated reminders
- Deadline tracking

**Analytics:**
- Offer acceptance rate
- Time to acceptance
- Drop-off points
- Conversion metrics

### **12. Analytics & Insights**
**For Recruiters:**

**Recruitment Analytics:**
- Applications received
- Interview to hire ratio
- Average time to hire
- Source of best candidates
- Diversity metrics
- Cost per hire

**Job Performance:**
- Views per job posting
- Application conversion rate
- Most effective job descriptions
- Skill demand analysis

**Candidate Quality:**
- AI match score distributions
- Interview success rates
- Skill gap analysis
- Experience level trends

**For Job Seekers:**

**Profile Analytics:**
- Profile views
- Search appearances
- Who viewed your profile
- Engagement on posts

**Application Insights:**
- Applications sent
- Interview invitations
- Success rate
- Areas for improvement

### **13. Advanced Search & Filtering**
**Job Search:**
- Keyword search
- Location-based filtering
- Salary range filters
- Experience level
- Job type (remote/on-site/hybrid)
- Company size
- Industry
- Posted date
- Sort by relevance/recent

**Candidate Search (for Recruiters):**
- Skills matching
- Years of experience
- Location
- Education level
- Current company
- Interview score threshold
- Availability

### **14. Settings & Preferences**
**User Settings:**

**Account Settings:**
- Email and password
- Two-factor authentication (future)
- Account deletion
- Export data

**Privacy Settings:**
- Profile visibility
- Who can message you
- Who can see your activity
- Block/unblock users

**Notification Preferences:**
- Email notifications
- In-app notifications
- Notification frequency
- Specific alert types

**Job Preferences:**
- Desired roles
- Preferred locations
- Expected salary range
- Work type (remote/hybrid/on-site)
- Industries of interest
- Company sizes

**7. Smart Resume Parser**
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
  
  // Job Seeker Profile
  jobSeekerProfile: {
    photo, coverPhoto, headline, bio, location,
    skills: [{ name, proficiency }],
    experience: [{ company, position, duration, description }],
    education: [{ institution, degree, year, field }],
    certifications: [String],
    projects: [{ name, description, technologies }],
    languages: [{ language, proficiency }],
    resume, 
    resumeId,
    onboardingInterview: { questions, answers, score },
    interviewScore,
    preferences: { desiredRoles, locations, salary, workType }
  },
  
  // Platform Interview Gating
  platformInterview: {
    status: 'pending' | 'passed' | 'failed',
    score, attempts, canRetry, retryAfter,
    completedAt, lastAttemptAt
  },
  
  // Employer Profile
  employerProfile: { 
    companyName, industry, size, website,
    description, logo, location
  },
  
  // Social Features
  connections: [userId],
  followers: [userId],
  following: [userId]
}
```

### **Interview Model**
```javascript
{
  userId, resumeId, jobId,
  interviewType: 'technical' | 'hr' | 'combined',
  
  // Questions
  questions: [{
    question, category, difficulty,
    expectedTopics, timeLimit,
    generatedBy: 'ai' | 'manual' | 'adaptive'
  }],
  
  // Responses
  responses: [{
    questionIndex, answer,
    audioRecording, videoRecording, timeSpent,
    evaluation: {
      score, technicalAccuracy, communication,
      confidence, relevance, completeness,
      feedback, topicsAddressed, topicsMissed,
      strengthsShown, improvementAreas
    },
    quickScore: { score, brief }
  }],
  
  // Overall Scoring
  scoring: {
    technicalAccuracy, communication, confidence,
    relevance, overallScore,
    strengths: [String], weaknesses: [String],
    detailedFeedback
  },
  
  // JD Matching (for job-specific interviews)
  matchScore: {
    overall, skills, experience, education,
    matchedSkills, missingSkills, interviewFocus
  },
  
  // Recruiter Report (AI-generated)
  recruiterReport: {
    summary, recommendation,
    overallAssessment: { score, grade, verdict },
    keyStrengths, concerns,
    technicalAssessment, communicationAssessment,
    cultureFit, suggestedNextSteps,
    suggestedQuestions, salaryRecommendation,
    riskFactors, finalNotes
  },
  
  // Proctoring
  proctoring: {
    flags: [{ type, timestamp, severity, description }],
    totalFlags, riskLevel: 'low' | 'medium' | 'high'
  },
  
  status: 'scheduled' | 'in_progress' | 'completed' | 'abandoned',
  passed: boolean,
  startedAt, completedAt, duration
}
```

### **Job Model**
```javascript
{
  title, description,
  company: { name, logo, industry, size },
  requirements: {
    skills: [String],
    minExperience, maxExperience,
    education: [String],
    experienceLevel: 'entry' | 'mid' | 'senior'
  },
  location, salary: { min, max, currency },
  jobType: 'full-time' | 'part-time' | 'contract' | 'internship',
  workMode: 'remote' | 'on-site' | 'hybrid',
  status: 'active' | 'closed' | 'draft',
  postedBy: employer_id,
  applications: [{ userId, status, appliedAt }],
  views, applicantsCount,
  createdAt, updatedAt
}
```

### **Post Model**
```javascript
{
  userId,
  content: {
    text: String,
    media: [{
      type: 'image' | 'video' | 'document',
      fileId, fileName, url, thumbnail
    }]
  },
  postType: 'text' | 'media' | 'achievement' | 'job_update' | 'open_to_work',
  
  // Engagement
  engagement: {
    likes: [{ userId, likedAt }],
    dislikes: [{ userId, dislikedAt }],
    comments: [{ userId, text, createdAt }],
    shares: [{ userId, sharedAt }],
    reposts: [{ userId, repostedAt }]
  },
  
  visibility: 'public' | 'connections' | 'private',
  tags: [String],
  mentions: [userId],
  views: Number,
  createdAt, updatedAt
}
```

### **Message Model**
```javascript
{
  senderId, recipientId,
  content: String,
  attachments: [{
    fileId, fileName, fileType, fileSize
  }],
  read: boolean,
  readAt: Date,
  metadata: {
    edited: boolean, editedAt,
    deleted: boolean, deletedAt
  },
  createdAt, updatedAt
}
```

### **Notification Model**
```javascript
{
  userId, sender: userId,
  type: 'job_alert' | 'interview_reminder' | 'profile_completion' | 
        'message_received' | 'application_status' | 'job_recommendation' |
        'post_engagement' | 'motivational' | 'system' | 'follow' |
        'like' | 'comment' | 'mention' | 'hired' | 'rejected',
  title, message,
  relatedEntity: {
    entityType: 'job' | 'interview' | 'message' | 'post' | 'user',
    entityId
  },
  actionUrl, actionText,
  read: boolean, readAt,
  priority: 'low' | 'medium' | 'high',
  isPopup: boolean, popupShown: boolean,
  createdAt
}
```

### **HiringProcess Model**
```javascript
{
  jobId, applicantId, recruiterId,
  currentStage: 'offer_extended' | 'offer_accepted' | 'offer_declined' |
                'documents_pending' | 'documents_complete' | 
                'onboarding_complete' | 'cancelled',
  status: 'active' | 'completed' | 'cancelled',
  
  // Offer Details
  offer: {
    position, 
    salary: { amount, currency, period },
    startDate, location,
    employmentType: 'full-time' | 'part-time' | 'contract' | 'internship',
    department, reportingManager,
    benefits: [String],
    customTerms, offerLetterUrl,
    expiryDate, acceptedAt, declinedAt,
    declineReason, signature
  },
  
  // Timeline
  timeline: {
    offerSentAt, offerAcceptedAt,
    documentsDeadline, startDate, actualStartDate
  },
  
  // Progress
  progress: {
    documentsCompleted, documentsTotal,
    overallProgress: 0-100
  },
  
  notifications: {
    remindersSent, lastReminderAt
  },
  
  createdAt, updatedAt
}
```

### **Resume Model**
```javascript
{
  userId, fileId, fileName, fileType, fileUrl,
  parsedData: {
    personalInfo: { name, email, phone, location },
    summary,
    skills: [String],
    experience: [{ company, position, duration, description, achievements }],
    education: [{ institution, degree, field, year }],
    projects: [{ name, description, technologies }],
    certifications: [String],
    languages: [String]
  },
  aiAnalysis: {
    keyStrengths, suggestedRoles, skillLevel
  },
  uploadedAt, lastModified
}
```

---

## 📱 Complete Page/Component Listing

### **Job Seeker Pages:**
1. **HomeFeed.jsx** - Social feed with posts, engagement
2. **ProfilePage.jsx** - Complete profile management
3. **JobListingsPage.jsx** - Browse and search jobs
4. **InterviewsPage.jsx** - Platform/job interviews, scorecards
5. **MessagingPage.jsx** - Real-time chat with recruiters
6. **SettingsPage.jsx** - Account preferences
7. **OnboardingPortal.jsx** - Initial setup wizard
8. **JobSeekerDashboard.jsx** - Overview, analytics
9. **OfferAcceptancePage.jsx** - Review and sign offers

### **Recruiter/Employer Pages:**
1. **RecruiterHome.jsx** - Recruiter dashboard
2. **JobPostingPage.jsx** - Create new job listings
3. **MyJobsPage.jsx** - Manage posted jobs
4. **CandidatesPage.jsx** - View applicants
5. **RecruiterApplicationsPage.jsx** - Application management
6. **HiringPipelinePage.jsx** - Offer and onboarding workflow
7. **RecruiterMessages.jsx** - Chat with candidates
8. **RecruiterAnalytics.jsx** - Recruitment metrics
9. **RecruiterDashboard.jsx** - Overview stats
10. **RecruiterSettings.jsx** - Account configuration

### **Shared/Common Pages:**
1. **Login.jsx** - Authentication
2. **Signup.jsx** - Registration
3. **LandingPage.jsx** - Marketing homepage
4. **NotFoundPage.jsx** - 404 error

### **Onboarding Pages:**
1. **OnboardingInterview.jsx** - Platform interview interface
2. **OnboardingWelcome.jsx** - Welcome screen
3. **ResumeUpload.jsx** - Resume submission
4. **ProfileSetup.jsx** - Initial profile creation
5. **InterviewResults.jsx** - Scorecard display
6. **CodeIDE.jsx** - Coding test interface

### **Interview Pages:**
1. **InterviewRoom.jsx** - Live interview screen
2. **InterviewQuestions.jsx** - Q&A interface
3. **InterviewResults.jsx** - Detailed scorecard
4. **CodingTest.jsx** - Programming challenges

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
