import React from 'react';
import './ConfirmDialog.css';

const ConfirmDialog = ({
    isOpen,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'info', // 'danger' | 'warning' | 'info'
    onConfirm,
    onCancel
}) => {
    if (!isOpen) return null;

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onCancel();
        }
    };

    return (
        <div className="confirm-dialog-overlay" onClick={handleOverlayClick}>
            <div className="confirm-dialog">
                <div className="confirm-dialog-header">
                    <h3 className="confirm-dialog-title">{title}</h3>
                </div>
                <div className="confirm-dialog-body">
                    <p className="confirm-dialog-message">{message}</p>
                </div>
                <div className="confirm-dialog-actions">
                    <button
                        className="confirm-dialog-btn confirm-dialog-btn-cancel"
                        onClick={onCancel}
                    >
                        {cancelText}
                    </button>
                    <button
                        className={`confirm-dialog-btn confirm-dialog-btn-confirm confirm-dialog-btn-${variant}`}
                        onClick={onConfirm}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDialog;
