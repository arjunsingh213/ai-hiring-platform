/**
 * Froscel Mobile - Interview List Screen
 * Shows all user interviews with status
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    RefreshControl,
    TouchableOpacity,
    useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card, Badge, Button, SkeletonCard } from '../../components/common';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import { interviewAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';

const InterviewListScreen = ({ navigation }) => {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme] || Colors.light;
    const { user } = useAuthStore();

    const [interviews, setInterviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('all'); // all, pending, completed

    useEffect(() => {
        fetchInterviews();
    }, []);

    const fetchInterviews = async () => {
        try {
            setLoading(true);
            const userId = user?._id || user?.id;
            if (!userId) {
                setLoading(false);
                return;
            }

            const response = await interviewAPI.getUserInterviews(userId);
            if (response.success) {
                setInterviews(response.data || []);
            }
        } catch (error) {
            console.error('Error fetching interviews:', error);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchInterviews();
        setRefreshing(false);
    }, []);

    const getFilteredInterviews = () => {
        switch (activeTab) {
            case 'pending':
                return interviews.filter(i => i.status === 'pending' || i.status === 'in_progress');
            case 'completed':
                return interviews.filter(i => i.status === 'completed' || i.status === 'under_review');
            default:
                return interviews;
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'pending':
                return { label: 'Pending', variant: 'warning' };
            case 'in_progress':
                return { label: 'In Progress', variant: 'info' };
            case 'completed':
                return { label: 'Completed', variant: 'success' };
            case 'under_review':
                return { label: 'Under Review', variant: 'primary' };
            default:
                return { label: status, variant: 'default' };
        }
    };

    const handleInterviewPress = (interview) => {
        if (!interview) return;
        const interviewId = interview?._id || interview?.id;
        if (!interviewId) return;

        if (interview.status === 'pending' || interview.status === 'in_progress') {
            navigation.navigate('PreInterviewCheck', {
                interviewId: interviewId,
                jobId: interview?.jobId?._id || interview?.jobId?.id || interview?.jobId,
            });
        } else {
            navigation.navigate('InterviewDetails', { interviewId: interviewId });
        }
    };

    const renderItem = ({ item }) => {
        if (!item) return null;
        const statusBadge = getStatusBadge(item.status);
        const jobTitle = item.jobId?.title || 'General Interview';
        const company = item.jobId?.company?.name || 'Froscel';

        return (
            <Card
                onPress={() => handleInterviewPress(item)}
                style={styles.interviewCard}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.jobInfo}>
                        <Text style={[styles.jobTitle, { color: colors.text }]} numberOfLines={1}>
                            {jobTitle}
                        </Text>
                        <Text style={[styles.company, { color: colors.textSecondary }]}>
                            {company}
                        </Text>
                    </View>
                    <Badge label={statusBadge.label} variant={statusBadge.variant} size="small" />
                </View>

                <View style={[styles.divider, { backgroundColor: colors.border }]} />

                <View style={styles.cardFooter}>
                    <View style={styles.dateContainer}>
                        <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                        <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                            {new Date(item.createdAt).toLocaleDateString()}
                        </Text>
                    </View>

                    {item.status === 'pending' && (
                        <TouchableOpacity
                            style={[styles.continueButton, { backgroundColor: colors.primary }]}
                            onPress={() => handleInterviewPress(item)}
                        >
                            <Text style={styles.continueText}>Start</Text>
                            <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
                        </TouchableOpacity>
                    )}

                    {item.status === 'completed' && item.scoring?.overallScore && (
                        <View style={styles.scoreContainer}>
                            <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>Score</Text>
                            <Text style={[styles.scoreValue, { color: colors.primary }]}>
                                {item.scoring?.overallScore}%
                            </Text>
                        </View>
                    )}
                </View>
            </Card>
        );
    };

    const renderTabs = () => (
        <View style={[styles.tabContainer, { backgroundColor: colors.backgroundSecondary }]}>
            {['all', 'pending', 'completed'].map((tab) => (
                <TouchableOpacity
                    key={tab}
                    style={[
                        styles.tab,
                        activeTab === tab && { backgroundColor: colors.surface },
                    ]}
                    onPress={() => setActiveTab(tab)}
                >
                    <Text
                        style={[
                            styles.tabText,
                            { color: activeTab === tab ? colors.primary : colors.textSecondary },
                        ]}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <Ionicons name="videocam-outline" size={64} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No interviews yet</Text>
            <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
                Apply to jobs to receive interview invitations
            </Text>
            <Button
                title="Browse Jobs"
                onPress={() => navigation.navigate('Jobs')}
                style={styles.browseButton}
            />
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <View style={[styles.header, { backgroundColor: colors.background }]}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>My Interviews</Text>
            </View>

            {renderTabs()}

            {loading ? (
                <View style={styles.loadingContainer}>
                    {[1, 2, 3].map(i => (
                        <Card key={i} style={styles.interviewCard}>
                            <SkeletonCard />
                        </Card>
                    ))}
                </View>
            ) : (
                <FlatList
                    data={getFilteredInterviews()}
                    renderItem={renderItem}
                    keyExtractor={(item, index) => item?._id || item?.id || index.toString()}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={colors.primary}
                        />
                    }
                    ListEmptyComponent={renderEmpty}
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.lg,
    },
    headerTitle: {
        ...Typography.h2,
    },
    tabContainer: {
        flexDirection: 'row',
        marginHorizontal: Spacing.lg,
        marginBottom: Spacing.lg,
        borderRadius: BorderRadius.lg,
        padding: 4,
    },
    tab: {
        flex: 1,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
    },
    tabText: {
        ...Typography.caption,
        fontWeight: '600',
    },
    listContent: {
        padding: Spacing.lg,
        paddingBottom: 100,
    },
    loadingContainer: {
        padding: Spacing.lg,
    },
    interviewCard: {
        marginBottom: Spacing.md,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
    },
    jobInfo: {
        flex: 1,
        marginRight: Spacing.md,
    },
    jobTitle: {
        ...Typography.bodyMedium,
        marginBottom: 4,
    },
    company: {
        ...Typography.caption,
    },
    divider: {
        height: 1,
        marginVertical: Spacing.md,
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    dateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dateText: {
        ...Typography.caption,
        marginLeft: Spacing.xs,
    },
    continueButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.xs,
        paddingHorizontal: Spacing.md,
        borderRadius: BorderRadius.full,
    },
    continueText: {
        color: '#FFFFFF',
        ...Typography.buttonSmall,
        marginRight: 4,
    },
    scoreContainer: {
        alignItems: 'flex-end',
    },
    scoreLabel: {
        ...Typography.small,
    },
    scoreValue: {
        ...Typography.h3,
        fontWeight: '700',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 100,
        paddingHorizontal: Spacing.xxl,
    },
    emptyTitle: {
        ...Typography.h3,
        marginTop: Spacing.xl,
        marginBottom: Spacing.sm,
    },
    emptyDescription: {
        ...Typography.body,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: Spacing.xl,
    },
    browseButton: {
        minWidth: 150,
    },
});

export default InterviewListScreen;
