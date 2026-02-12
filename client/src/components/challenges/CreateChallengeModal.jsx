import React, { useState } from 'react';
import { motion } from 'framer-motion';
import api from '../../services/api';

const DOMAINS = ['Software Engineering', 'Marketing', 'Customer Support', 'Design',
    'Product Management', 'Data Science', 'Sales', 'HR', 'Finance', 'Others'];

const CreateChallengeModal = ({ onClose, onCreated }) => {
    const [step, setStep] = useState(1);
    const [publishing, setPublishing] = useState(false);
    const [form, setForm] = useState({
        title: '',
        description: '',
        domain: 'Software Engineering',
        difficulty: 'Beginner',
        category: 'quiz',
        timeLimit: 30,
        maxAttempts: 3,
        skillTags: '',
        questions: [{
            questionText: '',
            questionType: 'mcq',
            options: ['', '', '', ''],
            correctAnswer: '',
            maxScore: 10,
            codeLanguage: 'javascript'
        }]
    });

    const userId = localStorage.getItem('userId');

    const updateQuestion = (idx, field, value) => {
        const qs = [...form.questions];
        qs[idx] = { ...qs[idx], [field]: value };
        setForm({ ...form, questions: qs });
    };

    const updateOption = (qIdx, oIdx, value) => {
        const qs = [...form.questions];
        const opts = [...qs[qIdx].options];
        opts[oIdx] = value;
        qs[qIdx] = { ...qs[qIdx], options: opts };
        setForm({ ...form, questions: qs });
    };

    const addQuestion = () => {
        setForm({
            ...form,
            questions: [...form.questions, {
                questionText: '', questionType: 'mcq',
                options: ['', '', '', ''], correctAnswer: '', maxScore: 10, codeLanguage: 'javascript'
            }]
        });
    };

    const removeQuestion = (idx) => {
        if (form.questions.length <= 1) return;
        setForm({ ...form, questions: form.questions.filter((_, i) => i !== idx) });
    };

    const canProceed = () => {
        if (step === 1) return form.title.trim() && form.description.trim();
        if (step === 2) return form.questions.every(q => q.questionText.trim());
        return true;
    };

    const handlePublish = async () => {
        setPublishing(true);
        try {
            const payload = {
                creatorId: userId,
                title: form.title,
                description: form.description,
                domain: form.domain,
                difficulty: form.difficulty,
                category: form.category,
                timeLimit: parseInt(form.timeLimit),
                maxAttempts: parseInt(form.maxAttempts),
                skillTags: form.skillTags.split(',').map(s => s.trim()).filter(Boolean),
                questions: form.questions.map(q => ({
                    questionText: q.questionText,
                    questionType: q.questionType,
                    options: q.questionType === 'mcq' ? q.options.filter(Boolean) : undefined,
                    correctAnswer: q.correctAnswer || undefined,
                    maxScore: q.maxScore,
                    codeLanguage: q.questionType === 'code' ? q.codeLanguage : undefined
                }))
            };

            await api.post('/challenges', payload);
            onCreated && onCreated();
        } catch (err) {
            alert(err.error || 'Failed to create challenge');
        } finally {
            setPublishing(false);
        }
    };

    return (
        <motion.div
            className="create-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <motion.div
                className="create-modal"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={e => e.stopPropagation()}
            >
                <div className="create-modal-header">
                    <h2>Create Challenge</h2>
                    <button className="challenge-detail-close" onClick={onClose}>✕</button>
                </div>

                <div className="create-modal-body">
                    {/* Step Indicator */}
                    <div className="step-indicator">
                        {[1, 2, 3].map(s => (
                            <div key={s} className={`step-dot ${s === step ? 'active' : s < step ? 'completed' : ''}`} />
                        ))}
                    </div>

                    {/* Step 1: Basic Info */}
                    {step === 1 && (
                        <>
                            <div className="form-group">
                                <label>Challenge Title</label>
                                <input className="form-input" placeholder="E.g., React Hooks Mastery" value={form.title}
                                    onChange={e => setForm({ ...form, title: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Description</label>
                                <textarea className="form-textarea" placeholder="Describe what this challenge tests..."
                                    value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Domain</label>
                                    <select className="form-select" value={form.domain}
                                        onChange={e => setForm({ ...form, domain: e.target.value })}>
                                        {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Difficulty</label>
                                    <select className="form-select" value={form.difficulty}
                                        onChange={e => setForm({ ...form, difficulty: e.target.value })}>
                                        <option value="Beginner">Beginner</option>
                                        <option value="Intermediate">Intermediate</option>
                                        <option value="Advanced">Advanced</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Category</label>
                                    <select className="form-select" value={form.category}
                                        onChange={e => setForm({ ...form, category: e.target.value })}>
                                        <option value="quiz">Quiz</option>
                                        <option value="coding">Coding</option>
                                        <option value="simulation">Simulation</option>
                                        <option value="case-study">Case Study</option>
                                        <option value="writing">Writing</option>
                                        <option value="design-task">Design Task</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Time Limit (min)</label>
                                    <input className="form-input" type="number" min="5" max="180" value={form.timeLimit}
                                        onChange={e => setForm({ ...form, timeLimit: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Skill Tags (comma-separated)</label>
                                <input className="form-input" placeholder="React, JavaScript, State Management"
                                    value={form.skillTags} onChange={e => setForm({ ...form, skillTags: e.target.value })} />
                            </div>
                        </>
                    )}

                    {/* Step 2: Questions */}
                    {step === 2 && (
                        <>
                            {form.questions.map((q, qi) => (
                                <div key={qi} className="question-builder">
                                    <div className="question-builder-header">
                                        <span>Question {qi + 1}</span>
                                        <button className="remove-question-btn" onClick={() => removeQuestion(qi)}>Remove</button>
                                    </div>
                                    <div className="form-group">
                                        <label>Question Text</label>
                                        <textarea className="form-textarea" placeholder="Enter question..."
                                            value={q.questionText} onChange={e => updateQuestion(qi, 'questionText', e.target.value)} />
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Type</label>
                                            <select className="form-select" value={q.questionType}
                                                onChange={e => updateQuestion(qi, 'questionType', e.target.value)}>
                                                <option value="mcq">Multiple Choice</option>
                                                <option value="short-answer">Short Answer</option>
                                                <option value="essay">Essay</option>
                                                <option value="code">Code</option>
                                                <option value="simulation">Simulation</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Max Score</label>
                                            <input className="form-input" type="number" min="1" max="100" value={q.maxScore}
                                                onChange={e => updateQuestion(qi, 'maxScore', parseInt(e.target.value))} />
                                        </div>
                                    </div>

                                    {q.questionType === 'mcq' && (
                                        <div className="form-group">
                                            <label>Options</label>
                                            {q.options.map((opt, oi) => (
                                                <div key={oi} className="mcq-option-input">
                                                    <input placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                                                        value={opt} onChange={e => updateOption(qi, oi, e.target.value)} />
                                                    <button
                                                        className={`correct-marker ${q.correctAnswer === opt && opt ? 'is-correct' : ''}`}
                                                        onClick={() => updateQuestion(qi, 'correctAnswer', opt)}
                                                    >
                                                        {q.correctAnswer === opt && opt ? '✓ Correct' : 'Set Correct'}
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {(q.questionType === 'short-answer') && (
                                        <div className="form-group">
                                            <label>Correct Answer (for auto-grading)</label>
                                            <input className="form-input" placeholder="Expected answer..."
                                                value={q.correctAnswer} onChange={e => updateQuestion(qi, 'correctAnswer', e.target.value)} />
                                        </div>
                                    )}

                                    {q.questionType === 'code' && (
                                        <div className="form-group">
                                            <label>Language</label>
                                            <select className="form-select" value={q.codeLanguage}
                                                onChange={e => updateQuestion(qi, 'codeLanguage', e.target.value)}>
                                                <option value="javascript">JavaScript</option>
                                                <option value="python">Python</option>
                                                <option value="java">Java</option>
                                                <option value="cpp">C++</option>
                                            </select>
                                        </div>
                                    )}
                                </div>
                            ))}
                            <button className="add-question-btn" onClick={addQuestion}>+ Add Question</button>
                        </>
                    )}

                    {/* Step 3: Review & Publish */}
                    {step === 3 && (
                        <div className="detail-section">
                            <h3>Review Summary</h3>
                            <div className="detail-stats-grid">
                                <div className="detail-stat">
                                    <div className="detail-stat-value">{form.questions.length}</div>
                                    <div className="detail-stat-label">Questions</div>
                                </div>
                                <div className="detail-stat">
                                    <div className="detail-stat-value">{form.timeLimit}m</div>
                                    <div className="detail-stat-label">Time Limit</div>
                                </div>
                                <div className="detail-stat">
                                    <div className="detail-stat-value">{form.difficulty}</div>
                                    <div className="detail-stat-label">Difficulty</div>
                                </div>
                                <div className="detail-stat">
                                    <div className="detail-stat-value">{form.domain.split(' ')[0]}</div>
                                    <div className="detail-stat-label">Domain</div>
                                </div>
                            </div>
                            <div style={{ marginTop: 16 }}>
                                <h3 style={{ fontSize: '1rem', color: '#f1f5f9', margin: '0 0 8px' }}>{form.title}</h3>
                                <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{form.description}</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="create-modal-footer">
                    <button className="modal-btn secondary" onClick={step > 1 ? () => setStep(step - 1) : onClose}>
                        {step > 1 ? '← Back' : 'Cancel'}
                    </button>
                    {step < 3 ? (
                        <button className="modal-btn primary" onClick={() => setStep(step + 1)} disabled={!canProceed()}>
                            Next →
                        </button>
                    ) : (
                        <button className="modal-btn success" onClick={handlePublish} disabled={publishing}>
                            {publishing ? 'Publishing...' : '🚀 Publish Challenge'}
                        </button>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
};

export default CreateChallengeModal;
