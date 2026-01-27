/**
 * Froscel Mobile - Live Interview Screen
 * Full-screen AI interview experience
 */

import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    Animated,
    Alert,
    BackHandler,
    StatusBar,
    KeyboardAvoidingView,
    Platform,
    useColorScheme,
} from 'react-native';
import { CameraView } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { Button, Badge } from '../../components/common';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import useInterviewStore from '../../store/interviewStore';

const LiveInterviewScreen = ({ navigation, route }) => {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme] || Colors.light;

    const {
        currentInterview,
        currentQuestion,
        currentQuestionIndex,
        submitResponse,
        completeInterview,
        isLoading,
        blueprint,
        progress,
    } = useInterviewStore();

    const [answer, setAnswer] = useState('');
    const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutes per question
    const [questionStartTime, setQuestionStartTime] = useState(Date.now());

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const timerRef = useRef(null);

    // Prevent back navigation
    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            handleExitAttempt();
            return true;
        });

        return () => backHandler.remove();
    }, []);

    // Question fade animation
    useEffect(() => {
        fadeAnim.setValue(0);
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
        }).start();

        setAnswer('');
        setQuestionStartTime(Date.now());
        setTimeRemaining(300);
    }, [currentQuestionIndex]);

    // Timer
    useEffect(() => {
        timerRef.current = setInterval(() => {
            setTimeRemaining(prev => {
                if (prev <= 1) {
                    handleTimeUp();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timerRef.current);
    }, [currentQuestionIndex]);

    const handleTimeUp = () => {
        clearInterval(timerRef.current);
        Alert.alert(
            'Time Up',
            'Moving to the next question.',
            [{ text: 'OK', onPress: handleSubmit }]
        );
    };

    const handleExitAttempt = () => {
        Alert.alert(
            'Exit Interview?',
            'Your progress will be lost. Are you sure you want to exit?',
            [
                { text: 'Continue Interview', style: 'cancel' },
                { text: 'Exit', style: 'destructive', onPress: () => navigation.goBack() },
            ]
        );
    };

    const handleSubmit = async () => {
        if (!answer.trim() && timeRemaining > 0) {
            Alert.alert('Empty Answer', 'Please provide an answer before submitting.');
            return;
        }

        if (!currentInterview && !blueprint) {
            Alert.alert('Session Error', 'No active interview session found.', [
                { text: 'Exit', onPress: () => navigation.goBack() }
            ]);
            return;
        }

        const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);
        const result = await submitResponse(answer.trim() || 'No response provided', timeSpent);

        if (result?.success) {
            if (result?.invalid) {
                Alert.alert('Analysis Feedback', result?.message || 'Please provide a more relevant answer.');
                return;
            }

            if (!result?.hasNext) {
                // Interview complete
                // For onboarding, we might want to show a specific screen or refresh the passport
                navigation.replace('SubmissionConfirmation', {
                    type: route?.params?.isOnboarding ? 'onboarding' : 'job'
                });
            }
            // Otherwise, next question will load automatically via store update
        } else {
            Alert.alert('Error', result?.error || 'Failed to submit response');
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const getTimerColor = () => {
        if (timeRemaining <= 30) return colors.danger;
        if (timeRemaining <= 60) return colors.warning;
        return colors.text;
    };

    const totalQuestions = blueprint?.totalQuestions || currentInterview?.questions?.length || 8;
    const questionText = currentQuestion?.text || currentQuestion?.question || 'Loading question...';

    // Derived round info from blueprint or current question
    const currentRoundNum = currentQuestion?.roundNumber || (currentQuestionIndex < 5 ? 1 : 2);
    const roundName = currentQuestion?.roundName || (currentQuestionIndex < 5 ? 'Technical' : 'Behavioral');
    const questionInRound = currentQuestion?.questionInRound || (currentQuestionIndex % 5 + 1);
    const totalInRound = currentQuestion?.totalQuestionsInRound || 5;

    return (
        <View style={[styles.container, { backgroundColor: '#0F172A' }]}>
            <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

            {/* Top Bar */}
            <View style={styles.topBar}>
                <View>
                    <Text style={styles.questionCounter}>
                        Question {currentQuestionIndex + 1} of {totalQuestions}
                    </Text>
                    <Text style={styles.roundSubtitle}>
                        Round {currentRoundNum}: {roundName}
                    </Text>
                </View>

                <Text style={[styles.timer, { color: getTimerColor() }]}>
                    {formatTime(timeRemaining)}
                </Text>

                <Badge
                    label={`${questionInRound}/${totalInRound}`}
                    variant="primary"
                    size="small"
                />
            </View>

            {/* Question */}
            <Animated.View
                style={[
                    styles.questionContainer,
                    { opacity: fadeAnim },
                ]}
            >
                <Text style={styles.questionText}>
                    {questionText}
                </Text>
            </Animated.View>

            {/* Camera Preview */}
            <View style={styles.cameraContainer}>
                <CameraView
                    style={styles.camera}
                    facing="front"
                />
                <View style={styles.micIndicator}>
                    <Ionicons name="mic" size={14} color="#FFFFFF" />
                </View>
            </View>

            {/* Answer Input */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.inputContainer}
            >
                <TextInput
                    style={styles.answerInput}
                    value={answer}
                    onChangeText={setAnswer}
                    placeholder="Type your answer here..."
                    placeholderTextColor="#64748B"
                    multiline
                    textAlignVertical="top"
                    editable={!isLoading}
                />

                <Button
                    title={isLoading ? 'Submitting...' : 'Submit Answer'}
                    onPress={handleSubmit}
                    loading={isLoading}
                    disabled={isLoading}
                    style={styles.submitButton}
                />
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.xxxl + 20, // Account for status bar
        paddingBottom: Spacing.lg,
    },
    questionCounter: {
        ...Typography.caption,
        color: '#94A3B8',
        fontWeight: '600',
    },
    roundSubtitle: {
        ...Typography.small,
        color: Colors.light.primary,
        marginTop: 2,
    },
    timer: {
        ...Typography.h3,
        color: '#F8FAFC',
        fontWeight: '700',
        fontVariant: ['tabular-nums'],
    },
    questionContainer: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: Spacing.xxl,
        paddingBottom: 200,
    },
    questionText: {
        ...Typography.h2,
        color: '#F8FAFC',
        textAlign: 'center',
        lineHeight: 36,
    },
    cameraContainer: {
        position: 'absolute',
        bottom: 220,
        right: Spacing.xl,
        width: 100,
        height: 100,
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#334155',
    },
    camera: {
        flex: 1,
    },
    micIndicator: {
        position: 'absolute',
        bottom: 4,
        left: 4,
        right: 4,
        height: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: BorderRadius.sm,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    inputContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#1E293B',
        borderTopLeftRadius: BorderRadius.xxl,
        borderTopRightRadius: BorderRadius.xxl,
        padding: Spacing.xl,
        paddingBottom: Spacing.xxxl,
    },
    answerInput: {
        backgroundColor: '#0F172A',
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        color: '#F8FAFC',
        ...Typography.body,
        minHeight: 80,
        maxHeight: 120,
        marginBottom: Spacing.md,
    },
    submitButton: {
        width: '100%',
    },
});

export default LiveInterviewScreen;
