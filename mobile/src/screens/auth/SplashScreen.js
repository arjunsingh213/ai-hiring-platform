/**
 * Froscel Mobile - Splash Screen
 * Initial loading screen with auth state check
 */

import React, { useEffect } from 'react';
import {
    View,
    Image,
    StyleSheet,
    Animated,
    StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import useAuthStore from '../../store/authStore';

const SplashScreen = ({ navigation }) => {
    const fadeAnim = React.useRef(new Animated.Value(0)).current;
    const { initialize, isAuthenticated, isLoading: authLoading } = useAuthStore();

    useEffect(() => {
        // Fade in animation
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
        }).start();

        // Initialize auth state
        initializeApp();
    }, []);

    useEffect(() => {
        // Navigate after auth check completes
        if (!authLoading) {
            // Small delay for visual smoothness
            setTimeout(() => {
                if (isAuthenticated) {
                    navigation.replace('Main');
                } else {
                    navigation.replace('Auth');
                }
            }, 500);
        }
    }, [authLoading, isAuthenticated]);

    const initializeApp = async () => {
        await initialize();
    };

    return (
        <LinearGradient
            colors={['#0F172A', '#1E293B']}
            style={styles.container}
        >
            <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

            <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                <Image
                    source={require('../../../assets/icon.png')}
                    style={styles.logo}
                    resizeMode="contain"
                />

                <View style={styles.loadingContainer}>
                    <View style={styles.loadingDots}>
                        {[0, 1, 2].map((index) => (
                            <LoadingDot key={index} delay={index * 200} />
                        ))}
                    </View>
                </View>

                <View style={styles.brandContainer}>
                    <Animated.Text style={[styles.brandName, { opacity: fadeAnim }]}>
                        Froscel
                    </Animated.Text>
                    <Animated.Text style={[styles.tagline, { opacity: fadeAnim }]}>
                        AI-Powered Hiring Excellence
                    </Animated.Text>
                </View>
            </Animated.View>
        </LinearGradient>
    );
};

// Loading dot component with animation
const LoadingDot = ({ delay }) => {
    const opacity = React.useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.delay(delay),
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.3,
                    duration: 400,
                    useNativeDriver: true,
                }),
            ])
        );
        animation.start();
        return () => animation.stop();
    }, []);

    return (
        <Animated.View style={[styles.dot, { opacity }]} />
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        alignItems: 'center',
    },
    logo: {
        width: 120,
        height: 120,
        marginBottom: 32,
    },
    loadingContainer: {
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingDots: {
        flexDirection: 'row',
        gap: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#64748B',
    },
    brandContainer: {
        marginTop: 32,
        alignItems: 'center',
    },
    brandName: {
        fontSize: 32,
        fontWeight: '300',
        color: '#F8FAFC',
        letterSpacing: 2,
    },
    tagline: {
        fontSize: 14,
        color: '#94A3B8',
        marginTop: 8,
        letterSpacing: 0.5,
    },
});

export default SplashScreen;
