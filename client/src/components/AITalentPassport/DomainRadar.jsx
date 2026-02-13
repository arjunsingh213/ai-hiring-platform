import React from 'react';
import {
    Radar, RadarChart, PolarGrid,
    PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
    Tooltip
} from 'recharts';

const DomainRadar = ({ data, theme = 'dark' }) => {
    // Enterprise-grade color mapping based on theme tokens
    const colors = {
        dark: {
            radar: 'rgba(0, 125, 255, 0.6)',
            stroke: '#007DFF',
            grid: 'rgba(255, 255, 255, 0.1)',
            text: '#94a3b8'
        },
        light: {
            radar: 'rgba(0, 125, 255, 0.4)',
            stroke: '#007DFF',
            grid: 'rgba(0, 0, 0, 0.1)',
            text: '#64748b'
        }
    };

    const currentColors = colors[theme] || colors.dark;

    // Transform data if necessary, or assume it comes in Recharts format
    // [{ subject: 'Math', A: 120, fullMark: 150 }]

    return (
        <div className="atp-chart-container domain-radar" style={{ height: 350, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                    <PolarGrid stroke={currentColors.grid} />
                    <PolarAngleAxis
                        dataKey="subject"
                        tick={{ fill: currentColors.text, fontSize: 12, fontWeight: 600 }}
                    />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'var(--atp-surface)',
                            borderColor: 'var(--atp-border)',
                            borderRadius: 'var(--radius-md)',
                            color: 'var(--atp-text-main)'
                        }}
                    />
                    <Radar
                        name="Skill Depth"
                        dataKey="value"
                        stroke={currentColors.stroke}
                        fill={currentColors.radar}
                        fillOpacity={0.6}
                    />
                </RadarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default DomainRadar;
