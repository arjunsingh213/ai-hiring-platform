/**
 * Interview Orchestrator Service
 * Domain-Adaptive Interview Architecture
 * 
 * This service dynamically generates interview blueprints based on:
 * - Resume-derived skills and experience
 * - Domain classification (Technical, Semi-Technical, Non-Technical, etc.)
 * - Programming language detection for conditional coding rounds
 */

const axios = require('axios');

// AI Model Configuration
const MODELS = {
    LLAMA: {
        name: 'meta-llama/llama-3.1-8b-instruct',
        key: process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_LLAMA_KEY
    }
};

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Supported domains with their interview patterns
const DOMAIN_PATTERNS = {
    'Technical': {
        rounds: [
            { type: 'technical_fundamentals', displayName: 'Technical Fundamentals', icon: '📚', questionCount: 5 },
            { type: 'deep_dive', displayName: 'Technical Deep Dive', icon: '🔬', questionCount: 5 },
            { type: 'behavioral_hr', displayName: 'Behavioral & HR', icon: '💬', questionCount: 5 },
            { type: 'coding_challenge', displayName: 'Coding Challenge', icon: '💻', questionCount: 1, isCodingRound: true }
        ],
        hasCodingRound: true
    },
    'Semi-Technical': {
        rounds: [
            { type: 'core_skills', displayName: 'Core Skills Assessment', icon: '🎯', questionCount: 5 },
            { type: 'scenario_based', displayName: 'Scenario-Based Questions', icon: '🧩', questionCount: 5 },
            { type: 'communication', displayName: 'Communication & Collaboration', icon: '🤝', questionCount: 5 }
        ],
        hasCodingRound: false, // Can be overridden if programming languages detected
        conditionalCoding: true
    },
    'Non-Technical': {
        rounds: [
            { type: 'domain_knowledge', displayName: 'Domain Knowledge', icon: '📋', questionCount: 5 },
            { type: 'behavioral', displayName: 'Behavioral Assessment', icon: '💭', questionCount: 5 },
            { type: 'communication', displayName: 'Communication Skills', icon: '🗣️', questionCount: 5 }
        ],
        hasCodingRound: false
    },
    'Customer Support': {
        rounds: [
            { type: 'product_knowledge', displayName: 'Product & Domain Knowledge', icon: '📦', questionCount: 5 },
            { type: 'scenario_handling', displayName: 'Customer Scenario Handling', icon: '🎭', questionCount: 5 },
            { type: 'communication', displayName: 'Communication & Empathy', icon: '💝', questionCount: 5 }
        ],
        hasCodingRound: false
    },
    'Marketing': {
        rounds: [
            { type: 'fundamentals', displayName: 'Marketing Fundamentals', icon: '📈', questionCount: 5 },
            { type: 'strategy', displayName: 'Strategy & Campaign Design', icon: '🎯', questionCount: 5 },
            { type: 'persuasion', displayName: 'Persuasion & Creativity', icon: '✨', questionCount: 5 }
        ],
        hasCodingRound: false
    },
    'Sales': {
        rounds: [
            { type: 'sales_fundamentals', displayName: 'Sales Fundamentals', icon: '💼', questionCount: 5 },
            { type: 'negotiation', displayName: 'Negotiation & Objection Handling', icon: '🤝', questionCount: 5 },
            { type: 'closing', displayName: 'Closing & Relationship Building', icon: '🎯', questionCount: 5 }
        ],
        hasCodingRound: false
    },
    'Creative': {
        rounds: [
            { type: 'concept', displayName: 'Concept & Vision', icon: '🎨', questionCount: 5 },
            { type: 'problem_framing', displayName: 'Problem Framing & Process', icon: '🖼️', questionCount: 5 },
            { type: 'communication', displayName: 'Communication & Presentation', icon: '📽️', questionCount: 5 }
        ],
        hasCodingRound: false
    },
    'Operations': {
        rounds: [
            { type: 'process_knowledge', displayName: 'Process & Operations Knowledge', icon: '⚙️', questionCount: 5 },
            { type: 'analysis', displayName: 'Analysis & Problem-Solving', icon: '📊', questionCount: 5 },
            { type: 'communication', displayName: 'Communication & Coordination', icon: '📞', questionCount: 5 }
        ],
        hasCodingRound: false
    }
};

// Programming language detection
const PROGRAMMING_LANGUAGES = [
    'python', 'javascript', 'typescript', 'java', 'c#', 'csharp', 'c++', 'cpp',
    'go', 'golang', 'ruby', 'php', 'swift', 'kotlin', 'rust', 'scala', 'r',
    'perl', 'lua', 'dart', 'elixir', 'haskell', 'clojure', 'objective-c'
];

// Round difficulty progression
const DIFFICULTY_PROGRESSION = {
    1: 'easy',
    2: 'medium',
    3: 'medium-hard',
    4: 'hard'
};

// Round descriptions for info pages
const ROUND_DESCRIPTIONS = {
    'technical_fundamentals': {
        description: "We'll start with fundamental questions about your core technical skills. These questions will assess your understanding of key concepts.",
        tips: ['Take your time to think through each question', 'Use specific examples from your experience', 'It\'s okay to say if you\'re not sure about something']
    },
    'deep_dive': {
        description: "Now we'll explore your expertise in more depth with scenario-based and system design questions.",
        tips: ['Think out loud to show your reasoning', 'Consider edge cases and trade-offs', 'Draw from real project experiences']
    },
    'behavioral_hr': {
        description: "Let's discuss your work style, past experiences, and career aspirations. These questions help us understand how you work with others.",
        tips: ['Use the STAR method (Situation, Task, Action, Result)', 'Be specific and honest', 'Share both successes and learning experiences']
    },
    'coding_challenge': {
        description: "Time to demonstrate your coding skills with a practical problem. Focus on writing clean, working code.",
        tips: ['Read the problem carefully before coding', 'Start with a working solution, then optimize', 'Write comments to explain your logic']
    },
    'core_skills': {
        description: "We'll assess your core competencies and how you apply them in your work.",
        tips: ['Connect your skills to real examples', 'Explain your thought process', 'Highlight your unique strengths']
    },
    'scenario_based': {
        description: "You'll be presented with realistic work scenarios to understand how you approach challenges.",
        tips: ['Think through the scenario step by step', 'Consider multiple solutions', 'Explain your decision-making process']
    },
    'communication': {
        description: "We'll evaluate your communication and collaboration abilities through targeted questions.",
        tips: ['Listen carefully to each question', 'Be clear and concise in your responses', 'Show empathy and emotional intelligence']
    },
    'domain_knowledge': {
        description: "We'll explore your understanding of the domain and industry you'll be working in.",
        tips: ['Share your domain expertise confidently', 'Use industry terminology appropriately', 'Demonstrate continuous learning']
    },
    'behavioral': {
        description: "Tell us about your past experiences, challenges faced, and how you handle different situations.",
        tips: ['Be authentic and genuine', 'Share specific examples', 'Reflect on what you learned']
    },
    'product_knowledge': {
        description: "We'll assess your ability to understand and explain products/services to customers.",
        tips: ['Think from the customer\'s perspective', 'Explain complex things simply', 'Show enthusiasm for helping others']
    },
    'scenario_handling': {
        description: "You'll face realistic customer scenarios to demonstrate your problem-solving and empathy.",
        tips: ['Stay calm and professional', 'Show empathy before solving', 'Offer practical solutions']
    },
    'fundamentals': {
        description: "Let's start with the foundational concepts of your domain.",
        tips: ['Demonstrate solid understanding of basics', 'Be ready to explain your reasoning', 'Show awareness of current trends']
    },
    'strategy': {
        description: "We'll explore your strategic thinking and planning capabilities.",
        tips: ['Think big picture', 'Consider data and metrics', 'Show creative problem-solving']
    },
    'persuasion': {
        description: "Demonstrate your ability to influence, convince, and communicate compelling ideas.",
        tips: ['Know your audience', 'Use storytelling techniques', 'Back claims with evidence']
    },
    'concept': {
        description: "Share your creative vision and how you approach ideation and conceptualization.",
        tips: ['Walk through your creative process', 'Show your unique perspective', 'Reference your portfolio or past work']
    },
    'problem_framing': {
        description: "We'll see how you define problems and translate them into actionable plans.",
        tips: ['Ask clarifying questions', 'Break down complex problems', 'Consider constraints and requirements']
    },
    'process_knowledge': {
        description: "We'll assess your understanding of operational processes and best practices.",
        tips: ['Show systematic thinking', 'Highlight efficiency improvements', 'Demonstrate attention to detail']
    },
    'analysis': {
        description: "Demonstrate your analytical skills and data-driven decision making.",
        tips: ['Use data to support your answers', 'Show logical reasoning', 'Consider multiple perspectives']
    },
    'sales_fundamentals': {
        description: "We'll cover the fundamentals of sales methodology and customer engagement.",
        tips: ['Know your value proposition', 'Understand the sales cycle', 'Show customer-centric thinking']
    },
    'negotiation': {
        description: "Demonstrate your ability to handle objections and negotiate effectively.",
        tips: ['Stay confident but respectful', 'Find win-win solutions', 'Listen more than you speak']
    },
    'closing': {
        description: "Show how you close deals and build lasting customer relationships.",
        tips: ['Be persistent but not pushy', 'Create urgency appropriately', 'Focus on long-term relationships']
    }
};

/**
 * Call OpenRouter API
 */
async function callAI(messages, options = {}) {
    if (!MODELS.LLAMA.key) {
        throw new Error('Missing OpenRouter API key');
    }

    try {
        const response = await axios.post(OPENROUTER_URL, {
            model: MODELS.LLAMA.name,
            messages,
            temperature: options.temperature || 0.4,
            max_tokens: options.max_tokens || 2048
        }, {
            headers: {
                'Authorization': `Bearer ${MODELS.LLAMA.key}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': process.env.APP_URL || 'http://localhost:5173',
                'X-Title': 'AI Hiring Platform'
            },
            timeout: 60000
        });

        return response.data.choices[0].message.content;
    } catch (error) {
        console.error('AI call failed:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Extract JSON from AI response
 */
function extractJson(text) {
    try {
        return JSON.parse(text);
    } catch (e) {
        const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/);
        if (jsonMatch) {
            try { return JSON.parse(jsonMatch[1]); } catch (e) { }
        }
        const bracketMatch = text.match(/\{[\s\S]*\}/);
        if (bracketMatch) {
            try { return JSON.parse(bracketMatch[0]); } catch (e) { }
        }
        throw new Error('Failed to extract JSON from response');
    }
}

/**
 * Detect programming languages from skills
 */
function detectProgrammingLanguages(skills) {
    if (!skills || !Array.isArray(skills)) return [];

    const detected = [];
    const skillsLower = skills.map(s => (s || '').toLowerCase().trim());

    for (const lang of PROGRAMMING_LANGUAGES) {
        if (skillsLower.some(skill =>
            skill === lang ||
            skill.includes(lang) ||
            (lang.length > 2 && skill.startsWith(lang))
        )) {
            detected.push(lang);
        }
    }

    return [...new Set(detected)];
}

/**
 * Classify candidate domain using AI
 * @param {Object} parsedResume - Parsed resume data
 * @returns {Object} Domain classification result
 */
async function classifyDomain(parsedResume) {
    console.log('🔵 [ORCHESTRATOR] Classifying domain from resume...');

    const skills = parsedResume?.skills || [];
    const experience = parsedResume?.experience || [];
    const projects = parsedResume?.projects || [];
    const education = parsedResume?.education || [];

    // Detect programming languages first
    const programmingLanguages = detectProgrammingLanguages(skills);
    const hasProgramming = programmingLanguages.length > 0;

    console.log('🔵 [ORCHESTRATOR] Programming languages detected:', programmingLanguages);

    const prompt = `Analyze this candidate's resume and classify their domain.

SKILLS: ${skills.join(', ') || 'None listed'}

EXPERIENCE:
${experience.map(e => `- ${e.role || e.position} at ${e.company}: ${e.description || ''}`).join('\n') || 'None listed'}

PROJECTS:
${projects.map(p => `- ${p.name}: ${p.description || ''} (Tech: ${(p.techStack || p.technologies || []).join(', ')})`).join('\n') || 'None listed'}

EDUCATION:
${education.map(e => `- ${e.degree} from ${e.institution}`).join('\n') || 'None listed'}

PROGRAMMING LANGUAGES DETECTED: ${programmingLanguages.join(', ') || 'None'}

Classify into ONE primary domain from:
- Technical (developers, engineers, data scientists, DevOps)
- Semi-Technical (product managers, QA, technical writers, IT support)
- Non-Technical (admin, HR generalist, legal, finance)
- Customer Support (support reps, customer success, help desk)
- Marketing (digital marketing, content, SEO, social media)
- Sales (account executives, SDRs, business development)
- Creative (designers, writers, video editors, artists)
- Operations (operations managers, logistics, supply chain)

Return JSON:
{
    "primaryDomain": "Technical",
    "secondaryDomain": null,
    "roleCategory": "backend_developer",
    "keySkills": ["JavaScript", "Node.js", "MongoDB"],
    "experienceLevel": "mid",
    "skillConfidence": {
        "technical": 0.85,
        "softSkills": 0.65,
        "domainExpertise": 0.70
    },
    "suggestedFocusAreas": ["API Design", "Database Optimization"],
    "reasoning": "Brief explanation of classification"
}`;

    try {
        const response = await callAI([
            { role: 'system', content: 'You are an expert HR analyst. Classify candidates accurately. Return valid JSON only.' },
            { role: 'user', content: prompt }
        ]);

        const classification = extractJson(response);

        // Add programming languages to result
        classification.hasProgrammingLanguages = hasProgramming;
        classification.programmingLanguages = programmingLanguages;

        console.log('✅ [ORCHESTRATOR] Domain classified:', classification.primaryDomain);
        return classification;

    } catch (error) {
        console.error('❌ [ORCHESTRATOR] Domain classification failed:', error.message);

        // Fallback classification based on programming detection
        return {
            primaryDomain: hasProgramming ? 'Technical' : 'Non-Technical',
            secondaryDomain: null,
            roleCategory: hasProgramming ? 'developer' : 'professional',
            keySkills: skills.slice(0, 5),
            experienceLevel: 'mid',
            skillConfidence: { technical: hasProgramming ? 0.7 : 0.3, softSkills: 0.5, domainExpertise: 0.5 },
            suggestedFocusAreas: skills.slice(0, 3),
            hasProgrammingLanguages: hasProgramming,
            programmingLanguages: programmingLanguages,
            reasoning: 'Fallback classification based on skill analysis'
        };
    }
}

/**
 * Generate interview blueprint based on domain and resume
 * @param {Object} parsedResume - Parsed resume data
 * @param {Object} domainClassification - Optional pre-computed classification
 * @returns {Object} Interview blueprint
 */
async function generateBlueprint(parsedResume, domainClassification = null) {
    console.log('🔵 [ORCHESTRATOR] Generating interview blueprint...');

    // Get domain classification if not provided
    const classification = domainClassification || await classifyDomain(parsedResume);
    const domain = classification.primaryDomain || 'Technical';
    const pattern = DOMAIN_PATTERNS[domain] || DOMAIN_PATTERNS['Technical'];

    // Determine if coding round should be included
    let includeCoding = pattern.hasCodingRound;
    if (pattern.conditionalCoding && classification.hasProgrammingLanguages) {
        includeCoding = true;
    }

    // Build rounds with difficulty progression
    const rounds = [];
    let questionNumber = 1;

    pattern.rounds.forEach((roundTemplate, index) => {
        // Skip coding round if not applicable
        if (roundTemplate.isCodingRound && !includeCoding) {
            return;
        }

        const roundNumber = rounds.length + 1;
        const difficulty = DIFFICULTY_PROGRESSION[roundNumber] || 'medium';
        const roundInfo = ROUND_DESCRIPTIONS[roundTemplate.type] || {
            description: 'Complete this round to proceed.',
            tips: ['Take your time', 'Be specific']
        };

        rounds.push({
            roundNumber,
            type: roundTemplate.type,
            displayName: roundTemplate.displayName,
            icon: roundTemplate.icon,
            difficulty,
            questionCount: roundTemplate.questionCount,
            startQuestionNumber: questionNumber,
            endQuestionNumber: questionNumber + roundTemplate.questionCount - 1,
            description: roundInfo.description,
            tips: roundInfo.tips,
            focus: classification.suggestedFocusAreas || classification.keySkills || [],
            isCodingRound: roundTemplate.isCodingRound || false
        });

        questionNumber += roundTemplate.questionCount;
    });

    const blueprint = {
        domain: domain,
        secondaryDomain: classification.secondaryDomain,
        roleCategory: classification.roleCategory,
        totalRounds: rounds.length,
        totalQuestions: questionNumber - 1,
        hasCodingRound: includeCoding,
        programmingLanguages: classification.programmingLanguages || [],
        keySkills: classification.keySkills || [],
        experienceLevel: classification.experienceLevel || 'mid',
        rounds: rounds,
        generatedAt: new Date().toISOString()
    };

    console.log('✅ [ORCHESTRATOR] Blueprint generated:', {
        domain: blueprint.domain,
        totalRounds: blueprint.totalRounds,
        totalQuestions: blueprint.totalQuestions,
        hasCodingRound: blueprint.hasCodingRound
    });

    return blueprint;
}

/**
 * Get round info for display between rounds
 * @param {Object} round - Round object from blueprint
 * @returns {Object} Round info for display
 */
function getRoundInfo(round) {
    return {
        roundNumber: round.roundNumber,
        displayName: round.displayName,
        icon: round.icon,
        difficulty: round.difficulty,
        questionCount: round.questionCount,
        description: round.description,
        tips: round.tips,
        focus: round.focus,
        isCodingRound: round.isCodingRound
    };
}

/**
 * Get current round based on question number
 * @param {Object} blueprint - Interview blueprint
 * @param {number} questionNumber - Current question number (1-indexed)
 * @returns {Object} Current round info
 */
function getCurrentRound(blueprint, questionNumber) {
    if (!blueprint || !blueprint.rounds) return null;

    for (const round of blueprint.rounds) {
        if (questionNumber >= round.startQuestionNumber &&
            questionNumber <= round.endQuestionNumber) {
            return round;
        }
    }

    return blueprint.rounds[blueprint.rounds.length - 1];
}

/**
 * Check if transitioning to new round
 * @param {Object} blueprint - Interview blueprint
 * @param {number} questionNumber - Current question number (1-indexed)
 * @returns {Object|null} Next round info if transitioning, null otherwise
 */
function checkRoundTransition(blueprint, questionNumber) {
    if (!blueprint || !blueprint.rounds) return null;

    for (const round of blueprint.rounds) {
        // Check if this question is the start of a new round (except round 1)
        if (round.startQuestionNumber === questionNumber && round.roundNumber > 1) {
            return {
                showInfo: true,
                round: getRoundInfo(round)
            };
        }
    }

    return null;
}

module.exports = {
    classifyDomain,
    generateBlueprint,
    getRoundInfo,
    getCurrentRound,
    checkRoundTransition,
    detectProgrammingLanguages,
    DOMAIN_PATTERNS,
    ROUND_DESCRIPTIONS
};
