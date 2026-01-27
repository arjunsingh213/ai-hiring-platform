/**
 * Froscel Mobile - Talent Passport Screen
 * AI Talent Passport display with scores and metrics
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    TouchableOpacity,
    useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card, Badge, SkeletonLoader } from '../../components/common';
import ScoreRing from '../../components/passport/ScoreRing';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import { passportAPI, interviewAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';

const TalentPassportScreen = ({ navigation }) => {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme] || Colors.light;
    const { user } = useAuthStore();

    const [passport, setPassport] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchPassport();
    }, []);

    const fetchPassport = async () => {
        try {
            setLoading(true);
            const userId = user?._id || user?.id;
            if (!userId) {
                setLoading(false);
                return;
            }

            const [passportRes, historyRes] = await Promise.all([
                passportAPI.getPassport(userId),
                interviewAPI.getUserInterviews(userId),
            ]);

            if (passportRes.success) {
                setPassport(passportRes.data?.passport || passportRes.data);
            }

            if (historyRes.success) {
                setHistory(historyRes.data?.filter(i => i && i.status === 'completed') || []);
            }
        } catch (error) {
            console.error('Error fetching passport:', error);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchPassport();
        setRefreshing(false);
    }, []);

    const handleRefreshPassport = async () => {
        try {
            const userId = user?._id || user?.id;
            if (!userId) return;

            await passportAPI.refreshPassport(userId);
            await fetchPassport();
        } catch (error) {
            console.error('Error refreshing passport:', error);
        }
    };

    const renderSkillBar = (skill, score, maxScore = 100) => {
        const percentage = (score / maxScore) * 100;

        return (
            <View style={styles.skillItem} key={skill}>
                <View style={styles.skillHeader}>
                    <Text style={[styles.skillName, { color: colors.text }]}>{skill}</Text>
                    <Text style={[styles.skillScore, { color: colors.textSecondary }]}>{score}%</Text>
                </View>
                <View style={[styles.skillBarBg, { backgroundColor: colors.backgroundTertiary }]}>
                    <View
                        style={[
                            styles.skillBarFill,
                            {
                                width: `${percentage}%`,
                                backgroundColor: percentage >= 70 ? colors.success :
                                    percentage >= 40 ? colors.primary : colors.warning,
                            },
                        ]}
                    />
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
                <View style={styles.header}>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>AI Talent Passport</Text>
                </View>
                <View style={styles.loadingContainer}>
                    <SkeletonLoader width={150} height={150} borderRadius={75} style={{ alignSelf: 'center' }} />
                    <SkeletonLoader width="60%" height={20} style={{ alignSelf: 'center', marginTop: 20 }} />
                    <SkeletonLoader width="40%" height={16} style={{ alignSelf: 'center', marginTop: 8 }} />
                </View>
            </SafeAreaView>
        );
    }

    const talentScore = passport?.talentScore || 0;
    const levelBand = passport?.levelBand || 'Level 1';
    const percentile = passport?.globalPercentile || 0;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.primary}
                    />
                }
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>AI Talent Passport</Text>
                    <TouchableOpacity onPress={handleRefreshPassport}>
                        <Ionicons name="refresh" size={24} color={colors.primary} />
                    </TouchableOpacity>
                </View>

                {/* Main Score */}
                <Card style={styles.scoreCard}>
                    <View style={styles.scoreContainer}>
                        <ScoreRing
                            score={talentScore}
                            size={150}
                            strokeWidth={12}
                            label="Talent Score"
                        />
                    </View>

                    <View style={styles.badgeRow}>
                        <Badge label={levelBand} variant="primary" />
                        <Text style={[styles.percentileText, { color: colors.textSecondary }]}>
                            Top {percentile}%
                        </Text>
                    </View>

                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: colors.text }]}>
                                {history.length}
                            </Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                                Interviews
                            </Text>
                        </View>
                        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: colors.text }]}>
                                {passport?.skillsVerified || 0}
                            </Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                                Skills Verified
                            </Text>
                        </View>
                        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: colors.text }]}>
                                {passport?.avgScore || 0}%
                            </Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                                Avg Score
                            </Text>
                        </View>
                    </View>
                </Card>

                {/* Skills Section */}
                <Card style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Skills</Text>
                        <TouchableOpacity>
                            <Text style={[styles.viewAll, { color: colors.primary }]}>View All</Text>
                        </TouchableOpacity>
                    </View>

                    {passport?.skills?.length > 0 ? (
                        passport.skills.slice(0, 5).map(s => s && renderSkillBar(s.name, s.score))
                    ) : (
                        <Text style={[styles.noDataText, { color: colors.textSecondary }]}>
                            Complete interviews to verify your skills
                        </Text>
                    )}
                </Card>

                {/* Behavior Section */}
                <Card style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Behavior</Text>
                    </View>

                    <View style={styles.behaviorGrid}>
                        {[
                            { name: 'Communication', score: passport?.behavior?.communication || 0, icon: 'chatbubbles' },
                            { name: 'Confidence', score: passport?.behavior?.confidence || 0, icon: 'shield-checkmark' },
                            { name: 'Reliability', score: passport?.behavior?.reliability || 0, icon: 'time' },
                            { name: 'Professionalism', score: passport?.behavior?.professionalism || 0, icon: 'briefcase' },
                        ].map((item) => (
                            <View
                                key={item.name}
                                style={[styles.behaviorItem, { backgroundColor: colors.backgroundSecondary }]}
                            >
                                <View style={[styles.behaviorIcon, { backgroundColor: `${colors.primary}20` }]}>
                                    <Ionicons name={item.icon} size={20} color={colors.primary} />
                                </View>
                                <Text style={[styles.behaviorScore, { color: colors.text }]}>{item.score}%</Text>
                                <Text style={[styles.behaviorName, { color: colors.textSecondary }]}>{item.name}</Text>
                            </View>
                        ))}
                    </View>
                </Card>

                {/* History Section */}
                <Card style={[styles.sectionCard, { marginBottom: 100 }]}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>History</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Interviews')}>
                            <Text style={[styles.viewAll, { color: colors.primary }]}>View All</Text>
                        </TouchableOpacity>
                    </View>

                    {history.length > 0 ? (
                        history.slice(0, 3).map((interview) => {
                            if (!interview) return null;
                            const id = interview?._id || interview?.id;

                            return (
                                <View key={id} style={styles.historyItem}>
                                    <View style={[styles.historyDot, { backgroundColor: colors.success }]} />
                                    <View style={styles.historyContent}>
                                        <Text style={[styles.historyTitle, { color: colors.text }]}>
                                            {interview.jobId?.title || 'Interview'}
                                        </Text>
                                        <Text style={[styles.historyDate, { color: colors.textSecondary }]}>
                                            {new Date(interview.completedAt || interview.createdAt).toLocaleDateString()}
                                        </Text>
                                    </View>
                                    <Text style={[styles.historyScore, { color: colors.primary }]}>
                                        {interview.scoring?.overallScore || '-'}%
                                    </Text>
                                </View>
                            );
                        })
                    ) : (
                        <Text style={[styles.noDataText, { color: colors.textSecondary }]}>
                            No completed interviews yet
                        </Text>
                    )}
                </Card>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.lg,
    },
    headerTitle: {
        ...Typography.h2,
    },
    loadingContainer: {
        padding: Spacing.xxl,
    },
    scoreCard: {
        marginHorizontal: Spacing.lg,
        marginBottom: Spacing.lg,
        alignItems: 'center',
    },
    scoreContainer: {
        marginBottom: Spacing.lg,
    },
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        marginBottom: Spacing.lg,
    },
    percentileText: {
        ...Typography.caption,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        ...Typography.h3,
        fontWeight: '700',
    },
    statLabel: {
        ...Typography.small,
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        height: 40,
    },
    sectionCard: {
        marginHorizontal: Spacing.lg,
        marginBottom: Spacing.lg,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing.md,
    },
    sectionTitle: {
        ...Typography.bodyMedium,
    },
    viewAll: {
        ...Typography.caption,
        fontWeight: '500',
    },
    skillItem: {
        marginBottom: Spacing.md,
    },
    skillHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    skillName: {
        ...Typography.caption,
    },
    skillScore: {
        ...Typography.caption,
        fontWeight: '600',
    },
    skillBarBg: {
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
    },
    skillBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    behaviorGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    behaviorItem: {
        width: '48%',
        padding: Spacing.md,
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
    },
    behaviorIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.sm,
    },
    behaviorScore: {
        ...Typography.h3,
        fontWeight: '700',
        marginBottom: 2,
    },
    behaviorName: {
        ...Typography.small,
    },
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.sm,
    },
    historyDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: Spacing.md,
    },
    historyContent: {
        flex: 1,
    },
    historyTitle: {
        ...Typography.caption,
        fontWeight: '500',
    },
    historyDate: {
        ...Typography.small,
    },
    historyScore: {
        ...Typography.bodyMedium,
        fontWeight: '700',
    },
    noDataText: {
        ...Typography.caption,
        textAlign: 'center',
        paddingVertical: Spacing.lg,
    },
});

export default TalentPassportScreen;
