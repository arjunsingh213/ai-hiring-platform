import React from 'react';
import './ProgressBar.css';

const ProgressBar = ({
    progress = 0,
    color = 'primary',
    showPercentage = true,
    height = 'md',
    label = null
}) => {
    const clampedProgress = Math.min(100, Math.max(0, progress));

    const heightClasses = {
        sm: 'progress-bar-sm',
        md: 'progress-bar-md',
        lg: 'progress-bar-lg'
    };

    return (
        <div className="progress-bar-container">
            {label && <div className="progress-label">{label}</div>}
            <div className={`progress-bar ${heightClasses[height]}`}>
                <div
                    className={`progress-fill progress-${color}`}
                    style={{ width: `${clampedProgress}%` }}
                >
                    {showPercentage && height !== 'sm' && (
                        <span className="progress-percentage">{Math.round(clampedProgress)}%</span>
                    )}
                </div>
            </div>
            {showPercentage && height === 'sm' && (
                <span className="progress-percentage-external">{Math.round(clampedProgress)}%</span>
            )}
        </div>
    );
};

export default ProgressBar;
