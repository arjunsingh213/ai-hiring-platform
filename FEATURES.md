# 🧠 AI Hiring Platform — Complete Feature Registry

> **Last Updated:** 2026-03-02  
> **Purpose:** This file catalogs **every feature** currently implemented in the codebase.  
> It serves as a persistent knowledge base so every conversation starts with full context.  
> **Update Rule:** This file MUST be updated whenever a feature is added, modified, or removed.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Authentication & Authorization](#authentication--authorization)
3. [Onboarding System](#onboarding-system)
4. [AI Interview System](#ai-interview-system)
5. [Video Interview Room (Froscel Interview Room™)](#video-interview-room-froscel-interview-room)
6. [AI Talent Passport (ATP)](#ai-talent-passport-atp)
7. [Skill Verification & Challenges](#skill-verification--challenges)
8. [Job Marketplace](#job-marketplace)
9. [Recruiter Features](#recruiter-features)
10. [Job Seeker Features](#job-seeker-features)
11. [Social / Community Feed](#social--community-feed)
12. [Messaging System](#messaging-system)
13. [Notification System](#notification-system)
14. [Admin Panel](#admin-panel)
15. [Hiring Pipeline & Onboarding Portal](#hiring-pipeline--onboarding-portal)
16. [Landing Page & SEO](#landing-page--seo)
17. [Mobile App (React Native / Expo)](#mobile-app)
18. [AI Services & Integrations](#ai-services--integrations)
19. [Proctoring & Anti-Cheat](#proctoring--anti-cheat)
20. [Infrastructure & DevOps](#infrastructure--devops)

---

## Architecture Overview

| Layer | Tech | Key Files |
|-------|------|-----------|
| **Frontend** | React 18, Vite, React Router v6 | `client/src/App.jsx` |
| **Backend** | Node.js, Express, Socket.io | `server/server.js` |
| **Database** | MongoDB, Mongoose (23 models) | `server/models/` |
| **Mobile** | React Native, Expo | `mobile/` |
| **AI** | Google Gemini, DeepSeek, Groq, OpenRouter | `server/services/ai/` |
| **Storage** | Cloudinary (videos/images), Multer (uploads) | `server/config/cloudinary.js` |
| **Auth** | JWT, Passport.js (Google OAuth) | `server/config/passport.js` |
| **Real-time** | Socket.io | `server/config/socket.js` |
| **Deployment** | Vercel (serverless) | `server/vercel.json` |

### Database Models (23 total)
`User`, `Interview`, `Job`, `VideoRoom`, `Post`, `Message`, `Resume`, `Notification`, `HiringProcess`, `OnboardingDocument`, `Challenge`, `ChallengeAttempt`, `ChallengeRiskLog`, `SkillNode`, `VerifiedProject`, `Admin`, `AdminChallengeAction`, `AIUsage`, `AuditLog`, `CandidateBatch`, `Feedback`, `Round`, `UserActivity`

### API Route Modules (32 total)
`authRoutes`, `authOAuth`, `userRoutes`, `profileRoutes`, `jobRoutes`, `resumeRoutes`, `interviewRoutes`, `onboardingInterview`, `jobInterview`, `videoRoomRoutes`, `messageRoutes`, `postRoutes`, `notificationRoutes`, `feedbackRoutes`, `adminRoutes`, `adminSetup`, `settingsRoutes`, `contactRoutes`, `companyRoutes`, `batchRoutes`, `challengeRoutes`, `challengeAdminRoutes`, `codeExecutionRoutes`, `documents`, `hiring`, `jobBuilderRoutes`, `roundRoutes`, `skillNodeRoutes`, `talentPassportRoutes`, `projectRoutes`, `activityRoutes`, `resumeParser`

---

## Authentication & Authorization

### Files
- **Frontend:** `client/src/pages/auth/AuthPage.jsx`, `LoginPage.jsx`, `SignupPage.jsx`, `ForgotPasswordPage.jsx`, `VerifyEmailPage.jsx`
- **Backend:** `server/routes/authRoutes.js`, `server/routes/authOAuth.js`, `server/config/passport.js`
- **Middleware:** `server/middleware/userAuth.js`, `server/middleware/adminAuth.js`
- **Component:** `client/src/components/ProtectedRoute.jsx`

### Features
- [x] **Email/Password Registration** — local signup with hashed passwords
- [x] **Email/Password Login** — JWT-based authentication
- [x] **Google OAuth** — via Passport.js strategy; auto-creates user on first login
- [x] **JWT Token Storage** — stored in localStorage with login timestamp
- [x] **OAuth Token Handler** — extracts token/userId/role from URL params after OAuth redirect
- [x] **Email Verification** — token-based email verification flow (`/verify-email/:token`)
- [x] **Forgot Password** — password reset via email link
- [x] **Role-Based Access Control** — routes protected by role (`jobseeker`, `recruiter`, `admin`)
- [x] **Protected Routes** — `ProtectedRoute` component checks auth + role before rendering
- [x] **Admin Authentication** — separate admin auth middleware with permission levels (`super_admin`, `admin`, `moderator`)
- [x] **Platform Interview Guard** — middleware to enforce platform interview completion before certain actions
- [x] **Session Management** — express-session with configurable cookie settings

---

## Onboarding System

### Files
- **Frontend:** `client/src/pages/onboarding/RoleSelection.jsx`, `JobSeekerOnboarding.jsx`, `RecruiterOnboarding.jsx`, `OnboardingMethodChoice.jsx`, `OnboardingInterview.jsx`, `ResumeUploadFirst.jsx`, `PlatformWalkthrough.jsx`
- **Backend:** `server/routes/onboardingInterview.js` (84KB — largest route file)

### Features
- [x] **Role Selection** — user picks Job Seeker or Recruiter post-signup
- [x] **Job Seeker Onboarding** — multi-step form (profession, skills, experience, education, etc.)
- [x] **Resume Upload First** — upload and parse resume before manual data entry
- [x] **Onboarding Method Choice** — choose between resume upload, manual entry, or AI interview
- [x] **AI Onboarding Interview** — voice-based conversational interview to extract profile data
  - Adaptive question generation based on domain
  - Speech-to-text transcription
  - Real-time voice interaction via WebSocket
  - Session store for interview state
- [x] **Recruiter Onboarding** — company details, position, team size, hiring needs
- [x] **Platform Walkthrough** — guided tour of features post-onboarding
- [x] **Onboarding Completion Tracking** — `isOnboardingComplete` flag on User model
- [x] **Incomplete Onboarding Reminders** — reminder count, last reminder timestamps

---

## AI Interview System

### Files
- **Frontend:** `client/src/pages/interview/AIInterview.jsx` (83KB), `InterviewReadiness.jsx` (36KB), `InterviewResults.jsx` (22KB)
- **Backend:** `server/routes/interviewRoutes.js` (62KB), `server/routes/jobInterview.js` (40KB)
- **AI Services:** `server/services/ai/geminiService.js` (44KB), `server/services/ai/deepseekService.js` (37KB), `server/services/ai/openRouterService.js` (35KB), `server/services/ai/evaluationEngine.js` (25KB)
- **Hooks:** `client/src/hooks/useVoiceInterview.js`, `client/src/hooks/useFaceDetection.js`
- **Components:** `client/src/components/InterviewDeclaration.jsx`, `client/src/components/InterviewProctor.jsx`

### Features
- [x] **Interview Types** — `technical`, `hr`, `combined`, `job_specific`, `platform`
- [x] **Domain-Specific Blueprints** — interview structure based on candidate's domain (Technical, Semi-Technical, Non-Technical)
- [x] **Dynamic Question Generation** — AI generates questions from resume + job description
- [x] **Multi-Round Interviews** — current round tracking, round-specific scoring
- [x] **Interview Readiness Check** — camera, microphone, browser compatibility checks before starting
- [x] **Interview Declaration** — terms acceptance before starting
- [x] **Live Camera Verification** — face detection to verify identity during interview
- [x] **Speech-to-Text** — real-time transcription of spoken answers
- [x] **Voice Interview Hook** — `useVoiceInterview` manages recording, transcription, submission
- [x] **AI Evaluation Engine** — multi-model evaluation:
  - Technical accuracy scoring
  - Communication quality scoring
  - Confidence assessment
  - Relevance analysis
  - Overall weighted scoring
- [x] **Quick Scoring** — fast preliminary score via lighter AI model
- [x] **Detailed Scoring** — comprehensive evaluation with feedback
- [x] **Strengths & Weaknesses Analysis** — AI-generated feedback per interview
- [x] **Interview Results Page** — visual display of scores, strengths, areas for improvement
- [x] **JD-Resume Match Score** — match scoring (overall, skills, experience, education, matched/missing skills)
- [x] **Recruiter Report Generation** — summary, recommendation, risk factors, salary recommendation, suggested next steps
- [x] **Video Recording** — interview sessions recorded and stored (Cloudinary)
- [x] **Video AI Analysis** — post-interview analysis of recorded video
- [x] **Skipped Answer Detection** — identifies and scores skipped/empty answers as 0
- [x] **Coding Test Section** — code execution within interviews (test cases, pass/fail)
- [x] **Admin Review System** — admin can review, approve, reject, escalate interviews
- [x] **Result Visibility Control** — results only visible to candidate after admin approval
- [x] **Interview Timers** — per-question time limits

---

## Video Interview Room (Froscel Interview Room™)

### Files
- **Frontend:** `client/src/pages/interview/InterviewRoom.jsx` (69KB), `InterviewRoom.css` (40KB)
- **Backend:** `server/routes/videoRoomRoutes.js` (31KB), `server/config/socket.js` (35KB)
- **Model:** `server/models/VideoRoom.js` (323 lines)
- **Reports:** `client/src/pages/recruiter/InterviewReport.jsx`

### Features
- [x] **WebRTC Video Calls** — real-time peer-to-peer video/audio via LiveKit
- [x] **Room Code System** — unique short codes (e.g., "A1B2C3D4") for joining rooms
- [x] **One-on-One & Panel Interviews** — support for multiple interview types
- [x] **Participant Management** — join/leave tracking, role-based permissions
- [x] **Camera Toggle** — on/off for both self and admin control
- [x] **Microphone Toggle** — mute/unmute with admin override capability
- [x] **Screen Sharing** — participants can share screen during interview
- [x] **Pin View** — pin specific participant's video feed
- [x] **Recording** — sessions recorded via Cloudinary or locally (status: idle/recording/processing/ready/failed)
- [x] **Live Transcript** — real-time transcription of all speakers
- [x] **AI-Generated Notes** — auto/manual/AI-suggested notes during interview
- [x] **Integrity Signals** — green/yellow/red flags for suspicious behavior
- [x] **Audit Log** — immutable log of all room actions (creation, start, end, joins, flags, mutes)
- [x] **Post-Interview Report** — AI-generated summary with:
  - Question-answer mapping with per-answer scores
  - Overall scores by category
  - Recommendation (highly_recommended → not_recommended)
  - Risk factors & suggested follow-up questions
  - Salary recommendation
- [x] **AI Follow-Up Suggestions** — AI suggests follow-up questions; recruiter can approve/edit/reject
- [x] **Recruiter Overrides** — recruiter can override AI scores with documented reasons
- [x] **Recruiter Validation** — recruiter validates final report before ATP update
- [x] **ATP Integration** — approved interview results update candidate's AI Talent Passport

---

## AI Talent Passport (ATP)

### Files
- **Frontend:** `client/src/components/AITalentPassport/AITalentPassport.jsx` (61KB), `ATPScoreRing.jsx`, `BehavioralTelemetry.jsx`, `CapabilityGraph.jsx`, `DomainRadar.jsx`, `MarketFeedback.jsx`
- **Backend:** `server/services/aiTalentPassportService.js` (13KB), `server/routes/talentPassportRoutes.js`
- **Model:** Fields in `server/models/User.js` (aiTalentPassport section)

### Features
- [x] **Talent Score** — 0-100 overall score
- [x] **Domain Score** — domain-specific proficiency rating
- [x] **Communication Score** — assessed via interviews
- [x] **Problem Solving Score** — assessed via challenges and interviews
- [x] **Consistency Score** — measured over multiple sessions
- [x] **Skill Heatmap** — per-skill proficiency visualization with assessment dates
- [x] **Proof-of-Work Scores** — coding tasks, simulations, real-world assessments
- [x] **Behavioral Telemetry** — leadership, teamwork, communication style
- [x] **Reliability Metrics** — punctuality, task completion rate, consistency
- [x] **Career Predictions** — AI-recommended roles with fit scores, salary estimates
- [x] **Growth Trajectory** — learning curve analysis, upskilling recommendations
- [x] **Domain-Specific Scores** — separate scores per domain (Engineering, Data Science, etc.)
- [x] **Score Ring Visualization** — animated circular progress indicators
- [x] **Capability Graph** — radar-style chart of capabilities
- [x] **Domain Radar** — domain comparison visualization
- [x] **Market Feedback** — hiring market signals and feedback display
- [x] **ATP Score Decay** — skill scores decay over time without activity (cron job: `server/jobs/skillDecay.js`)

---

## Skill Verification & Challenges

### Files
- **Frontend:** `client/src/components/challenges/ChallengesTab.jsx` (24KB), `ChallengeDetail.jsx` (25KB), `ChallengeCard.jsx`, `ChallengeHistory.jsx`, `CreateChallengeModal.jsx`
- **Backend:** `server/routes/challengeRoutes.js` (24KB), `server/routes/challengeAdminRoutes.js` (20KB), `server/routes/codeExecutionRoutes.js` (12KB), `server/routes/skillNodeRoutes.js` (13KB)
- **Models:** `server/models/Challenge.js`, `server/models/ChallengeAttempt.js`, `server/models/ChallengeRiskLog.js`, `server/models/SkillNode.js`
- **Utils:** `server/utils/antiCheatEngine.js` (15KB), `server/utils/challengeEvaluator.js` (16KB), `server/utils/riskEngine.js`

### Features
- [x] **Skill Node System** — XP-based leveling (0→4: Unverified → Basic → Intermediate → Advanced → Expert)
- [x] **XP Thresholds** — 0→100(L1), 100→300(L2), 300→600(L3), 600→1000(L4)
- [x] **Auto Level Calculation** — level auto-computed from XP with pre-save hooks
- [x] **Verified Status Tracking** — `not_verified`, `in_progress`, `verified`, `expert`
- [x] **Sub-Skills Detection** — e.g., Python → Django, Flask, NumPy
- [x] **XP History Audit Trail** — full log of XP changes with reasons
- [x] **Skill Decay** — skills decay over time without activity (cron-based)
- [x] **Challenge Types** — `custom` (user-created), `domain` (AI/system-generated)
- [x] **Question Types** — MCQ, short-answer, code, essay, simulation
- [x] **Code Challenges** — in-browser code execution with test cases
- [x] **Code IDE Component** — `client/src/components/CodeIDE/CodeIDE.jsx` with syntax highlighting
- [x] **AI Challenge Generation** — AI generates challenges targeting specific skills
- [x] **Challenge Evaluation** — automated scoring via AI evaluation engine
- [x] **Anti-Cheat Engine** — behavioral analysis, risk scoring per skill
- [x] **Challenge Risk Logging** — tracks suspicious behavior during challenges
- [x] **Leaderboard** — `client/src/pages/jobseeker/LeaderboardPage.jsx` — ranking by challenge scores
- [x] **Admin Challenge Monitoring** — admin can monitor, approve, flag challenges

---

## Job Marketplace

### Files
- **Frontend:** `client/src/pages/jobseeker/JobListingsPage.jsx` (24KB), `client/src/pages/recruiter/JobPostingPage.jsx` (35KB), `client/src/pages/recruiter/MyJobsPage.jsx`
- **Backend:** `server/routes/jobRoutes.js` (40KB), `server/routes/jobBuilderRoutes.js`
- **Components:** `client/src/components/SmartJobBuilder/SmartJobBuilder.jsx` (26KB)
- **Model:** `server/models/Job.js`

### Features
- [x] **Job Posting** — recruiters create jobs with title, description, requirements, salary, benefits
- [x] **Smart Job Builder** — AI-assisted job description generation
- [x] **Domain Classification** — jobs categorized by domain (engineering, data science, design, etc.)
- [x] **Interview Pipeline Configuration** — per-job customizable interview pipeline with:
  - Pipeline presets (quick_2round, standard_4round, dsa_only, assessment_only, custom)
  - Round types: screening, technical, coding, DSA, HR, assessment, system design, behavioral, portfolio review, group discussion, in-person, video, panel, etc.
  - Per-round scoring thresholds and weightage
  - Coding config (difficulty, languages, problem count, topics)
  - Assessment config (MCQ types: technical, communication, aptitude, reasoning)
  - Auto-reject/auto-advance score thresholds
- [x] **Job Search & Filters** — text search, skill-based filtering, experience level filters
- [x] **Job Application** — apply with resume, answers to custom questions
- [x] **Application Status Tracking** — applied → reviewing → interviewing → shortlisted → interviewed → rejected/hired
- [x] **Applicant Management** — recruiter notes, rejection reasons, hire dates
- [x] **AI Candidate Matching** — AI suggests matching candidates with match scores
- [x] **AI-Enhanced Descriptions** — AI formats and enriches job descriptions
- [x] **Job Analytics** — view counts per job
- [x] **Job Status Control** — draft, active, closed, filled
- [x] **Hybrid Pipeline (Dynamic Rounds)** — rounds as separate `Round` model with ObjectId references

---

## Recruiter Features

### Files
- **Frontend:** `client/src/pages/recruiter/RecruiterDashboard.jsx`, `RecruiterHome.jsx` (37KB), `RecruiterAnalytics.jsx` (21KB), `RecruiterApplicationsPage.jsx` (56KB), `CandidatesPage.jsx`, `HiringPipelinePage.jsx`, `RecruiterMessages.jsx`, `RecruiterSettings.jsx`, `InterviewReport.jsx` (20KB)
- **Components:** `client/src/components/InterviewPipelineConfig.jsx` (67KB), `client/src/components/ScheduleInterviewModal.jsx`, `client/src/components/OfferLetterModal.jsx`, `client/src/components/TopCandidatesSidebar.jsx`, `client/src/components/SparklineChart.jsx`, `client/src/components/StageTimeline.jsx`, `client/src/components/StatusBadge.jsx`

### Features
- [x] **Recruiter Dashboard** — sidebar layout with nested routes
- [x] **Recruiter Home Feed** — activity feed, recent activity, quick stats
- [x] **Recruiter Analytics** — hiring metrics, sparkline charts, conversion rates
- [x] **Applications Management** — view, filter, sort all applicants (56KB page!)
- [x] **Candidate Search** — browse and filter candidates
- [x] **Top Candidates Sidebar** — quick view of best-fit candidates
- [x] **Interview Pipeline Config** — drag-and-drop pipeline builder (67KB component)
- [x] **Schedule Interview Modal** — schedule interviews with candidates
- [x] **Offer Letter Modal** — generate and send offer letters
- [x] **Hiring Pipeline Page** — Kanban-style pipeline visualization
- [x] **Stage Timeline** — visual timeline of candidate progress
- [x] **Status Badges** — color-coded status indicators
- [x] **Interview Reports** — view detailed post-interview AI reports
- [x] **Recruiter Messaging** — in-app messaging with candidates
- [x] **Recruiter Settings** — account and notification preferences
- [x] **Recruiter Profile** — position, company name, domain, size, hiring volume

---

## Job Seeker Features

### Files
- **Frontend:** `client/src/pages/jobseeker/JobSeekerDashboard.jsx`, `HomeFeed.jsx` (71KB), `ProfilePage.jsx` (46KB), `InterviewsPage.jsx` (38KB), `SettingsPage.jsx` (42KB), `MessagingPage.jsx` (23KB), `OfferAcceptancePage.jsx` (13KB), `OnboardingPortal.jsx` (15KB), `LeaderboardPage.jsx` (14KB)
- **Components:** `client/src/components/FollowButton.jsx`, `client/src/components/MessageButton.jsx`, `client/src/components/UserProfileLink.jsx`

### Features
- [x] **Job Seeker Dashboard** — sidebar layout with nested routes
- [x] **Home Feed** — social feed with posts, achievements, ATP shares, job updates
- [x] **Profile Page** — editable profile with:
  - Personal info, bio, headline, avatar (with image cropping)
  - Skills management
  - Work experience
  - Education history
  - Certifications
  - Languages
  - Resume download/view
- [x] **Interviews Page** — view scheduled, completed, pending interviews with detailed results
- [x] **Job Listings** — browse, search, and apply to jobs
- [x] **Settings Page** — comprehensive settings (account, privacy, notifications, appearance, theme)
- [x] **Messaging** — real-time chat with recruiters and connections
- [x] **Offer Acceptance** — review, accept/decline offers with digital signature
- [x] **Onboarding Portal** — post-hire document submission and progress tracking
- [x] **Leaderboard** — skill challenge rankings
- [x] **Follow System** — follow/unfollow other users
- [x] **Connection Management** — followers, following, connection counts

---

## Social / Community Feed

### Files
- **Frontend:** `client/src/pages/jobseeker/HomeFeed.jsx` (71KB)
- **Backend:** `server/routes/postRoutes.js` (10KB)
- **Model:** `server/models/Post.js`
- **Components:** `client/src/components/CommentInput.jsx`

### Features
- [x] **Post Types** — text, media, achievement, proof_of_work, atp, job_posting, company_update, job_update, open_to_work, challenge
- [x] **Media Uploads** — image, video, document attachments
- [x] **Like/Dislike** — engagement with timestamps
- [x] **Comments** — threaded comments on posts
- [x] **Shares & Reposts** — share posts to network
- [x] **Post Visibility** — public, connections-only, private
- [x] **Tags & Mentions** — tag skills, mention other users
- [x] **Post Analytics** — view counts per post
- [x] **Pinned Posts** — pin important posts to top
- [x] **ATP Live Sync Posts** — posts that reference live ATP data

---

## Messaging System

### Files
- **Frontend:** `client/src/pages/jobseeker/MessagingPage.jsx`, `client/src/pages/recruiter/RecruiterMessages.jsx`
- **Backend:** `server/routes/messageRoutes.js` (12KB), `server/config/socket.js`
- **Model:** `server/models/Message.js`
- **Components:** `client/src/components/MessageButton.jsx`

### Features
- [x] **Real-Time Messaging** — Socket.io powered instant messaging
- [x] **Conversation View** — thread-based conversation between two users
- [x] **Typing Indicators** — real-time typing status via WebSocket
- [x] **Online Status** — user online/offline presence
- [x] **Message Privacy Controls** — allow messages from everyone, connections, or nobody
- [x] **Quick Message Button** — one-click message initiation from profile cards

---

## Notification System

### Files
- **Frontend:** `client/src/components/NotificationBell.jsx`, `client/src/components/NotificationCenter.jsx`
- **Backend:** `server/routes/notificationRoutes.js`
- **Model:** `server/models/Notification.js`

### Features
- [x] **Real-Time Notifications** — via Socket.io
- [x] **Notification Bell** — badge with unread count
- [x] **Notification Center** — full-page notification listing
- [x] **Notification Types** — follows, likes, comments, messages, interview updates, job updates
- [x] **Notification Preferences** — per-type enable/disable (email, push, follow, message, like, comment)
- [x] **Email Notifications** — sent via email service for important events
- [x] **Daily Interview Reminders** — cron job sends reminders for pending interviews (`server/jobs/dailyInterviewReminder.js`)

---

## Admin Panel

### Files
- **Frontend:** `client/src/pages/admin/AdminDashboard.jsx` (32KB), `AdminLogin.jsx`, `UserControl.jsx` (47KB), `InterviewQueue.jsx`, `InterviewDetail.jsx` (45KB), `ManageAdmins.jsx` (24KB), `AuditLogs.jsx`, `AIUsageDashboard.jsx`, `AdminFeedbacks.jsx`, `AdminChallengeMonitoring.jsx` (44KB), `AdminProjectReview.jsx` (13KB)
- **Backend:** `server/routes/adminRoutes.js` (60KB), `server/routes/adminSetup.js`
- **Models:** `server/models/Admin.js`, `server/models/AuditLog.js`, `server/models/AIUsage.js`

### Features
- [x] **Admin Login** — separate admin authentication flow
- [x] **Admin Dashboard** — overview with key metrics and charts
- [x] **User Control** — full CRUD on users (47KB!), suspend/unsuspend, mark as offender
- [x] **Interview Queue** — view all pending interviews for review
- [x] **Interview Detail** — deep dive into individual interview results, scores, video recordings, proctoring flags
- [x] **Interview Review System** — approve/reject/escalate with comments, priority levels (normal/high/critical)
- [x] **Manage Admins** — create/edit/delete admin accounts with permission levels
- [x] **Audit Logs** — immutable log of all admin actions
- [x] **AI Usage Dashboard** — monitor AI API usage, costs, rate limits
- [x] **Admin Feedbacks** — view and manage user feedback submissions
- [x] **Challenge Monitoring** — monitor challenge attempts, risk scores, anti-cheat flags
- [x] **Project Review** — review and approve/reject verified projects (GitHub projects)
- [x] **Jobs Management** — administer, edit, search, filter, and close published platform jobs
- [x] **Account Status Management** — suspend accounts, mark offenders with notes
- [x] **Admin Setup Route** — initial admin setup for fresh deployments (protected by secret)

---

## Hiring Pipeline & Onboarding Portal

### Files
- **Frontend:** `client/src/pages/recruiter/HiringPipelinePage.jsx`, `client/src/pages/jobseeker/OfferAcceptancePage.jsx`, `client/src/pages/jobseeker/OnboardingPortal.jsx`
- **Backend:** `server/routes/hiring.js` (10KB), `server/routes/documents.js` (9KB)
- **Models:** `server/models/HiringProcess.js`, `server/models/OnboardingDocument.js`
- **Components:** `client/src/components/OfferLetterModal.jsx`, `client/src/components/BatchManager.jsx`

### Features
- [x] **Offer Management** — extend, track, expire offers
- [x] **Offer Details** — position, salary, start date, location, employment type, department, benefits, custom terms
- [x] **Digital Offer Letters** — generate downloadable offer letter URLs
- [x] **Offer Acceptance/Decline** — candidate can accept with digital signature or decline with reason
- [x] **Offer Expiry** — auto-expire offers past deadline
- [x] **Onboarding Document Flow** — document submission tracking:
  - Stages: offer_extended → offer_accepted → documents_pending → documents_complete → onboarding_complete
  - Progress tracking (documents completed / total)
  - Overall progress percentage
- [x] **Candidate Batching** — batch process multiple candidates (`CandidateBatch` model)
- [x] **Hiring Pipeline Visualization** — pipeline stages view
- [x] **Reminder System** — automated reminders for pending actions

---

## Landing Page & SEO

### Files
- **Frontend:** `client/src/pages/landing/LandingPage.jsx`, `LandingPageNew.jsx`
- **Components:** `Hero.jsx`, `SplineHero.jsx`, `Features.jsx`, `Proof.jsx`, `CTA.jsx`, `Header.jsx`, `Footer.jsx`, `InterviewRoomLanding.jsx`, `GlossaryPage.jsx`, `BlogPage.jsx`
- **Animations:** `client/src/pages/landing/animations/`
- **Assets:** `client/src/pages/landing/assets/` (11 files)

### Features
- [x] **New Landing Page** — modern redesign (`LandingPageNew.jsx`)
- [x] **Legacy Landing Page** — older design still accessible at `/landing-old`
- [x] **3D Spline Hero** — interactive 3D animation via Spline
- [x] **Features Section** — feature showcase with icons and descriptions
- [x] **Social Proof Section** — testimonials/metrics
- [x] **CTA Section** — call-to-action with signup prompts
- [x] **Header & Footer** — full navigation header and info-rich footer
- [x] **Interview Room Landing (SEO)** — `/interview-room` public page for SEO
- [x] **Glossary Page (SEO)** — `/glossary` page for hiring terminology SEO
- [x] **Blog Page (SEO)** — `/blog` page for content marketing SEO
- [x] **Contact Form** — `client/src/components/ContactForm.jsx` with backend route

---

## Mobile App

### Files
- **Root:** `mobile/App.js`, `mobile/app.json`
- **Screens:** `mobile/src/screens/` (auth, home, interviews, jobs, passport, profile)
- **Services:** `mobile/src/services/`
- **Navigation:** `mobile/src/navigation/`
- **State:** `mobile/src/store/`
- **Theme:** `mobile/src/theme/`

### Features
- [x] **React Native (Expo)** — cross-platform mobile app
- [x] **Auth Screens** — login/signup (4 files)
- [x] **Home Screen** — main dashboard
- [x] **Interview Screens** — view/manage interviews (4 files)
- [x] **Job Screens** — browse jobs (2 files)
- [x] **Passport Screen** — view AI Talent Passport
- [x] **Profile Screens** — view/edit profile (3 files)
- [x] **API Service Layer** — centralized API client
- [x] **State Management** — Redux/Context store
- [x] **Theme System** — consistent theming

---

## AI Services & Integrations

### Files
- **Services:** `server/services/ai/geminiService.js` (44KB), `deepseekService.js` (37KB), `openRouterService.js` (35KB), `groqService.js`, `aiService.js`, `interviewOrchestrator.js` (23KB), `evaluationEngine.js` (25KB), `reportGeneratorService.js`, `videoAIService.js` (17KB), `aiUsageService.js`, `geminiCache.js`, `geminiRateLimiter.js`, `geminiRouter.js`
- **Adaptive Interview:** `server/services/adaptiveInterview/` (7 files: orchestrator, questionService, analysisService, sttService, ttsService, socketHandlers, sessionStore)
- **Resume:** `server/services/resume/resumeParser.js` (18KB), `unstructuredParser.js`
- **Email:** `server/services/emailService.js` (12KB)
- **ATP Service:** `server/services/aiTalentPassportService.js` (13KB)
- **Utils:** `server/utils/roleQuestionTemplates.js` (30KB)

### Features
- [x] **Multi-Model AI Architecture** — supports Google Gemini, DeepSeek, Groq, OpenRouter models
- [x] **Gemini Service** — primary AI for question generation, evaluation, answer scoring, profile analysis
- [x] **Gemini Caching** — response caching to reduce API calls
- [x] **Gemini Rate Limiter** — rate limiting to prevent API quota exhaustion
- [x] **Gemini Router** — intelligent routing between Gemini model variants
- [x] **DeepSeek Service** — alternative AI model for evaluation tasks
- [x] **OpenRouter Service** — fallback proxy service for interview evaluation when Gemini is unavailable
- [x] **Groq Service** — fast inference for lightweight tasks
- [x] **Interview Orchestrator** — coordinates multi-model evaluation pipeline
- [x] **Evaluation Engine** — scoring logic with multi-criteria assessment
- [x] **Report Generator** — creates comprehensive interview reports
- [x] **Video AI Service** — AI analysis of recorded interview videos
- [x] **AI Usage Tracking** — tracks API calls, tokens used, costs per model
- [x] **Adaptive Interview System** — real-time adaptive questioning via WebSocket:
  - Question service (generates follow-ups based on responses)
  - Analysis service (real-time answer quality analysis)
  - STT Service (speech-to-text integration)
  - TTS Service (text-to-speech for AI interviewer)
  - Session store & socket handlers
- [x] **Resume Parsing** — PDF and DOCX parsing with:
  - Skill extraction
  - Experience analysis
  - Education detection
  - Contact info extraction
  - Unstructured parser fallback
- [x] **Email Service** — transactional emails (verification, password reset, notifications, offer letters)
- [x] **Role Question Templates** — 30KB of domain-specific interview question templates
- [x] **Smart Job Builder AI** — AI-assisted job description creation

---

## Proctoring & Anti-Cheat

### Files
- **Frontend:** `client/src/components/InterviewProctor.jsx`, `client/src/components/LiveCameraVerification.jsx`
- **Hooks:** `client/src/hooks/useAntiCheat.js`, `client/src/hooks/useFaceDetection.js`, `client/src/hooks/useActivityMonitor.js`
- **Services:** `client/src/services/faceValidationService.js` (16KB), `client/src/services/proctoringService.js`
- **Backend Utils:** `server/utils/antiCheatEngine.js` (15KB), `server/utils/riskEngine.js`
- **Model:** Proctoring fields in `server/models/Interview.js`

### Features
- [x] **Face Detection** — real-time face tracking via TensorFlow.js
- [x] **Face Validation Service** — identity verification during interview
- [x] **Live Camera Verification** — liveness detection, face quality scoring
- [x] **Anti-Cheat Hook** — monitors for:
  - Tab switching detection
  - Multiple voices detection
  - Eye movement anomalies
  - Browser DevTools detection
  - Copy-paste detection
  - Phone detection
- [x] **Activity Monitor** — tracks page visibility, focus changes, suspicious patterns
- [x] **Proctoring Flags** — categorized flags: multiple_voices, eye_movement, tab_switch, face_not_detected, multiple_faces, phone_detected, devtools_open, copy_paste, browser_manipulation
- [x] **Risk Scoring** — aggregated risk score per skill across challenge attempts
- [x] **Anti-Cheat Engine** — server-side behavioral analysis
- [x] **Challenge Risk Logging** — `ChallengeRiskLog` model for detailed risk tracking
- [x] **Trust Score** — overall interview trust percentage

---

## Infrastructure & DevOps

### Files
- **Config:** `server/config/database.js`, `server/config/cloudinary.js`, `server/config/socket.js`, `server/config/passport.js`
- **Middleware:** `server/middleware/userAuth.js`, `server/middleware/adminAuth.js`, `server/middleware/platformInterviewGuard.js`
- **Client Services:** `client/src/services/api.js`, `client/src/services/socketService.js`
- **Cron Jobs:** `server/jobs/dailyInterviewReminder.js`, `server/jobs/skillDecay.js`
- **Deployment:** `server/vercel.json`

### Features
- [x] **MongoDB Connection** — Mongoose ODM with connection pooling
- [x] **Cloudinary Integration** — image/video upload and storage
- [x] **Socket.io Configuration** — real-time WebSocket server (35KB config!)
- [x] **Passport.js OAuth** — Google OAuth strategy
- [x] **CORS Configuration** — multi-layer CORS with failsafe headers
- [x] **File Uploads** — Multer middleware for resume/media uploads
- [x] **API Client** — Axios-based API service with interceptors
- [x] **Socket Client** — dedicated socket service for real-time features
- [x] **Cron Jobs** — scheduled tasks (interview reminders, skill decay)
- [x] **Vercel Deployment** — serverless deployment configuration
- [x] **Error Handling** — global error handler middleware
- [x] **Health Check** — `/api/health` endpoint
- [x] **Activity Tracking** — `useActivityTracker` hook logs user activity
- [x] **Deep Engagement Tracking** — `useDeepEngagement` hook for user engagement metrics
- [x] **Theme Toggle** — dark/light mode switching
- [x] **Toast Notifications** — toast notification system
- [x] **Skeleton Loading** — skeleton UI for loading states
- [x] **Lazy Loading** — all pages lazy-loaded via `React.lazy()`
- [x] **Image Crop Modal** — client-side image cropping for profile photos
- [x] **Confirm Dialog** — reusable confirmation dialog component
- [x] **Progress Bar** — reusable progress bar component
- [x] **Terms Modal** — terms of service modal
- [x] **Feedback Modal** — user feedback submission modal
- [x] **Mobile Navigation** — responsive bottom nav for mobile web
- [x] **Top Navigation** — desktop top nav with search and notifications
- [x] **Autocomplete Input** — reusable autocomplete component
- [x] **Skills Input** — tag-based skills input component
- [x] **Job Domains Input** — domain selection component

---

## Verified Projects (ATP Proof-of-Work)

### Files
- **Backend:** `server/routes/projectRoutes.js` (12KB)
- **Model:** `server/models/VerifiedProject.js`
- **Utils:** `server/utils/githubAnalyzer.js` (9KB)
- **Admin:** `client/src/pages/admin/AdminProjectReview.jsx`

### Features
- [x] **GitHub Project Submission** — users submit GitHub URLs for verification
- [x] **Automated GitHub Analysis** — analyzer checks:
  - Tech stack detection
  - Commit count
  - Contributor count
  - Estimated lines of code
  - Complexity estimate
  - Originality score (fork detection)
  - Development days estimate
- [x] **Admin Review** — admins review and approve/reject projects
- [x] **ATP Impact Scoring** — approved projects boost ATP scores
- [x] **Project Metrics** — complexity rating, LOC, originality assessment

---

## User Settings & Privacy

### Files
- **Frontend:** `client/src/pages/jobseeker/SettingsPage.jsx` (42KB), `client/src/pages/recruiter/RecruiterSettings.jsx`
- **Backend:** `server/routes/settingsRoutes.js` (12KB)

### Features
- [x] **Account Settings** — email, password, profile visibility
- [x] **Privacy Controls** — profile visibility (public/connections/private), message permissions
- [x] **Notification Preferences** — per-type email and push notification toggles
- [x] **Theme Preferences** — dark/light mode persistence
- [x] **Account Deletion/Suspension** — admin-controlled account status

---

## Public Profiles

### Files
- **Frontend:** `client/src/pages/shared/PublicProfilePage.jsx` (46KB)
- **Backend:** `server/routes/profileRoutes.js` (11KB)

### Features
- [x] **Public Profile View** — viewable by anyone (with login)
- [x] **ATP Display** — shows candidate's AI Talent Passport on profile
- [x] **Skill Badges** — verified skill levels displayed
- [x] **Work History** — experience timeline
- [x] **Follow/Message Actions** — quick action buttons on profiles
- [x] **Profile Analytics** — view tracking

---

## Feedback System

### Files
- **Frontend:** `client/src/components/FeedbackModal.jsx` (16KB)
- **Backend:** `server/routes/feedbackRoutes.js`
- **Model:** `server/models/Feedback.js`

### Features
- [x] **User Feedback Submission** — in-app feedback form
- [x] **Admin Feedback Review** — admins view and manage feedback
- [x] **Feedback Categories** — structured feedback types

---

> **⚠️ IMPORTANT:** This file must be updated every time a feature is added, modified, or removed.  
> When starting a new conversation, read this file first for full context.
