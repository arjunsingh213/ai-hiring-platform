/**
 * Expanded Job Domains Database (Simulated API)
 * 
 * This file acts as a local database for job domains and roles to provide
 * instant auto-suggestions without relying on external APIs that might go down.
 * 
 * Structure:
 * - doman: The main category
 * - roles: Common job titles within that domain
 * - keywords: Related terms for search matching
 */

export const EXPANDED_JOB_DOMAINS = [
    // --- TECHNOLOGY & ENGINEERING ---
    {
        id: 'tech_sw',
        domain: 'Software Engineering',
        roles: ['Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'DevOps Engineer', 'iOS Developer', 'Android Developer', 'Software Architect', 'QA Engineer', 'Game Developer', 'Embedded Systems Engineer'],
        keywords: ['coding', 'programming', 'web', 'app', 'mobile', 'software', 'it']
    },
    {
        id: 'tech_data',
        domain: 'Data Science & Analytics',
        roles: ['Data Scientist', 'Data Analyst', 'Data Engineer', 'Machine Learning Engineer', 'AI Researcher', 'Business Intelligence Analyst', 'Statistician', 'Database Administrator'],
        keywords: ['big data', 'ml', 'ai', 'analytics', 'statistics', 'sql', 'python']
    },
    {
        id: 'tech_product',
        domain: 'Product Management',
        roles: ['Product Manager', 'Associate Product Manager', 'Product Owner', 'Technical Product Manager', 'Group Product Manager', 'Head of Product'],
        keywords: ['product', 'agile', 'scrum', 'roadmap', 'strategy']
    },
    {
        id: 'tech_design',
        domain: 'Design & Creative',
        roles: ['UI/UX Designer', 'Graphic Designer', 'Product Designer', 'Web Designer', 'Art Director', 'Motion Graphics Designer', 'Illustrator', '3D Artist'],
        keywords: ['user interface', 'user experience', 'creative', 'art', 'visual', 'sketch', 'figma']
    },
    {
        id: 'tech_cyber',
        domain: 'Cybersecurity',
        roles: ['Security Analyst', 'Ethical Hacker', 'Security Engineer', 'CISO', 'Security Consultant', 'Network Security Engineer', 'Penetration Tester'],
        keywords: ['security', 'hacking', 'network', 'protection', 'infosec']
    },
    {
        id: 'tech_it',
        domain: 'IT & Infrastructure',
        roles: ['System Administrator', 'Network Engineer', 'IT Support Specialist', 'Cloud Architect', 'Site Reliability Engineer (SRE)', 'Help Desk Technician'],
        keywords: ['support', 'network', 'sysadmin', 'cloud', 'aws', 'azure']
    },

    // --- BUSINESS & MANAGEMENT ---
    {
        id: 'bus_marketing',
        domain: 'Marketing',
        roles: ['Digital Marketer', 'Content Strategist', 'SEO Specialist', 'Social Media Manager', 'Brand Manager', 'Marketing Manager', 'Copywriter', 'Email Marketing Specialist'],
        keywords: ['advertising', 'growth', 'social', 'content', 'brand', 'seo']
    },
    {
        id: 'bus_sales',
        domain: 'Sales & Business Development',
        roles: ['Sales Representative', 'Account Executive', 'Business Development Manager', 'Sales Manager', 'Account Manager', 'Customer Success Manager', 'Presales Consultant'],
        keywords: ['selling', 'bd', 'revenue', 'clients', 'customers']
    },
    {
        id: 'bus_finance',
        domain: 'Finance & Accounting',
        roles: ['Financial Analyst', 'Accountant', 'Investment Banker', 'Auditor', 'Controller', 'Finance Manager', 'Tax Consultant', 'Bookkeeper'],
        keywords: ['money', 'banking', 'investment', 'tax', 'audit', 'accounting']
    },
    {
        id: 'bus_hr',
        domain: 'Human Resources',
        roles: ['HR Manager', 'Talent Acquisition Specialist', 'Recruiter', 'HR Business Partner', 'People Operations Manager', 'Training & Development Specialist'],
        keywords: ['hiring', 'recruitment', 'personnel', 'people', 'training']
    },
    {
        id: 'bus_ops',
        domain: 'Operations & Strategy',
        roles: ['Operations Manager', 'Project Manager', 'Program Manager', 'Strategy Consultant', 'Supply Chain Manager', 'Logistics Coordinator'],
        keywords: ['logistics', 'planning', 'management', 'process', 'scrum']
    },

    // --- OTHER PROFESSIONAL SECTORS ---
    {
        id: 'healthcare',
        domain: 'Healthcare & Medical',
        roles: ['Registered Nurse', 'Physician', 'Pharmacist', 'Medical Researcher', 'Healthcare Administrator', 'Physical Therapist', 'Dentist', 'Surgeon'],
        keywords: ['medical', 'doctor', 'nurse', 'health', 'hospital']
    },
    {
        id: 'edu',
        domain: 'Education & Training',
        roles: ['Teacher', 'Professor', 'Instructional Designer', 'Tutor', 'Education Administrator', 'Curriculum Developer', 'School Counselor'],
        keywords: ['teaching', 'school', 'university', 'learning', 'academic']
    },
    {
        id: 'legal',
        domain: 'Legal',
        roles: ['Lawyer', 'Paralegal', 'Legal Consultant', 'Corporate Counsel', 'Compliance Officer', 'Judge'],
        keywords: ['law', 'attorney', 'legal', 'compliance']
    },
    {
        id: 'media',
        domain: 'Media & Communications',
        roles: ['Journalist', 'Editor', 'Public Relations Specialist', 'Video Editor', 'Content Creator', 'Broadcaster', 'Producer'],
        keywords: ['news', 'writing', 'video', 'pr', 'communication']
    },
    {
        id: 'construction',
        domain: 'Construction & Architecture',
        roles: ['Civil Engineer', 'Architect', 'Construction Manager', 'Interior Designer', 'Surveyor', 'Urban Planner'],
        keywords: ['building', 'design', 'structure', 'planning']
    }
];

// Helper function to search domains (Simulates an API search endpoint)
export const searchJobDomains = (query) => {
    if (!query) return [];

    const lowerQuery = query.toLowerCase();

    // First pass: Exact or starts-with match on domain name (Priority)
    const exactMatches = EXPANDED_JOB_DOMAINS.filter(item =>
        item.domain.toLowerCase().startsWith(lowerQuery)
    );

    // Second pass: Contains match on domain name or keywords
    const fuzzyMatches = EXPANDED_JOB_DOMAINS.filter(item =>
        !item.domain.toLowerCase().startsWith(lowerQuery) && (
            item.domain.toLowerCase().includes(lowerQuery) ||
            item.keywords.some(k => k.toLowerCase().includes(lowerQuery)) ||
            item.roles.some(r => r.toLowerCase().includes(lowerQuery))
        )
    );

    // Combine and deduplicate
    return [...exactMatches, ...fuzzyMatches].slice(0, 8); // Limit to top 8 results
};

// Helper to get roles for a specific domain
export const getRolesForDomain = (domainName) => {
    const domain = EXPANDED_JOB_DOMAINS.find(d => d.domain === domainName);
    return domain ? domain.roles : [];
};
