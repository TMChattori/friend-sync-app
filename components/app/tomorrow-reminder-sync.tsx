import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useRegistration } from '@/components/auth/registration-context';
import { fetchEvents } from '@/services/events-api';
import { syncTomorrowScheduleReminders } from '@/services/tomorrow-reminders';

export function TomorrowReminderSync() {
  const { authSession } = useRegistration();

  useEffect(() => {
    if (Platform.OS === 'web' || !authSession?.accessToken || !authSession.email) {
      return;
    }

    let isActive = true;

    async function syncReminders() {
      try {
        const events = await fetchEvents(authSession);
        if (!isActive) {
          return;
        }

        await syncTomorrowScheduleReminders(events);
      } catch {
        // 通知同期の失敗は画面表示を止めないようにします。
      }
    }

    void syncReminders();

    return () => {
      isActive = false;
    };
  }, [authSession]);

  return null;
}
