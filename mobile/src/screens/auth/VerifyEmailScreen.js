/**
 * Froscel Mobile - Verify Email Screen
 * OTP verification after signup
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    Alert,
    useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input } from '../../components/common';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import useAuthStore from '../../store/authStore';

const VerifyEmailScreen = ({ navigation, route }) => {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme] || Colors.light;
    const { email } = route.params || {};

    const [token, setToken] = useState('');
    const [resendTimer, setResendTimer] = useState(60);

    const { verifyEmail, isLoading } = useAuthStore();

    useEffect(() => {
        let interval;
        if (resendTimer > 0) {
            interval = setInterval(() => {
                setResendTimer(prev => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [resendTimer]);

    const handleVerify = async () => {
        if (token.length < 4) {
            Alert.alert('Invalid OTP', 'Please enter the full verification code.');
            return;
        }

        const result = await verifyEmail(token);
        if (result.success) {
            Alert.alert('Verified Success', 'Your email has been verified successfully!', [
                { text: 'Get Started', onPress: () => navigation.replace('Main') }
            ]);
        } else {
            Alert.alert('Verification Failed', result.error);
        }
    };

    const handleResend = () => {
        setResendTimer(60);
        // Call resend API here if needed
        Alert.alert('Code Sent', `A new verification code has been sent to ${email}`);
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <View style={styles.content}>
                    <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>

                    <View style={styles.iconContainer}>
                        <View style={[styles.circularBg, { backgroundColor: `${colors.primary}15` }]}>
                            <Ionicons name="mail-unread-outline" size={40} color={colors.primary} />
                        </View>
                    </View>

                    <Text style={[styles.title, { color: colors.text }]}>Verify Email</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        We've sent a 6-digit verification code to
                        <Text style={{ fontWeight: '700', color: colors.text }}> {email}</Text>
                    </Text>

                    <View style={styles.form}>
                        <Input
                            placeholder="Enter Code"
                            value={token}
                            onChangeText={setToken}
                            keyboardType="number-pad"
                            maxLength={6}
                            textAlign="center"
                            style={styles.otpInput}
                            inputStyle={{ letterSpacing: 10, fontSize: 24, fontWeight: '700' }}
                        />

                        <Button
                            title="Verify & Continue"
                            onPress={handleVerify}
                            loading={isLoading}
                            style={styles.button}
                        />

                        <View style={styles.resendContainer}>
                            <Text style={[styles.resendText, { color: colors.textSecondary }]}>
                                Didn't receive code?{' '}
                            </Text>
                            {resendTimer > 0 ? (
                                <Text style={[styles.timerText, { color: colors.primary }]}>
                                    Resend in {resendTimer}s
                                </Text>
                            ) : (
                                <TouchableOpacity onPress={handleResend}>
                                    <Text style={[styles.resendLink, { color: colors.primary }]}>Resend Code</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>
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
    content: {
        flex: 1,
        paddingHorizontal: Spacing.xxl,
        paddingTop: Spacing.lg,
    },
    backButton: {
        marginBottom: Spacing.xxl,
    },
    iconContainer: {
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    circularBg: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        ...Typography.h1,
        textAlign: 'center',
        marginBottom: Spacing.sm,
    },
    subtitle: {
        ...Typography.body,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: Spacing.xxxl,
    },
    form: {
        width: '100%',
    },
    otpInput: {
        marginBottom: Spacing.xl,
    },
    button: {
        marginBottom: Spacing.xl,
    },
    resendContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    resendText: {
        ...Typography.body,
    },
    timerText: {
        ...Typography.bodyMedium,
    },
    resendLink: {
        ...Typography.bodyMedium,
        fontWeight: '700',
    },
});

export default VerifyEmailScreen;
