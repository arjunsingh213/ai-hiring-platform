/**
 * Froscel Mobile - Job Detail Screen
 * Detailed job view and application flow
 */

import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Image,
    TouchableOpacity,
    Alert,
    useColorScheme,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Badge } from '../../components/common';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme';
import { jobAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';

const JobDetailScreen = ({ navigation, route }) => {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme] || Colors.light;
    const { user } = useAuthStore();
    const { jobId, job: initialJob } = route.params || {};

    const [job, setJob] = useState(initialJob);
    const [loading, setLoading] = useState(!initialJob);
    const [applying, setApplying] = useState(false);

    useEffect(() => {
        if (!initialJob) {
            fetchJobDetails();
        }
    }, [jobId]);

    const fetchJobDetails = async () => {
        try {
            setLoading(true);
            const response = await jobAPI.getJob(jobId);
            if (response.success) {
                setJob(response.data);
            } else {
                Alert.alert('Error', 'Failed to load job details');
                navigation.goBack();
            }
        } catch (error) {
            console.error('Error fetching job details:', error);
            Alert.alert('Error', 'An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleApply = async () => {
        // Check if user has required skills/passport level if needed
        // For now, proceed to pre-interview check which is the standard flow
        const id = job?._id || job?.id;
        if (!id) return;

        navigation.navigate('Interviews', {
            screen: 'PreInterviewCheck',
            params: { jobId: id }
        });
    };

    if (loading || !job) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    const matchScore = job.matchScore?.overall || null;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.shareButton}>
                    <Ionicons name="share-outline" size={24} color={colors.text} />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Company Info */}
                <View style={styles.companySection}>
                    <View style={[styles.logoContainer, { backgroundColor: colors.backgroundTertiary }]}>
                        <Text style={[styles.logoText, { color: colors.primary }]}>
                            {job.company?.name?.charAt(0) || 'C'}
                        </Text>
                    </View>
                    <Text style={[styles.jobTitle, { color: colors.text }]}>{job.title}</Text>
                    <Text style={[styles.companyName, { color: colors.textSecondary }]}>
                        {job.company?.name} • {job.location?.city || 'Remote'}
                    </Text>

                    <View style={styles.badgeRow}>
                        <Badge label={job.type || 'Full-time'} variant="info" size="small" />
                        <Badge label={job.experienceLevel || 'Intermediate'} variant="default" size="small" />
                        {matchScore && (
                            <Badge label={`${matchScore}% Match`} variant="success" size="small" />
                        )}
                    </View>
                </View>

                {/* Quick Stats */}
                <View style={[styles.statsRow, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
                    <View style={styles.statItem}>
                        <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Salary</Text>
                        <Text style={[styles.statValue, { color: colors.text }]}>
                            {job.salary?.min ? `$${job.salary.min / 1000}k - $${job.salary.max / 1000}k` : 'Not Disclosure'}
                        </Text>
                    </View>
                    <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.statItem}>
                        <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Applicants</Text>
                        <Text style={[styles.statValue, { color: colors.text }]}>
                            {job.applicants?.length || 0}
                        </Text>
                    </View>
                </View>

                {/* Description */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Description</Text>
                    <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>
                        {job.description || 'No description provided.'}
                    </Text>
                </View>

                {/* Requirements */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Requirements</Text>
                    <View style={styles.skillsContainer}>
                        {(job.requirements?.skills || []).map((skill, index) => (
                            <View key={index} style={[styles.skillChip, { backgroundColor: colors.backgroundSecondary }]}>
                                <Text style={[styles.skillText, { color: colors.textSecondary }]}>{skill}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Responsibilities */}
                {job.responsibilities && job.responsibilities.length > 0 && (
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Responsibilities</Text>
                        {job.responsibilities.map((item, index) => (
                            <View key={index} style={styles.listItem}>
                                <View style={[styles.listDot, { backgroundColor: colors.primary }]} />
                                <Text style={[styles.listText, { color: colors.textSecondary }]}>{item}</Text>
                            </View>
                        ))}
                    </View>
                )}

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Footer Apply Button */}
            <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
                <Button
                    title="Apply Now with AI Interview"
                    onPress={handleApply}
                    size="large"
                    style={styles.applyButton}
                />
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.md,
    },
    backButton: {
        padding: Spacing.xs,
    },
    shareButton: {
        padding: Spacing.xs,
    },
    scrollContent: {
        paddingHorizontal: Spacing.xl,
    },
    companySection: {
        alignItems: 'center',
        marginTop: Spacing.lg,
        marginBottom: Spacing.xxl,
    },
    logoContainer: {
        width: 80,
        height: 80,
        borderRadius: BorderRadius.xl,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.lg,
        ...Shadows.md,
    },
    logoText: {
        ...Typography.h1,
        fontWeight: '800',
    },
    jobTitle: {
        ...Typography.h2,
        textAlign: 'center',
        marginBottom: Spacing.xs,
    },
    companyName: {
        ...Typography.body,
        textAlign: 'center',
        marginBottom: Spacing.md,
    },
    badgeRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    statsRow: {
        flexDirection: 'row',
        paddingVertical: Spacing.xl,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        marginBottom: Spacing.xxl,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statLabel: {
        ...Typography.small,
        marginBottom: 4,
    },
    statValue: {
        ...Typography.bodyMedium,
        fontWeight: '700',
    },
    statDivider: {
        width: 1,
        height: '100%',
    },
    section: {
        marginBottom: Spacing.xxl,
    },
    sectionTitle: {
        ...Typography.h3,
        marginBottom: Spacing.md,
    },
    descriptionText: {
        ...Typography.body,
        lineHeight: 24,
    },
    skillsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    skillChip: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.md,
    },
    skillText: {
        ...Typography.caption,
        fontWeight: '500',
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: Spacing.sm,
    },
    listDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginTop: 9,
        marginRight: Spacing.md,
    },
    listText: {
        ...Typography.body,
        flex: 1,
        lineHeight: 24,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: Spacing.xl,
        paddingBottom: Spacing.xxxl,
        borderTopWidth: 1,
    },
    applyButton: {
        width: '100%',
    },
});

export default JobDetailScreen;
