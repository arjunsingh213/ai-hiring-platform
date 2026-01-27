/**
 * Froscel Mobile - Card Component
 * Reusable card container with elevation
 */

import React from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    useColorScheme,
} from 'react-native';
import { Colors, BorderRadius, Spacing, Shadows } from '../../theme';

const Card = ({
    children,
    onPress,
    style,
    elevation = 'md', // sm, md, lg
    padding = true,
    disabled = false,
}) => {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme] || Colors.light;

    const cardStyle = [
        styles.card,
        { backgroundColor: colors.surface },
        Shadows[elevation],
        padding && styles.padding,
        style,
    ];

    if (onPress) {
        return (
            <TouchableOpacity
                style={cardStyle}
                onPress={onPress}
                activeOpacity={0.7}
                disabled={disabled}
            >
                {children}
            </TouchableOpacity>
        );
    }

    return <View style={cardStyle}>{children}</View>;
};

const styles = StyleSheet.create({
    card: {
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
    },
    padding: {
        padding: Spacing.lg,
    },
});

export default Card;
