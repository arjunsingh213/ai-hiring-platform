/**
 * Froscel Mobile - SkeletonLoader Component
 * Loading placeholder animations
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, useColorScheme } from 'react-native';
import { Colors, BorderRadius } from '../../theme';

const SkeletonLoader = ({
    width = '100%',
    height = 20,
    borderRadius = BorderRadius.md,
    style,
}) => {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme] || Colors.light;
    const animatedValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(animatedValue, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(animatedValue, {
                    toValue: 0,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        );

        animation.start();

        return () => animation.stop();
    }, []);

    const opacity = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.7],
    });

    return (
        <Animated.View
            style={[
                styles.skeleton,
                {
                    width,
                    height,
                    borderRadius,
                    backgroundColor: colors.skeleton,
                    opacity,
                },
                style,
            ]}
        />
    );
};

// Pre-built skeleton variants
export const SkeletonText = ({ lines = 3, lastLineWidth = '60%' }) => (
    <View>
        {[...Array(lines)].map((_, index) => (
            <SkeletonLoader
                key={index}
                width={index === lines - 1 ? lastLineWidth : '100%'}
                height={16}
                style={{ marginBottom: index < lines - 1 ? 8 : 0 }}
            />
        ))}
    </View>
);

export const SkeletonAvatar = ({ size = 48 }) => (
    <SkeletonLoader
        width={size}
        height={size}
        borderRadius={size / 2}
    />
);

export const SkeletonCard = () => (
    <View style={styles.cardSkeleton}>
        <View style={styles.cardHeader}>
            <SkeletonAvatar size={40} />
            <View style={styles.cardHeaderText}>
                <SkeletonLoader width="60%" height={14} />
                <SkeletonLoader width="40%" height={12} style={{ marginTop: 6 }} />
            </View>
        </View>
        <SkeletonText lines={2} />
    </View>
);

const styles = StyleSheet.create({
    skeleton: {
        overflow: 'hidden',
    },
    cardSkeleton: {
        padding: 16,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    cardHeaderText: {
        flex: 1,
        marginLeft: 12,
    },
});

export default SkeletonLoader;
