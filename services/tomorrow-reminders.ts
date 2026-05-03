import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { type Event } from '@/data/mock-data';
import { addDays, enumerateDateRange, parseDateKey } from '@/utils/date-range';

const REMINDER_KIND = 'tomorrow-schedule-reminder';
const REMINDER_CHANNEL_ID = 'tomorrow-schedule-reminders';
const MAX_TITLE_COUNT = 3;

type ReminderEntry = {
  targetDate: string;
  titles: string[];
  triggerAt: Date;
};

function buildReminderBody(titles: string[]) {
  if (titles.length <= MAX_TITLE_COUNT) {
    return titles.join(' / ');
  }

  const visibleTitles = titles.slice(0, MAX_TITLE_COUNT).join(' / ');
  return `${visibleTitles} ほか${titles.length - MAX_TITLE_COUNT}件`;
}

function buildReminderEntries(events: Event[]) {
  const reminders = new Map<string, Set<string>>();

  for (const event of events) {
    for (const eventDate of enumerateDateRange(event.date, event.endDate)) {
      const titles = reminders.get(eventDate) ?? new Set<string>();
      titles.add(event.title);
      reminders.set(eventDate, titles);
    }
  }

  return Array.from(reminders.entries())
    .map(([targetDate, titleSet]) => {
      const reminderDate = parseDateKey(addDays(targetDate, -1));
      reminderDate.setHours(21, 0, 0, 0);

      return {
        targetDate,
        titles: Array.from(titleSet),
        triggerAt: reminderDate,
      } satisfies ReminderEntry;
    })
    .filter((entry) => entry.triggerAt.getTime() > Date.now())
    .sort((left, right) => left.triggerAt.getTime() - right.triggerAt.getTime());
}

async function ensurePermissions() {
  if (Platform.OS === 'web') {
    return false;
  }

  const permission = await Notifications.getPermissionsAsync();
  if (permission.granted) {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

async function ensureChannel() {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
    name: '翌日の予定リマインド',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export function configureTomorrowReminderHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function syncTomorrowScheduleReminders(events: Event[]) {
  if (!(await ensurePermissions())) {
    return;
  }

  await ensureChannel();

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const managedNotifications = scheduled.filter(
    (notification) => notification.content.data?.kind === REMINDER_KIND
  );

  await Promise.all(
    managedNotifications.map((notification) =>
      Notifications.cancelScheduledNotificationAsync(notification.identifier)
    )
  );

  const reminderEntries = buildReminderEntries(events);
  await Promise.all(
    reminderEntries.map((entry) =>
      Notifications.scheduleNotificationAsync({
        content: {
          title: '明日の予定があります',
          body: buildReminderBody(entry.titles),
          data: {
            kind: REMINDER_KIND,
            targetDate: entry.targetDate,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: entry.triggerAt,
          channelId: Platform.OS === 'android' ? REMINDER_CHANNEL_ID : undefined,
        },
      })
    )
  );
}
