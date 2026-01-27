/**
 * Froscel Mobile - Input Component
 * Reusable text input with validation states
 */

import React, { useState } from 'react';
import {
    View,
    TextInput,
    Text,
    StyleSheet,
    TouchableOpacity,
    useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, BorderRadius, Spacing } from '../../theme';

const Input = ({
    label,
    value,
    onChangeText,
    placeholder,
    error,
    helperText,
    secureTextEntry = false,
    keyboardType = 'default',
    autoCapitalize = 'none',
    autoComplete,
    maxLength,
    multiline = false,
    numberOfLines = 1,
    disabled = false,
    icon,
    rightIcon,
    onRightIconPress,
    style,
    inputStyle,
}) => {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme] || Colors.light;
    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const getBorderColor = () => {
        if (error) return colors.danger;
        if (isFocused) return colors.primary;
        return colors.border;
    };

    return (
        <View style={[styles.container, style]}>
            {label && (
                <Text style={[styles.label, { color: colors.text }]}>
                    {label}
                </Text>
            )}

            <View
                style={[
                    styles.inputContainer,
                    {
                        borderColor: getBorderColor(),
                        backgroundColor: disabled ? colors.backgroundSecondary : colors.surface,
                    },
                    multiline && styles.multilineContainer,
                ]}
            >
                {icon && (
                    <View style={styles.iconLeft}>
                        {icon}
                    </View>
                )}

                <TextInput
                    style={[
                        styles.input,
                        { color: colors.text },
                        icon && styles.inputWithIcon,
                        (secureTextEntry || rightIcon) && styles.inputWithRightIcon,
                        multiline && styles.multilineInput,
                        inputStyle,
                    ]}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor={colors.textTertiary}
                    secureTextEntry={secureTextEntry && !showPassword}
                    keyboardType={keyboardType}
                    autoCapitalize={autoCapitalize}
                    autoComplete={autoComplete}
                    maxLength={maxLength}
                    multiline={multiline}
                    numberOfLines={numberOfLines}
                    editable={!disabled}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                />

                {secureTextEntry && (
                    <TouchableOpacity
                        style={styles.iconRight}
                        onPress={() => setShowPassword(!showPassword)}
                    >
                        <Ionicons
                            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                            size={20}
                            color={colors.textSecondary}
                        />
                    </TouchableOpacity>
                )}

                {rightIcon && !secureTextEntry && (
                    <TouchableOpacity
                        style={styles.iconRight}
                        onPress={onRightIconPress}
                    >
                        {rightIcon}
                    </TouchableOpacity>
                )}
            </View>

            {(error || helperText) && (
                <Text
                    style={[
                        styles.helperText,
                        { color: error ? colors.danger : colors.textSecondary },
                    ]}
                >
                    {error || helperText}
                </Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: Spacing.lg,
    },
    label: {
        ...Typography.caption,
        fontWeight: '500',
        marginBottom: Spacing.sm,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderRadius: BorderRadius.lg,
        minHeight: 50,
    },
    multilineContainer: {
        minHeight: 100,
        alignItems: 'flex-start',
    },
    input: {
        flex: 1,
        ...Typography.body,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
    },
    inputWithIcon: {
        paddingLeft: Spacing.sm,
    },
    inputWithRightIcon: {
        paddingRight: Spacing.sm,
    },
    multilineInput: {
        textAlignVertical: 'top',
        paddingTop: Spacing.md,
    },
    iconLeft: {
        paddingLeft: Spacing.lg,
    },
    iconRight: {
        paddingRight: Spacing.lg,
    },
    helperText: {
        ...Typography.small,
        marginTop: Spacing.xs,
        marginLeft: Spacing.sm,
    },
});

export default Input;
