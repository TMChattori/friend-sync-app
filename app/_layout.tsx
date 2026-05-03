import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { TomorrowReminderSync } from '@/components/app/tomorrow-reminder-sync';
import { RegistrationProvider } from '@/components/auth/registration-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { configureTomorrowReminderHandler } from '@/services/tomorrow-reminders';

export const unstable_settings = {
  anchor: 'register',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    configureTomorrowReminderHandler();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <RegistrationProvider>
        <TomorrowReminderSync />
        <Stack initialRouteName="register">
          <Stack.Screen name="register" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </RegistrationProvider>
    </ThemeProvider>
  );
}
