/**
 * Role-Specific Interview Question Templates
 * Maps job roles to question focus areas and difficulty levels based on experience
 */

// Role category mapping - groups similar roles together
const ROLE_CATEGORIES = {
    development: [
        'Full Stack Developer', 'Frontend Developer', 'Backend Developer',
        'Software Engineer', 'Software Developer', 'Web Developer',
        'Mobile App Developer', 'iOS Developer', 'Android Developer',
        'React Developer', 'Angular Developer', 'Vue.js Developer',
        'Node.js Developer', 'Python Developer', 'Java Developer'
    ],
    data: [
        'Data Scientist', 'Data Analyst', 'Data Engineer',
        'Machine Learning Engineer', 'AI Engineer', 'Deep Learning Engineer',
        'Business Analyst'
    ],
    design: [
        'UI/UX Designer', 'Graphic Designer'
    ],
    devops: [
        'DevOps Engineer', 'Cloud Engineer', 'Cloud Architect',
        'System Administrator', 'Network Engineer'
    ],
    management: [
        'Product Manager', 'Project Manager', 'Scrum Master'
    ],
    qa: [
        'Quality Assurance (QA) Engineer', 'Test Engineer', 'Automation Tester'
    ],
    security: [
        'Security Engineer', 'Cybersecurity Analyst'
    ],
    database: [
        'Database Administrator (DBA)'
    ],
    other: [
        'Technical Writer', 'Technical Support Engineer', 'IT Support Specialist',
        'Sales Executive', 'Marketing Executive', 'Digital Marketing Specialist',
        'SEO Specialist', 'Content Writer', 'HR Executive', 'Recruiter',
        'Finance Analyst', 'Accountant'
    ]
};

// Question focus templates by role category and experience level
const QUESTION_TEMPLATES = {
    development: {
        fresher: {
            round1: {
                name: "Introduction & Background",
                questionCount: 5,
                focus: ["role introduction", "resume experience", "background overview"],
                difficulty: "easy",
                competencies: ["communication", "relevant experience", "role understanding"]
            },
            round2: {
                name: "Technical Fundamentals",
                questionCount: 6,
                focus: ["core concepts", "debugging", "version control", "basic algorithms"],
                difficulty: "medium",
                competencies: ["technical knowledge", "analytical thinking", "code quality awareness"]
            },
            round3: {
                name: "Practical Application",
                questionCount: 4,
                focus: ["academic projects", "learning scenarios", "teamwork"],
                difficulty: "medium",
                competencies: ["project experience", "collaboration", "continuous learning"]
            }
        },
        experienced: {
            '0-2': {
                round1: {
                    name: "Early Career Experience",
                    questionCount: 4,
                    focus: ["recent projects", "team workflow", "code reviews"],
                    difficulty: "medium",
                    competencies: ["hands-on experience", "professional practices", "teamwork"]
                },
                round2: {
                    name: "Technical Skills",
                    questionCount: 6,
                    focus: ["frameworks", "best practices", "debugging complex issues"],
                    difficulty: "medium-hard",
                    competencies: ["technology stack depth", "problem resolution", "code standards"]
                },
                round3: {
                    name: "Growth & Collaboration",
                    questionCount: 5,
                    focus: ["ownership", "learning from seniors", "code improvements"],
                    difficulty: "medium",
                    competencies: ["initiative", "learning agility", "quality focus"]
                }
            },
            '3-5': {
                round1: {
                    name: "Professional Expertise",
                    questionCount: 4,
                    focus: ["complex features", "architecture decisions", "technical challenges"],
                    difficulty: "hard",
                    competencies: ["system design", "decision making", "technical depth"]
                },
                round2: {
                    name: "Advanced Technical",
                    questionCount: 6,
                    focus: ["scalability", "performance optimization", "design patterns", "microservices"],
                    difficulty: "hard",
                    competencies: ["architecture skills", "optimization", "advanced concepts"]
                },
                round3: {
                    name: "Leadership & Impact",
                    questionCount: 5,
                    focus: ["mentoring", "project ownership", "technical direction"],
                    difficulty: "hard",
                    competencies: ["leadership", "influence", "business impact"]
                }
            },
            '5+': {
                round1: {
                    name: "Strategic Technical Leadership",
                    questionCount: 4,
                    focus: ["strategic decisions", "system architecture", "business alignment"],
                    difficulty: "expert",
                    competencies: ["strategic thinking", "architectural vision", "business acumen"]
                },
                round2: {
                    name: "Expert Technical Knowledge",
                    questionCount: 6,
                    focus: ["distributed systems", "technical standards", "innovation", "technical debt"],
                    difficulty: "expert",
                    competencies: ["expert knowledge", "technical standardization", "thought leadership"]
                },
                round3: {
                    name: "Organizational Impact",
                    questionCount: 5,
                    focus: ["team building", "technical culture", "cross-team collaboration"],
                    difficulty: "expert",
                    competencies: ["organizational influence", "culture building", "strategic leadership"]
                }
            }
        }
    },

    data: {
        fresher: {
            round1: {
                name: "Data Science Foundation",
                questionCount: 5,
                focus: ["interest in data", "statistical concepts", "tools knowledge"],
                difficulty: "easy",
                competencies: ["analytical mindset", "statistics basics", "tool familiarity"]
            },
            round2: {
                name: "Technical Skills",
                questionCount: 6,
                focus: ["data analysis", "machine learning basics", "data cleaning", "python/r"],
                difficulty: "medium",
                competencies: ["technical skills", "ML concepts", "data processing"]
            },
            round3: {
                name: "Applied Learning",
                questionCount: 4,
                focus: ["academic projects", "data insights", "model evaluation"],
                difficulty: "medium",
                competencies: ["project work", "insight generation", "evaluation methods"]
            }
        },
        experienced: {
            '0-2': {
                round1: { name: "Data Experience", questionCount: 4, focus: ["data projects", "analysis work", "stakeholder interaction"], difficulty: "medium", competencies: ["professional experience", "communication", "business context"] },
                round2: { name: "Technical Depth", questionCount: 6, focus: ["ML algorithms", "data pipelines", "feature engineering"], difficulty: "medium-hard", competencies: ["algorithm knowledge", "pipeline building", "feature selection"] },
                round3: { name: "Impact & Growth", questionCount: 5, focus: ["business insights", "metrics improvement", "learning"], difficulty: "medium", competencies: ["business impact", "metric-driven", "continuous learning"] }
            },
            '3-5': {
                round1: { name: "Advanced Data Work", questionCount: 4, focus: ["complex analyses", "model deployment", "data strategy"], difficulty: "hard", competencies: ["advanced analytics", "ML ops", "strategic thinking"] },
                round2: { name: "Expert Techniques", questionCount: 6, focus: ["deep learning", "big data", "A/B testing", "model optimization"], difficulty: "hard", competencies: ["advanced ML", "big data tech", "experimentation"] },
                round3: { name: "Leadership", questionCount: 5, focus: ["team collaboration", "project ownership", "data-driven decisions"], difficulty: "hard", competencies: ["leadership", "influence", "decision making"] }
            },
            '5+': {
                round1: { name: "Data Science Leadership", questionCount: 4, focus: ["data strategy", "team building", "innovation"], difficulty: "expert", competencies: ["strategic vision", "team leadership", "innovation"] },
                round2: { name: "Expert Knowledge", questionCount: 6, focus: ["advanced architectures", "MLOps", "research", "fairness"], difficulty: "expert", competencies: ["cutting-edge knowledge", "ethical AI", "research application"] },
                round3: { name: "Organizational Impact", questionCount: 5, focus: ["culture", "process", "cross-functional leadership"], difficulty: "expert", competencies: ["organizational impact", "process improvement", "executive communication"] }
            }
        }
    },

    design: {
        fresher: {
            round1: { name: "Design Passion", questionCount: 5, focus: ["design interest", "design process", "tools"], difficulty: "easy", competencies: ["design thinking", "creativity", "tool proficiency"] },
            round2: { name: "Design Fundamentals", questionCount: 6, focus: ["UX principles", "accessibility", "design systems"], difficulty: "medium", competencies: ["UX knowledge", "accessibility", "consistency"] },
            round3: { name: "Portfolio Projects", questionCount: 4, focus: ["projects", "feedback handling", "iteration"], difficulty: "medium", competencies: ["practical experience", "feedback receptiveness", "iteration"] }
        },
        experienced: {
            '0-2': {
                round1: { name: "Professional Design", questionCount: 4, focus: ["design projects", "user research", "collaboration"], difficulty: "medium", competencies: ["professional work", "user focus", "teamwork"] },
                round2: { name: "Advanced Design", questionCount: 6, focus: ["design systems", "responsive design", "prototyping"], difficulty: "medium-hard", competencies: ["system thinking", "multi-platform", "prototyping skills"] },
                round3: { name: "Impact", questionCount: 5, focus: ["metrics improvement", "stakeholder management", "iteration"], difficulty: "medium", competencies: ["measurable impact", "communication", "refinement"] }
            },
            '3-5': {
                round1: { name: "Design Leadership", questionCount: 4, focus: ["design strategy", "complex projects", "team collaboration"], difficulty: "hard", competencies: ["strategic design", "complexity handling", "leadership"] },
                round2: { name: "Expert Design", questionCount: 6, focus: ["design language", "design ops", "innovation"], difficulty: "hard", competencies: ["system ownership", "process", "innovation"] },
                round3: { name: "Influence", questionCount: 5, focus: ["advocacy", "culture", "cross-team"], difficulty: "hard", competencies: ["user advocacy", "culture building", "influence"] }
            },
            '5+': {
                round1: { name: "Design Strategy", questionCount: 4, focus: ["vision", "team building", "organizational design"], difficulty: "expert", competencies: ["strategic vision", "team development", "org-level design"] },
                round2: { name: "Thought Leadership", questionCount: 6, focus: ["industry trends", "design standards", "innovation"], difficulty: "expert", competencies: ["thought leadership", "standardization", "innovation"] },
                round3: { name: "Executive Impact", questionCount: 5, focus: ["business alignment", "executive communication", "ROI"], difficulty: "expert", competencies: ["business impact", "executive presence", "value demonstration"] }
            }
        }
    },

    // Generic fallback template for all other categories
    devops: {
        fresher: {
            round1: { name: "Foundation & Motivation", questionCount: 5, focus: ["career motivation", "basic concepts", "learning approach"], difficulty: "easy", competencies: ["fundamentals", "problem-solving", "passion"] },
            round2: { name: "Technical Fundamentals", questionCount: 6, focus: ["core technical skills", "tools", "best practices"], difficulty: "medium", competencies: ["technical knowledge", "analytical thinking", "quality awareness"] },
            round3: { name: "Practical Application", questionCount: 4, focus: ["projects", "learning scenarios", "teamwork"], difficulty: "medium", competencies: ["project experience", "collaboration", "continuous learning"] }
        },
        experienced: {
            '0-2': {
                round1: { name: "Early Career Experience", questionCount: 4, focus: ["recent projects", "team workflow", "responsibilities"], difficulty: "medium", competencies: ["hands-on experience", "professional practices", "teamwork"] },
                round2: { name: "Technical Skills", questionCount: 6, focus: ["technical expertise", "best practices", "problem-solving"], difficulty: "medium-hard", competencies: ["depth of knowledge", "problem resolution", "standards"] },
                round3: { name: "Growth & Collaboration", questionCount: 5, focus: ["ownership", "learning", "improvements"], difficulty: "medium", competencies: ["initiative", "learning agility", "quality focus"] }
            },
            '3-5': {
                round1: { name: "Professional Expertise", questionCount: 4, focus: ["complex projects", "key decisions", "technical challenges"], difficulty: "hard", competencies: ["expertise", "decision making", "technical depth"] },
                round2: { name: "Advanced Technical", questionCount: 6, focus: ["advanced topics", "optimization", "architecture"], difficulty: "hard", competencies: ["advanced skills", "optimization", "strategic thinking"] },
                round3: { name: "Leadership & Impact", questionCount: 5, focus: ["mentoring", "project ownership", "direction"], difficulty: "hard", competencies: ["leadership", "influence", "business impact"] }
            },
            '5+': {
                round1: { name: "Strategic Leadership", questionCount: 4, focus: ["strategic decisions", "architecture", "business alignment"], difficulty: "expert", competencies: ["strategic thinking", "vision", "business acumen"] },
                round2: { name: "Expert Knowledge", questionCount: 6, focus: ["expert topics", "standards", "innovation"], difficulty: "expert", competencies: ["expert knowledge", "standardization", "thought leadership"] },
                round3: { name: "Organizational Impact", questionCount: 5, focus: ["team building", "culture", "cross-team collaboration"], difficulty: "expert", competencies: ["organizational influence", "culture building", "leadership"] }
            }
        }
    },
    management: {
        fresher: {
            round1: { name: "Foundation & Motivation", questionCount: 5, focus: ["career motivation", "basic concepts", "learning approach"], difficulty: "easy", competencies: ["fundamentals", "problem-solving", "passion"] },
            round2: { name: "Management Fundamentals", questionCount: 6, focus: ["management basics", "tools", "methodologies"], difficulty: "medium", competencies: ["knowledge", "thinking", "awareness"] },
            round3: { name: "Practical Application", questionCount: 4, focus: ["projects", "scenarios", "teamwork"], difficulty: "medium", competencies: ["experience", "collaboration", "learning"] }
        },
        experienced: {
            '0-2': {
                round1: { name: "Management Experience", questionCount: 4, focus: ["projects", "team coordination", "stakeholders"], difficulty: "medium", competencies: ["experience", "practices", "teamwork"] },
                round2: { name: "Management Skills", questionCount: 6, focus: ["methodologies", "tools", "problem-solving"], difficulty: "medium-hard", competencies: ["knowledge", "resolution", "standards"] },
                round3: { name: "Growth", questionCount: 5, focus: ["ownership", "learning", "process improvement"], difficulty: "medium", competencies: ["initiative", "agility", "quality"] }
            },
            '3-5': {
                round1: { name: "Management Expertise", questionCount: 4, focus: ["complex projects", "decisions", "challenges"], difficulty: "hard", competencies: ["management", "decision making", "depth"] },
                round2: { name: "Advanced Management", questionCount: 6, focus: ["strategy", "optimization", "stakeholder management"], difficulty: "hard", competencies: ["skills", "optimization", "thinking"] },
                round3: { name: "Leadership", questionCount: 5, focus: ["team development", "ownership", "direction"], difficulty: "hard", competencies: ["leadership", "influence", "impact"] }
            },
            '5+': {
                round1: { name: "Strategic Leadership", questionCount: 4, focus: ["strategic decisions", "vision", "alignment"], difficulty: "expert", competencies: ["thinking", "vision", "acumen"] },
                round2: { name: "Expert Knowledge", questionCount: 6, focus: ["best practices", "standards", "innovation"], difficulty: "expert", competencies: ["knowledge", "standardization", "leadership"] },
                round3: { name: "Organizational Impact", questionCount: 5, focus: ["team building", "culture", "collaboration"], difficulty: "expert", competencies: ["influence", "culture", "leadership"] }
            }
        }
    },
    qa: {
        fresher: {
            round1: { name: "Foundation & Motivation", questionCount: 5, focus: ["career motivation", "QA basics", "learning approach"], difficulty: "easy", competencies: ["fundamentals", "problem-solving", "passion"] },
            round2: { name: "QA Fundamentals", questionCount: 6, focus: ["testing concepts", "tools", "methodologies"], difficulty: "medium", competencies: ["knowledge", "thinking", "awareness"] },
            round3: { name: "Practical Application", questionCount: 4, focus: ["projects", "scenarios", "teamwork"], difficulty: "medium", competencies: ["experience", "collaboration", "learning"] }
        },
        experienced: {
            '0-2': {
                round1: { name: "QA Experience", questionCount: 4, focus: ["testing projects", "workflows", "bug tracking"], difficulty: "medium", competencies: ["experience", "practices", "teamwork"] },
                round2: { name: "Testing Skills", questionCount: 6, focus: ["test strategies", "automation", "problem-solving"], difficulty: "medium-hard", competencies: ["knowledge", "resolution", "standards"] },
                round3: { name: "Growth", questionCount: 5, focus: ["ownership", "learning", "quality improvement"], difficulty: "medium", competencies: ["initiative", "agility", "quality"] }
            },
            '3-5': {
                round1: { name: "QA Expertise", questionCount: 4, focus: ["complex testing", "decisions", "challenges"], difficulty: "hard", competencies: ["expertise", "decision making", "depth"] },
                round2: { name: "Advanced QA", questionCount: 6, focus: ["test architecture", "optimization", "automation strategy"], difficulty: "hard", competencies: ["skills", "optimization", "thinking"] },
                round3: { name: "Leadership", questionCount: 5, focus: ["team development", "ownership", "quality direction"], difficulty: "hard", competencies: ["leadership", "influence", "impact"] }
            },
            '5+': {
                round1: { name: "Strategic QA Leadership", questionCount: 4, focus: ["strategic decisions", "quality vision", "alignment"], difficulty: "expert", competencies: ["thinking", "vision", "acumen"] },
                round2: { name: "Expert Knowledge", questionCount: 6, focus: ["best practices", "standards", "innovation"], difficulty: "expert", competencies: ["knowledge", "standardization", "leadership"] },
                round3: { name: "Organizational Impact", questionCount: 5, focus: ["team building", "culture", "collaboration"], difficulty: "expert", competencies: ["influence", "culture", "leadership"] }
            }
        }
    },
    security: {
        fresher: {
            round1: { name: "Foundation & Motivation", questionCount: 5, focus: ["career motivation", "security basics", "learning approach"], difficulty: "easy", competencies: ["fundamentals", "problem-solving", "passion"] },
            round2: { name: "Security Fundamentals", questionCount: 6, focus: ["security concepts", "tools", "best practices"], difficulty: "medium", competencies: ["knowledge", "thinking", "awareness"] },
            round3: { name: "Practical Application", questionCount: 4, focus: ["projects", "scenarios", "teamwork"], difficulty: "medium", competencies: ["experience", "collaboration", "learning"] }
        },
        experienced: {
            '0-2': {
                round1: { name: "Security Experience", questionCount: 4, focus: ["security projects", "workflows", "incident response"], difficulty: "medium", competencies: ["experience", "practices", "teamwork"] },
                round2: { name: "Security Skills", questionCount: 6, focus: ["security tools", "vulnerabilities", "problem-solving"], difficulty: "medium-hard", competencies: ["knowledge", "resolution", "standards"] },
                round3: { name: "Growth", questionCount: 5, focus: ["ownership", "learning", "security improvement"], difficulty: "medium", competencies: ["initiative", "agility", "security focus"] }
            },
            '3-5': {
                round1: { name: "Security Expertise", questionCount: 4, focus: ["complex security", "decisions", "challenges"], difficulty: "hard", competencies: ["expertise", "decision making", "depth"] },
                round2: { name: "Advanced Security", questionCount: 6, focus: ["security architecture", "optimization", "compliance"], difficulty: "hard", competencies: ["skills", "optimization", "thinking"] },
                round3: { name: "Leadership", questionCount: 5, focus: ["team development", "ownership", "security direction"], difficulty: "hard", competencies: ["leadership", "influence", "impact"] }
            },
            '5+': {
                round1: { name: "Strategic Security Leadership", questionCount: 4, focus: ["strategic decisions", "security vision", "alignment"], difficulty: "expert", competencies: ["thinking", "vision", "acumen"] },
                round2: { name: "Expert Knowledge", questionCount: 6, focus: ["best practices", "standards", "innovation"], difficulty: "expert", competencies: ["knowledge", "standardization", "leadership"] },
                round3: { name: "Organizational Impact", questionCount: 5, focus: ["team building", "culture", "collaboration"], difficulty: "expert", competencies: ["influence", "culture", "leadership"] }
            }
        }
    },
    database: {
        fresher: {
            round1: { name: "Foundation & Motivation", questionCount: 5, focus: ["career motivation", "database basics", "learning approach"], difficulty: "easy", competencies: ["fundamentals", "problem-solving", "passion"] },
            round2: { name: "Database Fundamentals", questionCount: 6, focus: ["SQL", "database concepts", "tools"], difficulty: "medium", competencies: ["knowledge", "thinking", "awareness"] },
            round3: { name: "Practical Application", questionCount: 4, focus: ["projects", "scenarios", "teamwork"], difficulty: "medium", competencies: ["experience", "collaboration", "learning"] }
        },
        experienced: {
            '0-2': {
                round1: { name: "Database Experience", questionCount: 4, focus: ["database projects", "workflows", "optimization"], difficulty: "medium", competencies: ["experience", "practices", "teamwork"] },
                round2: { name: "Database Skills", questionCount: 6, focus: ["query optimization", "backup", "problem-solving"], difficulty: "medium-hard", competencies: ["knowledge", "resolution", "standards"] },
                round3: { name: "Growth", questionCount: 5, focus: ["ownership", "learning", "performance improvement"], difficulty: "medium", competencies: ["initiative", "agility", "quality"] }
            },
            '3-5': {
                round1: { name: "Database Expertise", questionCount: 4, focus: ["complex databases", "decisions", "challenges"], difficulty: "hard", competencies: ["expertise", "decision making", "depth"] },
                round2: { name: "Advanced Database", questionCount: 6, focus: ["database architecture", "optimization", "scaling"], difficulty: "hard", competencies: ["skills", "optimization", "thinking"] },
                round3: { name: "Leadership", questionCount: 5, focus: ["team development", "ownership", "database direction"], difficulty: "hard", competencies: ["leadership", "influence", "impact"] }
            },
            '5+': {
                round1: { name: "Strategic Database Leadership", questionCount: 4, focus: ["strategic decisions", "database vision", "alignment"], difficulty: "expert", competencies: ["thinking", "vision", "acumen"] },
                round2: { name: "Expert Knowledge", questionCount: 6, focus: ["best practices", "standards", "innovation"], difficulty: "expert", competencies: ["knowledge", "standardization", "leadership"] },
                round3: { name: "Organizational Impact", questionCount: 5, focus: ["team building", "culture", "collaboration"], difficulty: "expert", competencies: [" influence", "culture", "leadership"] }
            }
        }
    },
    other: {
        fresher: {
            round1: { name: "Foundation & Motivation", questionCount: 5, focus: ["career motivation", "basic concepts", "learning approach"], difficulty: "easy", competencies: ["fundamentals", "problem-solving", "passion"] },
            round2: { name: "Core Skills", questionCount: 6, focus: ["core knowledge", "tools", "best practices"], difficulty: "medium", competencies: ["knowledge", "thinking", "awareness"] },
            round3: { name: "Practical Application", questionCount: 4, focus: ["projects", "scenarios", "teamwork"], difficulty: "medium", competencies: ["experience", "collaboration", "learning"] }
        },
        experienced: {
            '0-2': {
                round1: { name: "Professional Experience", questionCount: 4, focus: ["recent projects", "workflow", "responsibilities"], difficulty: "medium", competencies: ["experience", "practices", "teamwork"] },
                round2: { name: "Professional Skills", questionCount: 6, focus: ["expertise", "best practices", "problem-solving"], difficulty: "medium-hard", competencies: ["knowledge", "resolution", "standards"] },
                round3: { name: "Growth", questionCount: 5, focus: ["ownership", "learning", "improvement"], difficulty: "medium", competencies: ["initiative", "agility", "quality"] }
            },
            '3-5': {
                round1: { name: "Professional Expertise", questionCount: 4, focus: ["complex projects", "decisions", "challenges"], difficulty: "hard", competencies: ["expertise", "decision making", "depth"] },
                round2: { name: "Advanced Skills", questionCount: 6, focus: ["advanced topics", "optimization", "strategy"], difficulty: "hard", competencies: ["skills", "optimization", "thinking"] },
                round3: { name: "Leadership", questionCount: 5, focus: ["team development", "ownership", "direction"], difficulty: "hard", competencies: ["leadership", "influence", "impact"] }
            },
            '5+': {
                round1: { name: "Strategic Leadership", questionCount: 4, focus: ["strategic decisions", "vision", "alignment"], difficulty: "expert", competencies: ["thinking", "vision", "acumen"] },
                round2: { name: "Expert Knowledge", questionCount: 6, focus: ["best practices", "standards", "innovation"], difficulty: "expert", competencies: ["knowledge", "standardization", "leadership"] },
                round3: { name: "Organizational Impact", questionCount: 5, focus: ["team building", "culture", "collaboration"], difficulty: "expert", competencies: ["influence", "culture", "leadership"] }
            }
        }
    }
};

/**
 * Get role category from desired role string
 */
function getRoleCategory(desiredRole) {
    if (!desiredRole) return 'other';

    const roleLower = desiredRole.toLowerCase();

    for (const [category, roles] of Object.entries(ROLE_CATEGORIES)) {
        const matchFound = roles.some(role => {
            return role.toLowerCase() === roleLower || roleLower.includes(role.toLowerCase().split(' ')[0]);
        });
        if (matchFound) return category;
    }

    return 'other';
}

/**
 * Get experience tier from years
 */
function getExperienceTier(experienceLevel, yearsOfExperience) {
    if (experienceLevel === 'fresher' || !yearsOfExperience || yearsOfExperience === 0) {
        return 'fresher';
    }

    const years = parseInt(yearsOfExperience);
    if (years <= 2) return '0-2';
    if (years <= 5) return '3-5';
    return '5+';
}

/**
 * Get question template for a role and experience level
 */
function getQuestionTemplate(roleCategory, experienceTier) {
    const categoryTemplates = QUESTION_TEMPLATES[roleCategory] || QUESTION_TEMPLATES.development;

    if (experienceTier === 'fresher') {
        return categoryTemplates.fresher;
    }

    return categoryTemplates.experienced?.[experienceTier] || categoryTemplates.experienced?.['0-2'];
}

module.exports = {
    ROLE_CATEGORIES,
    QUESTION_TEMPLATES,
    getRoleCategory,
    getExperienceTier,
    getQuestionTemplate
};
