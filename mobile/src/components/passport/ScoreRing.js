/**
 * Froscel Mobile - ScoreRing Component
 * Animated circular score display
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, useColorScheme } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Colors, Typography } from '../../theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const ScoreRing = ({
    score = 0,
    size = 120,
    strokeWidth = 10,
    label = 'Score',
    showPercentage = true,
    animated = true,
}) => {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme] || Colors.light;

    const animatedValue = useRef(new Animated.Value(0)).current;

    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const center = size / 2;

    useEffect(() => {
        if (animated) {
            Animated.timing(animatedValue, {
                toValue: score,
                duration: 900,
                useNativeDriver: false,
            }).start();
        } else {
            animatedValue.setValue(score);
        }
    }, [score, animated]);

    const strokeDashoffset = animatedValue.interpolate({
        inputRange: [0, 100],
        outputRange: [circumference, 0],
    });

    const getScoreColor = () => {
        if (score >= 80) return colors.success;
        if (score >= 60) return colors.primary;
        if (score >= 40) return colors.warning;
        return colors.danger;
    };

    const displayScore = animatedValue.interpolate({
        inputRange: [0, 100],
        outputRange: [0, 100],
    });

    return (
        <View style={[styles.container, { width: size, height: size }]}>
            <Svg width={size} height={size}>
                {/* Background circle */}
                <Circle
                    cx={center}
                    cy={center}
                    r={radius}
                    stroke={colors.backgroundTertiary}
                    strokeWidth={strokeWidth}
                    fill="none"
                />
                {/* Animated progress circle */}
                <AnimatedCircle
                    cx={center}
                    cy={center}
                    r={radius}
                    stroke={getScoreColor()}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${center} ${center})`}
                />
            </Svg>

            <View style={styles.textContainer}>
                <Animated.Text
                    style={[
                        styles.scoreText,
                        { color: colors.text, fontSize: size * 0.25 },
                    ]}
                >
                    {Math.round(score)}
                </Animated.Text>
                {showPercentage && (
                    <Text style={[styles.percentSymbol, { color: colors.textSecondary }]}>
                        %
                    </Text>
                )}
                {label && (
                    <Text style={[styles.label, { color: colors.textSecondary }]}>
                        {label}
                    </Text>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    textContainer: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
    },
    scoreText: {
        fontWeight: '800',
    },
    percentSymbol: {
        ...Typography.small,
        marginTop: -4,
    },
    label: {
        ...Typography.caption,
        marginTop: 2,
    },
});

export default ScoreRing;
