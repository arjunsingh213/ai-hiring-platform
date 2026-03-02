import React from 'react';
import './TalkingAvatar.css';

const TalkingAvatar = ({ state = 'idle', size = 'default' }) => {

    // SVG Based Avatar for cinematic feel without heavy 3D models
    const renderAvatarStates = () => {
        switch (state) {
            case 'speaking':
                return (
                    <div className="avatar-speaking">
                        <div className="wave wave1"></div>
                        <div className="wave wave2"></div>
                        <div className="wave wave3"></div>
                        <div className="avatar-core speaking-animation"></div>
                    </div>
                );
            case 'thinking':
                return (
                    <div className="avatar-thinking">
                        <div className="orbit orbit1"></div>
                        <div className="orbit orbit2"></div>
                        <div className="avatar-core thinking-animation"></div>
                    </div>
                );
            case 'listening':
                return (
                    <div className="avatar-listening">
                        <div className="pulse-ring"></div>
                        <div className="avatar-core listening-animation"></div>
                    </div>
                );
            case 'idle':
            default:
                return (
                    <div className="avatar-idle">
                        <div className="avatar-core idle-animation"></div>
                    </div>
                );
        }
    };

    return (
        <div className={`ai-talking-avatar-container size-${size}`}>
            {renderAvatarStates()}
            <div className="avatar-status-badge">
                <span className={`status-dot ${state}`}></span>
                {state.charAt(0).toUpperCase() + state.slice(1)}
            </div>
        </div>
    );
};

export default TalkingAvatar;
