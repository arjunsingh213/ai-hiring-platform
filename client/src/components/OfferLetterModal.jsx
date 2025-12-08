import React, { useState } from 'react';
import { useToast } from './Toast';
import './OfferLetterModal.css';

const OfferLetterModal = ({ isOpen, onClose, applicant, job, onOfferSent }) => {
    const toast = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        position: job?.title || '',
        salaryAmount: '',
        salaryCurrency: 'USD',
        salaryPeriod: 'annual',
        startDate: '',
        location: job?.company?.location || 'Remote',
        employmentType: job?.jobDetails?.type || 'full-time',
        department: '',
        reportingManager: '',
        benefits: [],
        customTerms: '',
        offerExpiryDays: 7
    });

    const benefitOptions = [
        'Health Insurance',
        '401(k) Matching',
        'Dental Insurance',
        'Vision Insurance',
        'Life Insurance',
        'Paid Time Off',
        'Sick Leave',
        'Parental Leave',
        'Remote Work',
        'Flexible Hours',
        'Professional Development',
        'Gym Membership',
        'Stock Options',
        'Performance Bonus'
    ];

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleBenefitToggle = (benefit) => {
        setFormData(prev => ({
            ...prev,
            benefits: prev.benefits.includes(benefit)
                ? prev.benefits.filter(b => b !== benefit)
                : [...prev.benefits, benefit]
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!formData.salaryAmount || !formData.startDate) {
            toast.error('Please fill in all required fields');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('/api/hiring/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jobId: job?._id || job, // Handle if job is object or ID string
                    applicantId: applicant.userId?._id || applicant.userId || applicant._id,
                    recruiterId: localStorage.getItem('userId'),
                    position: formData.position,
                    salary: {
                        amount: parseFloat(formData.salaryAmount),
                        currency: formData.salaryCurrency,
                        period: formData.salaryPeriod
                    },
                    startDate: formData.startDate,
                    location: formData.location,
                    employmentType: formData.employmentType,
                    department: formData.department,
                    reportingManager: formData.reportingManager,
                    benefits: formData.benefits,
                    customTerms: formData.customTerms,
                    offerExpiryDays: parseInt(formData.offerExpiryDays)
                })
            });

            const data = await response.json();

            if (data.success) {
                toast.success('Offer sent successfully!');
                onOfferSent && onOfferSent(data.data);
                onClose();
            } else {
                toast.error(data.error || 'Failed to send offer');
            }
        } catch (error) {
            console.error('Error sending offer:', error);
            toast.error('Failed to send offer. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="offer-modal card-glass" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div>
                        <h2>Send Job Offer</h2>
                        <p className="modal-subtitle">
                            To: {applicant.userId?.profile?.name || applicant.name}
                        </p>
                    </div>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <form onSubmit={handleSubmit} className="offer-form">
                    <div className="form-grid">
                        {/* Position */}
                        <div className="form-group full-width">
                            <label className="form-label">Position Title *</label>
                            <input
                                type="text"
                                name="position"
                                value={formData.position}
                                onChange={handleChange}
                                className="input"
                                required
                            />
                        </div>

                        {/* Salary */}
                        <div className="form-group">
                            <label className="form-label">Salary Amount *</label>
                            <input
                                type="number"
                                name="salaryAmount"
                                value={formData.salaryAmount}
                                onChange={handleChange}
                                className="input"
                                placeholder="120000"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Currency</label>
                            <select
                                name="salaryCurrency"
                                value={formData.salaryCurrency}
                                onChange={handleChange}
                                className="input"
                            >
                                <option value="USD">USD</option>
                                <option value="EUR">EUR</option>
                                <option value="GBP">GBP</option>
                                <option value="INR">INR</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Period</label>
                            <select
                                name="salaryPeriod"
                                value={formData.salaryPeriod}
                                onChange={handleChange}
                                className="input"
                            >
                                <option value="annual">Annual</option>
                                <option value="monthly">Monthly</option>
                            </select>
                        </div>

                        {/* Start Date */}
                        <div className="form-group">
                            <label className="form-label">Start Date *</label>
                            <input
                                type="date"
                                name="startDate"
                                value={formData.startDate}
                                onChange={handleChange}
                                className="input"
                                min={new Date().toISOString().split('T')[0]}
                                required
                            />
                        </div>

                        {/* Location */}
                        <div className="form-group">
                            <label className="form-label">Location</label>
                            <input
                                type="text"
                                name="location"
                                value={formData.location}
                                onChange={handleChange}
                                className="input"
                                placeholder="Remote / New York, NY"
                            />
                        </div>

                        {/* Employment Type */}
                        <div className="form-group">
                            <label className="form-label">Employment Type</label>
                            <select
                                name="employmentType"
                                value={formData.employmentType}
                                onChange={handleChange}
                                className="input"
                            >
                                <option value="full-time">Full-time</option>
                                <option value="part-time">Part-time</option>
                                <option value="contract">Contract</option>
                                <option value="internship">Internship</option>
                            </select>
                        </div>

                        {/* Department */}
                        <div className="form-group">
                            <label className="form-label">Department</label>
                            <input
                                type="text"
                                name="department"
                                value={formData.department}
                                onChange={handleChange}
                                className="input"
                                placeholder="Engineering"
                            />
                        </div>

                        {/* Reporting Manager */}
                        <div className="form-group">
                            <label className="form-label">Reporting Manager</label>
                            <input
                                type="text"
                                name="reportingManager"
                                value={formData.reportingManager}
                                onChange={handleChange}
                                className="input"
                                placeholder="John Smith"
                            />
                        </div>

                        {/* Offer Expiry */}
                        <div className="form-group">
                            <label className="form-label">Offer Valid For (days)</label>
                            <input
                                type="number"
                                name="offerExpiryDays"
                                value={formData.offerExpiryDays}
                                onChange={handleChange}
                                className="input"
                                min="1"
                                max="30"
                            />
                        </div>

                        {/* Benefits */}
                        <div className="form-group full-width">
                            <label className="form-label">Benefits</label>
                            <div className="benefits-grid">
                                {benefitOptions.map(benefit => (
                                    <label key={benefit} className="checkbox-label">
                                        <input
                                            type="checkbox"
                                            checked={formData.benefits.includes(benefit)}
                                            onChange={() => handleBenefitToggle(benefit)}
                                        />
                                        <span>{benefit}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Custom Terms */}
                        <div className="form-group full-width">
                            <label className="form-label">Additional Terms (Optional)</label>
                            <textarea
                                name="customTerms"
                                value={formData.customTerms}
                                onChange={handleChange}
                                className="input"
                                rows="4"
                                placeholder="Any additional terms or conditions..."
                            />
                        </div>
                    </div>

                    <div className="modal-actions">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Sending...' : 'Send Offer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default OfferLetterModal;
