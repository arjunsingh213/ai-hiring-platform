/**
 * Froscel Mobile - App Entry Point
 */

import React, { useEffect } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { Colors } from './src/theme';

export default function App() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme] || Colors.light;

    return (
        <SafeAreaProvider>
            <StatusBar
                barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
                backgroundColor={colors.background}
            />
            <AppNavigator />
        </SafeAreaProvider>
    );
}
