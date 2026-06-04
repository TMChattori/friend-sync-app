import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useRegistration } from '@/components/auth/registration-context';
import { AppCard } from '@/components/common/app-card';
import { AppButton } from '@/components/common/app-button';
import { Event, WEEK_LABELS } from '@/data/mock-data';
import { createEvent, deleteEvent, fetchEvents, updateEvent } from '@/services/events-api';
import { readCachedJson, writeCachedJson } from '@/services/local-cache';
import { syncTomorrowScheduleReminders } from '@/services/tomorrow-reminders';
import { compareDateKeys, formatDateKey, formatDateRangeLabel, isDateWithinRange, parseDateKey } from '@/utils/date-range';

type FormMode = 'create' | 'edit';
type PickerMode = 'startDate' | 'endDate' | 'startTime' | 'endTime' | null;

type EventCategory = {
  id: string;
  name: string;
  color: string;
};

type CalendarDayCell = {
  date: string;
  dayNumber: number;
  isCurrentMonth: boolean;
};

type CalendarMonth = {
  key: string;
  year: number;
  monthIndex: number;
  title: string;
  days: CalendarDayCell[];
};

type CalendarEventSpan = {
  event: Event;
  lane: number;
  startCol: number;
  endCol: number;
  startsInWeek: boolean;
  endsInWeek: boolean;
};

const MONTH_NAMES = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
const DEFAULT_CATEGORY_ID = 'uncategorized';

const DEFAULT_EVENT_CATEGORIES: EventCategory[] = [
  { id: DEFAULT_CATEGORY_ID, name: '未分類', color: '#7b8a97' },
  { id: 'fun', name: '娯楽', color: '#51c2d5' },
  { id: 'birthday', name: '誕生日', color: '#b9a99f' },
  { id: 'work', name: '仕事', color: '#6b39d8' },
  { id: 'beauty', name: '美容', color: '#d61c86' },
  { id: 'exercise', name: '運動', color: '#55c78a' },
  { id: 'meal', name: 'ごはん', color: '#ff9828' },
];

const CATEGORY_COLOR_OPTIONS = ['#7b8a97', '#51c2d5', '#b9a99f', '#6b39d8', '#d61c86', '#c76a14', '#ffd93d', '#55c78a', '#ff9828', '#1697a6'];
const WHEEL_ITEM_HEIGHT = 52;
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, index) => index);
const MINUTE_OPTIONS = Array.from({ length: 6 }, (_, index) => index * 10);
const YEAR_RANGE_RADIUS = 50;
const CATEGORY_STORAGE_KEY_PREFIX = 'friend-sync-calendar-categories';
const MAX_VISIBLE_EVENT_LANES = 3;
const EVENT_BAR_HEIGHT = 16;
const EVENT_BAR_GAP = 4;
const EVENT_BAR_TOP = 28;
const EVENT_BAR_SIDE_INSET = 2;

let secureStoreModulePromise: Promise<typeof import('expo-secure-store') | null> | null = null;

async function getSecureStoreModule() {
  if (Platform.OS === 'web') {
    return null;
  }

  if (!secureStoreModulePromise) {
    secureStoreModulePromise = import('expo-secure-store');
  }

  return secureStoreModulePromise;
}

function buildCategoryStorageKey(userKey: string) {
  const normalizedUserKey = (userKey || 'guest').replace(/[^0-9A-Za-z._-]/g, '_') || 'guest';
  return `${CATEGORY_STORAGE_KEY_PREFIX}_${normalizedUserKey}`;
}

async function getStoredCategoryPayload(userKey: string) {
  const storageKey = buildCategoryStorageKey(userKey);
  const secureStoreModule = await getSecureStoreModule();

  if (secureStoreModule && typeof secureStoreModule.getItemAsync === 'function') {
    return secureStoreModule.getItemAsync(storageKey);
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.localStorage.getItem(storageKey);
  }

  return null;
}

async function setStoredCategoryPayload(userKey: string, categories: EventCategory[]) {
  const storageKey = buildCategoryStorageKey(userKey);
  const payload = JSON.stringify(categories);
  const secureStoreModule = await getSecureStoreModule();

  if (secureStoreModule && typeof secureStoreModule.setItemAsync === 'function') {
    await secureStoreModule.setItemAsync(storageKey, payload);
    return;
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.localStorage.setItem(storageKey, payload);
  }
}

function getTodayDateKey() {
  return formatDateKey(new Date());
}

function createCalendarMonth(year: number, monthIndex: number): CalendarMonth {
  const firstDay = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0);
  const startOffset = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  const cells: CalendarDayCell[] = [];

  for (let offset = startOffset; offset > 0; offset -= 1) {
    const date = new Date(year, monthIndex, 1 - offset);
    cells.push({
      date: formatDateKey(date),
      dayNumber: date.getDate(),
      isCurrentMonth: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, monthIndex, day);
    cells.push({
      date: formatDateKey(date),
      dayNumber: day,
      isCurrentMonth: true,
    });
  }

  while (cells.length % 7 !== 0 || cells.length < 35) {
    const date = new Date(year, monthIndex, daysInMonth + (cells.length - (startOffset + daysInMonth)) + 1);
    cells.push({
      date: formatDateKey(date),
      dayNumber: date.getDate(),
      isCurrentMonth: false,
    });
  }

  return {
    key: `${year}-${String(monthIndex + 1).padStart(2, '0')}`,
    year,
    monthIndex,
    title: `${year}年 ${MONTH_NAMES[monthIndex]}`,
    days: cells,
  };
}

function createCalendarMonths(year: number) {
  return Array.from({ length: 12 }, (_, monthIndex) => createCalendarMonth(year, monthIndex));
}

function chunkMonthDays(days: CalendarDayCell[]) {
  const weeks: CalendarDayCell[][] = [];
  for (let index = 0; index < days.length; index += 7) {
    weeks.push(days.slice(index, index + 7));
  }
  return weeks;
}

function formatTimeRange(startTime?: string, endTime?: string) {
  if (startTime && endTime) {
    return `${startTime} - ${endTime}`;
  }

  return startTime ?? '--:--';
}

function buildEventTime(event: Event) {
  return event.time || formatTimeRange(event.startTime, event.endTime);
}

function getCategoryById(categories: EventCategory[], categoryId?: string) {
  return categories.find((category) => category.id === categoryId) ?? categories.find((category) => category.id === DEFAULT_CATEGORY_ID) ?? categories[0];
}

function parseTimeParts(time: string) {
  const [hour, minute] = time.split(':').map(Number);
  return {
    hour: Number.isFinite(hour) ? hour : 0,
    minute: Number.isFinite(minute) ? minute : 0,
  };
}

function formatTimePart(value: number) {
  return String(value).padStart(2, '0');
}

function buildTimeValue(hour: number, minute: number) {
  return `${formatTimePart(hour)}:${formatTimePart(minute)}`;
}

function buildWeekEventSpans(weekDays: CalendarDayCell[], events: Event[]) {
  if (weekDays.length === 0) {
    return [];
  }

  const weekStart = weekDays[0].date;
  const weekEnd = weekDays[weekDays.length - 1].date;
  const overlappingEvents = events
    .filter((event) => isDateWithinRange(weekStart, event.startDate, event.endDate) || isDateWithinRange(weekEnd, event.startDate, event.endDate) || isDateWithinRange(event.startDate, weekStart, weekEnd))
    .sort((left, right) => {
      const startCompare = compareDateKeys(left.startDate, right.startDate);
      if (startCompare !== 0) {
        return startCompare;
      }

      const leftEnd = left.endDate ?? left.startDate;
      const rightEnd = right.endDate ?? right.startDate;
      const endCompare = compareDateKeys(rightEnd, leftEnd);
      if (endCompare !== 0) {
        return endCompare;
      }

      return left.title.localeCompare(right.title, 'ja');
    });

  const laneBusyUntil = new Map<number, number>();
  const spans: CalendarEventSpan[] = [];

  for (const event of overlappingEvents) {
    const effectiveEndDate = event.endDate ?? event.startDate;
    const startCol = weekDays.findIndex((day) => isDateWithinRange(day.date, event.startDate, event.startDate));
    const endCol = [...weekDays].reverse().findIndex((day) => isDateWithinRange(day.date, effectiveEndDate, effectiveEndDate));
    const normalizedStartCol = startCol === -1 ? 0 : startCol;
    const normalizedEndCol = endCol === -1 ? weekDays.length - 1 : weekDays.length - 1 - endCol;
    const startsInWeek = compareDateKeys(event.startDate, weekStart) >= 0;
    const endsInWeek = compareDateKeys(effectiveEndDate, weekEnd) <= 0;

    let lane = 0;
    while ((laneBusyUntil.get(lane) ?? -1) >= normalizedStartCol) {
      lane += 1;
    }

    laneBusyUntil.set(lane, normalizedEndCol);
    spans.push({
      event,
      lane,
      startCol: normalizedStartCol,
      endCol: normalizedEndCol,
      startsInWeek,
      endsInWeek,
    });
  }

  return spans.filter((span) => span.lane < MAX_VISIBLE_EVENT_LANES);
}

export function CalendarScreenContent() {
  const { authSession } = useRegistration();
  const { width } = useWindowDimensions();
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonthIndex = today.getMonth();
  const initialDateKey = getTodayDateKey();
  const initialDate = parseDateKey(initialDateKey);
  const scrollViewRef = useRef<ScrollView | null>(null);
  const monthOffsetsRef = useRef<Record<string, number>>({});
  const hasInitialScrolledRef = useRef(false);
  const [monthLayoutVersion, setMonthLayoutVersion] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isShowingCachedEvents, setIsShowingCachedEvents] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isFormModalVisible, setIsFormModalVisible] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [pickerMode, setPickerMode] = useState<PickerMode>(null);
  const [draftStartDate, setDraftStartDate] = useState(initialDateKey);
  const [draftEndDate, setDraftEndDate] = useState(initialDateKey);
  const [draftStartTime, setDraftStartTime] = useState('18:00');
  const [draftEndTime, setDraftEndTime] = useState('19:00');
  const [pickerYear, setPickerYear] = useState(initialDate.getFullYear());
  const [pickerMonth, setPickerMonth] = useState(initialDate.getMonth() + 1);
  const [pickerDay, setPickerDay] = useState(initialDate.getDate());
  const [displayYear, setDisplayYear] = useState(initialDate.getFullYear());
  const [pickerHour, setPickerHour] = useState(18);
  const [pickerMinute, setPickerMinute] = useState(0);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftCategoryId, setDraftCategoryId] = useState(DEFAULT_CATEGORY_ID);
  const [categories, setCategories] = useState<EventCategory[]>(DEFAULT_EVENT_CATEGORIES);
  const [areCategoriesReady, setAreCategoriesReady] = useState(false);
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  const [isEditingCategories, setIsEditingCategories] = useState(false);
  const gridGap = 0;
  const calendarHorizontalPadding = 10;
  const screenHorizontalPadding = 8;
  const availableGridWidth = width - screenHorizontalPadding * 2 - calendarHorizontalPadding * 2;
  const dayCellWidth = Math.max(42, Math.floor((availableGridWidth - gridGap * 6) / 7));
  const currentUserId = authSession?.publicUserId ?? '';
  const categoryOwnerKey = authSession?.authUserId ?? authSession?.email ?? 'guest';
  const eventCacheScope = authSession?.authUserId ?? authSession?.email ?? 'guest';
  const calendarMonths = useMemo(() => createCalendarMonths(displayYear), [displayYear]);
  const yearOptions = useMemo(
    () => Array.from({ length: YEAR_RANGE_RADIUS * 2 + 1 }, (_, index) => currentYear - YEAR_RANGE_RADIUS + index),
    [currentYear]
  );
  const monthOptions = useMemo(() => Array.from({ length: 12 }, (_, index) => index + 1), []);
  const dayOptions = useMemo(
    () => Array.from({ length: new Date(pickerYear, pickerMonth, 0).getDate() }, (_, index) => index + 1),
    [pickerMonth, pickerYear]
  );
  const calendarWeeksByMonth = useMemo(
    () => calendarMonths.map((month) => chunkMonthDays(month.days)),
    [calendarMonths]
  );

  const selectedSchedules = useMemo(
    () => (selectedDate ? events.filter((event) => isDateWithinRange(selectedDate, event.startDate, event.endDate)) : []),
    [events, selectedDate]
  );

  const pickerTitle =
    pickerMode === 'startDate'
      ? '開始日を選択'
      : pickerMode === 'endDate'
        ? '終了日を選択'
        : pickerMode
          ? '時刻を選択'
          : '';
  const selectedCategory = getCategoryById(categories, draftCategoryId);
  const applyPickerValue = () => {
    if (pickerMode === 'startDate' || pickerMode === 'endDate') {
      applyDatePickerValue();
      return;
    }

    if (pickerMode === 'startTime' || pickerMode === 'endTime') {
      applyTimePickerValue();
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadEvents = async () => {
      const cachedEvents = await readCachedJson<Event[]>('events', eventCacheScope);

      if (cachedEvents && cachedEvents.length > 0 && isMounted) {
        setEvents(cachedEvents);
        setSyncError(null);
        setIsShowingCachedEvents(true);
        setIsLoading(false);
      }

      try {
        setIsLoading(!cachedEvents || cachedEvents.length === 0);
        setIsRefreshing(!!cachedEvents && cachedEvents.length > 0);
        const apiEvents = await fetchEvents(authSession);
        if (isMounted) {
          setEvents(apiEvents);
          setSyncError(null);
          setIsShowingCachedEvents(false);
          await writeCachedJson('events', eventCacheScope, apiEvents);
        }
      } catch {
        if (isMounted) {
          setSyncError(
            cachedEvents && cachedEvents.length > 0
              ? '前回の予定を表示しています。最新情報の取得に失敗しました。'
              : 'APIに接続できないため、ローカル予定を表示しています。'
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    };

    loadEvents();

    return () => {
      isMounted = false;
    };
  }, [authSession, eventCacheScope]);

  useEffect(() => {
    let isMounted = true;

    async function loadStoredCategories() {
      setAreCategoriesReady(false);
      try {
        const payload = await getStoredCategoryPayload(categoryOwnerKey);
        if (!payload || !isMounted) {
          setCategories(DEFAULT_EVENT_CATEGORIES);
          setAreCategoriesReady(true);
          return;
        }

        const parsed = JSON.parse(payload) as EventCategory[];
        if (!Array.isArray(parsed) || parsed.length === 0) {
          setCategories(DEFAULT_EVENT_CATEGORIES);
          setAreCategoriesReady(true);
          return;
        }

        setCategories(parsed);
        setAreCategoriesReady(true);
      } catch {
        if (isMounted) {
          setCategories(DEFAULT_EVENT_CATEGORIES);
          setAreCategoriesReady(true);
        }
      }
    }

    void loadStoredCategories();

    return () => {
      isMounted = false;
    };
  }, [categoryOwnerKey]);

  useEffect(() => {
    if (!areCategoriesReady) {
      return;
    }
    void setStoredCategoryPayload(categoryOwnerKey, categories);
  }, [areCategoriesReady, categories, categoryOwnerKey]);

  useEffect(() => {
    if (!authSession?.accessToken || !authSession.email) {
      return;
    }

    void syncTomorrowScheduleReminders(events);
  }, [authSession, events]);

  useEffect(() => {
    if (displayYear !== currentYear || hasInitialScrolledRef.current) {
      return;
    }

    const targetMonth = calendarMonths[currentMonthIndex];
    const targetOffset = targetMonth ? monthOffsetsRef.current[targetMonth.key] : undefined;
    if (targetOffset === undefined || !scrollViewRef.current) {
      return;
    }

    hasInitialScrolledRef.current = true;
    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollTo({ y: Math.max(targetOffset - 12, 0), animated: false });
    });
  }, [calendarMonths, currentMonthIndex, currentYear, displayYear, monthLayoutVersion]);

  const closeFormModal = () => {
    Keyboard.dismiss();
    setIsFormModalVisible(false);
    setIsCategoryModalVisible(false);
    setIsEditingCategories(false);
    setPickerMode(null);
    setEditingEventId(null);
  };

  const openCreateModalForDate = (targetDate: string) => {
    const parsed = parseDateKey(targetDate);
    setFormMode('create');
    setEditingEventId(null);
    setDraftStartDate(targetDate);
    setDraftEndDate(targetDate);
    setPickerYear(parsed.getFullYear());
    setPickerMonth(parsed.getMonth() + 1);
    setPickerDay(parsed.getDate());
    setDraftStartTime('18:00');
    setDraftEndTime('19:00');
    setDraftTitle('');
    setDraftCategoryId(DEFAULT_CATEGORY_ID);
    setPickerMode(null);
    setIsFormModalVisible(true);
  };

  const openEditModal = (event: Event) => {
    const parsed = parseDateKey(event.startDate);
    setFormMode('edit');
    setEditingEventId(event.id);
    setDraftStartDate(event.startDate);
    setDraftEndDate(event.endDate ?? event.startDate);
    setPickerYear(parsed.getFullYear());
    setPickerMonth(parsed.getMonth() + 1);
    setPickerDay(parsed.getDate());
    setDraftStartTime(event.startTime ?? event.time.split(' - ')[0] ?? '18:00');
    setDraftEndTime(event.endTime ?? event.time.split(' - ')[1] ?? '19:00');
    setDraftTitle(event.title);
    setDraftCategoryId(event.category ?? DEFAULT_CATEGORY_ID);
    setPickerMode(null);
    setIsFormModalVisible(true);
  };

  const updateCategoryName = (categoryId: string, name: string) => {
    setCategories((current) => current.map((category) => (category.id === categoryId ? { ...category, name } : category)));
  };

  const updateCategoryColor = (categoryId: string, color: string) => {
    setCategories((current) => current.map((category) => (category.id === categoryId ? { ...category, color } : category)));
  };

  const addCategory = () => {
    const id = `custom-${Date.now()}`;
    const color = CATEGORY_COLOR_OPTIONS[categories.length % CATEGORY_COLOR_OPTIONS.length];
    setCategories((current) => [
      ...current,
      {
        id,
        name: '新しい色',
        color,
      },
    ]);
    setDraftCategoryId(id);
    setIsEditingCategories(true);
  };

  const openDatePicker = (mode: 'startDate' | 'endDate') => {
    const sourceDate = mode === 'startDate' ? draftStartDate : draftEndDate;
    const parsed = parseDateKey(sourceDate);
    setPickerYear(parsed.getFullYear());
    setPickerMonth(parsed.getMonth() + 1);
    setPickerDay(parsed.getDate());
    setPickerMode(mode);
  };

  const applyDatePickerValue = () => {
    const safeDay = Math.min(pickerDay, new Date(pickerYear, pickerMonth, 0).getDate());
    const nextDate = formatDateKey(new Date(pickerYear, pickerMonth - 1, safeDay));
    if (pickerMode === 'startDate') {
      setDraftStartDate(nextDate);
      if (nextDate > draftEndDate) {
        setDraftEndDate(nextDate);
      }
    }
    if (pickerMode === 'endDate') {
      setDraftEndDate(nextDate);
      if (nextDate < draftStartDate) {
        setDraftStartDate(nextDate);
      }
    }
    setPickerDay(safeDay);
    setPickerMode(null);
  };

  const openTimePicker = (mode: 'startTime' | 'endTime') => {
    const parts = parseTimeParts(mode === 'startTime' ? draftStartTime : draftEndTime);
    setPickerHour(parts.hour);
    setPickerMinute(MINUTE_OPTIONS.reduce((closest, minute) => (
      Math.abs(minute - parts.minute) < Math.abs(closest - parts.minute) ? minute : closest
    ), MINUTE_OPTIONS[0]));
    setPickerMode(mode);
  };

  const applyTimePickerValue = () => {
    const time = buildTimeValue(pickerHour, pickerMinute);
    if (pickerMode === 'startTime') {
      setDraftStartTime(time);
    }

    if (pickerMode === 'endTime') {
      setDraftEndTime(time);
    }

    setPickerMode(null);
  };

  const updateWheelValue = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
    options: number[],
    onChange: (value: number) => void
  ) => {
    const index = Math.round(event.nativeEvent.contentOffset.y / WHEEL_ITEM_HEIGHT);
    const value = options[Math.min(Math.max(index, 0), options.length - 1)];

    if (value !== undefined) {
      onChange(value);
    }
  };

  const handleSubmitSchedule = async () => {
    const trimmedTitle = draftTitle.trim();

    if (!trimmedTitle) {
      Alert.alert('入力を確認', '予定名を入力してください。');
      return;
    }

    if (draftStartDate > draftEndDate) {
      Alert.alert('入力を確認', '終了日は開始日以降にしてください。');
      return;
    }

    if (draftStartTime >= draftEndTime) {
      Alert.alert('入力を確認', '終了時刻は開始時刻より後にしてください。');
      return;
    }

    if (!currentUserId) {
      Alert.alert('ログイン情報を確認', '再ログインしてから予定を操作してください。');
      return;
    }

    try {
      if (formMode === 'edit' && editingEventId) {
        const updated = await updateEvent(editingEventId, {
          userId: currentUserId,
          startDate: draftStartDate,
          endDate: draftEndDate,
          title: trimmedTitle,
          startTime: draftStartTime,
          endTime: draftEndTime,
          category: draftCategoryId,
        }, authSession);
        setEvents((current) => current.map((event) => (event.id === editingEventId ? updated : event)));
        setSelectedDate(draftStartDate);
        setSyncError(null);
        closeFormModal();
        Alert.alert('予定を更新', `${formatDateRangeLabel(draftStartDate, draftEndDate)} の予定を更新しました`);
        return;
      }

      const created = await createEvent({
        userId: currentUserId,
        startDate: draftStartDate,
        endDate: draftEndDate,
        title: trimmedTitle,
        startTime: draftStartTime,
        endTime: draftEndTime,
        category: draftCategoryId,
      }, authSession);
      setEvents((current) => [...current, created]);
      setSelectedDate(draftStartDate);
      setSyncError(null);
      closeFormModal();
      Alert.alert('予定追加', `${formatDateRangeLabel(draftStartDate, draftEndDate)} に予定を追加しました`);
    } catch {
      try {
        const latestEvents = await fetchEvents(authSession);
        setEvents(latestEvents);

        const matchedEvent = latestEvents.find((event) =>
          event.startDate === draftStartDate &&
          (event.endDate ?? event.startDate) === draftEndDate &&
          event.title === trimmedTitle &&
          event.startTime === draftStartTime &&
          event.endTime === draftEndTime &&
          (event.category ?? DEFAULT_CATEGORY_ID) === draftCategoryId
        );

        if (matchedEvent) {
          setSelectedDate(draftStartDate);
          setSyncError(null);
          closeFormModal();
          Alert.alert('予定追加', '予定は登録されました。通信確認に失敗したため、一覧を再同期しています。');
          return;
        }
      } catch {
        // Fall through to the generic error alert below.
      }

      Alert.alert('予定保存に失敗', 'サーバーとの接続を確認してください。');
    }
  };

  const handleDeleteSchedule = (event: Event) => {
    Alert.alert('予定を削除', `「${event.title}」を削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteEvent(event.id, authSession);
            setEvents((current) => current.filter((item) => item.id !== event.id));
            Alert.alert('削除しました', '予定を削除しました。');
          } catch {
            Alert.alert('削除に失敗', 'サーバーとの接続を確認してください。');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView ref={scrollViewRef} style={styles.container} contentContainerStyle={styles.content}>
        {calendarMonths.map((month, monthIndex) => (
          <AppCard
            key={month.key}
            style={styles.calendarCard}
            onLayout={(event) => {
              monthOffsetsRef.current[month.key] = event.nativeEvent.layout.y;
              setMonthLayoutVersion((current) => current + 1);
            }}>
            <View style={styles.calendarHeader}>
              <View style={styles.calendarHeaderInfo}>
                <Text style={styles.monthTitle}>{month.title}</Text>
                <Text style={styles.monthMeta}>自分だけの予定を月で管理</Text>
                {monthIndex === 0 && syncError ? <Text style={styles.syncText}>{syncError}</Text> : null}
                {monthIndex === 0 && isShowingCachedEvents ? <Text style={styles.syncText}>前回の予定を先に表示しています。</Text> : null}
                {monthIndex === 0 && isRefreshing ? <Text style={styles.syncText}>最新の予定を更新中です...</Text> : null}
                {monthIndex === 0 && isLoading ? <Text style={styles.syncText}>予定を読み込み中です...</Text> : null}
              </View>
              {monthIndex === 0 ? (
                <View style={styles.yearSwitchRow}>
                  <Pressable onPress={() => setDisplayYear((current) => current - 1)} style={styles.yearSwitchButton}>
                    <Text style={styles.yearSwitchText}>前年</Text>
                  </Pressable>
                  <Text style={styles.yearSwitchLabel}>{displayYear}年</Text>
                  <Pressable onPress={() => setDisplayYear((current) => current + 1)} style={styles.yearSwitchButton}>
                    <Text style={styles.yearSwitchText}>翌年</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>

            <View style={styles.weekRow}>
              {WEEK_LABELS.map((label, index) => (
                <Text key={label} style={[styles.weekLabel, index === 0 && styles.sunLabel, index === 6 && styles.satLabel]}>
                  {label}
                </Text>
              ))}
            </View>
            <View style={styles.grid}>
              {calendarWeeksByMonth[monthIndex]?.map((weekDays, weekIndex) => {
                const weekSpans = buildWeekEventSpans(weekDays, events);
                const weekHeight = dayCellWidth + 54;

                return (
                  <View key={`${month.key}-week-${weekIndex}`} style={[styles.weekBlock, { height: weekHeight }]}>
                    <View style={styles.weekCellsRow}>
                      {weekDays.map((day, dayIndex) => {
                        const isSelected = day.date === selectedDate;
                        const isSunday = dayIndex === 0;
                        const isSaturday = dayIndex === 6;

                        return (
                          <Pressable
                            key={day.date}
                            onPress={() => setSelectedDate(day.date)}
                            style={[
                              styles.dayCell,
                              { width: dayCellWidth, minHeight: weekHeight },
                              day.isCurrentMonth ? styles.dayCellCurrent : styles.dayCellMuted,
                              isSelected && styles.dayCellSelected,
                            ]}>
                            <Text
                              style={[
                                styles.dayNumber,
                                !day.isCurrentMonth && styles.dayNumberMuted,
                                isSunday && day.isCurrentMonth && styles.sunText,
                                isSaturday && day.isCurrentMonth && styles.satText,
                                isSelected && styles.dayNumberSelected,
                              ]}>
                              {day.dayNumber}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    <View pointerEvents="none" style={styles.weekBarsOverlay}>
                      {weekSpans.map((span) => {
                        const category = getCategoryById(categories, span.event.category);
                        const laneTop = EVENT_BAR_TOP + span.lane * (EVENT_BAR_HEIGHT + EVENT_BAR_GAP);
                        const spanWidth =
                          (span.endCol - span.startCol + 1) * dayCellWidth +
                          (span.endCol - span.startCol) * gridGap -
                          EVENT_BAR_SIDE_INSET * 2;
                        const left = span.startCol * (dayCellWidth + gridGap) + EVENT_BAR_SIDE_INSET;

                        return (
                          <View
                            key={`${span.event.id}-${weekIndex}-${span.lane}`}
                            style={[
                              styles.eventSpanBar,
                              {
                                top: laneTop,
                                left,
                                width: Math.max(spanWidth, dayCellWidth - EVENT_BAR_SIDE_INSET * 2),
                                backgroundColor: category.color,
                                borderTopLeftRadius: span.startsInWeek ? 6 : 0,
                                borderBottomLeftRadius: span.startsInWeek ? 6 : 0,
                                borderTopRightRadius: span.endsInWeek ? 6 : 0,
                                borderBottomRightRadius: span.endsInWeek ? 6 : 0,
                              },
                            ]}>
                            <Text numberOfLines={1} ellipsizeMode="tail" style={styles.eventSpanText}>
                              {span.startsInWeek ? span.event.title : ''}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </View>
          </AppCard>
        ))}
      </ScrollView>

      <Modal animationType="slide" transparent visible={isFormModalVisible} onRequestClose={closeFormModal}>
        <Pressable style={styles.modalBackdrop} onPress={closeFormModal}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.formModalWrap}>
            <Pressable style={styles.formModalCard} onPress={() => {}}>
              {isCategoryModalVisible ? (
                <>
                  <View style={styles.categoryModalHeader}>
                    <Pressable
                      onPress={() => {
                        if (isEditingCategories) {
                          setIsEditingCategories(false);
                          return;
                        }
                        setIsCategoryModalVisible(false);
                      }}>
                      <Text style={styles.categoryHeaderAction}>戻る</Text>
                    </Pressable>
                    <Text style={styles.categoryModalTitle}>カレンダー</Text>
                    <Pressable onPress={() => setIsEditingCategories((current) => !current)}>
                      <Text style={styles.categoryHeaderAction}>{isEditingCategories ? '完了' : '編集'}</Text>
                    </Pressable>
                  </View>

                  <Text style={styles.categorySectionTitle}>カレンダーの色設定</Text>
                  {isEditingCategories ? <Text style={styles.categoryHelpText}>カテゴリー名と色を自由に変更できます。</Text> : null}
                  <ScrollView style={styles.categoryList} contentContainerStyle={styles.categoryListContent}>
                    {categories.map((category) => {
                      const isSelected = category.id === draftCategoryId;

                      if (isEditingCategories) {
                        return (
                          <View key={category.id} style={styles.categoryEditRow}>
                            <View style={styles.categoryEditNameRow}>
                              <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
                              <TextInput
                                value={category.name}
                                onChangeText={(text) => updateCategoryName(category.id, text)}
                                placeholder="カテゴリー名"
                                placeholderTextColor="#a0a8b5"
                                returnKeyType="done"
                                onSubmitEditing={Keyboard.dismiss}
                                style={styles.categoryNameInput}
                              />
                            </View>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorPalette}>
                              {CATEGORY_COLOR_OPTIONS.map((color) => (
                                <Pressable
                                  key={color}
                                  onPress={() => updateCategoryColor(category.id, color)}
                                  style={[
                                    styles.colorOption,
                                    { backgroundColor: color },
                                    color === category.color && styles.colorOptionSelected,
                                  ]}
                                />
                              ))}
                            </ScrollView>
                          </View>
                        );
                      }

                      return (
                        <View key={category.id} style={styles.categoryRow}>
                          <Pressable
                            style={styles.categorySelectArea}
                            onPress={() => {
                              setDraftCategoryId(category.id);
                              setIsCategoryModalVisible(false);
                            }}>
                            <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
                            <Text style={styles.categoryName}>{category.name}</Text>
                          </Pressable>

                          {isSelected ? <Text style={styles.categoryCheck}>✓</Text> : null}
                        </View>
                      );
                    })}

                    <Pressable style={styles.addCategoryRow} onPress={addCategory}>
                      <Text style={styles.addCategoryIcon}>＋</Text>
                      <Text style={styles.addCategoryText}>色作成</Text>
                    </Pressable>
                  </ScrollView>
                </>
              ) : (
                <>
                  <View style={styles.formContent}>
                    <Text style={styles.scheduleTitle}>{formMode === 'create' ? '予定を追加' : '予定を編集'}</Text>
                    <Text style={styles.scheduleMeta}>予定名を入れて、日付と時間を選んで保存できます。</Text>

                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>予定名</Text>
                      <TextInput
                        value={draftTitle}
                        onChangeText={setDraftTitle}
                        placeholder="例: 仕事終わりにごはん"
                        placeholderTextColor="#8a97ab"
                        returnKeyType="done"
                        onSubmitEditing={Keyboard.dismiss}
                        style={styles.formInput}
                      />
                    </View>

                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>開始日</Text>
                      <Pressable style={styles.pickerField} onPress={() => openDatePicker('startDate')}>
                        <Text style={styles.pickerFieldText}>{formatDateRangeLabel(draftStartDate)}</Text>
                        <Text style={styles.pickerFieldMeta}>変更</Text>
                      </Pressable>
                    </View>

                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>終了日</Text>
                      <Pressable style={styles.pickerField} onPress={() => openDatePicker('endDate')}>
                        <Text style={styles.pickerFieldText}>{formatDateRangeLabel(draftEndDate)}</Text>
                        <Text style={styles.pickerFieldMeta}>変更</Text>
                      </Pressable>
                    </View>

                    <View style={styles.timeRow}>
                      <View style={[styles.formGroup, styles.timeField]}>
                        <Text style={styles.formLabel}>開始</Text>
                        <Pressable style={styles.pickerField} onPress={() => openTimePicker('startTime')}>
                          <Text style={styles.pickerFieldText}>{draftStartTime}</Text>
                          <Text style={styles.pickerFieldMeta}>変更</Text>
                        </Pressable>
                      </View>
                      <View style={[styles.formGroup, styles.timeField]}>
                        <Text style={styles.formLabel}>終了</Text>
                        <Pressable style={styles.pickerField} onPress={() => openTimePicker('endTime')}>
                          <Text style={styles.pickerFieldText}>{draftEndTime}</Text>
                          <Text style={styles.pickerFieldMeta}>変更</Text>
                        </Pressable>
                      </View>
                    </View>

                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>色設定</Text>
                      <Pressable style={styles.categoryField} onPress={() => setIsCategoryModalVisible(true)}>
                        <View style={styles.categoryFieldLeft}>
                          <View style={[styles.categoryDot, { backgroundColor: selectedCategory.color }]} />
                          <Text style={styles.pickerFieldText}>{selectedCategory.name}</Text>
                        </View>
                        <Text style={styles.pickerFieldMeta}>変更</Text>
                      </Pressable>
                    </View>

                    {pickerMode ? (
                      <View style={styles.inlinePickerCard}>
                        <View style={styles.inlinePickerHeader}>
                          <Text style={styles.inlinePickerTitle}>{pickerTitle}</Text>
                          <View style={styles.inlinePickerHeaderActions}>
                            <Pressable onPress={applyPickerValue}>
                              <Text style={styles.inlinePickerApply}>決定</Text>
                            </Pressable>
                            <Pressable onPress={() => setPickerMode(null)}>
                              <Text style={styles.inlinePickerClose}>閉じる</Text>
                            </Pressable>
                          </View>
                        </View>
                        {pickerMode === 'startDate' || pickerMode === 'endDate' ? (
                          <>
                            <View style={styles.timeWheelViewport}>
                              <View style={styles.timeWheelSelectionBand} pointerEvents="none" />
                              <ScrollView
                                style={styles.timeWheelColumn}
                                contentContainerStyle={styles.timeWheelContent}
                                showsVerticalScrollIndicator={false}
                                snapToInterval={WHEEL_ITEM_HEIGHT}
                                decelerationRate="fast"
                                contentOffset={{ x: 0, y: Math.max(yearOptions.indexOf(pickerYear), 0) * WHEEL_ITEM_HEIGHT }}
                                onMomentumScrollEnd={(event) => updateWheelValue(event, yearOptions, setPickerYear)}
                                onScrollEndDrag={(event) => updateWheelValue(event, yearOptions, setPickerYear)}>
                                {yearOptions.map((year) => (
                                  <Pressable key={year} onPress={() => setPickerYear(year)} style={styles.timeWheelOption}>
                                    <Text style={[styles.timeWheelText, pickerYear === year && styles.timeWheelTextSelected]}>{year}</Text>
                                  </Pressable>
                                ))}
                              </ScrollView>
                              <ScrollView
                                style={styles.timeWheelColumn}
                                contentContainerStyle={styles.timeWheelContent}
                                showsVerticalScrollIndicator={false}
                                snapToInterval={WHEEL_ITEM_HEIGHT}
                                decelerationRate="fast"
                                contentOffset={{ x: 0, y: Math.max(monthOptions.indexOf(pickerMonth), 0) * WHEEL_ITEM_HEIGHT }}
                                onMomentumScrollEnd={(event) =>
                                  updateWheelValue(event, monthOptions, (monthValue) => {
                                    setPickerMonth(monthValue);
                                    setPickerDay((current) => Math.min(current, new Date(pickerYear, monthValue, 0).getDate()));
                                  })
                                }
                                onScrollEndDrag={(event) =>
                                  updateWheelValue(event, monthOptions, (monthValue) => {
                                    setPickerMonth(monthValue);
                                    setPickerDay((current) => Math.min(current, new Date(pickerYear, monthValue, 0).getDate()));
                                  })
                                }>
                                {monthOptions.map((monthValue) => (
                                  <Pressable
                                    key={monthValue}
                                    onPress={() => {
                                      setPickerMonth(monthValue);
                                      setPickerDay((current) => Math.min(current, new Date(pickerYear, monthValue, 0).getDate()));
                                    }}
                                    style={styles.timeWheelOption}>
                                    <Text style={[styles.timeWheelText, pickerMonth === monthValue && styles.timeWheelTextSelected]}>
                                      {formatTimePart(monthValue)}
                                    </Text>
                                  </Pressable>
                                ))}
                              </ScrollView>
                              <ScrollView
                                style={styles.timeWheelColumn}
                                contentContainerStyle={styles.timeWheelContent}
                                showsVerticalScrollIndicator={false}
                                snapToInterval={WHEEL_ITEM_HEIGHT}
                                decelerationRate="fast"
                                contentOffset={{ x: 0, y: Math.max(dayOptions.indexOf(pickerDay), 0) * WHEEL_ITEM_HEIGHT }}
                                onMomentumScrollEnd={(event) => updateWheelValue(event, dayOptions, setPickerDay)}
                                onScrollEndDrag={(event) => updateWheelValue(event, dayOptions, setPickerDay)}>
                                {dayOptions.map((dayValue) => (
                                  <Pressable key={dayValue} onPress={() => setPickerDay(dayValue)} style={styles.timeWheelOption}>
                                    <Text style={[styles.timeWheelText, pickerDay === dayValue && styles.timeWheelTextSelected]}>
                                      {formatTimePart(dayValue)}
                                    </Text>
                                  </Pressable>
                                ))}
                              </ScrollView>
                            </View>
                          </>
                        ) : (
                          <>
                            <View style={styles.timeWheelViewport}>
                              <View style={styles.timeWheelSelectionBand} pointerEvents="none" />
                              <ScrollView
                                style={styles.timeWheelColumn}
                                contentContainerStyle={styles.timeWheelContent}
                                showsVerticalScrollIndicator={false}
                                snapToInterval={WHEEL_ITEM_HEIGHT}
                                decelerationRate="fast"
                                contentOffset={{ x: 0, y: pickerHour * WHEEL_ITEM_HEIGHT }}
                                onMomentumScrollEnd={(event) => updateWheelValue(event, HOUR_OPTIONS, setPickerHour)}
                                onScrollEndDrag={(event) => updateWheelValue(event, HOUR_OPTIONS, setPickerHour)}>
                                {HOUR_OPTIONS.map((hour) => (
                                  <Pressable key={hour} onPress={() => setPickerHour(hour)} style={styles.timeWheelOption}>
                                    <Text style={[styles.timeWheelText, pickerHour === hour && styles.timeWheelTextSelected]}>{formatTimePart(hour)}</Text>
                                  </Pressable>
                                ))}
                              </ScrollView>
                              <Text style={styles.timeWheelColon}>:</Text>
                              <ScrollView
                                style={styles.timeWheelColumn}
                                contentContainerStyle={styles.timeWheelContent}
                                showsVerticalScrollIndicator={false}
                                snapToInterval={WHEEL_ITEM_HEIGHT}
                                decelerationRate="fast"
                                contentOffset={{ x: 0, y: Math.max(MINUTE_OPTIONS.indexOf(pickerMinute), 0) * WHEEL_ITEM_HEIGHT }}
                                onMomentumScrollEnd={(event) => updateWheelValue(event, MINUTE_OPTIONS, setPickerMinute)}
                                onScrollEndDrag={(event) => updateWheelValue(event, MINUTE_OPTIONS, setPickerMinute)}>
                                {MINUTE_OPTIONS.map((minute) => (
                                  <Pressable key={minute} onPress={() => setPickerMinute(minute)} style={styles.timeWheelOption}>
                                    <Text style={[styles.timeWheelText, pickerMinute === minute && styles.timeWheelTextSelected]}>{formatTimePart(minute)}</Text>
                                  </Pressable>
                                ))}
                              </ScrollView>
                            </View>
                          </>
                        )}
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.formFooter}>
                    <View style={styles.modalActions}>
                      <AppButton label="閉じる" variant="secondary" onPress={closeFormModal} />
                      <AppButton label={formMode === 'create' ? '予定追加' : '更新'} onPress={handleSubmitSchedule} />
                    </View>
                  </View>
                </>
              )}
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      <Modal animationType="fade" transparent visible={selectedDate !== null} onRequestClose={() => setSelectedDate(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setSelectedDate(null)}>
          <Pressable style={styles.scheduleModalCard} onPress={() => {}}>
            {selectedDate ? (
              <>
                <View style={styles.scheduleHeader}>
                  <View style={styles.scheduleHeaderInfoBlock}>
                    <Text style={styles.scheduleTitle}>{formatDateRangeLabel(selectedDate)} の予定</Text>
                    <Text style={styles.scheduleMeta}>この一覧は自分だけが見る前提のプライベートな予定メモです。</Text>
                  </View>
                  <View style={styles.scheduleHeaderActions}>
                    <AppButton
                      label="予定追加"
                      onPress={() => {
                        const targetDate = selectedDate;
                        if (!targetDate) {
                          return;
                        }
                        setSelectedDate(null);
                        openCreateModalForDate(targetDate);
                      }}
                    />
                    <Text style={styles.scheduleCount}>{selectedSchedules.length}件</Text>
                  </View>
                </View>
                {selectedSchedules.length > 0 ? (
                  selectedSchedules.map((schedule) => (
                    <View key={schedule.id} style={styles.scheduleItem}>
                      <View style={[styles.timeBadge, { backgroundColor: getCategoryById(categories, schedule.category).color }]}>
                        <Text style={styles.timeBadgeText}>{buildEventTime(schedule)}</Text>
                      </View>
                      <View style={styles.scheduleBody}>
                        <Text style={styles.scheduleItemTitle}>{schedule.title}</Text>
                        <Text style={styles.scheduleItemMemo}>{schedule.memo}</Text>
                        <View style={styles.scheduleActions}>
                          <AppButton
                            label="編集"
                            variant="secondary"
                            onPress={() => {
                              setSelectedDate(null);
                              openEditModal(schedule);
                            }}
                          />
                          <AppButton label="削除" variant="dark" onPress={() => handleDeleteSchedule(schedule)} />
                        </View>
                      </View>
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyTitle}>予定はまだありません</Text>
                    <Text style={styles.emptyText}>自分用のメモとして、気軽に予定を追加できる想定です。</Text>
                  </View>
                )}
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f6f7fb' },
  container: { flex: 1, backgroundColor: '#f6f7fb' },
  content: { paddingHorizontal: 8, paddingTop: 12, paddingBottom: 40, gap: 12 },
  calendarCard: { borderRadius: 24, padding: 10 },
  calendarHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, gap: 10 },
  calendarHeaderInfo: { flex: 1, minWidth: 0 },
  monthTitle: { fontSize: 24, fontWeight: '800', color: '#152033' },
  monthMeta: { fontSize: 13, color: '#74829a', marginTop: 4 },
  syncText: { marginTop: 4, fontSize: 12, color: '#6c7a90' },
  yearSwitchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  yearSwitchButton: { borderRadius: 999, backgroundColor: '#eef4ff', paddingHorizontal: 12, paddingVertical: 8 },
  yearSwitchText: { fontSize: 13, fontWeight: '800', color: '#1f6fff' },
  yearSwitchLabel: { fontSize: 14, fontWeight: '800', color: '#44536a' },
  weekRow: { flexDirection: 'row', marginBottom: 10 },
  weekLabel: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '700', color: '#7a879d' },
  sunLabel: { color: '#ef6a6a' },
  satLabel: { color: '#4e80ff' },
  grid: { gap: 0 },
  weekBlock: { position: 'relative' },
  weekCellsRow: { flexDirection: 'row', gap: 0 },
  weekBarsOverlay: { ...StyleSheet.absoluteFillObject },
  dayCell: {
    borderRadius: 0,
    paddingTop: 8,
    paddingHorizontal: 3,
    paddingBottom: 8,
    alignItems: 'stretch',
    justifyContent: 'flex-start',
    borderWidth: 1,
  },
  dayCellCurrent: { backgroundColor: '#fbfcff', borderColor: '#e7ebf3' },
  dayCellMuted: { backgroundColor: '#f5f7fb', borderColor: '#e7ebf3' },
  dayCellSelected: {
    backgroundColor: '#1f6fff',
    borderColor: '#1f6fff',
  },
  dayNumber: { fontSize: 14, fontWeight: '800', color: '#1a2740', textAlign: 'center' },
  dayNumberMuted: { color: '#b3bccb' },
  dayNumberSelected: { color: '#ffffff' },
  sunText: { color: '#ef6a6a' },
  satText: { color: '#4e80ff' },
  eventSpanBar: {
    position: 'absolute',
    height: EVENT_BAR_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  eventSpanText: { fontSize: 9, fontWeight: '800', color: '#ffffff', lineHeight: 11 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(21, 32, 51, 0.18)', justifyContent: 'flex-end', padding: 16 },
  formModalWrap: { flex: 1, justifyContent: 'center', paddingVertical: 28 },
  scheduleModalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    padding: 20,
    gap: 14,
    shadowColor: '#111827',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
    marginBottom: 8,
    maxHeight: '88%',
  },
  formModalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    padding: 18,
    gap: 10,
    shadowColor: '#111827',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
    maxHeight: '94%',
  },
  formContent: { gap: 4 },
  formFooter: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#edf1f7',
    backgroundColor: '#ffffff',
  },
  scheduleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  scheduleHeaderInfoBlock: { flex: 1 },
  scheduleHeaderActions: { alignItems: 'flex-end', gap: 8, flexShrink: 0 },
  scheduleTitle: { fontSize: 20, fontWeight: '800', color: '#152033' },
  scheduleMeta: { marginTop: 6, fontSize: 13, lineHeight: 20, color: '#6f7f95' },
  formGroup: { gap: 8, marginTop: 14 },
  formLabel: { fontSize: 14, fontWeight: '800', color: '#152033' },
  formInput: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: '#f6f8fc',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#152033',
  },
  pickerField: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: '#f6f8fc',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerFieldText: { fontSize: 15, fontWeight: '700', color: '#152033' },
  pickerFieldMeta: { fontSize: 13, fontWeight: '700', color: '#1f6fff' },
  categoryField: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: '#f6f8fc',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryFieldLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  categoryDot: { width: 13, height: 13, borderRadius: 999 },
  timeRow: { flexDirection: 'row', gap: 10 },
  timeField: { flex: 1 },
  inlinePickerCard: { marginTop: 14, borderRadius: 20, backgroundColor: '#f8faff', padding: 14, gap: 10 },
  inlinePickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  inlinePickerHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  inlinePickerTitle: { fontSize: 16, fontWeight: '800', color: '#152033' },
  inlinePickerApply: { fontSize: 13, fontWeight: '700', color: '#1f6fff' },
  inlinePickerClose: { fontSize: 13, fontWeight: '700', color: '#1f6fff' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
  dateWheelList: { maxHeight: 320 },
  dateWheelContent: { gap: 8, paddingVertical: 8 },
  dateWheelOption: {
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#f6f8fc',
    alignItems: 'center',
  },
  dateWheelOptionSelected: { backgroundColor: '#1f6fff' },
  dateWheelOptionText: { fontSize: 18, fontWeight: '700', color: '#152033' },
  dateWheelOptionTextSelected: { color: '#ffffff' },
  timeWheelViewport: {
    height: 272,
    borderRadius: 24,
    backgroundColor: '#f7f8fb',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  timeWheelSelectionBand: {
    position: 'absolute',
    left: 14,
    right: 14,
    top: 110,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e3e8f1',
    shadowColor: '#111827',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  timeWheelColumn: { flex: 1, maxHeight: 272 },
  timeWheelContent: { paddingVertical: 110 },
  timeWheelOption: {
    height: 52,
    paddingHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  timeWheelText: { fontSize: 24, fontWeight: '900', color: '#a0a8b5' },
  timeWheelTextSelected: { color: '#152033' },
  timeWheelColon: { alignSelf: 'center', marginHorizontal: 2, fontSize: 26, fontWeight: '900', color: '#152033', zIndex: 2 },
  timePickerActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  categoryModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  categoryHeaderAction: { minWidth: 42, fontSize: 15, fontWeight: '800', color: '#152033' },
  categoryModalTitle: { fontSize: 18, fontWeight: '900', color: '#152033' },
  categorySectionTitle: { fontSize: 14, fontWeight: '800', color: '#6f7f95', marginBottom: 8 },
  categoryHelpText: { fontSize: 12, lineHeight: 18, color: '#8a97ab', marginTop: -4, marginBottom: 8 },
  categoryList: { maxHeight: 520 },
  categoryListContent: { paddingBottom: 16 },
  categoryRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  categorySelectArea: { flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1, minHeight: 44 },
  categoryEditRow: {
    borderRadius: 18,
    backgroundColor: '#f8faff',
    padding: 10,
    gap: 10,
    marginBottom: 8,
  },
  categoryEditNameRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  categoryName: { fontSize: 16, fontWeight: '700', color: '#152033' },
  categoryNameInput: {
    flex: 1,
    minHeight: 38,
    borderRadius: 12,
    backgroundColor: '#f6f8fc',
    paddingHorizontal: 10,
    fontSize: 15,
    color: '#152033',
  },
  categoryCheck: { fontSize: 24, fontWeight: '900', color: '#152033', paddingHorizontal: 8 },
  colorPalette: { gap: 8, alignItems: 'center', paddingVertical: 4 },
  colorOption: { width: 24, height: 24, borderRadius: 999, borderWidth: 2, borderColor: 'transparent' },
  colorOptionSelected: { borderColor: '#152033' },
  addCategoryRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 16 },
  addCategoryIcon: { fontSize: 24, color: '#152033', lineHeight: 28 },
  addCategoryText: { fontSize: 16, fontWeight: '700', color: '#152033' },
  scheduleCount: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1f6fff',
    backgroundColor: '#e8f0ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#f8faff',
    borderRadius: 20,
    padding: 14,
    marginTop: 12,
  },
  timeBadge: { minWidth: 88, borderRadius: 14, backgroundColor: '#152033', paddingVertical: 8, paddingHorizontal: 10, alignItems: 'center' },
  timeBadgeText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
  scheduleBody: { flex: 1, gap: 6 },
  scheduleItemTitle: { fontSize: 16, fontWeight: '800', color: '#152033' },
  scheduleItemMemo: { fontSize: 13, lineHeight: 20, color: '#69778f' },
  scheduleActions: { flexDirection: 'row', gap: 10, marginTop: 4, flexWrap: 'wrap' },
  emptyCard: { borderRadius: 20, backgroundColor: '#f8faff', padding: 18, alignItems: 'center', gap: 8, marginTop: 14 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: '#152033' },
  emptyText: { fontSize: 14, lineHeight: 21, color: '#6f7f95', textAlign: 'center' },
});
