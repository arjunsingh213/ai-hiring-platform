import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminProjectReview.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const AdminProjectReview = () => {
    const navigate = useNavigate();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedProject, setSelectedProject] = useState(null);
    const [showModal, setShowModal] = useState(null); // 'approve' or 'reject'
    const [formData, setFormData] = useState({
        adminNotes: '',
        complexity: 'medium',
        isOriginal: true
    });
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchPendingProjects();
    }, []);

    const fetchPendingProjects = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch(`${API_URL}/projects/pending`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 401) {
                navigate('/admin/login');
                return;
            }

            const data = await response.json();
            if (data.success) {
                setProjects(data.data);
            }
        } catch (error) {
            console.error('Error fetching projects:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async () => {
        if (!selectedProject || !showModal) return;

        setProcessing(true);
        try {
            const token = localStorage.getItem('adminToken');
            const adminInfo = JSON.parse(localStorage.getItem('adminInfo') || '{}');

            const payload = {
                action: showModal === 'approve' ? 'approved' : 'rejected',
                adminId: adminInfo.id,
                adminNotes: formData.adminNotes,
                complexity: formData.complexity,
                isOriginal: formData.isOriginal
            };

            const response = await fetch(`${API_URL}/projects/${selectedProject._id}/review`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (data.success) {
                // Remove from list
                setProjects(prev => prev.filter(p => p._id !== selectedProject._id));
                setShowModal(null);
                setSelectedProject(null);
                setFormData({ adminNotes: '', complexity: 'medium', isOriginal: true });
            } else {
                alert(data.error || 'Review failed');
            }
        } catch (error) {
            console.error('Review error:', error);
            alert('Failed to submit review');
        } finally {
            setProcessing(false);
        }
    };

    const openReviewModal = (project, action) => {
        setSelectedProject(project);
        setShowModal(action);
        // Pre-fill with AI analysis if available
        setFormData({
            adminNotes: '',
            complexity: project.githubAnalysis?.complexityEstimate || 'medium',
            isOriginal: project.githubAnalysis?.originalityScore > 50
        });
    };

    if (loading) {
        return (
            <div className="admin-loading">
                <div className="admin-loading-spinner"></div>
            </div>
        );
    }

    return (
        <div className="admin-project-review">
            <div className="admin-page-header">
                <div>
                    <h1>Project Review</h1>
                    <p>Validate ATP project submissions</p>
                </div>
                <button className="admin-refresh-btn" onClick={fetchPendingProjects}>
                    Refresh
                </button>
            </div>

            {projects.length === 0 ? (
                <div className="admin-empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3>No Pending Projects</h3>
                    <p>All submitted projects have been reviewed.</p>
                </div>
            ) : (
                <div className="projects-grid">
                    {projects.map(project => (
                        <div key={project._id} className="project-card">
                            <div className="project-header">
                                <div className="project-user">
                                    <div className="project-avatar">
                                        {project.userId?.profile?.name?.charAt(0) || 'U'}
                                    </div>
                                    <div>
                                        <h4>{project.userId?.profile?.name || 'Unknown User'}</h4>
                                        <span className="project-email">{project.userId?.email}</span>
                                    </div>
                                </div>
                                <span className="project-date">
                                    {new Date(project.createdAt).toLocaleDateString()}
                                </span>
                            </div>

                            <div className="project-body">
                                <h3>{project.title}</h3>
                                <div className="project-domain-badge">{project.domain}</div>
                                <p className="project-desc">{project.description}</p>

                                <a href={project.githubUrl} target="_blank" rel="noopener noreferrer" className="github-link">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.29 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.527.105-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405 1.02 0 2.04.135 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.285 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                                    </svg>
                                    View Code
                                </a>

                                {project.githubAnalysis && (
                                    <div className="analysis-summary">
                                        <h5>AI Analysis</h5>
                                        <div className="analysis-stats">
                                            <div className="stat">
                                                <label>Complexity</label>
                                                <span>{project.githubAnalysis.complexityEstimate}</span>
                                            </div>
                                            <div className="stat">
                                                <label>Originality</label>
                                                <span>{project.githubAnalysis.originalityScore}%</span>
                                            </div>
                                        </div>
                                        <div className="stat-tech">
                                            <label>Tech Stack: </label>
                                            <span>{project.githubAnalysis.techStackDetected?.slice(0, 3).join(', ')}</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="project-actions">
                                <button className="btn-reject" onClick={() => openReviewModal(project, 'reject')}>
                                    Reject
                                </button>
                                <button className="btn-approve" onClick={() => openReviewModal(project, 'approve')}>
                                    Approve
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Review Modal */}
            {selectedProject && showModal && (
                <div className="admin-modal-overlay" onClick={() => setShowModal(null)}>
                    <div className="admin-modal" onClick={e => e.stopPropagation()}>
                        <div className="admin-modal-header">
                            <h2>{showModal === 'approve' ? 'Approve Project' : 'Reject Project'}</h2>
                            <button className="admin-modal-close" onClick={() => setShowModal(null)}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                        <div className="admin-modal-body">
                            <div className="modal-project-summary">
                                <strong>{selectedProject.title}</strong>
                                <br />
                                <small>{selectedProject.githubUrl}</small>
                            </div>

                            {showModal === 'approve' && (
                                <>
                                    <div className="admin-form-group">
                                        <label>Complexity Assessment</label>
                                        <select
                                            value={formData.complexity}
                                            onChange={e => setFormData({ ...formData, complexity: e.target.value })}
                                            className="admin-select"
                                        >
                                            <option value="low">Low</option>
                                            <option value="medium">Medium</option>
                                            <option value="high">High</option>
                                        </select>
                                    </div>
                                    <div className="admin-form-group checkbox-wrapper">
                                        <label className="checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={formData.isOriginal}
                                                onChange={e => setFormData({ ...formData, isOriginal: e.target.checked })}
                                            />
                                            Verified Original Content
                                        </label>
                                    </div>
                                </>
                            )}

                            <div className="admin-form-group">
                                <label>Review Notes {showModal === 'reject' && '*'}</label>
                                <textarea
                                    value={formData.adminNotes}
                                    onChange={e => setFormData({ ...formData, adminNotes: e.target.value })}
                                    placeholder={showModal === 'reject' ? "Reason for rejection..." : "Optional notes..."}
                                    rows={3}
                                    className="admin-textarea"
                                />
                            </div>
                        </div>
                        <div className="admin-modal-footer">
                            <button className="admin-btn-cancel" onClick={() => setShowModal(null)}>Cancel</button>
                            <button
                                className={`admin-btn-confirm ${showModal}`}
                                onClick={handleAction}
                                disabled={processing || (showModal === 'reject' && !formData.adminNotes)}
                            >
                                {processing ? 'Processing...' : 'Confirm Decision'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminProjectReview;
