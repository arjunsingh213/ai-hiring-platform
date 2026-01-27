/**
 * Froscel Mobile - Profile Screen
 * User profile and settings
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Alert,
    useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card, Button } from '../../components/common';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme';
import { userAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';

const ProfileScreen = ({ navigation }) => {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme] || Colors.light;
    const { user, logout, refreshUser } = useAuthStore();

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        refreshUser();
    }, []);

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        await logout();
                        navigation.reset({
                            index: 0,
                            routes: [{ name: 'Auth' }],
                        });
                    },
                },
            ]
        );
    };

    const renderMenuItem = (icon, title, subtitle, onPress, showBadge = false) => (
        <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: colors.surface }]}
            onPress={onPress}
        >
            <View style={[styles.menuIcon, { backgroundColor: `${colors.primary}10` }]}>
                <Ionicons name={icon} size={20} color={colors.primary} />
            </View>
            <View style={styles.menuContent}>
                <Text style={[styles.menuTitle, { color: colors.text }]}>{title}</Text>
                {subtitle && (
                    <Text style={[styles.menuSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
                )}
            </View>
            {showBadge && (
                <View style={[styles.badge, { backgroundColor: colors.danger }]}>
                    <Text style={styles.badgeText}>1</Text>
                </View>
            )}
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
        </TouchableOpacity>
    );

    const userName = user?.profile?.name || 'User';
    const userEmail = user?.email || '';
    const userPhoto = user?.profile?.photo;
    const headline = user?.profile?.headline || 'Job Seeker';

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
                        <Ionicons name="settings-outline" size={24} color={colors.text} />
                    </TouchableOpacity>
                </View>

                {/* Profile Card */}
                <Card style={styles.profileCard}>
                    <View style={styles.profileHeader}>
                        <View style={[styles.avatar, { backgroundColor: colors.backgroundTertiary }]}>
                            {userPhoto ? (
                                <Image source={{ uri: userPhoto }} style={styles.avatarImage} />
                            ) : (
                                <Text style={[styles.avatarText, { color: colors.primary }]}>
                                    {userName.charAt(0).toUpperCase()}
                                </Text>
                            )}
                            <TouchableOpacity
                                style={[styles.editAvatarButton, { backgroundColor: colors.primary }]}
                            >
                                <Ionicons name="camera" size={14} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.profileInfo}>
                            <Text style={[styles.userName, { color: colors.text }]}>{userName}</Text>
                            <Text style={[styles.headline, { color: colors.textSecondary }]}>{headline}</Text>
                            <Text style={[styles.email, { color: colors.textTertiary }]}>{userEmail}</Text>
                        </View>
                    </View>

                    <Button
                        title="Edit Profile"
                        variant="outline"
                        size="small"
                        onPress={() => navigation.navigate('EditProfile')}
                        style={styles.editButton}
                    />
                </Card>

                {/* Menu Sections */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Account</Text>

                    {renderMenuItem(
                        'person-outline',
                        'Personal Information',
                        'Name, contact, location',
                        () => navigation.navigate('EditProfile')
                    )}
                    {renderMenuItem(
                        'document-text-outline',
                        'Resume',
                        user?.resume ? 'Uploaded' : 'Not uploaded',
                        () => navigation.navigate('ResumeUpload')
                    )}
                    {renderMenuItem(
                        'briefcase-outline',
                        'Job Preferences',
                        'Role, salary, location',
                        () => navigation.navigate('Preferences')
                    )}
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Settings</Text>

                    {renderMenuItem(
                        'notifications-outline',
                        'Notifications',
                        'Push, email preferences',
                        () => navigation.navigate('NotificationSettings')
                    )}
                    {renderMenuItem(
                        'shield-outline',
                        'Privacy',
                        'Profile visibility, data',
                        () => navigation.navigate('PrivacySettings')
                    )}
                    {renderMenuItem(
                        'help-circle-outline',
                        'Help & Support',
                        'FAQ, contact us',
                        () => navigation.navigate('Help')
                    )}
                </View>

                <View style={styles.section}>
                    <TouchableOpacity
                        style={[styles.logoutButton, { backgroundColor: colors.dangerLight }]}
                        onPress={handleLogout}
                    >
                        <Ionicons name="log-out-outline" size={20} color={colors.danger} />
                        <Text style={[styles.logoutText, { color: colors.danger }]}>Logout</Text>
                    </TouchableOpacity>
                </View>

                {/* App Version */}
                <Text style={[styles.version, { color: colors.textTertiary }]}>
                    Froscel v1.0.0
                </Text>
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
    profileCard: {
        marginHorizontal: Spacing.lg,
        marginBottom: Spacing.xl,
    },
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    avatar: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    avatarImage: {
        width: 72,
        height: 72,
        borderRadius: 36,
    },
    avatarText: {
        ...Typography.h1,
        fontWeight: '700',
    },
    editAvatarButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    profileInfo: {
        flex: 1,
        marginLeft: Spacing.lg,
    },
    userName: {
        ...Typography.h3,
        marginBottom: 2,
    },
    headline: {
        ...Typography.caption,
        marginBottom: 4,
    },
    email: {
        ...Typography.small,
    },
    editButton: {
        alignSelf: 'flex-start',
    },
    section: {
        marginBottom: Spacing.xl,
    },
    sectionTitle: {
        ...Typography.small,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
        paddingHorizontal: Spacing.xl,
        marginBottom: Spacing.md,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.xl,
        marginHorizontal: Spacing.lg,
        marginBottom: Spacing.sm,
        borderRadius: BorderRadius.lg,
    },
    menuIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    menuContent: {
        flex: 1,
        marginLeft: Spacing.md,
    },
    menuTitle: {
        ...Typography.bodyMedium,
    },
    menuSubtitle: {
        ...Typography.small,
        marginTop: 2,
    },
    badge: {
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.sm,
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '700',
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.md,
        marginHorizontal: Spacing.lg,
        borderRadius: BorderRadius.lg,
    },
    logoutText: {
        ...Typography.bodyMedium,
        marginLeft: Spacing.sm,
    },
    version: {
        ...Typography.small,
        textAlign: 'center',
        marginBottom: 100,
        marginTop: Spacing.xl,
    },
});

export default ProfileScreen;
