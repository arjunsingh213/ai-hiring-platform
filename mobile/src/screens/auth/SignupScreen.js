/**
 * Froscel Mobile - Signup Screen
 * New user registration
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    TouchableOpacity,
    useColorScheme,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input } from '../../components/common';
import { Colors, Typography, Spacing } from '../../theme';
import useAuthStore from '../../store/authStore';

const SignupScreen = ({ navigation }) => {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme] || Colors.light;

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [errors, setErrors] = useState({});

    const { register, isLoading, clearError } = useAuthStore();

    const updateField = (field, value) => {
        setFormData({ ...formData, [field]: value });
        if (errors[field]) {
            setErrors({ ...errors, [field]: null });
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Name is required';
        }

        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Please enter a valid email';
        }

        if (!formData.password) {
            newErrors.password = 'Password is required';
        } else if (formData.password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
        }

        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSignup = async () => {
        clearError();

        if (!validateForm()) return;

        const result = await register({
            email: formData.email,
            password: formData.password,
            profile: { name: formData.name },
        });

        if (result.success) {
            Alert.alert(
                'Registration Successful',
                'Please check your email to verify your account.',
                [{ text: 'OK', onPress: () => navigation.navigate('VerifyEmail', { email: formData.email }) }]
            );
        } else {
            Alert.alert('Registration Failed', result.error);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Back Button */}
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>

                    {/* Logo */}
                    <View style={styles.logoContainer}>
                        <Image
                            source={require('../../../assets/icon.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                    </View>

                    {/* Title */}
                    <Text style={[styles.title, { color: colors.text }]}>
                        Create Account
                    </Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        Join thousands of professionals
                    </Text>

                    {/* Form */}
                    <View style={styles.form}>
                        <Input
                            label="Full Name"
                            value={formData.name}
                            onChangeText={(text) => updateField('name', text)}
                            placeholder="Enter your full name"
                            autoCapitalize="words"
                            autoComplete="name"
                            error={errors.name}
                        />

                        <Input
                            label="Email"
                            value={formData.email}
                            onChangeText={(text) => updateField('email', text)}
                            placeholder="Enter your email"
                            keyboardType="email-address"
                            autoComplete="email"
                            error={errors.email}
                        />

                        <Input
                            label="Password"
                            value={formData.password}
                            onChangeText={(text) => updateField('password', text)}
                            placeholder="Create a password"
                            secureTextEntry
                            autoComplete="new-password"
                            error={errors.password}
                            helperText="Must be at least 6 characters"
                        />

                        <Input
                            label="Confirm Password"
                            value={formData.confirmPassword}
                            onChangeText={(text) => updateField('confirmPassword', text)}
                            placeholder="Confirm your password"
                            secureTextEntry
                            autoComplete="new-password"
                            error={errors.confirmPassword}
                        />

                        <Button
                            title="Create Account"
                            onPress={handleSignup}
                            loading={isLoading}
                            style={styles.signupButton}
                        />
                    </View>

                    {/* Terms */}
                    <Text style={[styles.terms, { color: colors.textTertiary }]}>
                        By creating an account, you agree to our{' '}
                        <Text style={{ color: colors.primary }}>Terms of Service</Text>
                        {' '}and{' '}
                        <Text style={{ color: colors.primary }}>Privacy Policy</Text>
                    </Text>

                    {/* Login link */}
                    <View style={styles.loginContainer}>
                        <Text style={[styles.loginText, { color: colors.textSecondary }]}>
                            Already have an account?{' '}
                        </Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                            <Text style={[styles.loginLink, { color: colors.primary }]}>
                                Sign In
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: Spacing.xxl,
        paddingTop: Spacing.lg,
        paddingBottom: Spacing.xxl,
    },
    backButton: {
        marginBottom: Spacing.lg,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    logo: {
        width: 60,
        height: 60,
    },
    title: {
        ...Typography.h2,
        textAlign: 'center',
        marginBottom: Spacing.sm,
    },
    subtitle: {
        ...Typography.body,
        textAlign: 'center',
        marginBottom: Spacing.xxl,
    },
    form: {
        marginBottom: Spacing.lg,
    },
    signupButton: {
        marginTop: Spacing.md,
    },
    terms: {
        ...Typography.small,
        textAlign: 'center',
        marginBottom: Spacing.xxl,
        lineHeight: 20,
    },
    loginContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loginText: {
        ...Typography.body,
    },
    loginLink: {
        ...Typography.bodyMedium,
        fontWeight: '600',
    },
});

export default SignupScreen;
