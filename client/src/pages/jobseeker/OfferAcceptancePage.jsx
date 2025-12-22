import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../components/Toast';
import { CardSkeleton } from '../../components/Skeleton';
import './OfferAcceptancePage.css';

const OfferAcceptancePage = () => {
    const { hiringId } = useParams();
    const navigate = useNavigate();
    const toast = useToast();
    const canvasRef = useRef(null);
    const [hiringProcess, setHiringProcess] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasSignature, setHasSignature] = useState(false);
    const [showDeclineModal, setShowDeclineModal] = useState(false);
    const [declineReason, setDeclineReason] = useState('');

    useEffect(() => {
        fetchHiringProcess();
    }, [hiringId]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
        }
    }, []);

    const fetchHiringProcess = async () => {
        try {
            const response = await api.get(`/hiring/${hiringId}`);
            setHiringProcess(response.data);
        } catch (error) {
            console.error('Error fetching hiring process:', error);
            toast.error('Failed to load offer details');
        } finally {
            setLoading(false);
        }
    };

    const startDrawing = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const ctx = canvas.getContext('2d');

        ctx.beginPath();
        ctx.moveTo(
            e.clientX - rect.left,
            e.clientY - rect.top
        );
        setIsDrawing(true);
    };

    const draw = (e) => {
        if (!isDrawing) return;

        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const ctx = canvas.getContext('2d');

        ctx.lineTo(
            e.clientX - rect.left,
            e.clientY - rect.top
        );
        ctx.stroke();
        setHasSignature(true);
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const clearSignature = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasSignature(false);
    };

    const handleAccept = async () => {
        if (!hasSignature) {
            toast.warning('Please provide your signature');
            return;
        }

        setSubmitting(true);
        try {
            const canvas = canvasRef.current;
            const signatureData = canvas.toDataURL('image/png');

            await api.post(`/hiring/${hiringId}/offer/accept`, {
                signature: signatureData
            });

            toast.success('Offer accepted! Welcome aboard! 🎉');
            navigate(`/jobseeker/onboarding/${hiringId}`);
        } catch (error) {
            console.error('Error accepting offer:', error);
            toast.error(error.error || 'Failed to accept offer');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDecline = async () => {
        if (!declineReason.trim()) {
            toast.warning('Please provide a reason for declining');
            return;
        }

        setSubmitting(true);
        try {
            await api.post(`/hiring/${hiringId}/offer/decline`, {
                reason: declineReason
            });

            toast.info('Offer declined. Thank you for your time.');
            navigate('/jobseeker/jobs');
        } catch (error) {
            console.error('Error declining offer:', error);
            toast.error('Failed to decline offer');
        } finally {
            setSubmitting(false);
            setShowDeclineModal(false);
        }
    };

    const getTimeRemaining = () => {
        if (!hiringProcess?.offer?.expiryDate) return null;

        const now = new Date();
        const expiry = new Date(hiringProcess.offer.expiryDate);
        const diff = expiry - now;

        if (diff <= 0) return 'Expired';

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        if (days > 0) return `${days} day${days > 1 ? 's' : ''} ${hours} hour${hours > 1 ? 's' : ''}`;
        return `${hours} hour${hours > 1 ? 's' : ''}`;
    };

    if (loading) {
        return (
            <div className="offer-acceptance">
                <div className="loading-state skeleton-loading">
                    <CardSkeleton />
                </div>
            </div>
        );
    }

    if (!hiringProcess) {
        return (
            <div className="offer-acceptance empty-state">
                <h2>Offer not found</h2>
                <button className="btn btn-primary" onClick={() => navigate('/jobseeker/jobs')}>
                    Browse Jobs
                </button>
            </div>
        );
    }

    const { offer } = hiringProcess;
    const timeRemaining = getTimeRemaining();
    const isExpired = timeRemaining === 'Expired';

    return (
        <div className="offer-acceptance">
            <div className="offer-container card-glass">
                <div className="offer-header">
                    <div className="congrats-icon">🎉</div>
                    <h1>Congratulations!</h1>
                    <p className="offer-subtitle">You have received a job offer</p>
                </div>

                <div className="offer-details">
                    <div className="detail-row">
                        <span className="detail-label">Position</span>
                        <span className="detail-value">{offer.position}</span>
                    </div>
                    <div className="detail-row">
                        <span className="detail-label">Salary</span>
                        <span className="detail-value">
                            {offer.salary.currency} {offer.salary.amount.toLocaleString()} per {offer.salary.period}
                        </span>
                    </div>
                    <div className="detail-row">
                        <span className="detail-label">Start Date</span>
                        <span className="detail-value">
                            {new Date(offer.startDate).toLocaleDateString('en-US', {
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric'
                            })}
                        </span>
                    </div>
                    <div className="detail-row">
                        <span className="detail-label">Location</span>
                        <span className="detail-value">{offer.location}</span>
                    </div>
                    <div className="detail-row">
                        <span className="detail-label">Employment Type</span>
                        <span className="detail-value">{offer.employmentType}</span>
                    </div>
                    {offer.department && (
                        <div className="detail-row">
                            <span className="detail-label">Department</span>
                            <span className="detail-value">{offer.department}</span>
                        </div>
                    )}
                </div>

                {offer.benefits && offer.benefits.length > 0 && (
                    <div className="benefits-section">
                        <h3>Benefits</h3>
                        <div className="benefits-grid">
                            {offer.benefits.map((benefit, index) => (
                                <div key={index} className="benefit-item">
                                    <span className="benefit-icon">✓</span>
                                    <span>{benefit}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {offer.customTerms && (
                    <div className="custom-terms">
                        <h3>Additional Terms</h3>
                        <p>{offer.customTerms}</p>
                    </div>
                )}

                <div className={`expiry-notice ${isExpired ? 'expired' : ''}`}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                        <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="2" />
                    </svg>
                    <span>
                        {isExpired ? 'This offer has expired' : `Offer expires in: ${timeRemaining}`}
                    </span>
                </div>

                {!isExpired && (
                    <>
                        <div className="signature-section">
                            <h3>Sign to Accept</h3>
                            <p className="signature-instruction">Draw your signature below</p>
                            <div className="signature-canvas-container">
                                <canvas
                                    ref={canvasRef}
                                    width={600}
                                    height={200}
                                    onMouseDown={startDrawing}
                                    onMouseMove={draw}
                                    onMouseUp={stopDrawing}
                                    onMouseLeave={stopDrawing}
                                    className="signature-canvas"
                                />
                            </div>
                            <button
                                className="btn btn-secondary btn-sm"
                                onClick={clearSignature}
                            >
                                Clear Signature
                            </button>
                        </div>

                        <div className="offer-actions">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowDeclineModal(true)}
                                disabled={submitting}
                            >
                                Decline Offer
                            </button>
                            <button
                                className="btn btn-primary btn-lg"
                                onClick={handleAccept}
                                disabled={submitting || !hasSignature}
                            >
                                {submitting ? 'Processing...' : 'Accept Offer'}
                            </button>
                        </div>
                    </>
                )}

                {isExpired && (
                    <div className="expired-actions">
                        <p>Please contact the recruiter if you're still interested in this position.</p>
                        <button
                            className="btn btn-primary"
                            onClick={() => navigate('/jobseeker/jobs')}
                        >
                            Browse Other Jobs
                        </button>
                    </div>
                )}
            </div>

            {/* Decline Modal */}
            {showDeclineModal && (
                <div className="modal-overlay" onClick={() => setShowDeclineModal(false)}>
                    <div className="decline-modal card-glass" onClick={(e) => e.stopPropagation()}>
                        <h2>Decline Offer</h2>
                        <p>We're sorry to see you go. Please let us know why you're declining:</p>
                        <textarea
                            value={declineReason}
                            onChange={(e) => setDeclineReason(e.target.value)}
                            className="input"
                            rows="4"
                            placeholder="Your reason for declining..."
                        />
                        <div className="modal-actions">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowDeclineModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-danger"
                                onClick={handleDecline}
                                disabled={submitting}
                            >
                                {submitting ? 'Declining...' : 'Confirm Decline'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OfferAcceptancePage;
