/**
 * Froscel Mobile - Edit Profile Screen
 * Update user profile information
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
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

const EditProfileScreen = ({ navigation }) => {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme] || Colors.light;
    const { user, updateUser, isLoading } = useAuthStore();

    const [formData, setFormData] = useState({
        name: user?.profile?.name || '',
        headline: user?.profile?.headline || '',
        bio: user?.profile?.bio || '',
        location: user?.profile?.location || '',
        phone: user?.profile?.phone || '',
    });

    const [errors, setErrors] = useState({});

    const updateField = (field, value) => {
        setFormData({ ...formData, [field]: value });
        if (errors[field]) {
            setErrors({ ...errors, [field]: null });
        }
    };

    const handleSave = async () => {
        if (!formData.name.trim()) {
            setErrors({ name: 'Name is required' });
            return;
        }

        const result = await updateUser({
            profile: {
                ...(user?.profile || {}),
                ...formData
            }
        });

        if (result.success) {
            Alert.alert('Success', 'Profile updated successfully!', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } else {
            Alert.alert('Error', result.error || 'Failed to update profile');
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Edit Profile</Text>
                <TouchableOpacity onPress={handleSave} disabled={isLoading}>
                    <Text style={[styles.saveText, { color: colors.primary, opacity: isLoading ? 0.5 : 1 }]}>
                        Save
                    </Text>
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.flex}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.form}>
                        <Input
                            label="Full Name"
                            value={formData.name}
                            onChangeText={(text) => updateField('name', text)}
                            placeholder="Enter your full name"
                            error={errors.name}
                        />

                        <Input
                            label="Headline"
                            value={formData.headline}
                            onChangeText={(text) => updateField('headline', text)}
                            placeholder="e.g. Senior Software Engineer"
                        />

                        <Input
                            label="Location"
                            value={formData.location}
                            onChangeText={(text) => updateField('location', text)}
                            placeholder="e.g. London, UK"
                        />

                        <Input
                            label="Phone Number"
                            value={formData.phone}
                            onChangeText={(text) => updateField('phone', text)}
                            placeholder="+1 234 567 890"
                            keyboardType="phone-pad"
                        />

                        <Input
                            label="Bio"
                            value={formData.bio}
                            onChangeText={(text) => updateField('bio', text)}
                            placeholder="Tell us about yourself"
                            multiline
                            numberOfLines={4}
                        />
                    </View>

                    <Button
                        title="Update Profile"
                        onPress={handleSave}
                        loading={isLoading}
                        style={styles.submitButton}
                    />
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    flex: {
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
    headerTitle: {
        ...Typography.h3,
    },
    backButton: {
        padding: Spacing.xs,
    },
    saveText: {
        ...Typography.bodyMedium,
        fontWeight: '700',
    },
    scrollContent: {
        padding: Spacing.xl,
    },
    form: {
        marginBottom: Spacing.xxl,
    },
    submitButton: {
        width: '100%',
        marginBottom: Spacing.xxxl,
    },
});

export default EditProfileScreen;
