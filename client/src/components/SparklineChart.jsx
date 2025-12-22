import React from 'react';
import './SparklineChart.css';

/**
 * Mini sparkline chart component for displaying trends
 * @param {Array} data - Array of numbers to visualize
 * @param {string} color - Primary color (default: blue)
 * @param {number} height - Chart height in pixels (default: 30)
 */
const SparklineChart = ({ data = [], color = 'primary', height = 30 }) => {
    if (!data.length) {
        // Generate sample data if none provided
        data = [4, 7, 5, 9, 6, 8, 7, 10, 8, 12];
    }

    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;

    // Calculate bar heights as percentages
    const bars = data.map(value => ({
        height: ((value - min) / range) * 100,
        value
    }));

    // Determine if trend is up or down
    const trend = data[data.length - 1] > data[0] ? 'up' : data[data.length - 1] < data[0] ? 'down' : 'neutral';

    const colorClass = {
        primary: 'sparkline-primary',
        success: 'sparkline-success',
        warning: 'sparkline-warning',
        purple: 'sparkline-purple',
        danger: 'sparkline-danger'
    }[color] || 'sparkline-primary';

    return (
        <div className={`sparkline-chart ${colorClass}`} style={{ height: `${height}px` }}>
            <div className="sparkline-bars">
                {bars.map((bar, index) => (
                    <div
                        key={index}
                        className={`sparkline-bar ${index === bars.length - 1 ? 'current' : ''}`}
                        style={{ height: `${Math.max(bar.height, 10)}%` }}
                    />
                ))}
            </div>
            <div className={`sparkline-trend ${trend}`}>
                {trend === 'up' && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M7 17L17 7M17 7H7M17 7V17" />
                    </svg>
                )}
                {trend === 'down' && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M7 7L17 17M17 17H7M17 17V7" />
                    </svg>
                )}
            </div>
        </div>
    );
};

export default SparklineChart;
