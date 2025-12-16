import React, { useState, useEffect } from 'react';
import './InterviewPipelineConfig.css';

// Professional SVG Icons
const Icons = {
    zap: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>,
    chart: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>,
    code: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>,
    fileText: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><line x1="10" y1="9" x2="8" y2="9" /></svg>,
    settings: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>,
    clipboard: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /></svg>,
    bulb: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6" /><path d="M10 22h4" /><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" /></svg>,
    terminal: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" /></svg>,
    hash: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="9" x2="20" y2="9" /><line x1="4" y1="15" x2="20" y2="15" /><line x1="10" y1="3" x2="8" y2="21" /><line x1="16" y1="3" x2="14" y2="21" /></svg>,
    users: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
    layers: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>,
    palette: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r="0.5" /><circle cx="17.5" cy="10.5" r="0.5" /><circle cx="8.5" cy="7.5" r="0.5" /><circle cx="6.5" cy="12.5" r="0.5" /><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z" /></svg>,
    messageCircle: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>,
    target: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>,
    helpCircle: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
    cpu: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2" /><rect x="9" y="9" width="6" height="6" /><line x1="9" y1="1" x2="9" y2="4" /><line x1="15" y1="1" x2="15" y2="4" /><line x1="9" y1="20" x2="9" y2="23" /><line x1="15" y1="20" x2="15" y2="23" /><line x1="20" y1="9" x2="23" y2="9" /><line x1="20" y1="14" x2="23" y2="14" /><line x1="1" y1="9" x2="4" y2="9" /><line x1="1" y1="14" x2="4" y2="14" /></svg>,
    user: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
    check: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
    chevronDown: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>,
    chevronRight: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>,
    arrowUp: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></svg>,
    arrowDown: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" /></svg>,
    x: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
    plus: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
};

// Pipeline preset templates with domain-aware defaults
const PIPELINE_PRESETS = {
    quick_2round: {
        name: 'Quick 2-Round',
        description: 'Fast-track for junior roles',
        icon: Icons.zap,
        color: '#10B981',
        rounds: [
            {
                roundNumber: 1,
                roundType: 'technical',
                title: 'Technical Interview',
                description: 'Core technical skills assessment',
                duration: 30,
                isAIEnabled: true,
                questionConfig: { questionCount: 5, categories: ['conceptual', 'practical'] }
            },
            {
                roundNumber: 2,
                roundType: 'hr',
                title: 'HR Interview',
                description: 'Culture fit and behavioral assessment',
                duration: 25,
                isAIEnabled: true,
                questionConfig: { questionCount: 5, categories: ['behavioral', 'situational'] }
            }
        ]
    },
    standard_4round: {
        name: 'Standard 4-Round',
        description: 'Comprehensive evaluation process',
        icon: Icons.chart,
        color: '#6366F1',
        rounds: [
            {
                roundNumber: 1,
                roundType: 'screening',
                title: 'Initial Screening',
                description: 'Quick aptitude and communication check',
                duration: 15,
                isAIEnabled: true,
                questionConfig: { questionCount: 3, categories: ['general'] }
            },
            {
                roundNumber: 2,
                roundType: 'technical',
                title: 'Technical Deep Dive',
                description: 'In-depth technical knowledge assessment',
                duration: 45,
                isAIEnabled: true,
                questionConfig: { questionCount: 8, categories: ['conceptual', 'practical', 'problem_solving'] }
            },
            {
                roundNumber: 3,
                roundType: 'coding',
                title: 'Coding Challenge',
                description: 'Hands-on coding assessment',
                duration: 60,
                isAIEnabled: true,
                codingConfig: { difficulty: 'medium', problemCount: 2, timePerProblem: 25 }
            },
            {
                roundNumber: 4,
                roundType: 'hr',
                title: 'HR & Culture Fit',
                description: 'Final culture and team fit evaluation',
                duration: 30,
                isAIEnabled: true,
                questionConfig: { questionCount: 5, categories: ['behavioral', 'cultural'] }
            }
        ]
    },
    dsa_only: {
        name: 'DSA/Coding Only',
        description: 'Pure algorithmic assessment',
        icon: Icons.terminal,
        color: '#F59E0B',
        rounds: [
            {
                roundNumber: 1,
                roundType: 'dsa',
                title: 'DSA Challenge',
                description: 'Data Structures & Algorithms problems',
                duration: 90,
                isAIEnabled: true,
                codingConfig: {
                    difficulty: 'medium',
                    problemCount: 3,
                    topics: ['arrays', 'strings', 'trees', 'graphs', 'dynamic_programming'],
                    timePerProblem: 30
                }
            }
        ]
    },
    assessment_only: {
        name: 'Assessment Only',
        description: 'MCQ & written test evaluation',
        icon: Icons.fileText,
        color: '#EC4899',
        rounds: [
            {
                roundNumber: 1,
                roundType: 'assessment',
                title: 'Technical Assessment',
                description: 'Multiple choice and short answer questions',
                duration: 45,
                isAIEnabled: false,
                assessmentConfig: {
                    questionCount: 30,
                    passingScore: 60,
                    randomize: true,
                    assessmentTypes: ['technical']  // Default to technical
                }
            }
        ]
    },
    custom: {
        name: 'Custom Pipeline',
        description: 'Build your own interview process',
        icon: Icons.settings,
        color: '#8B5CF6',
        rounds: []
    }
};

// Round type options for custom builder
const ROUND_TYPES = [
    { value: 'screening', label: 'Screening', icon: Icons.clipboard, description: 'Quick initial assessment' },
    { value: 'technical', label: 'Technical Interview', icon: Icons.bulb, description: 'Technical knowledge interview' },
    { value: 'coding', label: 'Coding Challenge', icon: Icons.code, description: 'Live coding challenge' },
    { value: 'dsa', label: 'DSA/Algorithms', icon: Icons.hash, description: 'Algorithms & data structures' },
    { value: 'hr', label: 'HR/Behavioral', icon: Icons.users, description: 'Culture fit & soft skills' },
    { value: 'assessment', label: 'Assessment', icon: Icons.fileText, description: 'MCQ/Written test' },
    { value: 'system_design', label: 'System Design', icon: Icons.layers, description: 'Architecture discussion' },
    { value: 'portfolio_review', label: 'Portfolio Review', icon: Icons.palette, description: 'Work sample evaluation' },
    { value: 'group_discussion', label: 'Group Discussion', icon: Icons.messageCircle, description: 'Team collaboration assessment' }
];

// DSA topics for coding rounds
const DSA_TOPICS = [
    'arrays', 'strings', 'linked_lists', 'stacks', 'queues',
    'trees', 'graphs', 'dynamic_programming', 'recursion',
    'sorting', 'searching', 'hashing', 'greedy', 'backtracking'
];


const InterviewPipelineConfig = ({ value, onChange, jobSkills = [] }) => {
    const [selectedPreset, setSelectedPreset] = useState('standard_4round');
    const [rounds, setRounds] = useState(PIPELINE_PRESETS.standard_4round.rounds);
    const [settings, setSettings] = useState({
        requirePlatformInterview: false,
        autoRejectBelowScore: null,
        autoAdvanceAboveScore: 70,
        allowReschedule: true,
        maxAttempts: 1,
        expiryDays: 7
    });
    const [expandedRound, setExpandedRound] = useState(null);
    const [showSettings, setShowSettings] = useState(false);

    // Track if we've done initial sync from value prop
    const [hasSynced, setHasSynced] = useState(false);

    // SYNC with external value when editing - runs when value changes
    useEffect(() => {
        // Only sync if value exists and has rounds (meaning it's a saved pipeline)
        if (!value || !value.rounds || value.rounds.length === 0) {
            return;
        }

        // Don't re-sync if we've already synced and the rounds match
        if (hasSynced && rounds.length === value.rounds.length) {
            return;
        }

        console.log('[PIPELINE CONFIG] Syncing from saved pipeline:', value.pipelineType, 'with', value.rounds?.length, 'rounds');
        console.log('[PIPELINE CONFIG] First round type:', value.rounds?.[0]?.roundType);

        // Set preset type
        if (value.pipelineType) {
            setSelectedPreset(value.pipelineType);
        } else {
            // If no pipelineType but has rounds, it's custom
            setSelectedPreset('custom');
        }

        // Set rounds
        setRounds(value.rounds);

        // Set settings if provided
        if (value.settings) {
            setSettings(prev => ({ ...prev, ...value.settings }));
        }

        setHasSynced(true);
    }, [value]);

    // Update parent when config changes
    useEffect(() => {
        onChange({
            pipelineType: selectedPreset,
            rounds,
            settings
        });
    }, [selectedPreset, rounds, settings]);

    // Handle preset selection
    const handlePresetChange = (presetKey) => {
        setSelectedPreset(presetKey);
        const preset = PIPELINE_PRESETS[presetKey];
        if (presetKey !== 'custom') {
            // Apply preset rounds with job skills
            const presetRounds = preset.rounds.map(round => ({
                ...round,
                questionConfig: round.questionConfig ? {
                    ...round.questionConfig,
                    focusSkills: jobSkills.slice(0, 5)
                } : undefined,
                codingConfig: round.codingConfig ? {
                    ...round.codingConfig,
                    languages: ['JavaScript', 'Python', 'Java'] // Default languages
                } : undefined
            }));
            setRounds(presetRounds);
        }
    };

    // Add new round (for custom)
    const addRound = (roundType = 'technical') => {
        const roundInfo = ROUND_TYPES.find(r => r.value === roundType);
        const newRound = {
            roundNumber: rounds.length + 1,
            roundType,
            title: `${roundInfo?.label || 'Interview'} Round`,
            description: roundInfo?.description || '',
            duration: 30,
            isAIEnabled: true,
            isRequired: true,
            questionConfig: ['technical', 'hr', 'behavioral', 'screening'].includes(roundType) ? {
                questionCount: 5,
                categories: ['conceptual', 'practical'],
                focusSkills: jobSkills.slice(0, 5)
            } : undefined,
            codingConfig: ['coding', 'dsa'].includes(roundType) ? {
                difficulty: 'medium',
                problemCount: 2,
                topics: ['arrays', 'strings'],
                languages: ['JavaScript', 'Python'],
                timePerProblem: 25
            } : undefined,
            assessmentConfig: roundType === 'assessment' ? {
                questionCount: 20,
                duration: 30,
                passingScore: 60,
                randomize: true,
                assessmentTypes: ['technical']  // Default to technical
            } : undefined,
            scoring: { passingScore: 60, weightage: 100 }
        };
        setRounds([...rounds, newRound]);
        setExpandedRound(rounds.length);
    };

    // Remove round
    const removeRound = (index) => {
        const updatedRounds = rounds.filter((_, i) => i !== index).map((round, i) => ({
            ...round,
            roundNumber: i + 1
        }));
        setRounds(updatedRounds);
        setExpandedRound(null);
    };

    // Update round config
    const updateRound = (index, field, value) => {
        const updatedRounds = [...rounds];

        // Handle nested field updates (e.g., 'codingConfig.difficulty')
        if (field.includes('.')) {
            const [parent, child] = field.split('.');
            updatedRounds[index] = {
                ...updatedRounds[index],
                [parent]: {
                    ...updatedRounds[index][parent],
                    [child]: value
                }
            };
        }
        // Handle roundType change - initialize proper config for the type
        else if (field === 'roundType') {
            updatedRounds[index] = {
                ...updatedRounds[index],
                roundType: value,
                title: ROUND_TYPES.find(r => r.value === value)?.label + ' Round',
                // Initialize configs based on round type
                questionConfig: ['technical', 'hr', 'behavioral', 'screening'].includes(value) ? {
                    questionCount: 5,
                    categories: ['conceptual', 'practical'],
                    focusSkills: jobSkills.slice(0, 5)
                } : undefined,
                codingConfig: ['coding', 'dsa'].includes(value) ? {
                    difficulty: 'medium',
                    problemCount: 2,
                    topics: ['arrays', 'strings'],
                    languages: ['JavaScript', 'Python'],
                    timePerProblem: 25
                } : undefined,
                assessmentConfig: value === 'assessment' ? {
                    questionCount: 20,
                    passingScore: 60,
                    randomize: true,
                    assessmentTypes: ['technical']  // Default to technical
                } : undefined
            };
        }
        else {
            updatedRounds[index] = { ...updatedRounds[index], [field]: value };
        }
        setRounds(updatedRounds);
    };

    // Move round up/down
    const moveRound = (index, direction) => {
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= rounds.length) return;

        const updatedRounds = [...rounds];
        [updatedRounds[index], updatedRounds[newIndex]] = [updatedRounds[newIndex], updatedRounds[index]];

        // Update round numbers
        updatedRounds.forEach((round, i) => {
            round.roundNumber = i + 1;
        });

        setRounds(updatedRounds);
    };

    return (
        <div className="interview-pipeline-config">
            {/* Section Header */}
            <div className="pipeline-header">
                <h3><span className="header-icon">{Icons.target}</span> Interview Pipeline</h3>
                <p className="pipeline-subtitle">Configure how candidates will be evaluated</p>
            </div>

            {/* Preset Selector */}
            <div className="preset-selector">
                <label className="form-label">Select Pipeline Type</label>
                <div className="preset-cards">
                    {Object.entries(PIPELINE_PRESETS).map(([key, preset]) => (
                        <div
                            key={key}
                            className={`preset-card ${selectedPreset === key ? 'active' : ''}`}
                            style={{ '--preset-color': preset.color }}
                            onClick={() => handlePresetChange(key)}
                        >
                            <span className="preset-icon">{preset.icon}</span>
                            <span className="preset-name">{preset.name}</span>
                            <span className="preset-desc">{preset.description}</span>
                            {selectedPreset === key && <span className="preset-check">{Icons.check}</span>}
                        </div>
                    ))}
                </div>
            </div>

            {/* Round Timeline Preview */}
            <div className="rounds-preview">
                <label className="form-label">Interview Flow</label>
                <div className="timeline">
                    {rounds.map((round, index) => {
                        const roundInfo = ROUND_TYPES.find(r => r.value === round.roundType);
                        return (
                            <div key={index} className="timeline-item">
                                <div
                                    className={`timeline-node ${expandedRound === index ? 'expanded' : ''}`}
                                    onClick={() => setExpandedRound(expandedRound === index ? null : index)}
                                >
                                    <span className="node-number">{index + 1}</span>
                                    <span className="node-icon">{roundInfo?.icon || '📋'}</span>
                                </div>
                                <span className="timeline-label">{round.title}</span>
                                {index < rounds.length - 1 && <div className="timeline-connector" />}
                            </div>
                        );
                    })}
                    {selectedPreset === 'custom' && (
                        <div className="timeline-item add-round">
                            <button className="add-round-btn" onClick={() => addRound()}>
                                <span>+</span>
                            </button>
                            <span className="timeline-label">Add Round</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Round Details/Editor */}
            <div className="rounds-editor">
                {rounds.map((round, index) => (
                    <div
                        key={index}
                        className={`round-card ${expandedRound === index ? 'expanded' : ''}`}
                    >
                        <div
                            className="round-header"
                            onClick={() => setExpandedRound(expandedRound === index ? null : index)}
                        >
                            <div className="round-info">
                                <span className="round-number">Round {round.roundNumber}</span>
                                <span className="round-title">{round.title}</span>
                                <span className="round-meta">
                                    {round.duration} min • {round.isAIEnabled ? <><span className="ai-badge">{Icons.cpu}</span> AI</> : <><span className="manual-badge">{Icons.user}</span> Manual</>}
                                </span>
                            </div>
                            <div className="round-actions">
                                {selectedPreset === 'custom' && (
                                    <>
                                        <button
                                            className="round-action-btn"
                                            onClick={(e) => { e.stopPropagation(); moveRound(index, 'up'); }}
                                            disabled={index === 0}
                                        >{Icons.arrowUp}</button>
                                        <button
                                            className="round-action-btn"
                                            onClick={(e) => { e.stopPropagation(); moveRound(index, 'down'); }}
                                            disabled={index === rounds.length - 1}
                                        >{Icons.arrowDown}</button>
                                        <button
                                            className="round-action-btn delete"
                                            onClick={(e) => { e.stopPropagation(); removeRound(index); }}
                                        >{Icons.x}</button>
                                    </>
                                )}
                                <span className="expand-icon">{expandedRound === index ? Icons.chevronDown : Icons.chevronRight}</span>
                            </div>
                        </div>

                        {expandedRound === index && (
                            <div className="round-config">
                                {/* Basic Config */}
                                <div className="config-row">
                                    <div className="config-field">
                                        <label>Title</label>
                                        <input
                                            type="text"
                                            value={round.title}
                                            onChange={(e) => updateRound(index, 'title', e.target.value)}
                                            className="input"
                                        />
                                    </div>
                                    <div className="config-field">
                                        <label>Duration (min)</label>
                                        <input
                                            type="number"
                                            value={round.duration}
                                            onChange={(e) => updateRound(index, 'duration', parseInt(e.target.value))}
                                            className="input"
                                            min="5"
                                            max="180"
                                        />
                                    </div>
                                </div>

                                <div className="config-row">
                                    <div className="config-field">
                                        <label>Round Type</label>
                                        <select
                                            value={round.roundType}
                                            onChange={(e) => updateRound(index, 'roundType', e.target.value)}
                                            className="input"
                                        >
                                            {ROUND_TYPES.map(type => (
                                                <option key={type.value} value={type.value}>
                                                    {type.icon} {type.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="config-field">
                                        <label className="checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={round.isAIEnabled}
                                                onChange={(e) => updateRound(index, 'isAIEnabled', e.target.checked)}
                                            />
                                            AI-Powered Evaluation
                                        </label>
                                    </div>
                                </div>

                                {/* Coding/DSA specific config */}
                                {['coding', 'dsa'].includes(round.roundType) && round.codingConfig && (
                                    <div className="coding-config">
                                        <h4><span className="config-icon">{Icons.code}</span> Coding Configuration</h4>
                                        <div className="config-row">
                                            <div className="config-field">
                                                <label>Difficulty</label>
                                                <select
                                                    value={round.codingConfig.difficulty}
                                                    onChange={(e) => updateRound(index, 'codingConfig.difficulty', e.target.value)}
                                                    className="input"
                                                >
                                                    <option value="easy">Easy</option>
                                                    <option value="medium">Medium</option>
                                                    <option value="hard">Hard</option>
                                                    <option value="mixed">Mixed</option>
                                                </select>
                                            </div>
                                            <div className="config-field">
                                                <label>Problem Count</label>
                                                <input
                                                    type="number"
                                                    value={round.codingConfig.problemCount}
                                                    onChange={(e) => updateRound(index, 'codingConfig.problemCount', parseInt(e.target.value))}
                                                    className="input"
                                                    min="1"
                                                    max="5"
                                                />
                                            </div>
                                        </div>
                                        <div className="config-field full-width">
                                            <label>DSA Topics</label>
                                            <div className="topic-tags">
                                                {DSA_TOPICS.map(topic => (
                                                    <span
                                                        key={topic}
                                                        className={`topic-tag ${round.codingConfig.topics?.includes(topic) ? 'active' : ''}`}
                                                        onClick={() => {
                                                            const currentTopics = round.codingConfig.topics || [];
                                                            const newTopics = currentTopics.includes(topic)
                                                                ? currentTopics.filter(t => t !== topic)
                                                                : [...currentTopics, topic];
                                                            updateRound(index, 'codingConfig.topics', newTopics);
                                                        }}
                                                    >
                                                        {topic.replace('_', ' ')}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Interview question config */}
                                {['technical', 'hr', 'behavioral', 'screening'].includes(round.roundType) && round.questionConfig && (
                                    <div className="question-config">
                                        <h4><span className="config-icon">{Icons.helpCircle}</span> Question Configuration</h4>
                                        <div className="config-row">
                                            <div className="config-field">
                                                <label>Question Count</label>
                                                <input
                                                    type="number"
                                                    value={round.questionConfig.questionCount}
                                                    onChange={(e) => updateRound(index, 'questionConfig.questionCount', parseInt(e.target.value))}
                                                    className="input"
                                                    min="1"
                                                    max="20"
                                                />
                                            </div>
                                            <div className="config-field">
                                                <label>Passing Score (%)</label>
                                                <input
                                                    type="number"
                                                    value={round.scoring?.passingScore || 60}
                                                    onChange={(e) => updateRound(index, 'scoring.passingScore', parseInt(e.target.value))}
                                                    className="input"
                                                    min="0"
                                                    max="100"
                                                />
                                            </div>
                                        </div>
                                        {jobSkills.length > 0 && (
                                            <div className="config-field full-width">
                                                <label>Focus Skills (from job requirements)</label>
                                                <div className="skill-tags">
                                                    {jobSkills.map(skill => (
                                                        <span
                                                            key={skill}
                                                            className={`skill-tag ${round.questionConfig.focusSkills?.includes(skill) ? 'active' : ''}`}
                                                            onClick={() => {
                                                                const currentSkills = round.questionConfig.focusSkills || [];
                                                                const newSkills = currentSkills.includes(skill)
                                                                    ? currentSkills.filter(s => s !== skill)
                                                                    : [...currentSkills, skill];
                                                                updateRound(index, 'questionConfig.focusSkills', newSkills);
                                                            }}
                                                        >
                                                            {skill}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Assessment config */}
                                {round.roundType === 'assessment' && round.assessmentConfig && (
                                    <div className="assessment-config">
                                        <h4><span className="config-icon">{Icons.fileText}</span> Assessment Configuration</h4>
                                        <div className="config-row">
                                            <div className="config-field">
                                                <label>Question Count</label>
                                                <input
                                                    type="number"
                                                    value={round.assessmentConfig.questionCount}
                                                    onChange={(e) => updateRound(index, 'assessmentConfig.questionCount', parseInt(e.target.value))}
                                                    className="input"
                                                    min="5"
                                                    max="100"
                                                />
                                            </div>
                                            <div className="config-field">
                                                <label>Passing Score (%)</label>
                                                <input
                                                    type="number"
                                                    value={round.assessmentConfig.passingScore}
                                                    onChange={(e) => updateRound(index, 'assessmentConfig.passingScore', parseInt(e.target.value))}
                                                    className="input"
                                                    min="0"
                                                    max="100"
                                                />
                                            </div>
                                        </div>

                                        {/* Assessment Types Selection */}
                                        <div className="config-field full-width" style={{ marginTop: 'var(--spacing-md)' }}>
                                            <label>Assessment Types <span style={{ color: 'var(--text-tertiary)', fontWeight: 'normal' }}>(select at least one)</span></label>
                                            <div className="assessment-types-grid" style={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(2, 1fr)',
                                                gap: 'var(--spacing-sm)',
                                                marginTop: 'var(--spacing-sm)'
                                            }}>
                                                {[
                                                    { id: 'technical', label: '💻 Technical', desc: 'Programming concepts, pseudocode, code output' },
                                                    { id: 'communication', label: '💬 Communication', desc: 'Professional writing, email etiquette' },
                                                    { id: 'aptitude', label: '🧠 Aptitude', desc: 'Logical reasoning, problem-solving' },
                                                    { id: 'reasoning', label: '📊 Reasoning', desc: 'Analytical thinking, data interpretation' }
                                                ].map(type => {
                                                    const isSelected = round.assessmentConfig.assessmentTypes?.includes(type.id);
                                                    return (
                                                        <label
                                                            key={type.id}
                                                            className={`assessment-type-card ${isSelected ? 'selected' : ''}`}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'flex-start',
                                                                gap: 'var(--spacing-sm)',
                                                                padding: 'var(--spacing-md)',
                                                                border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border-color)'}`,
                                                                borderRadius: 'var(--radius-md)',
                                                                cursor: 'pointer',
                                                                background: isSelected ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-secondary)',
                                                                transition: 'all 0.2s ease'
                                                            }}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={(e) => {
                                                                    const currentTypes = round.assessmentConfig.assessmentTypes || ['technical'];
                                                                    let newTypes;
                                                                    if (e.target.checked) {
                                                                        newTypes = [...currentTypes, type.id];
                                                                    } else {
                                                                        newTypes = currentTypes.filter(t => t !== type.id);
                                                                        // Ensure at least one type is selected
                                                                        if (newTypes.length === 0) newTypes = ['technical'];
                                                                    }
                                                                    updateRound(index, 'assessmentConfig.assessmentTypes', newTypes);
                                                                }}
                                                                style={{ marginTop: '2px' }}
                                                            />
                                                            <div>
                                                                <div style={{ fontWeight: 600 }}>{type.label}</div>
                                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{type.desc}</div>
                                                            </div>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Add Round Button (for custom) */}
            {selectedPreset === 'custom' && rounds.length === 0 && (
                <div className="empty-rounds">
                    <p>No rounds configured. Add your first round:</p>
                    <div className="add-round-options">
                        {ROUND_TYPES.slice(0, 6).map(type => (
                            <button
                                key={type.value}
                                className="add-type-btn"
                                onClick={() => addRound(type.value)}
                            >
                                <span className="type-icon">{type.icon}</span>
                                <span className="type-label">{type.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Pipeline Settings */}
            <div className="pipeline-settings">
                <button
                    className="settings-toggle"
                    onClick={() => setShowSettings(!showSettings)}
                >
                    <span className="settings-icon">{Icons.settings}</span> Pipeline Settings {showSettings ? Icons.chevronDown : Icons.chevronRight}
                </button>

                {showSettings && (
                    <div className="settings-panel">
                        <div className="settings-row">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={settings.requirePlatformInterview}
                                    onChange={(e) => setSettings({ ...settings, requirePlatformInterview: e.target.checked })}
                                />
                                Require platform interview before job interview
                            </label>
                        </div>

                        <div className="settings-row">
                            <div className="settings-field">
                                <label>Auto-reject below score</label>
                                <input
                                    type="number"
                                    value={settings.autoRejectBelowScore || ''}
                                    onChange={(e) => setSettings({ ...settings, autoRejectBelowScore: e.target.value ? parseInt(e.target.value) : null })}
                                    className="input"
                                    placeholder="e.g., 40"
                                    min="0"
                                    max="100"
                                />
                            </div>
                            <div className="settings-field">
                                <label>Auto-advance above score</label>
                                <input
                                    type="number"
                                    value={settings.autoAdvanceAboveScore || ''}
                                    onChange={(e) => setSettings({ ...settings, autoAdvanceAboveScore: e.target.value ? parseInt(e.target.value) : null })}
                                    className="input"
                                    placeholder="e.g., 70"
                                    min="0"
                                    max="100"
                                />
                            </div>
                        </div>

                        <div className="settings-row">
                            <div className="settings-field">
                                <label>Max attempts per round</label>
                                <select
                                    value={settings.maxAttempts}
                                    onChange={(e) => setSettings({ ...settings, maxAttempts: parseInt(e.target.value) })}
                                    className="input"
                                >
                                    <option value={1}>1 attempt</option>
                                    <option value={2}>2 attempts</option>
                                    <option value={3}>3 attempts</option>
                                </select>
                            </div>
                            <div className="settings-field">
                                <label>Interview expiry (days)</label>
                                <input
                                    type="number"
                                    value={settings.expiryDays}
                                    onChange={(e) => setSettings({ ...settings, expiryDays: parseInt(e.target.value) })}
                                    className="input"
                                    min="1"
                                    max="30"
                                />
                            </div>
                        </div>

                        <div className="settings-row">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={settings.allowReschedule}
                                    onChange={(e) => setSettings({ ...settings, allowReschedule: e.target.checked })}
                                />
                                Allow candidates to reschedule
                            </label>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InterviewPipelineConfig;
