/**
 * Froscel Mobile - Badge Component
 * Status badges and labels
 */

import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { Colors, Typography, BorderRadius, Spacing } from '../../theme';

const Badge = ({
    label,
    variant = 'default', // default, success, warning, danger, info, primary
    size = 'medium', // small, medium
    style,
}) => {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme] || Colors.light;

    const getColors = () => {
        switch (variant) {
            case 'success':
                return { bg: colors.successLight, text: colors.success };
            case 'warning':
                return { bg: colors.warningLight, text: colors.warning };
            case 'danger':
                return { bg: colors.dangerLight, text: colors.danger };
            case 'info':
                return { bg: colors.infoLight, text: colors.info };
            case 'primary':
                return { bg: `${colors.primary}20`, text: colors.primary };
            default:
                return { bg: colors.backgroundTertiary, text: colors.textSecondary };
        }
    };

    const { bg, text } = getColors();

    return (
        <View
            style={[
                styles.badge,
                { backgroundColor: bg },
                size === 'small' && styles.badgeSmall,
                style,
            ]}
        >
            <Text
                style={[
                    styles.text,
                    { color: text },
                    size === 'small' && styles.textSmall,
                ]}
            >
                {label}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    badge: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.full,
        alignSelf: 'flex-start',
    },
    badgeSmall: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
    },
    text: {
        ...Typography.caption,
        fontWeight: '600',
    },
    textSmall: {
        ...Typography.small,
        fontWeight: '600',
    },
});

export default Badge;
