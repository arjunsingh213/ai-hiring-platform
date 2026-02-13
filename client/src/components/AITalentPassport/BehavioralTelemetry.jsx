import React from 'react';
import DomainRadar from './DomainRadar';
import './BehavioralTelemetry.css';

const BehavioralTelemetry = ({ profile, theme = 'dark' }) => {
    if (!profile) return null;

    const radarData = [
        { subject: 'Leadership', value: profile.leadership || 0 },
        { subject: 'Teamwork', value: profile.teamwork || 0 },
        { subject: 'Confidence', value: profile.confidence || 0 },
        { subject: 'Adaptability', value: 75 }, // Example static for viz if data missing
        { subject: 'Communication', value: 82 }
    ];

    return (
        <div className="atp-telemetry-container">
            <div className="atp-telemetry-grid">
                <div className="atp-telemetry-left">
                    <div className="telemetry-header">
                        <h4 className="telemetry-title">Cognitive Telemetry</h4>
                        <span className="telemetry-subtitle">Validated through live behavioral analysis</span>
                    </div>
                    <div className="telemetry-list">
                        <div className="telemetry-item">
                            <span className="telemetry-label">Problem Decomposition</span>
                            <span className="telemetry-value">81</span>
                        </div>
                        <div className="telemetry-item">
                            <span className="telemetry-label">Learning Velocity</span>
                            <span className="telemetry-value">88</span>
                        </div>
                        <div className="telemetry-item">
                            <span className="telemetry-label">Stress Response</span>
                            <span className={`telemetry-trait ${profile.stressResponse?.toLowerCase()}`}>
                                {profile.stressResponse || 'Average'}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="atp-telemetry-right">
                    <DomainRadar data={radarData} theme={theme} />
                </div>
            </div>

            <div className="atp-proof-strip">
                <div className="proof-item verified">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M5 13l4 4L19 7" strokeLinecap="round" />
                    </svg>
                    <span>Identity Verified</span>
                </div>
                <div className="proof-item verified">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M5 13l4 4L19 7" strokeLinecap="round" />
                    </svg>
                    <span>Proctoring Clean</span>
                </div>
            </div>
        </div>
    );
};

export default BehavioralTelemetry;
