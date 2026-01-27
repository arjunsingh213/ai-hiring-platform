/**
 * Froscel Mobile - Job Listings Screen
 * Browse and search jobs
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    RefreshControl,
    TextInput,
    TouchableOpacity,
    useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card, Badge, Button, SkeletonCard } from '../../components/common';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme';
import { jobAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';

const JobListingsScreen = ({ navigation }) => {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme] || Colors.light;
    const { user } = useAuthStore();

    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState({});

    useEffect(() => {
        fetchJobs();
    }, [filters]);

    const fetchJobs = async () => {
        try {
            setLoading(true);
            const response = await jobAPI.getJobs(filters);
            if (response.success) {
                setJobs(response.data || []);
            }
        } catch (error) {
            console.error('Error fetching jobs:', error);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchJobs();
        setRefreshing(false);
    }, [filters]);

    const handleJobPress = (job) => {
        if (!job) return;
        const id = job?._id || job?.id;
        if (!id) return;
        navigation.navigate('JobDetail', { jobId: id, job });
    };

    const getFilteredJobs = () => {
        if (!searchQuery.trim()) return jobs;

        const query = searchQuery.toLowerCase();
        return jobs.filter(job =>
            job.title?.toLowerCase().includes(query) ||
            job.company?.name?.toLowerCase().includes(query) ||
            job.requirements?.skills?.some(s => s.toLowerCase().includes(query))
        );
    };

    const renderItem = ({ item }) => {
        if (!item) return null;
        const matchScore = item.matchScore?.overall || null;

        return (
            <Card
                onPress={() => handleJobPress(item)}
                style={styles.jobCard}
            >
                <View style={styles.cardHeader}>
                    <View style={[styles.companyLogo, { backgroundColor: colors.backgroundTertiary }]}>
                        <Text style={[styles.logoText, { color: colors.primary }]}>
                            {item.company?.name?.charAt(0) || 'C'}
                        </Text>
                    </View>

                    <View style={styles.jobInfo}>
                        <Text style={[styles.jobTitle, { color: colors.text }]} numberOfLines={1}>
                            {item.title}
                        </Text>
                        <Text style={[styles.companyName, { color: colors.textSecondary }]}>
                            {item.company?.name || 'Company'}
                        </Text>
                    </View>

                    {matchScore && (
                        <View style={[styles.matchBadge, { backgroundColor: `${colors.success}20` }]}>
                            <Text style={[styles.matchText, { color: colors.success }]}>
                                {matchScore}% Match
                            </Text>
                        </View>
                    )}
                </View>

                <View style={styles.detailsRow}>
                    <View style={styles.detailItem}>
                        <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                        <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                            {item.location?.city || 'Remote'}
                        </Text>
                    </View>

                    <View style={styles.detailItem}>
                        <Ionicons name="briefcase-outline" size={14} color={colors.textSecondary} />
                        <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                            {item.type || 'Full-time'}
                        </Text>
                    </View>

                    {item.salary?.min && (
                        <View style={styles.detailItem}>
                            <Ionicons name="cash-outline" size={14} color={colors.textSecondary} />
                            <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                                ${item.salary.min / 1000}k - ${item.salary.max / 1000}k
                            </Text>
                        </View>
                    )}
                </View>

                {/* Match Score & Insights */}
                {matchScore ? (
                    <View style={[styles.matchContainer, { backgroundColor: `${colors.success}10` }]}>
                        <View style={styles.matchRow}>
                            <Ionicons name="sparkles" size={16} color={colors.success} />
                            <Text style={[styles.matchText, { color: colors.success }]}>
                                {matchScore}% AI Match
                            </Text>
                        </View>
                        <Text style={[styles.matchDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                            {item.matchScore?.reasoning || 'Matches your skills and experience level.'}
                        </Text>
                    </View>
                ) : (
                    <View style={styles.skillsRow}>
                        {(item.requirements?.skills || []).slice(0, 3).map((skill, index) => (
                            <View key={index} style={[styles.skillChip, { backgroundColor: colors.backgroundSecondary }]}>
                                <Text style={[styles.skillText, { color: colors.textSecondary }]}>{skill}</Text>
                            </View>
                        ))}
                    </View>
                )}
            </Card>
        );
    };

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <Ionicons name="briefcase-outline" size={64} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No jobs found</Text>
            <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
                Try adjusting your search or filters
            </Text>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.background }]}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Browse Jobs</Text>
            </View>

            {/* Search Bar */}
            <View style={[styles.searchContainer, { backgroundColor: colors.surface }, Shadows.sm]}>
                <Ionicons name="search" size={20} color={colors.textSecondary} />
                <TextInput
                    style={[styles.searchInput, { color: colors.text }]}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onSubmitEditing={fetchJobs} // Trigger backend search
                    placeholder="Search jobs, companies, skills..."
                    placeholderTextColor={colors.textTertiary}
                    returnKeyType="search"
                />
                <TouchableOpacity onPress={() => navigation.navigate('JobFilters', { filters, setFilters })}>
                    <Ionicons name="options-outline" size={24} color={colors.primary} />
                </TouchableOpacity>
            </View>

            {/* Filter Chips */}
            <View style={styles.filterContainer}>
                {['Remote', 'Full-time', 'Entry Level'].map((filter) => (
                    <TouchableOpacity
                        key={filter}
                        style={[
                            styles.filterChip,
                            {
                                backgroundColor: filters[filter.toLowerCase()]
                                    ? colors.primary
                                    : colors.backgroundSecondary,
                            },
                        ]}
                        onPress={() => setFilters(prev => ({
                            ...prev,
                            [filter.toLowerCase()]: !prev[filter.toLowerCase()],
                        }))}
                    >
                        <Text
                            style={[
                                styles.filterText,
                                {
                                    color: filters[filter.toLowerCase()]
                                        ? '#FFFFFF'
                                        : colors.textSecondary,
                                },
                            ]}
                        >
                            {filter}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Job List */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    {[1, 2, 3].map(i => (
                        <Card key={i} style={styles.jobCard}>
                            <SkeletonCard />
                        </Card>
                    ))}
                </View>
            ) : (
                <FlatList
                    data={getFilteredJobs()}
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
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: Spacing.lg,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.lg,
        marginBottom: Spacing.md,
    },
    searchInput: {
        flex: 1,
        ...Typography.body,
        marginLeft: Spacing.sm,
        marginRight: Spacing.sm,
    },
    filterContainer: {
        flexDirection: 'row',
        paddingHorizontal: Spacing.lg,
        marginBottom: Spacing.lg,
        gap: Spacing.sm,
    },
    filterChip: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.full,
    },
    filterText: {
        ...Typography.small,
        fontWeight: '500',
    },
    listContent: {
        padding: Spacing.lg,
        paddingBottom: 100,
    },
    loadingContainer: {
        padding: Spacing.lg,
    },
    jobCard: {
        marginBottom: Spacing.md,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    companyLogo: {
        width: 48,
        height: 48,
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoText: {
        ...Typography.h3,
        fontWeight: '700',
    },
    jobInfo: {
        flex: 1,
        marginLeft: Spacing.md,
    },
    jobTitle: {
        ...Typography.bodyMedium,
        marginBottom: 2,
    },
    companyName: {
        ...Typography.caption,
    },
    matchBadge: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: BorderRadius.full,
    },
    matchText: {
        ...Typography.small,
        fontWeight: '600',
    },
    detailsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.lg,
        marginBottom: Spacing.md,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    detailText: {
        ...Typography.small,
        marginLeft: 4,
    },
    skillsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.xs,
    },
    skillChip: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: BorderRadius.sm,
    },
    skillText: {
        ...Typography.small,
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
    },
});

export default JobListingsScreen;
