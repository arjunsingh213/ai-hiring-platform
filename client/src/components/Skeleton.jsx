import React from 'react';
import './Skeleton.css';

// Skeleton variants for different content types
const Skeleton = ({ variant = 'text', width, height, count = 1, className = '' }) => {
    const elements = [];

    for (let i = 0; i < count; i++) {
        let style = {};
        if (width) style.width = width;
        if (height) style.height = height;

        elements.push(
            <div
                key={i}
                className={`skeleton skeleton-${variant} ${className}`}
                style={style}
            />
        );
    }

    return <>{elements}</>;
};

// Card skeleton for activity feed, job cards, etc.
export const CardSkeleton = () => (
    <div className="skeleton-card">
        <div className="skeleton-card-header">
            <Skeleton variant="avatar" />
            <div className="skeleton-card-meta">
                <Skeleton variant="text" width="60%" />
                <Skeleton variant="text" width="40%" height="12px" />
            </div>
        </div>
        <div className="skeleton-card-body">
            <Skeleton variant="text" count={3} />
        </div>
        <div className="skeleton-card-footer">
            <Skeleton variant="button" width="80px" />
            <Skeleton variant="button" width="80px" />
        </div>
    </div>
);

// Profile skeleton for user profiles
export const ProfileSkeleton = () => (
    <div className="skeleton-profile">
        <Skeleton variant="avatar" width="80px" height="80px" />
        <Skeleton variant="title" width="200px" />
        <Skeleton variant="text" width="150px" />
        <Skeleton variant="text" count={2} />
    </div>
);

// Table row skeleton
export const TableRowSkeleton = ({ columns = 4 }) => (
    <div className="skeleton-table-row">
        {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} variant="text" width={`${100 / columns - 5}%`} />
        ))}
    </div>
);

// List skeleton
export const ListSkeleton = ({ items = 5 }) => (
    <div className="skeleton-list">
        {Array.from({ length: items }).map((_, i) => (
            <div key={i} className="skeleton-list-item">
                <Skeleton variant="avatar" width="40px" height="40px" />
                <div className="skeleton-list-content">
                    <Skeleton variant="text" width="70%" />
                    <Skeleton variant="text" width="50%" height="12px" />
                </div>
            </div>
        ))}
    </div>
);

// Page skeleton
export const PageSkeleton = () => (
    <div className="skeleton-page">
        <Skeleton variant="title" width="300px" />
        <div className="skeleton-page-content">
            <div className="skeleton-page-main">
                <CardSkeleton />
                <CardSkeleton />
            </div>
            <div className="skeleton-page-sidebar">
                <Skeleton variant="rect" height="200px" />
                <Skeleton variant="rect" height="150px" />
            </div>
        </div>
    </div>
);

export default Skeleton;
