import React from 'react';
import './StatusBadge.css';

const StatusBadge = ({ status, text = null, size = 'md' }) => {
    const statusConfig = {
        // Document statuses
        pending: { color: 'warning', icon: '⏳', text: 'Pending' },
        uploaded: { color: 'info', icon: '📤', text: 'Uploaded' },
        verified: { color: 'success', icon: '✓', text: 'Verified' },
        rejected: { color: 'danger', icon: '✗', text: 'Rejected' },

        // Hiring stages
        offer_extended: { color: 'info', icon: '📧', text: 'Offer Extended' },
        offer_accepted: { color: 'success', icon: '✓', text: 'Offer Accepted' },
        offer_declined: { color: 'danger', icon: '✗', text: 'Offer Declined' },
        documents_pending: { color: 'warning', icon: '📄', text: 'Documents Pending' },
        documents_complete: { color: 'success', icon: '✓', text: 'Documents Complete' },
        onboarding_complete: { color: 'success', icon: '🎉', text: 'Onboarding Complete' },

        // General statuses
        active: { color: 'success', icon: '●', text: 'Active' },
        completed: { color: 'primary', icon: '✓', text: 'Completed' },
        cancelled: { color: 'secondary', icon: '○', text: 'Cancelled' },
        expired: { color: 'danger', icon: '⏰', text: 'Expired' }
    };

    const config = statusConfig[status] || { color: 'secondary', icon: '○', text: status };
    const displayText = text || config.text;

    const sizeClasses = {
        sm: 'badge-sm',
        md: 'badge-md',
        lg: 'badge-lg'
    };

    return (
        <span className={`status-badge badge-${config.color} ${sizeClasses[size]}`}>
            <span className="badge-icon">{config.icon}</span>
            <span className="badge-text">{displayText}</span>
        </span>
    );
};

export default StatusBadge;
