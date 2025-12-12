/**
 * Validation Data for Onboarding Form
 * Contains valid options for autocomplete fields
 */

// Domains/Fields of Study
export const DOMAINS = [
    "Computer Science",
    "Computer Science and Engineering (CSE)",
    "Information Technology (IT)",
    "Software Engineering",
    "Data Science",
    "Artificial Intelligence",
    "Machine Learning",
    "Electrical Engineering",
    "Electronics and Communication (ECE)",
    "Mechanical Engineering",
    "Civil Engineering",
    "Chemical Engineering",
    "Aerospace Engineering",
    "Biomedical Engineering",
    "Biotechnology",
    "Business Administration (MBA)",
    "Finance",
    "Marketing",
    "Human Resources",
    "Operations Management",
    "Commerce",
    "Accounting",
    "Economics",
    "Mathematics",
    "Physics",
    "Chemistry",
    "Biology",
    "Pharmacy",
    "Medicine (MBBS)",
    "Nursing",
    "Law (LLB)",
    "Architecture",
    "Design",
    "Mass Communication",
    "Journalism",
    "Psychology",
    "Sociology",
    "Political Science",
    "History",
    "English Literature",
    "Other"
];

// Job Domains - Areas where users want to work (max 3 selectable)
export const JOB_DOMAINS = [
    { id: 'web_dev', name: 'Web Development', icon: '🌐' },
    { id: 'frontend', name: 'Frontend Development', icon: '🎨' },
    { id: 'backend', name: 'Backend Development', icon: '⚙️' },
    { id: 'fullstack', name: 'Full Stack Development', icon: '💻' },
    { id: 'mobile', name: 'Mobile App Development', icon: '📱' },
    { id: 'data_science', name: 'Data Science', icon: '📊' },
    { id: 'data_analyst', name: 'Data Analytics', icon: '📈' },
    { id: 'ml_ai', name: 'AI & Machine Learning', icon: '🤖' },
    { id: 'devops', name: 'DevOps & Cloud', icon: '☁️' },
    { id: 'cybersecurity', name: 'Cybersecurity', icon: '🔒' },
    { id: 'network', name: 'Network Engineering', icon: '🔌' },
    { id: 'database', name: 'Database Administration', icon: '🗄️' },
    { id: 'ui_ux', name: 'UI/UX Design', icon: '✏️' },
    { id: 'graphic_design', name: 'Graphic Design', icon: '🎭' },
    { id: 'product', name: 'Product Management', icon: '📋' },
    { id: 'project', name: 'Project Management', icon: '📅' },
    { id: 'qa_testing', name: 'QA & Testing', icon: '🧪' },
    { id: 'hr', name: 'Human Resources', icon: '👥' },
    { id: 'marketing', name: 'Marketing', icon: '📣' },
    { id: 'sales', name: 'Sales', icon: '💼' },
    { id: 'finance', name: 'Finance & Accounting', icon: '💰' },
    { id: 'content', name: 'Content Writing', icon: '✍️' },
    { id: 'support', name: 'Technical Support', icon: '🎧' },
    { id: 'research', name: 'Research & Development', icon: '🔬' },
    { id: 'consulting', name: 'Consulting', icon: '💡' },
    { id: 'other', name: 'Other', icon: '📦' }
];


// Job Roles
export const JOB_ROLES = [
    "Full Stack Developer",
    "Frontend Developer",
    "Backend Developer",
    "Software Engineer",
    "Software Developer",
    "Web Developer",
    "Mobile App Developer",
    "iOS Developer",
    "Android Developer",
    "React Developer",
    "Angular Developer",
    "Vue.js Developer",
    "Node.js Developer",
    "Python Developer",
    "Java Developer",
    "DevOps Engineer",
    "Cloud Engineer",
    "Cloud Architect",
    "Data Scientist",
    "Data Analyst",
    "Data Engineer",
    "Machine Learning Engineer",
    "AI Engineer",
    "Deep Learning Engineer",
    "Business Analyst",
    "Product Manager",
    "Project Manager",
    "Scrum Master",
    "UI/UX Designer",
    "Graphic Designer",
    "Quality Assurance (QA) Engineer",
    "Test Engineer",
    "Automation Tester",
    "System Administrator",
    "Network Engineer",
    "Security Engineer",
    "Cybersecurity Analyst",
    "Database Administrator (DBA)",
    "Technical Writer",
    "Technical Support Engineer",
    "IT Support Specialist",
    "Sales Executive",
    "Marketing Executive",
    "Digital Marketing Specialist",
    "SEO Specialist",
    "Content Writer",
    "HR Executive",
    "Recruiter",
    "Finance Analyst",
    "Accountant",
    "Management Trainee",
    "Research Analyst",
    "Consultant",
    "Intern",
    "Fresher",
    "Other"
];

// Professions
export const PROFESSIONS = [
    "Software Engineer",
    "Student",
    "Web Developer",
    "Mobile Developer",
    "Data Scientist",
    "Data Analyst",
    "Business Analyst",
    "Product Manager",
    "Project Manager",
    "UI/UX Designer",
    "Graphic Designer",
    "DevOps Engineer",
    "System Administrator",
    "Network Engineer",
    "Quality Assurance",
    "Technical Writer",
    "Sales Professional",
    "Marketing Professional",
    "HR Professional",
    "Finance Professional",
    "Consultant",
    "Research Scholar",
    "Intern",
    "Fresher",
    "Entrepreneur",
    "Freelancer",
    "Other"
];

// Helper function to search in an array (case-insensitive, partial match)
export const searchInList = (list, query, limit = 10) => {
    if (!query || query.length < 2) return [];

    const lowerQuery = query.toLowerCase();
    const results = list.filter(item =>
        item.toLowerCase().includes(lowerQuery)
    );

    // Prioritize items that start with the query
    results.sort((a, b) => {
        const aStarts = a.toLowerCase().startsWith(lowerQuery);
        const bStarts = b.toLowerCase().startsWith(lowerQuery);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return a.localeCompare(b);
    });

    return results.slice(0, limit);
};

// Age and DOB validation
export const validateAgeAndDOB = (age, dob) => {
    if (!age || !dob) return null;

    const today = new Date();
    const birthDate = new Date(dob);

    // Check if DOB is in the future
    if (birthDate > today) {
        return "Date of birth cannot be in the future";
    }

    // Calculate age from DOB
    let calculatedAge = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--;
    }

    const enteredAge = parseInt(age);

    // Allow 1 year tolerance (birthday might not have passed yet)
    if (Math.abs(calculatedAge - enteredAge) > 1) {
        return `Age doesn't match DOB. You should be ${calculatedAge} years old.`;
    }

    // Check reasonable age range
    if (calculatedAge < 16) {
        return "You must be at least 16 years old";
    }

    if (calculatedAge > 70) {
        return "Please check your date of birth";
    }

    return null; // Valid
};

// Name validation
export const validateName = (name) => {
    if (!name || name.trim().length < 2) {
        return "Name must be at least 2 characters";
    }

    // Check for gibberish (no vowels, all same character, etc.)
    const namePattern = /^[A-Za-z\s.'-]+$/;
    if (!namePattern.test(name)) {
        return "Name can only contain letters, spaces, and basic punctuation";
    }

    // Check for repeated characters
    if (/(.)\1{4,}/.test(name)) {
        return "Please enter a valid name";
    }

    return null; // Valid
};

// Mobile validation (Indian format)
export const validateMobile = (mobile) => {
    if (!mobile) return null; // Optional

    // Remove spaces and dashes
    const cleaned = mobile.replace(/[\s-]/g, '');

    // Indian mobile: 10 digits starting with 6-9
    const indianPattern = /^[6-9]\d{9}$/;

    // International format with + prefix
    const intlPattern = /^\+\d{10,15}$/;

    if (!indianPattern.test(cleaned) && !intlPattern.test(cleaned)) {
        return "Please enter a valid 10-digit mobile number";
    }

    return null; // Valid
};

// LinkedIn URL validation
export const validateLinkedIn = (url) => {
    if (!url) return null; // Optional

    const linkedinPattern = /^(https?:\/\/)?(www\.)?linkedin\.com\/(in|company)\/[\w-]+\/?$/i;
    if (!linkedinPattern.test(url)) {
        return "Please enter a valid LinkedIn profile URL";
    }

    return null; // Valid
};

// GitHub URL validation
export const validateGitHub = (url) => {
    if (!url) return null; // Optional

    const githubPattern = /^(https?:\/\/)?(www\.)?github\.com\/[\w-]+\/?$/i;
    if (!githubPattern.test(url)) {
        return "Please enter a valid GitHub profile URL";
    }

    return null; // Valid
};
