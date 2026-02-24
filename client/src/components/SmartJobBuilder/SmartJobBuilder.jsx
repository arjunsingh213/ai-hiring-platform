import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { useToast } from '../Toast';
import './SmartJobBuilder.css';

const TEMPLATES = [
    { id: 'swe', name: 'Software Engineer', desc: 'Core backend, frontend, or fullstack development role.' },
    { id: 'data', name: 'Data Engineer', desc: 'Pipelines, ETL, and database architecture.' },
    { id: 'pm', name: 'Product Manager', desc: 'Strategy, roadmapping, and cross-functional leadership.' },
    { id: 'design', name: 'Product Designer', desc: 'UX/UI design, wireframing, and user research.' },
    { id: 'sales', name: 'Sales Representative', desc: 'Outbound, inbound, and account management.' }
];

const SmartJobBuilder = ({ onJobReady, onSwitchToManual }) => {
    const toast = useToast();
    const [activeTab, setActiveTab] = useState(() => localStorage.getItem('sjb_active_tab') || 'chat');

    // AI Draft State
    const [draft, setDraft] = useState(() => {
        const saved = localStorage.getItem('sjb_draft');
        return saved ? JSON.parse(saved) : null;
    });
    const [isGeneratingFull, setIsGeneratingFull] = useState(false);

    // Chat State
    const [messages, setMessages] = useState(() => {
        const saved = localStorage.getItem('sjb_messages');
        return saved ? JSON.parse(saved) : [
            { role: 'assistant', content: 'Hi! What kind of role are you looking to hire for today?' }
        ];
    });
    const [chatInput, setChatInput] = useState(() => localStorage.getItem('sjb_chat_input') || '');
    const [isChatLoading, setIsChatLoading] = useState(false);
    const messagesEndRef = useRef(null);

    // Parse State
    const [parseInput, setParseInput] = useState(() => localStorage.getItem('sjb_parse_input') || '');
    const [isParsing, setIsParsing] = useState(false);

    // Sync to LocalStorage
    useEffect(() => {
        localStorage.setItem('sjb_active_tab', activeTab);
    }, [activeTab]);

    useEffect(() => {
        localStorage.setItem('sjb_messages', JSON.stringify(messages));
    }, [messages]);

    useEffect(() => {
        if (draft) localStorage.setItem('sjb_draft', JSON.stringify(draft));
        else localStorage.removeItem('sjb_draft');
    }, [draft]);

    useEffect(() => {
        localStorage.setItem('sjb_chat_input', chatInput);
    }, [chatInput]);

    useEffect(() => {
        localStorage.setItem('sjb_parse_input', parseInput);
    }, [parseInput]);

    // Reset Functionality
    const handleReset = () => {
        if (window.confirm('Start a fresh session? Current progress will be cleared.')) {
            localStorage.removeItem('sjb_active_tab');
            localStorage.removeItem('sjb_messages');
            localStorage.removeItem('sjb_draft');
            localStorage.removeItem('sjb_chat_input');
            localStorage.removeItem('sjb_parse_input');

            setMessages([{ role: 'assistant', content: 'Hi! What kind of role are you looking to hire for today?' }]);
            setDraft(null);
            setChatInput('');
            setParseInput('');
            setActiveTab('chat');
            toast.success('Session reset! Ready for a new job post.');
        }
    };

    // Initial trigger to auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Handle standard conversational chat
    const handleChatSubmit = async (e) => {
        e?.preventDefault();
        if (!chatInput.trim()) return;

        const newMsg = { role: 'user', content: chatInput.trim() };
        setMessages(prev => [...prev, newMsg]);
        setChatInput('');
        setIsChatLoading(true);

        try {
            // Also send current draft if one exists for context
            const response = await api.post('/job-builder/chat', {
                messages: [...messages, newMsg].map(m => ({ role: m.role, content: m.content })),
                currentDraft: draft ? JSON.stringify(draft) : null
            });

            const reply = response.reply;
            if (reply) {
                setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
            }
        } catch (err) {
            console.error('Chat error:', err);
            toast.error('Failed to connect to AI assistant.');
        } finally {
            setIsChatLoading(false);
        }
    };

    // Generate Final Draft from Chat Context
    const generateFromChat = async () => {
        setIsGeneratingFull(true);
        try {
            const response = await api.post('/job-builder/generate-full', {
                context: {
                    source: 'conversational_chat',
                    chatHistory: messages.map(m => `${m.role}: ${m.content}`).join('\n')
                }
            });
            if (response.draft) {
                setDraft(response.draft);
                toast.success('Job draft generated successfully!');
            }
        } catch (err) {
            console.error('Generation error:', err);
            toast.error('Failed to generate full draft. Try again.');
        } finally {
            setIsGeneratingFull(false);
        }
    };

    // Handle Parsing
    const handleParse = async () => {
        if (!parseInput.trim()) return;
        setIsParsing(true);
        try {
            // First pass: Quick OpenRouter parse to get signals
            const parseRes = await api.post('/job-builder/parse', { text: parseInput });
            const signals = parseRes.parsed;

            if (signals?.parsing_confidence < 60) {
                toast.warning("Confidence is low. AI needs clarification.");
                // Switch to chat mode and ask for clarification
                setActiveTab('chat');
                setMessages(prev => [...prev,
                { role: 'user', content: `I pasted this JD:\n${parseInput.substring(0, 200)}...` },
                { role: 'assistant', content: 'I tried parsing that, but some key details are missing. What specific skills or seniority are you looking for?' }
                ]);
                setIsParsing(false);
                return;
            }

            // ENFORCEMENT: Check for mandatory fields (Compensation & Qualifications)
            const hasCompensation = signals.compensation_raw && signals.compensation_raw.length > 5;
            const hasQualifications = signals.qualifications && signals.qualifications.length > 0;

            if (!hasCompensation || !hasQualifications) {
                let missingMsg = "I've analyzed the JD, but some mandatory details are missing:";
                if (!hasCompensation) missingMsg += "\n- Compensation/Salary range";
                if (!hasQualifications) missingMsg += "\n- Core Qualifications/Education";
                missingMsg += "\n\nPlease provide these details so I can generate an accurate job draft for you.";

                setActiveTab('chat');
                setMessages(prev => [...prev,
                { role: 'user', content: `I pasted a JD for ${signals.role_title || 'a new role'}.` },
                { role: 'assistant', content: missingMsg }
                ]);
                setIsParsing(false);
                return;
            }

            // Second pass: Groq Full Generation using signals
            setIsGeneratingFull(true);
            const fullRes = await api.post('/job-builder/generate-full', {
                context: {
                    source: 'document_parse',
                    extracted_signals: signals,
                    original_text: parseInput
                }
            });

            if (fullRes.draft) {
                setDraft(fullRes.draft);
                toast.success('Successfully structured job description!');
                // Auto switch to draft view
                setParseInput(''); // Clear input
            }
        } catch (err) {
            console.error('Parse error:', err);
            toast.error('Failed to parse document.');
        } finally {
            setIsParsing(false);
            setIsGeneratingFull(false);
        }
    };

    // Handle Template
    const handleTemplateSelect = async (template) => {
        setIsGeneratingFull(true);
        try {
            const response = await api.post('/job-builder/generate-full', {
                templateName: template.name,
                context: {
                    hiring_priorities: "Standard industry expectations",
                    urgency: "Normal"
                }
            });
            if (response.draft) {
                setDraft(response.draft);
                toast.success(`Generated draft from ${template.name} template`);
            }
        } catch (err) {
            console.error('Template error:', err);
            toast.error('Failed to expand template.');
        } finally {
            setIsGeneratingFull(false);
        }
    };

    // Final Action string formatting to map into the older JobPosting schema
    const finalizeJob = () => {
        if (!draft) return;

        // Validation for mandatory fields
        const hasSalary = draft.salary_range?.min > 0 && draft.salary_range?.max > 0;
        const hasQuals = draft.qualifications && draft.qualifications.length > 0;

        if (!hasSalary || !hasQuals) {
            toast.warning("Incomplete draft. AI needs Compensation and Qualifications to proceed.");
            let prompt = "I've generated a draft, but I noticed some mandatory details are missing:";
            if (!hasSalary) prompt += "\n- Compensation/Salary range";
            if (!hasQuals) prompt += "\n- Core Qualifications/Education";
            prompt += "\n\nPlease provide these details so we can move to the interview pipeline.";

            setActiveTab('chat');
            setMessages(prev => [...prev, { role: 'assistant', content: prompt }]);
            return;
        }

        // Helper to strip non-numeric characters (except decimals)
        const cleanNumber = (val) => {
            if (typeof val === 'number') return val;
            if (!val) return 0;
            const cleaned = val.toString().replace(/[^0-9.]/g, '');
            return parseFloat(cleaned) || 0;
        };

        const sMin = cleanNumber(draft.salary_range?.min);
        const sMax = cleanNumber(draft.salary_range?.max);

        // Convert SMART_JOB draft to legacy required format
        const finalJobData = {
            title: draft.role_title,
            description: `Compensation: ${draft.salary_range?.currency || 'USD'} ${sMin.toLocaleString()} - ${sMax.toLocaleString()}\n` +
                `Education: ${draft.qualifications?.join(', ') || 'Not Specified'}\n\n` +
                (draft.responsibilities?.join('\n\n• ')
                    ? `Responsibilities:\n• ${draft.responsibilities.join('\n• ')}`
                    : ''),
            skills: [...(draft.required_skills || []), ...(draft.preferred_skills || [])].join(', '),
            minExperience: draft.experience_model === 'learning_with_guidance' ? 0 :
                draft.experience_model === 'feature_owner' ? 3 :
                    draft.experience_model === 'system_owner' ? 5 : 8,
            maxExperience: draft.experience_model === 'learning_with_guidance' ? 2 :
                draft.experience_model === 'feature_owner' ? 5 :
                    draft.experience_model === 'system_owner' ? 8 : 15,
            education: draft.qualifications?.join(', ') || '',
            type: draft.type || 'full-time',
            location: draft.location || 'Remote',
            remote: true,
            salaryMin: sMin.toString(),
            salaryMax: sMax.toString(),
            currency: draft.salary_range?.currency || 'USD',
            smartPipeline: draft.suggested_interview_rounds
        };

        onJobReady(finalJobData);
    };

    return (
        <div className="smart-job-builder">
            {/* LEFT PANE - AI INTERACTION */}
            <div className="sjb-left-pane">
                <div className="sjb-header">
                    <h2>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2a10 10 0 1 0 10 10H12V2Z" />
                            <path d="M12 12 2.1 12" />
                            <path d="M12 12 18.5 4.5" />
                        </svg>
                        Smart Builder
                    </h2>
                    <div className="sjb-tabs-container" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className="sjb-tabs">
                            <button className={`sjb-tab ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>Chat</button>
                            <button className={`sjb-tab ${activeTab === 'parse' ? 'active' : ''}`} onClick={() => setActiveTab('parse')}>Paste JD</button>
                            <button className={`sjb-tab ${activeTab === 'templates' ? 'active' : ''}`} onClick={() => setActiveTab('templates')}>Templates</button>
                        </div>
                        <button
                            className="sjb-reset-btn"
                            onClick={handleReset}
                            title="Start New Job/Chat"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'var(--surface-light)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '6px',
                                padding: '4px',
                                cursor: 'pointer',
                                color: 'var(--text-primary)',
                                transition: 'all 0.2s'
                            }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {activeTab === 'chat' && (
                    <div className="sjb-chat-view">
                        <div className="sjb-chat-messages">
                            {messages.map((msg, i) => (
                                <div key={i} className={`sjb-message ${msg.role === 'assistant' ? 'system' : 'user'}`}>
                                    {msg.content}
                                </div>
                            ))}
                            {isChatLoading && (
                                <div className="sjb-message system sjb-typing-indicator">
                                    <div className="sjb-typing-dot"></div>
                                    <div className="sjb-typing-dot"></div>
                                    <div className="sjb-typing-dot"></div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                        <div className="sjb-chat-actions" style={{ padding: '0 1.5rem 1rem 1.5rem', display: 'flex', justifyContent: 'center' }}>
                            {messages.length > 2 && (
                                <button className="btn btn-secondary btn-sm" onClick={generateFromChat} disabled={isGeneratingFull}>
                                    {isGeneratingFull ? 'Generating Draft...' : 'Generate Draft from Chat'}
                                </button>
                            )}
                        </div>
                        <form className="sjb-chat-input-area" onSubmit={handleChatSubmit}>
                            <input
                                type="text"
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                placeholder="Describe the role..."
                                disabled={isGeneratingFull || isChatLoading}
                            />
                            <button type="submit" disabled={!chatInput.trim() || isGeneratingFull || isChatLoading}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="22" y1="2" x2="11" y2="13" />
                                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                                </svg>
                            </button>
                        </form>
                    </div>
                )}

                {activeTab === 'parse' && (
                    <div className="sjb-parse-view">
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                            Paste an existing job description, requirements list, or competitor listing. Our AI will automatically extract and structure it into the Smart Job format.
                        </p>
                        <textarea
                            value={parseInput}
                            onChange={e => setParseInput(e.target.value)}
                            placeholder="Paste text here..."
                            disabled={isParsing || isGeneratingFull}
                        />
                        <button
                            className="btn btn-primary"
                            onClick={handleParse}
                            disabled={!parseInput.trim() || isParsing || isGeneratingFull}
                        >
                            {isParsing || isGeneratingFull ? 'Analyzing Document...' : 'Parse & Generate'}
                        </button>
                    </div>
                )}

                {activeTab === 'templates' && (
                    <div className="sjb-templates-view">
                        {TEMPLATES.map(t => (
                            <div key={t.id} className="sjb-template-card" onClick={() => !isGeneratingFull && handleTemplateSelect(t)}>
                                <h4>{t.name}</h4>
                                <p>{t.desc}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* RIGHT PANE - LIVE DRAFT */}
            <div className="sjb-right-pane">
                <div className="sjb-draft-header">
                    <h3>Smart Job Draft</h3>
                    <button className="btn btn-ghost btn-sm" onClick={onSwitchToManual}>Switch to Manual</button>
                </div>

                <div className="sjb-draft-content">
                    {isGeneratingFull ? (
                        <div className="sjb-empty-draft">
                            <div className="sjb-spinner"></div>
                            <p style={{ marginTop: '1rem' }}>Architecting Job Draft using Groq Engine...</p>
                        </div>
                    ) : draft ? (
                        <div className="sjb-draft-results">

                            <div className="sjb-draft-card">
                                <h4>Role Overview</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <p style={{ margin: '0 0 0.5rem 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Title</p>
                                        <div style={{ fontWeight: '600' }}>{draft.role_title}</div>
                                    </div>
                                    <div>
                                        <p style={{ margin: '0 0 0.5rem 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Seniority</p>
                                        <div style={{ fontWeight: '500' }}>{draft.seniority_level}</div>
                                    </div>
                                    <div>
                                        <p style={{ margin: '0 0 0.5rem 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Compensation</p>
                                        <div style={{ fontWeight: '600', color: 'var(--primary-color)' }}>
                                            {draft.salary_range?.min > 0 ? `${draft.salary_range.currency} ${draft.salary_range.min.toLocaleString()} - ${draft.salary_range.max.toLocaleString()} / ${draft.salary_range.period || 'year'}` : 'Not Specified'}
                                        </div>
                                    </div>
                                    <div>
                                        <p style={{ margin: '0 0 0.5rem 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Ownership Level</p>
                                        <div style={{ fontWeight: '500', color: 'var(--primary-color)' }}>{draft.experience_model?.replace(/_/g, ' ')}</div>
                                    </div>
                                </div>
                            </div>

                            {draft.qualifications?.length > 0 && (
                                <div className="sjb-draft-card">
                                    <h4>Qualifications</h4>
                                    <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                                        {draft.qualifications.map((q, i) => <li key={i} style={{ marginBottom: '0.25rem' }}>{q}</li>)}
                                    </ul>
                                </div>
                            )}

                            <div className="sjb-draft-card">
                                <h4>Required Skills</h4>
                                <div className="sjb-tag-list">
                                    {draft.required_skills?.map((s, i) => <span key={i} className="sjb-tag">{s}</span>)}
                                </div>

                                {draft.preferred_skills?.length > 0 && (
                                    <>
                                        <h4 style={{ marginTop: '1.5rem' }}>Preferred Skills</h4>
                                        <div className="sjb-tag-list">
                                            {draft.preferred_skills.map((s, i) => <span key={i} className="sjb-tag">{s}</span>)}
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="sjb-draft-card">
                                <h4>Interview Strategy</h4>
                                {draft.suggested_interview_rounds?.map((r, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--surface-hover)', borderRadius: '8px', marginBottom: '0.5rem' }}>
                                        <div>
                                            <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>{r.title}</div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Type: {r.type}</div>
                                        </div>
                                        <div style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>{r.duration}m</div>
                                    </div>
                                ))}

                                {draft.explainability_summary && (
                                    <div className="sjb-explainability">
                                        <p><strong>AI Reasoning (Confidence: {draft.explainability_summary.confidence_score}%):</strong> {draft.explainability_summary.reason_summary}</p>
                                    </div>
                                )}
                            </div>

                        </div>
                    ) : (
                        <div className="sjb-empty-draft">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1rem', color: 'var(--border-color)' }}>
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                                <line x1="16" y1="13" x2="8" y2="13" />
                                <line x1="16" y1="17" x2="8" y2="17" />
                                <polyline points="10 9 9 9 8 9" />
                            </svg>
                            <p>Draft will appear here.</p>
                            <p style={{ fontSize: '0.85rem' }}>Use the Chat, Parse, or Templates tabs to generate.</p>
                        </div>
                    )}
                </div>

                {/* Bottom Actions */}
                <div className="sjb-actions">
                    <button className="btn btn-primary" disabled={!draft} onClick={finalizeJob}>
                        Next: Configure Interview Pipeline
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '6px' }}>
                            <line x1="5" y1="12" x2="19" y2="12" />
                            <polyline points="12 5 19 12 12 19" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SmartJobBuilder;
