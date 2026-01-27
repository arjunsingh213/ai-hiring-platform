/**
 * Froscel Mobile - Navigation Configuration
 * Complete navigation setup with all stacks
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme, View, Platform } from 'react-native';
import { Colors } from '../theme';

// Auth Screens
import SplashScreen from '../screens/auth/SplashScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import SignupScreen from '../screens/auth/SignupScreen';
import VerifyEmailScreen from '../screens/auth/VerifyEmailScreen';

// Main Screens
import HomeFeedScreen from '../screens/home/HomeFeedScreen';
import InterviewListScreen from '../screens/interviews/InterviewListScreen';
import PreInterviewCheckScreen from '../screens/interviews/PreInterviewCheckScreen';
import LiveInterviewScreen from '../screens/interviews/LiveInterviewScreen';
import SubmissionConfirmationScreen from '../screens/interviews/SubmissionConfirmationScreen';
import JobListingsScreen from '../screens/jobs/JobListingsScreen';
import JobDetailScreen from '../screens/jobs/JobDetailScreen';
import TalentPassportScreen from '../screens/passport/TalentPassportScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import ResumeUploadScreen from '../screens/profile/ResumeUploadScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Auth Stack
const AuthStack = () => (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
    </Stack.Navigator>
);

// Home Stack
const HomeStack = () => (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="HomeFeed" component={HomeFeedScreen} />
    </Stack.Navigator>
);

// Interview Stack
const InterviewStack = () => (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="InterviewList" component={InterviewListScreen} />
        <Stack.Screen name="PreInterviewCheck" component={PreInterviewCheckScreen} />
        <Stack.Screen name="LiveInterview" component={LiveInterviewScreen} />
        <Stack.Screen name="SubmissionConfirmation" component={SubmissionConfirmationScreen} />
    </Stack.Navigator>
);

// Jobs Stack
const JobsStack = () => (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="JobListings" component={JobListingsScreen} />
        <Stack.Screen name="JobDetail" component={JobDetailScreen} />
    </Stack.Navigator>
);

// Passport Stack
const PassportStack = () => (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="PassportMain" component={TalentPassportScreen} />
    </Stack.Navigator>
);

// Profile Stack
const ProfileStack = () => (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="ProfileMain" component={ProfileScreen} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="ResumeUpload" component={ResumeUploadScreen} />
    </Stack.Navigator>
);

// Main Tab Navigator
const MainTabs = () => {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme] || Colors.light;

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textTertiary,
                tabBarStyle: {
                    backgroundColor: colors.surface,
                    borderTopColor: colors.border,
                    borderTopWidth: 1,
                    height: Platform.OS === 'ios' ? 88 : 60,
                    paddingBottom: Platform.OS === 'ios' ? 28 : 8,
                    paddingTop: 8,
                },
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '500',
                },
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName;

                    switch (route.name) {
                        case 'Home':
                            iconName = focused ? 'home' : 'home-outline';
                            break;
                        case 'Interviews':
                            iconName = focused ? 'videocam' : 'videocam-outline';
                            break;
                        case 'Jobs':
                            iconName = focused ? 'briefcase' : 'briefcase-outline';
                            break;
                        case 'Passport':
                            iconName = focused ? 'ribbon' : 'ribbon-outline';
                            break;
                        case 'Profile':
                            iconName = focused ? 'person' : 'person-outline';
                            break;
                        default:
                            iconName = 'ellipse';
                    }

                    return <Ionicons name={iconName} size={22} color={color} />;
                },
            })}
        >
            <Tab.Screen name="Home" component={HomeStack} />
            <Tab.Screen name="Interviews" component={InterviewStack} />
            <Tab.Screen name="Jobs" component={JobsStack} />
            <Tab.Screen name="Passport" component={PassportStack} />
            <Tab.Screen name="Profile" component={ProfileStack} />
        </Tab.Navigator>
    );
};

// Root Navigator
const AppNavigator = () => {
    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                <Stack.Screen name="Splash" component={SplashScreen} />
                <Stack.Screen name="Auth" component={AuthStack} />
                <Stack.Screen name="Main" component={MainTabs} />
            </Stack.Navigator>
        </NavigationContainer>
    );
};

export default AppNavigator;
