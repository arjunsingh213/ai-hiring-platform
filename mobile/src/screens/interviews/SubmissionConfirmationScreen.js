/**
 * Froscel Mobile - Submission Confirmation Screen
 * Interview completed confirmation
 */

import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    BackHandler,
    useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card } from '../../components/common';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import useInterviewStore from '../../store/interviewStore';

const SubmissionConfirmationScreen = ({ navigation, route }) => {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme] || Colors.light;
    const { resetInterview } = useInterviewStore();
    const { type } = route.params || {};
    const isOnboarding = type === 'onboarding';

    const scaleAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Prevent back navigation
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => true);

        // Entry animation
        Animated.sequence([
            Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 50,
                friction: 7,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start();

        return () => backHandler.remove();
    }, []);

    const handleReturnHome = () => {
        resetInterview();
        navigation.reset({
            index: 0,
            routes: [{ name: 'Main' }],
        });
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.content}>
                {/* Success Animation */}
                <Animated.View
                    style={[
                        styles.iconContainer,
                        {
                            backgroundColor: colors.successLight,
                            transform: [{ scale: scaleAnim }],
                        },
                    ]}
                >
                    <Ionicons name="checkmark" size={64} color={colors.success} />
                </Animated.View>

                {/* Title */}
                <Animated.Text
                    style={[
                        styles.title,
                        { color: colors.text, opacity: fadeAnim },
                    ]}
                >
                    {isOnboarding ? 'Skill Verification Complete' : 'Interview Submitted'}
                </Animated.Text>

                <Animated.Text
                    style={[
                        styles.subtitle,
                        { color: colors.textSecondary, opacity: fadeAnim },
                    ]}
                >
                    {isOnboarding
                        ? 'Your AI Talent Passport is being updated'
                        : 'Thank you for completing your interview'}
                </Animated.Text>

                {/* Status Card */}
                <Animated.View style={{ opacity: fadeAnim, width: '100%' }}>
                    <Card style={[styles.statusCard, { backgroundColor: `${colors.primary}10` }]}>
                        <View style={styles.statusRow}>
                            <View style={[styles.statusDot, { backgroundColor: isOnboarding ? colors.success : colors.warning }]} />
                            <Text style={[styles.statusText, { color: colors.text }]}>
                                {isOnboarding ? 'Syncing Passport Data' : 'Under Admin Review'}
                            </Text>
                        </View>
                        <Text style={[styles.statusDescription, { color: colors.textSecondary }]}>
                            Your responses are being reviewed by our team. You'll receive a
                            notification once the evaluation is complete.
                        </Text>
                    </Card>
                </Animated.View>

                {/* What's Next */}
                <Animated.View style={{ opacity: fadeAnim, width: '100%' }}>
                    <Text style={[styles.nextTitle, { color: colors.text }]}>What's Next?</Text>

                    {[
                        { icon: 'time-outline', text: 'Review typically takes 24-48 hours' },
                        { icon: 'notifications-outline', text: 'We\'ll notify you when results are ready' },
                        { icon: 'ribbon-outline', text: 'Your Talent Passport will be updated' },
                    ].map((item, index) => (
                        <View key={index} style={styles.nextItem}>
                            <Ionicons name={item.icon} size={20} color={colors.primary} />
                            <Text style={[styles.nextText, { color: colors.textSecondary }]}>
                                {item.text}
                            </Text>
                        </View>
                    ))}
                </Animated.View>
            </View>

            {/* Return Home Button */}
            <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
                <Button
                    title="Return to Home"
                    onPress={handleReturnHome}
                    size="large"
                    style={styles.homeButton}
                />
            </Animated.View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing.xxl,
    },
    iconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.xxl,
    },
    title: {
        ...Typography.h1,
        textAlign: 'center',
        marginBottom: Spacing.sm,
    },
    subtitle: {
        ...Typography.body,
        textAlign: 'center',
        marginBottom: Spacing.xxxl,
    },
    statusCard: {
        marginBottom: Spacing.xxl,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: Spacing.sm,
    },
    statusText: {
        ...Typography.bodyMedium,
    },
    statusDescription: {
        ...Typography.caption,
        lineHeight: 20,
    },
    nextTitle: {
        ...Typography.bodyMedium,
        alignSelf: 'flex-start',
        marginBottom: Spacing.md,
    },
    nextItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    nextText: {
        ...Typography.caption,
        marginLeft: Spacing.md,
        flex: 1,
    },
    footer: {
        padding: Spacing.xl,
        paddingBottom: Spacing.xxxl,
    },
    homeButton: {
        width: '100%',
    },
});

export default SubmissionConfirmationScreen;
