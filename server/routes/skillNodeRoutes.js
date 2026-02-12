const express = require('express');
const router = express.Router();
const SkillNode = require('../models/SkillNode');
const User = require('../models/User');

// Domain category mapping for auto-classification
const DOMAIN_MAP = {
    // Programming Languages
    'python': 'Software Engineering', 'java': 'Software Engineering', 'javascript': 'Software Engineering',
    'typescript': 'Software Engineering', 'c++': 'Software Engineering', 'c#': 'Software Engineering',
    'go': 'Software Engineering', 'rust': 'Software Engineering', 'swift': 'Software Engineering',
    'kotlin': 'Software Engineering', 'ruby': 'Software Engineering', 'php': 'Software Engineering',
    'scala': 'Software Engineering', 'r': 'Data Science', 'matlab': 'Data Science',
    // Frontend
    'react': 'Software Engineering', 'vue': 'Software Engineering', 'angular': 'Software Engineering',
    'svelte': 'Software Engineering', 'next.js': 'Software Engineering', 'html': 'Software Engineering',
    'css': 'Software Engineering', 'tailwind': 'Software Engineering', 'sass': 'Software Engineering',
    // Backend
    'node.js': 'Software Engineering', 'express': 'Software Engineering', 'django': 'Software Engineering',
    'flask': 'Software Engineering', 'spring': 'Software Engineering', 'fastapi': 'Software Engineering',
    'nestjs': 'Software Engineering', 'rails': 'Software Engineering', '.net': 'Software Engineering',
    // Databases
    'mysql': 'Software Engineering', 'postgresql': 'Software Engineering', 'mongodb': 'Software Engineering',
    'redis': 'Software Engineering', 'elasticsearch': 'Software Engineering', 'dynamodb': 'Software Engineering',
    'firebase': 'Software Engineering', 'sqlite': 'Software Engineering', 'cassandra': 'Software Engineering',
    // Cloud & DevOps
    'aws': 'Software Engineering', 'azure': 'Software Engineering', 'gcp': 'Software Engineering',
    'docker': 'Software Engineering', 'kubernetes': 'Software Engineering', 'terraform': 'Software Engineering',
    'jenkins': 'Software Engineering', 'ci/cd': 'Software Engineering', 'linux': 'Software Engineering',
    // Data Science & AI
    'machine learning': 'Data Science', 'deep learning': 'Data Science', 'tensorflow': 'Data Science',
    'pytorch': 'Data Science', 'pandas': 'Data Science', 'numpy': 'Data Science',
    'scikit-learn': 'Data Science', 'nlp': 'Data Science', 'computer vision': 'Data Science',
    'data analysis': 'Data Science', 'statistics': 'Data Science', 'tableau': 'Data Science',
    'power bi': 'Data Science', 'spark': 'Data Science', 'hadoop': 'Data Science',
    // Design
    'figma': 'Design', 'photoshop': 'Design', 'illustrator': 'Design', 'sketch': 'Design',
    'ui/ux': 'Design', 'ui design': 'Design', 'ux design': 'Design', 'graphic design': 'Design',
    'adobe xd': 'Design', 'canva': 'Design', 'wireframing': 'Design', 'prototyping': 'Design',
    // Marketing
    'seo': 'Marketing', 'sem': 'Marketing', 'google ads': 'Marketing', 'facebook ads': 'Marketing',
    'content marketing': 'Marketing', 'email marketing': 'Marketing', 'social media': 'Marketing',
    'analytics': 'Marketing', 'google analytics': 'Marketing', 'copywriting': 'Marketing',
    'brand management': 'Marketing', 'digital marketing': 'Marketing',
    // Product Management
    'product management': 'Product Management', 'agile': 'Product Management', 'scrum': 'Product Management',
    'jira': 'Product Management', 'roadmapping': 'Product Management', 'user research': 'Product Management',
    'a/b testing': 'Product Management', 'product strategy': 'Product Management',
    // Sales
    'salesforce': 'Sales', 'crm': 'Sales', 'lead generation': 'Sales', 'b2b sales': 'Sales',
    'negotiation': 'Sales', 'cold calling': 'Sales', 'account management': 'Sales',
    // HR
    'recruitment': 'HR', 'talent acquisition': 'HR', 'employee relations': 'HR',
    'performance management': 'HR', 'onboarding': 'HR', 'hris': 'HR', 'payroll': 'HR',
    // Finance
    'financial analysis': 'Finance', 'accounting': 'Finance', 'excel': 'Finance',
    'financial modeling': 'Finance', 'budgeting': 'Finance', 'taxation': 'Finance',
    'investment banking': 'Finance', 'risk management': 'Finance',
    // Customer Support
    'customer service': 'Customer Support', 'zendesk': 'Customer Support',
    'troubleshooting': 'Customer Support', 'ticketing': 'Customer Support',
    // Soft Skills
    'communication': 'Others', 'leadership': 'Others', 'teamwork': 'Others',
    'problem solving': 'Others', 'critical thinking': 'Others', 'time management': 'Others',
    'project management': 'Others', 'presentation': 'Others'
};

/**
 * Classify a skill into a domain category
 */
function classifySkill(skillName) {
    const normalized = skillName.toLowerCase().trim();
    if (DOMAIN_MAP[normalized]) return DOMAIN_MAP[normalized];

    // Fuzzy match: check if any key is contained in the skill name
    for (const [key, domain] of Object.entries(DOMAIN_MAP)) {
        if (normalized.includes(key) || key.includes(normalized)) return domain;
    }
    return 'Others';
}

// ===== GET /api/skill-nodes/:userId — Get all SkillNodes for a user =====
router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { domain, level, status } = req.query;

        const query = { userId };
        if (domain) query.domainCategory = domain;
        if (level !== undefined) query.level = parseInt(level);
        if (status) query.verifiedStatus = status;

        const skillNodes = await SkillNode.find(query)
            .sort({ level: -1, xp: -1, skillName: 1 })
            .lean();

        // Group by domain category
        const grouped = {};
        skillNodes.forEach(node => {
            if (!grouped[node.domainCategory]) grouped[node.domainCategory] = [];
            grouped[node.domainCategory].push(node);
        });

        res.json({
            success: true,
            data: skillNodes,
            grouped,
            total: skillNodes.length,
            thresholds: SkillNode.XP_THRESHOLDS || [0, 100, 300, 600, 1000],
            levelLabels: SkillNode.LEVEL_LABELS || ['Unverified', 'Basic', 'Intermediate', 'Advanced', 'Expert']
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== PUT /api/skill-nodes/:id — Edit a SkillNode (user edits name/subskills) =====
router.put('/:id', async (req, res) => {
    try {
        const { skillName, subSkills } = req.body;
        const node = await SkillNode.findById(req.params.id);
        if (!node) return res.status(404).json({ success: false, error: 'SkillNode not found' });

        if (skillName) {
            node.skillName = skillName;
            node.domainCategory = classifySkill(skillName);
        }
        if (subSkills) node.subSkills = subSkills;

        await node.save();
        res.json({ success: true, data: node });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== DELETE /api/skill-nodes/:id — Remove a SkillNode =====
router.delete('/:id', async (req, res) => {
    try {
        const node = await SkillNode.findByIdAndDelete(req.params.id);
        if (!node) return res.status(404).json({ success: false, error: 'SkillNode not found' });
        res.json({ success: true, message: 'SkillNode deleted' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== POST /api/skill-nodes/from-resume — Bulk create SkillNodes from parsed resume =====
router.post('/from-resume', async (req, res) => {
    try {
        const { userId, skills, skillCategories } = req.body;
        if (!userId) return res.status(400).json({ success: false, error: 'userId required' });

        // Collect all skills into a unified list with domain classification
        const allSkills = new Map(); // normalized name → { name, domain, subSkills }

        // From flat skills array
        if (skills && Array.isArray(skills)) {
            skills.forEach(skill => {
                const name = typeof skill === 'string' ? skill : skill.name;
                if (!name || name.trim().length < 2) return;
                const normalized = name.toLowerCase().trim();
                if (!allSkills.has(normalized)) {
                    allSkills.set(normalized, {
                        name: name.trim(),
                        domain: classifySkill(name),
                        subSkills: []
                    });
                }
            });
        }

        // From categorized skills (programming, frameworks, databases, tools, softSkills)
        if (skillCategories) {
            const categoryDomainMap = {
                programmingLanguages: 'Software Engineering',
                frameworks: 'Software Engineering',
                databases: 'Software Engineering',
                tools: 'Others',
                softSkills: 'Others'
            };

            for (const [category, skillList] of Object.entries(skillCategories)) {
                if (!Array.isArray(skillList)) continue;
                skillList.forEach(skill => {
                    if (!skill || skill.trim().length < 2) return;
                    const normalized = skill.toLowerCase().trim();
                    const domain = classifySkill(skill) || categoryDomainMap[category] || 'Others';
                    if (!allSkills.has(normalized)) {
                        allSkills.set(normalized, {
                            name: skill.trim(),
                            domain,
                            subSkills: []
                        });
                    }
                });
            }
        }

        if (allSkills.size === 0) {
            return res.json({ success: true, data: [], message: 'No skills to create' });
        }

        // Upsert SkillNodes (don't overwrite existing ones with higher levels)
        const created = [];
        const updated = [];

        for (const [normalized, skillData] of allSkills) {
            const existing = await SkillNode.findOne({ userId, skillNameNormalized: normalized });
            if (existing) {
                // Don't downgrade existing nodes, just update domain if needed
                if (existing.domainCategory === 'Others' && skillData.domain !== 'Others') {
                    existing.domainCategory = skillData.domain;
                    await existing.save();
                    updated.push(existing);
                }
            } else {
                try {
                    const node = new SkillNode({
                        userId,
                        skillName: skillData.name,
                        domainCategory: skillData.domain,
                        level: 0,
                        xp: 0,
                        source: 'resume',
                        subSkills: skillData.subSkills
                    });
                    await node.save();
                    created.push(node);
                } catch (dupErr) {
                    // Handle race condition duplicates
                    if (dupErr.code !== 11000) throw dupErr;
                }
            }
        }

        // Also update user's jobSeekerProfile.skills with resume skills
        try {
            const user = await User.findById(userId);
            if (user && user.jobSeekerProfile) {
                const existingSkillNames = (user.jobSeekerProfile.skills || []).map(s => s.name?.toLowerCase());
                const newSkills = [];
                for (const [normalized, skillData] of allSkills) {
                    if (!existingSkillNames.includes(normalized)) {
                        newSkills.push({ name: skillData.name, level: 'intermediate' });
                    }
                }
                if (newSkills.length > 0) {
                    user.jobSeekerProfile.skills = [
                        ...(user.jobSeekerProfile.skills || []),
                        ...newSkills
                    ];
                    await user.save();
                }
            }
        } catch (userErr) {
            console.warn('[SkillNode] User skill sync failed:', userErr.message);
        }

        res.json({
            success: true,
            data: { created, updated },
            message: `Created ${created.length} SkillNodes, updated ${updated.length}`
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== POST /api/skill-nodes/add — Manually add a single SkillNode =====
router.post('/add', async (req, res) => {
    try {
        const { userId, skillName } = req.body;
        if (!userId || !skillName) {
            return res.status(400).json({ success: false, error: 'userId and skillName required' });
        }

        const normalized = skillName.toLowerCase().trim();
        const existing = await SkillNode.findOne({ userId, skillNameNormalized: normalized });
        if (existing) {
            return res.json({ success: true, data: existing, message: 'SkillNode already exists' });
        }

        const node = new SkillNode({
            userId,
            skillName: skillName.trim(),
            domainCategory: classifySkill(skillName),
            level: 0,
            xp: 0,
            source: 'manual'
        });
        await node.save();

        res.status(201).json({ success: true, data: node });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Export the classifySkill utility for use by other routes
router.classifySkill = classifySkill;

module.exports = router;
