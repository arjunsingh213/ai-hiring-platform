import React, { useState } from 'react';
import api from '../services/api';
import './ScheduleInterviewModal.css';

/* ═══════════════════════════════════════════════════════════════
   FROSCEL INTERVIEW ROOM™ — Schedule Interview Modal
   Theme-aware & Mobile Responsive
   ═══════════════════════════════════════════════════════════════ */

const ScheduleInterviewModal = ({ applicant, jobId, jobTitle, onClose, onScheduled, rescheduleRoomCode }) => {
    const [formData, setFormData] = useState({
        date: '',
        time: '',
        duration: 45,
        interviewType: 'one_on_one',
        aiEnabled: false,
        aiSuggestFollowUps: true,
        aiDetectContradictions: true,
        aiProbeVague: true,
        interviewerNotes: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(null);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.date || !formData.time) {
            setError('Please select date and time');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const scheduledAt = new Date(`${formData.date}T${formData.time}`).toISOString();

            let response;
            if (rescheduleRoomCode) {
                // Reschedule existing room
                response = await api.put(`/video-rooms/${rescheduleRoomCode}/reschedule`, {
                    scheduledAt,
                    duration: formData.duration,
                });
            } else {
                // Create new room
                response = await api.post('/video-rooms', {
                    jobId,
                    candidateId: applicant._id || applicant.userId,
                    scheduledAt,
                    duration: formData.duration,
                    interviewType: formData.interviewType,
                    aiConfig: {
                        enabled: formData.aiEnabled,
                        suggestFollowUps: formData.aiSuggestFollowUps,
                        detectContradictions: formData.aiDetectContradictions,
                        probeVagueAnswers: formData.aiProbeVague,
                    },
                    interviewerNotes: formData.interviewerNotes,
                });
            }

            const data = response.data || response;
            setSuccess({
                roomCode: data.data?.roomCode || rescheduleRoomCode,
                roomLink: data.roomLink || `/interview-room/${rescheduleRoomCode}`,
                scheduledAt
            });

            if (onScheduled) onScheduled(data);
        } catch (err) {
            setError(err.response?.data?.error || err.message || 'Failed to schedule interview');
        } finally {
            setLoading(false);
        }
    };

    const today = new Date().toISOString().split('T')[0];

    return (
        <div className="sim-modal-overlay" onClick={onClose}>
            <div className="sim-modal" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="sim-header">
                    <h3 className="sim-title">{rescheduleRoomCode ? 'Reschedule Interview' : 'Schedule Video Interview'}</h3>
                    <button className="sim-close-btn" onClick={onClose}>✕</button>
                </div>

                {/* Success state */}
                {success ? (
                    <div className="sim-success">
                        <div className="sim-success-icon">✅</div>
                        <h4>{rescheduleRoomCode ? 'Interview Rescheduled!' : 'Interview Scheduled!'}</h4>
                        <p className="sim-success-code">
                            Room code: <strong>{success.roomCode}</strong>
                        </p>
                        <p className="sim-success-note">
                            An invitation has been sent to the candidate
                        </p>
                        <div className="sim-success-actions">
                            <button
                                className="sim-copy-btn"
                                onClick={() => {
                                    navigator.clipboard.writeText(`${window.location.origin}/interview-room/${success.roomCode}`);
                                }}
                            >📋 Copy Link</button>
                            <button className="sim-done-btn" onClick={onClose}>Done</button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        {/* Candidate info */}
                        <div className="sim-candidate-card">
                            <div className="sim-candidate-avatar">
                                {(applicant?.name || applicant?.applicantName || 'C')[0].toUpperCase()}
                            </div>
                            <div>
                                <div className="sim-candidate-name">
                                    {applicant?.name || applicant?.applicantName || 'Candidate'}
                                </div>
                                <div className="sim-candidate-role">
                                    {jobTitle || 'Position'}
                                </div>
                            </div>
                        </div>

                        {/* Date & Time */}
                        <div className="sim-grid-2">
                            <div>
                                <label className="sim-label">Date</label>
                                <input
                                    type="date"
                                    min={today}
                                    value={formData.date}
                                    onChange={(e) => handleChange('date', e.target.value)}
                                    required
                                    className="sim-input"
                                />
                            </div>
                            <div>
                                <label className="sim-label">Time</label>
                                <input
                                    type="time"
                                    value={formData.time}
                                    onChange={(e) => handleChange('time', e.target.value)}
                                    required
                                    className="sim-input"
                                />
                            </div>
                        </div>

                        {/* Duration */}
                        <div style={{ marginBottom: '12px' }}>
                            <label className="sim-label">Duration</label>
                            <div className="sim-option-group">
                                {[30, 45, 60, 90].map(d => (
                                    <button
                                        key={d}
                                        type="button"
                                        onClick={() => handleChange('duration', d)}
                                        className={`sim-option-btn ${formData.duration === d ? 'selected' : ''}`}
                                    >{d} min</button>
                                ))}
                            </div>
                        </div>

                        {/* Interview Type */}
                        <div style={{ marginBottom: '12px' }}>
                            <label className="sim-label">Interview Type</label>
                            <div className="sim-option-group">
                                {[
                                    { value: 'one_on_one', label: '1:1 Interview', icon: '👤' },
                                    { value: 'panel', label: 'Panel Interview', icon: '👥' }
                                ].map(t => (
                                    <button
                                        key={t.value}
                                        type="button"
                                        onClick={() => handleChange('interviewType', t.value)}
                                        className={`sim-option-btn ${formData.interviewType === t.value ? 'selected' : ''}`}
                                    >{t.icon} {t.label}</button>
                                ))}
                            </div>
                        </div>

                        {/* AI Co-Interviewer */}
                        <div className="sim-ai-section">
                            <div className="sim-ai-header">
                                <span className="sim-ai-title">🤖 AI Co-Interviewer</span>
                                <label className="sim-ai-toggle-label">
                                    <input
                                        type="checkbox"
                                        checked={formData.aiEnabled}
                                        onChange={(e) => handleChange('aiEnabled', e.target.checked)}
                                        style={{ accentColor: '#6366f1' }}
                                    />
                                    <span className={`sim-ai-status ${formData.aiEnabled ? 'enabled' : 'disabled'}`}>
                                        {formData.aiEnabled ? 'Enabled' : 'Disabled'}
                                    </span>
                                </label>
                            </div>

                            {formData.aiEnabled && (
                                <div className="sim-ai-options">
                                    {[
                                        { key: 'aiSuggestFollowUps', label: 'Suggest follow-up questions' },
                                        { key: 'aiDetectContradictions', label: 'Detect response contradictions' },
                                        { key: 'aiProbeVague', label: 'Flag vague answers' }
                                    ].map(opt => (
                                        <label key={opt.key} className="sim-ai-option-label">
                                            <input
                                                type="checkbox"
                                                checked={formData[opt.key]}
                                                onChange={(e) => handleChange(opt.key, e.target.checked)}
                                                style={{ accentColor: '#6366f1' }}
                                            />
                                            {opt.label}
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Interviewer Notes */}
                        <div style={{ marginBottom: '16px' }}>
                            <label className="sim-label">Notes for Interview</label>
                            <textarea
                                value={formData.interviewerNotes}
                                onChange={(e) => handleChange('interviewerNotes', e.target.value)}
                                placeholder="Key areas to probe, specific questions..."
                                className="sim-input sim-textarea"
                            />
                        </div>

                        {error && <div className="sim-error">{error}</div>}

                        {/* Actions */}
                        <div className="sim-actions">
                            <button type="button" onClick={onClose} className="sim-cancel-btn">
                                Cancel
                            </button>
                            <button type="submit" disabled={loading} className="sim-submit-btn">
                                {loading ? '⏳ Scheduling...' : '📹 Schedule Interview'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ScheduleInterviewModal;
