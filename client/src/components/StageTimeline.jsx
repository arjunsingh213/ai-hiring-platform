import React from 'react';
import './StageTimeline.css';

const StageTimeline = ({ currentStage }) => {
    const stages = [
        { key: 'offer_extended', label: 'Offer Extended', icon: '📧' },
        { key: 'offer_accepted', label: 'Offer Accepted', icon: '✓' },
        { key: 'documents_pending', label: 'Documents', icon: '📄' },
        { key: 'documents_complete', label: 'Verified', icon: '✓' },
        { key: 'onboarding_complete', label: 'Complete', icon: '🎉' }
    ];

    const getCurrentStageIndex = () => {
        return stages.findIndex(s => s.key === currentStage);
    };

    const currentIndex = getCurrentStageIndex();

    return (
        <div className="stage-timeline">
            {stages.map((stage, index) => {
                const isCompleted = index < currentIndex;
                const isCurrent = index === currentIndex;
                const isUpcoming = index > currentIndex;

                return (
                    <div key={stage.key} className="timeline-item">
                        <div className={`timeline-node ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''} ${isUpcoming ? 'upcoming' : ''}`}>
                            <span className="timeline-icon">{isCompleted ? '✓' : stage.icon}</span>
                        </div>
                        <div className="timeline-label">
                            {stage.label}
                        </div>
                        {index < stages.length - 1 && (
                            <div className={`timeline-connector ${isCompleted ? 'completed' : ''}`}></div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default StageTimeline;
