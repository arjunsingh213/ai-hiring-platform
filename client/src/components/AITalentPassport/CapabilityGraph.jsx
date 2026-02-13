import React from 'react';
import {
    ScatterChart, Scatter, XAxis, YAxis,
    ZAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const CapabilityGraph = ({ data, theme = 'dark' }) => {
    const colors = {
        dark: {
            axis: '#94a3b8',
            grid: 'rgba(255, 255, 255, 0.05)',
            point: '#007DFF'
        },
        light: {
            axis: '#64748b',
            grid: 'rgba(0, 0, 0, 0.05)',
            point: '#007DFF'
        }
    };

    const currentColors = colors[theme] || colors.dark;

    return (
        <div className="atp-chart-container capability-graph" style={{ height: 400, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
                <ScatterChart
                    margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke={currentColors.grid} vertical={false} />
                    <XAxis
                        type="number"
                        dataKey="depth"
                        name="Skill Depth"
                        unit="%"
                        domain={[0, 100]}
                        stroke={currentColors.axis}
                        tick={{ fontSize: 11 }}
                        label={{ value: 'Skill Depth', position: 'bottom', fill: currentColors.axis, fontSize: 12 }}
                    />
                    <YAxis
                        type="number"
                        dataKey="recency"
                        name="Recency"
                        unit="d"
                        stroke={currentColors.axis}
                        tick={{ fontSize: 11 }}
                        label={{ value: 'Recency (Days)', angle: -90, position: 'insideLeft', fill: currentColors.axis, fontSize: 12 }}
                    />
                    <ZAxis type="number" dataKey="confidence" range={[50, 400]} name="Confidence" />
                    <Tooltip
                        cursor={{ strokeDasharray: '3 3' }}
                        contentStyle={{
                            backgroundColor: 'var(--atp-surface)',
                            borderColor: 'var(--atp-border)',
                            borderRadius: 'var(--radius-md)',
                            color: 'var(--atp-text-main)'
                        }}
                    />
                    <Scatter name="Capabilities" data={data} fill={currentColors.point} />
                </ScatterChart>
            </ResponsiveContainer>
        </div>
    );
};

export default CapabilityGraph;
