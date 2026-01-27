/**
 * Froscel Mobile - Pre-Interview Check Screen
 * Mandatory permissions and preparation check
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    Linking,
    useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, Camera } from 'expo-camera';
import { Audio } from 'expo-av';
import * as Network from 'expo-network';
import { Button, Card } from '../../components/common';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import useAuthStore from '../../store/authStore';
import useInterviewStore from '../../store/interviewStore';

const PreInterviewCheckScreen = ({ navigation, route }) => {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme] || Colors.light;
    const { user } = useAuthStore();
    const { startInterview, isLoading } = useInterviewStore();

    const { interviewId, jobId } = route.params || {};

    const [checks, setChecks] = useState({
        camera: null,
        microphone: null,
        network: null,
        acknowledged: false,
    });

    useEffect(() => {
        checkPermissions();
    }, []);

    const checkPermissions = async () => {
        // Check camera
        const cameraStatus = await Camera.getCameraPermissionsAsync();

        // Check microphone
        const audioStatus = await Audio.getPermissionsAsync();

        // Check network
        const networkState = await Network.getNetworkStateAsync();

        setChecks(prev => ({
            ...prev,
            camera: cameraStatus.granted,
            microphone: audioStatus.granted,
            network: networkState.isConnected && networkState.isInternetReachable,
        }));
    };

    const requestCameraPermission = async () => {
        const { status } = await Camera.requestCameraPermissionsAsync();
        setChecks(prev => ({ ...prev, camera: status === 'granted' }));

        if (status !== 'granted') {
            Alert.alert(
                'Camera Permission Required',
                'Camera access is required for the AI interview. Please enable it in settings.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Open Settings', onPress: () => Linking.openSettings() },
                ]
            );
        }
    };

    const requestMicrophonePermission = async () => {
        const { status } = await Audio.requestPermissionsAsync();
        setChecks(prev => ({ ...prev, microphone: status === 'granted' }));

        if (status !== 'granted') {
            Alert.alert(
                'Microphone Permission Required',
                'Microphone access is required for the AI interview. Please enable it in settings.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Open Settings', onPress: () => Linking.openSettings() },
                ]
            );
        }
    };

    const allChecksPass = () => {
        return checks.camera && checks.microphone && checks.network && checks.acknowledged;
    };

    const handleStartInterview = async () => {
        if (!allChecksPass()) {
            Alert.alert('Checks Incomplete', 'Please complete all checks before starting.');
            return;
        }

        if (!user) {
            Alert.alert('Error', 'User profile not found. Please log in again.');
            return;
        }

        // Pass context for onboarding/adaptive interviews (Sync with Web)
        const context = !jobId ? {
            parsedResume: user?.resume?.parsedData || user?.parsedResume,
            desiredRole: user?.profile?.desiredRole || 'Software Professional',
            experienceLevel: user?.profile?.experienceLevel || 'fresher',
        } : {};

        const userId = user?._id || user?.id;
        if (!userId) {
            Alert.alert('Error', 'Authentication error. Please log in again.');
            return;
        }

        const result = await startInterview(userId, jobId, context);

        if (result.success) {
            const interviewId = result.interview?._id || result.interview?.id || 'onboarding_session';
            navigation.replace('LiveInterview', {
                interviewId: interviewId,
                isOnboarding: !jobId
            });
        } else {
            Alert.alert('Error', result.error || 'Failed to start interview');
        }
    };

    const renderCheckItem = (title, description, status, onPress) => {
        const getStatusIcon = () => {
            if (status === null) return { name: 'ellipse-outline', color: colors.textTertiary };
            if (status === true) return { name: 'checkmark-circle', color: colors.success };
            return { name: 'close-circle', color: colors.danger };
        };

        const icon = getStatusIcon();

        return (
            <TouchableOpacity
                style={[styles.checkItem, { backgroundColor: colors.surface }]}
                onPress={onPress}
                disabled={status === true}
            >
                <View style={styles.checkContent}>
                    <Text style={[styles.checkTitle, { color: colors.text }]}>{title}</Text>
                    <Text style={[styles.checkDescription, { color: colors.textSecondary }]}>
                        {description}
                    </Text>
                </View>
                <Ionicons name={icon.name} size={28} color={icon.color} />
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Interview Preparation</Text>
                    <View style={{ width: 24 }} />
                </View>

                {/* AI Notice */}
                <Card style={[styles.aiNotice, { backgroundColor: `${colors.primary}10` }]}>
                    <Ionicons name="sparkles" size={24} color={colors.primary} />
                    <Text style={[styles.aiNoticeText, { color: colors.text }]}>
                        This is an AI-powered interview. Your responses will be recorded and evaluated.
                    </Text>
                </Card>

                {/* Rules Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Interview Guidelines</Text>

                    <View style={[styles.rulesCard, { backgroundColor: colors.surface }]}>
                        {[
                            'Find a quiet, well-lit environment',
                            'Ensure your face is clearly visible',
                            'Answer each question thoughtfully',
                            'Stay focused throughout the interview',
                            'Do not navigate away from the app',
                        ].map((rule, index) => (
                            <View key={index} style={styles.ruleItem}>
                                <View style={[styles.ruleDot, { backgroundColor: colors.primary }]} />
                                <Text style={[styles.ruleText, { color: colors.textSecondary }]}>{rule}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Permission Checks */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>System Checks</Text>

                    {renderCheckItem(
                        'Camera Access',
                        checks.camera ? 'Permission granted' : 'Tap to enable',
                        checks.camera,
                        requestCameraPermission
                    )}

                    {renderCheckItem(
                        'Microphone Access',
                        checks.microphone ? 'Permission granted' : 'Tap to enable',
                        checks.microphone,
                        requestMicrophonePermission
                    )}

                    {renderCheckItem(
                        'Network Connection',
                        checks.network ? 'Connected' : 'No connection',
                        checks.network,
                        checkPermissions
                    )}
                </View>

                {/* Cheating Warning */}
                <Card style={[styles.warningCard, { backgroundColor: colors.warningLight }]}>
                    <View style={styles.warningHeader}>
                        <Ionicons name="warning" size={24} color={colors.warning} />
                        <Text style={[styles.warningTitle, { color: colors.text }]}>Important Notice</Text>
                    </View>
                    <Text style={[styles.warningText, { color: colors.textSecondary }]}>
                        This interview is monitored for integrity. Any suspicious activity will be flagged
                        and reviewed by our team. Cheating may result in disqualification.
                    </Text>

                    <TouchableOpacity
                        style={styles.acknowledgeRow}
                        onPress={() => setChecks(prev => ({ ...prev, acknowledged: !prev.acknowledged }))}
                    >
                        <View
                            style={[
                                styles.checkbox,
                                { borderColor: colors.primary },
                                checks.acknowledged && { backgroundColor: colors.primary },
                            ]}
                        >
                            {checks.acknowledged && (
                                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                            )}
                        </View>
                        <Text style={[styles.acknowledgeText, { color: colors.text }]}>
                            I understand and agree to proceed honestly
                        </Text>
                    </TouchableOpacity>
                </Card>
            </ScrollView>

            {/* Start Button */}
            <View style={[styles.footer, { backgroundColor: colors.background }]}>
                <Button
                    title="Start Interview"
                    onPress={handleStartInterview}
                    disabled={!allChecksPass()}
                    loading={isLoading}
                    size="large"
                    style={styles.startButton}
                />
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: Spacing.xl,
        paddingBottom: 120,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing.xl,
    },
    headerTitle: {
        ...Typography.h3,
    },
    aiNotice: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    aiNoticeText: {
        ...Typography.caption,
        flex: 1,
        marginLeft: Spacing.md,
        lineHeight: 20,
    },
    section: {
        marginBottom: Spacing.xl,
    },
    sectionTitle: {
        ...Typography.bodyMedium,
        marginBottom: Spacing.md,
    },
    rulesCard: {
        padding: Spacing.lg,
        borderRadius: BorderRadius.xl,
    },
    ruleItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: Spacing.sm,
    },
    ruleDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginTop: 7,
        marginRight: Spacing.md,
    },
    ruleText: {
        ...Typography.caption,
        flex: 1,
        lineHeight: 20,
    },
    checkItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: Spacing.lg,
        borderRadius: BorderRadius.lg,
        marginBottom: Spacing.sm,
    },
    checkContent: {
        flex: 1,
        marginRight: Spacing.md,
    },
    checkTitle: {
        ...Typography.bodyMedium,
        marginBottom: 2,
    },
    checkDescription: {
        ...Typography.small,
    },
    warningCard: {
        marginBottom: Spacing.xl,
    },
    warningHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    warningTitle: {
        ...Typography.bodyMedium,
        marginLeft: Spacing.sm,
    },
    warningText: {
        ...Typography.caption,
        lineHeight: 20,
        marginBottom: Spacing.lg,
    },
    acknowledgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.md,
    },
    acknowledgeText: {
        ...Typography.caption,
        flex: 1,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: Spacing.xl,
        paddingBottom: Spacing.xxxl,
    },
    startButton: {
        width: '100%',
    },
});

export default PreInterviewCheckScreen;
