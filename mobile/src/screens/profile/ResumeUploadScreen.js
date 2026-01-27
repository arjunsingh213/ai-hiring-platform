/**
 * Froscel Mobile - Resume Upload Screen
 * Manage resume files
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    useColorScheme,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { Button, Card } from '../../components/common';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import { resumeAPI, userAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';

const ResumeUploadScreen = ({ navigation }) => {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme] || Colors.light;
    const { user } = useAuthStore();

    const [uploading, setUploading] = useState(false);
    const [resume, setResume] = useState(user?.resume || null);
    const { updateUser } = useAuthStore();

    const handleUpload = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
                copyToCacheDirectory: true,
            });

            if (result.canceled) return;

            const file = result.assets[0];
            setUploading(true);

            // 1. Create FormData for upload
            const formData = new FormData();
            formData.append('resume', {
                uri: file.uri,
                name: file.name,
                type: file.mimeType,
            });

            // 2. Clear old data and parse new
            const response = await resumeAPI.parseResume(formData);

            if (response.success) {
                // 3. Update local user state
                const newResume = {
                    name: file.name,
                    date: new Date().toISOString(),
                    path: response.data?.path,
                    parsedData: response.data
                };

                await updateUser({ resume: newResume });
                setResume(newResume);
                Alert.alert('Success', 'Resume uploaded and parsed successfully!');
            } else {
                Alert.alert('Upload Failed', response.error || 'Failed to parse resume');
            }
        } catch (error) {
            console.error('Resume upload error:', error);
            Alert.alert('Error', 'An unexpected error occurred during upload.');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = () => {
        Alert.alert('Delete Resume', 'Are you sure you want to remove your resume?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => setResume(null) }
        ]);
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>My Resume</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.content}>
                <View style={styles.infoSection}>
                    <Text style={[styles.infoTitle, { color: colors.text }]}>Upload Your Resume</Text>
                    <Text style={[styles.infoSubtitle, { color: colors.textSecondary }]}>
                        Upload your latest resume to improve your match score and speed up applications.
                    </Text>
                </View>

                {resume ? (
                    <Card style={styles.resumeCard}>
                        <View style={styles.resumeIcon}>
                            <Ionicons name="document-text" size={32} color={colors.primary} />
                        </View>
                        <View style={styles.resumeInfo}>
                            <Text style={[styles.resumeName, { color: colors.text }]} numberOfLines={1}>
                                {resume.name || 'Current Resume'}
                            </Text>
                            <Text style={[styles.resumeDate, { color: colors.textSecondary }]}>
                                Uploaded on {new Date(resume.date || Date.now()).toLocaleDateString()}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={handleDelete}>
                            <Ionicons name="trash-outline" size={24} color={colors.danger} />
                        </TouchableOpacity>
                    </Card>
                ) : (
                    <TouchableOpacity style={[styles.uploadArea, { borderColor: colors.border }]} onPress={handleUpload}>
                        <Ionicons name="cloud-upload-outline" size={48} color={colors.textTertiary} />
                        <Text style={[styles.uploadText, { color: colors.textSecondary }]}>
                            Tap to select a file (PDF, DOCX)
                        </Text>
                    </TouchableOpacity>
                )}

                <View style={styles.tipsSection}>
                    <Text style={[styles.tipsTitle, { color: colors.text }]}>Tips</Text>
                    <View style={styles.tipItem}>
                        <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                        <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                            Ensure your contact info is clear
                        </Text>
                    </View>
                    <View style={styles.tipItem}>
                        <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                        <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                            Use keywords mentioned in job descriptions
                        </Text>
                    </View>
                </View>

                <View style={styles.spacer} />

                <Button
                    title={resume ? "Replace Resume" : "Upload Resume"}
                    onPress={handleUpload}
                    loading={uploading}
                    variant={resume ? "outline" : "primary"}
                    size="large"
                    style={styles.button}
                />
            </View>
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
        ...Typography.h3,
    },
    backButton: {
        padding: Spacing.xs,
    },
    content: {
        flex: 1,
        padding: Spacing.xl,
    },
    infoSection: {
        marginBottom: Spacing.xxxl,
    },
    infoTitle: {
        ...Typography.h2,
        marginBottom: Spacing.sm,
    },
    infoSubtitle: {
        ...Typography.body,
        lineHeight: 24,
    },
    resumeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.lg,
        marginBottom: Spacing.xxxl,
    },
    resumeIcon: {
        marginRight: Spacing.md,
    },
    resumeInfo: {
        flex: 1,
    },
    resumeName: {
        ...Typography.bodyMedium,
        fontWeight: '700',
    },
    resumeDate: {
        ...Typography.small,
        marginTop: 2,
    },
    uploadArea: {
        borderWidth: 2,
        borderStyle: 'dashed',
        borderRadius: BorderRadius.xl,
        height: 180,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.xxxl,
    },
    uploadText: {
        ...Typography.body,
        marginTop: Spacing.md,
    },
    tipsSection: {
        marginBottom: Spacing.xxl,
    },
    tipsTitle: {
        ...Typography.bodyMedium,
        fontWeight: '700',
        marginBottom: Spacing.md,
    },
    tipItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    tipText: {
        ...Typography.caption,
        marginLeft: Spacing.sm,
    },
    spacer: {
        flex: 1,
    },
    button: {
        marginBottom: Spacing.xxxl,
    },
});

export default ResumeUploadScreen;
