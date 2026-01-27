/**
 * Froscel Mobile - Button Component
 * Reusable button with multiple variants
 */

import React from 'react';
import {
    TouchableOpacity,
    Text,
    StyleSheet,
    ActivityIndicator,
    Animated,
    useColorScheme,
} from 'react-native';
import { Colors, Typography, BorderRadius, Spacing } from '../../theme';

const Button = ({
    title,
    onPress,
    variant = 'primary', // primary, secondary, outline, ghost, danger
    size = 'medium', // small, medium, large
    disabled = false,
    loading = false,
    icon,
    style,
    textStyle,
}) => {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme] || Colors.light;

    const scaleValue = React.useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleValue, {
            toValue: 0.96,
            useNativeDriver: true,
            speed: 50,
            bounciness: 4,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleValue, {
            toValue: 1,
            useNativeDriver: true,
            speed: 50,
            bounciness: 4,
        }).start();
    };

    const getButtonStyle = () => {
        const base = {
            ...styles.base,
            ...styles[size],
        };

        switch (variant) {
            case 'primary':
                return {
                    ...base,
                    backgroundColor: disabled ? colors.textTertiary : colors.primary,
                };
            case 'secondary':
                return {
                    ...base,
                    backgroundColor: disabled ? colors.backgroundTertiary : colors.backgroundSecondary,
                };
            case 'outline':
                return {
                    ...base,
                    backgroundColor: 'transparent',
                    borderWidth: 1.5,
                    borderColor: disabled ? colors.textTertiary : colors.primary,
                };
            case 'ghost':
                return {
                    ...base,
                    backgroundColor: 'transparent',
                };
            case 'danger':
                return {
                    ...base,
                    backgroundColor: disabled ? colors.textTertiary : colors.danger,
                };
            default:
                return base;
        }
    };

    const getTextStyle = () => {
        const base = {
            ...Typography.button,
            textAlign: 'center',
        };

        switch (variant) {
            case 'primary':
            case 'danger':
                return { ...base, color: '#FFFFFF' };
            case 'secondary':
                return { ...base, color: colors.text };
            case 'outline':
            case 'ghost':
                return { ...base, color: disabled ? colors.textTertiary : colors.primary };
            default:
                return base;
        }
    };

    return (
        <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
            <TouchableOpacity
                style={[getButtonStyle(), style]}
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={disabled || loading}
                activeOpacity={0.8}
            >
                {loading ? (
                    <ActivityIndicator
                        color={variant === 'primary' || variant === 'danger' ? '#FFFFFF' : colors.primary}
                        size="small"
                    />
                ) : (
                    <>
                        {icon && <>{icon}</>}
                        <Text style={[getTextStyle(), icon && { marginLeft: Spacing.sm }, textStyle]}>
                            {title}
                        </Text>
                    </>
                )}
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    base: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: BorderRadius.lg,
    },
    small: {
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        minHeight: 36,
    },
    medium: {
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.xl,
        minHeight: 48,
    },
    large: {
        paddingVertical: Spacing.lg,
        paddingHorizontal: Spacing.xxl,
        minHeight: 56,
    },
});

export default Button;
