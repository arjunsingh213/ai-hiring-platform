/**
 * Froscel Mobile - Home Feed Screen
 * System-generated achievement feed
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    RefreshControl,
    TouchableOpacity,
    Animated,
    useColorScheme,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card, Badge, SkeletonCard } from '../../components/common';
import { Colors, Typography, Spacing, Animations } from '../../theme';
import { notificationAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';

const HomeFeedScreen = ({ navigation }) => {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme] || Colors.light;
    const { user } = useAuthStore();

    const [feed, setFeed] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        fetchFeed();
        fetchUnreadCount();
    }, []);

    const fetchFeed = async () => {
        try {
            setLoading(true);
            const userId = user?._id || user?.id;
            if (!userId) {
                setLoading(false);
                return;
            }

            const response = await notificationAPI.getNotifications(userId, 20);
            if (response.success) {
                setFeed(response.notifications || []);
            }
        } catch (error) {
            console.error('Error fetching feed:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUnreadCount = async () => {
        try {
            const userId = user?._id || user?.id;
            if (!userId) return;

            const response = await notificationAPI.getUnreadCount(userId);
            if (response.success) {
                setUnreadCount(response.count || 0);
            }
        } catch (error) {
            console.error('Error fetching unread count:', error);
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([fetchFeed(), fetchUnreadCount()]);
        setRefreshing(false);
    }, []);

    const handleItemPress = async (item) => {
        if (!item) return;
        const itemId = item?._id || item?.id;
        if (!itemId) return;

        if (!item.read) {
            await notificationAPI.markAsRead(itemId);
            setFeed(prev => prev.map(f => (f?._id === itemId || f?.id === itemId) ? { ...f, read: true } : f));
            setUnreadCount(prev => Math.max(0, prev - 1));
        }

        if (item.actionUrl) {
            // Parse action URL and navigate
            if (item.actionUrl.includes('interview')) {
                navigation.navigate('Interviews');
            } else if (item.actionUrl.includes('job')) {
                navigation.navigate('Jobs');
            } else if (item.actionUrl.includes('passport')) {
                navigation.navigate('Passport');
            }
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'interview_completed':
                return { name: 'checkmark-circle', color: colors.success };
            case 'interview_pending':
            case 'under_review':
                return { name: 'time', color: colors.warning };
            case 'passport_updated':
                return { name: 'ribbon', color: colors.primary };
            case 'profile_viewed':
                return { name: 'eye', color: colors.info };
            case 'job_matched':
                return { name: 'briefcase', color: colors.primary };
            case 'job_applied':
                return { name: 'document-text', color: colors.success };
            default:
                return { name: 'notifications', color: colors.textSecondary };
        }
    };

    const formatTime = (date) => {
        const now = new Date();
        const notifDate = new Date(date);
        const diffMs = now - notifDate;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return notifDate.toLocaleDateString();
    };

    const renderItem = ({ item, index }) => {
        if (!item) return null;
        const icon = getIcon(item.type);
        const animatedValue = new Animated.Value(0);

        Animated.timing(animatedValue, {
            toValue: 1,
            duration: 200,
            delay: index * Animations.staggerDelay,
            useNativeDriver: true,
        }).start();

        return (
            <Animated.View
                style={{
                    opacity: animatedValue,
                    transform: [{
                        translateY: animatedValue.interpolate({
                            inputRange: [0, 1],
                            outputRange: [20, 0],
                        })
                    }],
                }}
            >
                <Card
                    onPress={() => handleItemPress(item)}
                    style={[
                        styles.feedCard,
                        !item.read && styles.unreadCard,
                        { borderLeftColor: !item.read ? colors.primary : 'transparent' }
                    ]}
                >
                    <View style={styles.cardContent}>
                        <View style={[styles.iconContainer, { backgroundColor: `${icon.color}15` }]}>
                            <Ionicons name={icon.name} size={24} color={icon.color} />
                        </View>

                        <View style={styles.textContent}>
                            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                                {item.title || item.message?.split('.')[0]}
                            </Text>
                            <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
                                {item.message}
                            </Text>
                            <Text style={[styles.timestamp, { color: colors.textTertiary }]}>
                                {formatTime(item.createdAt)}
                            </Text>
                        </View>

                        {!item.read && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
                    </View>
                </Card>
            </Animated.View>
        );
    };

    const renderHeader = () => (
        <View style={[styles.header, { backgroundColor: colors.background }]}>
            <View style={styles.headerLeft}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Activity</Text>
            </View>
            <TouchableOpacity style={styles.bellContainer}>
                <Ionicons name="notifications-outline" size={24} color={colors.text} />
                {unreadCount > 0 && (
                    <View style={[styles.badge, { backgroundColor: colors.danger }]}>
                        <Text style={styles.badgeText}>
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>
        </View>
    );

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={64} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No activity yet</Text>
            <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
                Complete interviews and apply to jobs to see your progress here
            </Text>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            {renderHeader()}

            {loading ? (
                <View style={styles.loadingContainer}>
                    {[1, 2, 3, 4].map(i => (
                        <Card key={i} style={styles.feedCard}>
                            <SkeletonCard />
                        </Card>
                    ))}
                </View>
            ) : (
                <FlatList
                    data={feed}
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerTitle: {
        ...Typography.h2,
    },
    bellContainer: {
        position: 'relative',
        padding: Spacing.sm,
    },
    badge: {
        position: 'absolute',
        top: 0,
        right: 0,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '700',
    },
    listContent: {
        padding: Spacing.lg,
        paddingBottom: 100,
    },
    loadingContainer: {
        padding: Spacing.lg,
    },
    feedCard: {
        marginBottom: Spacing.md,
        borderLeftWidth: 3,
    },
    unreadCard: {
        borderLeftWidth: 3,
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.md,
    },
    textContent: {
        flex: 1,
    },
    title: {
        ...Typography.bodyMedium,
        marginBottom: 4,
    },
    description: {
        ...Typography.caption,
        marginBottom: 8,
        lineHeight: 20,
    },
    timestamp: {
        ...Typography.small,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginLeft: Spacing.sm,
        marginTop: 4,
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
    },
});

export default HomeFeedScreen;
