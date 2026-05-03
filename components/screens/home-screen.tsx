import { useCallback, useMemo, useState } from 'react';
import { Alert, Keyboard, KeyboardAvoidingView, Modal, NativeScrollEvent, NativeSyntheticEvent, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AvatarBadge } from '@/components/common/avatar-badge';
import { AppButton } from '@/components/common/app-button';
import { AppCard } from '@/components/common/app-card';
import { ErrorText, LoadingText } from '@/components/common/feedback-text';
import { ScreenHeader, SectionHeader } from '@/components/common/screen-header';
import { useRegistration } from '@/components/auth/registration-context';
import { type Event } from '@/data/mock-data';
import { fetchFriendEvents } from '@/services/events-api';
import { fetchFriends, type ApiFriend } from '@/services/friends-api';
import { createInvite, fetchSentInvites } from '@/services/invites-api';
import { isDateWithinRange } from '@/utils/date-range';

type HomeFriendCard = {
  id: string;
  name: string;
  avatar: string;
  userId: string;
  iconUrl?: string | null;
  isAvailable: boolean;
};

const WHEEL_ITEM_HEIGHT = 52;
const YEAR_RANGE_RADIUS = 20;

function parseDateParts(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return { year, month, day };
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function buildDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function formatSelectedDateMeta(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  const weekLabels = ['日', '月', '火', '水', '木', '金', '土'];
  return `${parsed.getMonth() + 1}/${parsed.getDate()} ${weekLabels[parsed.getDay()]}`;
}

function getRelativeDateLabel(baseDate: string, candidateDate: string) {
  const base = new Date(`${baseDate}T00:00:00`);
  const candidate = new Date(`${candidateDate}T00:00:00`);
  const diffDays = Math.round((candidate.getTime() - base.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return '今日';
  if (diffDays === -1) return '昨日';
  if (diffDays === 1) return '明日';

  const weekLabels = ['日', '月', '火', '水', '木', '金', '土'];
  return weekLabels[candidate.getDay()];
}

function buildDateOptions(centerDate: string) {
  const base = new Date(`${centerDate}T00:00:00`);
  return Array.from({ length: 7 }, (_, index) => {
    const target = new Date(base);
    target.setDate(base.getDate() + index - 3);
    const key = buildDateKey(target.getFullYear(), target.getMonth() + 1, target.getDate());

    return {
      key,
      label: getRelativeDateLabel(centerDate, key),
      dayText: formatSelectedDateMeta(key),
    };
  });
}

export function HomeScreenContent() {
  const { authSession } = useRegistration();
  const today = new Date();
  const initialDateKey = buildDateKey(today.getFullYear(), today.getMonth() + 1, today.getDate());
  const initialDateParts = parseDateParts(initialDateKey);
  const [selectedDate, setSelectedDate] = useState(initialDateKey);
  const [dateWindowCenter, setDateWindowCenter] = useState(initialDateKey);
  const [pickerYear, setPickerYear] = useState(initialDateParts.year);
  const [pickerMonth, setPickerMonth] = useState(initialDateParts.month);
  const [pickerDay, setPickerDay] = useState(initialDateParts.day);
  const [friendSearchText, setFriendSearchText] = useState('');
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [invitedKeys, setInvitedKeys] = useState<string[]>([]);
  const [inviteTarget, setInviteTarget] = useState<HomeFriendCard | null>(null);
  const [inviteMessage, setInviteMessage] = useState('');
  const [isInviteSubmitting, setIsInviteSubmitting] = useState(false);
  const [friends, setFriends] = useState<ApiFriend[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const yearOptions = useMemo(
    () => Array.from({ length: YEAR_RANGE_RADIUS * 2 + 1 }, (_, index) => pickerYear - YEAR_RANGE_RADIUS + index),
    [pickerYear]
  );
  const monthOptions = useMemo(() => Array.from({ length: 12 }, (_, index) => index + 1), []);
  const dayOptions = useMemo(
    () => Array.from({ length: getDaysInMonth(pickerYear, pickerMonth) }, (_, index) => index + 1),
    [pickerMonth, pickerYear]
  );
  const dateOptions = useMemo(() => buildDateOptions(dateWindowCenter), [dateWindowCenter]);

  const loadHomeData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [apiFriends, apiEvents, sentInvites] = await Promise.all([
        fetchFriends(authSession),
        fetchFriendEvents(authSession),
        fetchSentInvites(authSession),
      ]);
      setFriends(apiFriends);
      setEvents(apiEvents);
      setInvitedKeys(sentInvites.map((invite) => `${invite.date}:${invite.to_user_id}`));
      setLoadError(null);
    } catch {
      setLoadError('ホーム画面のデータを取得できませんでした。サーバー接続を確認してください。');
    } finally {
      setIsLoading(false);
    }
  }, [authSession]);

  useFocusEffect(
    useCallback(() => {
      loadHomeData();
    }, [loadHomeData])
  );

  const selectedFriends = useMemo(() => {
    const busyUserIds = new Set(
      events
        .filter((event) => isDateWithinRange(selectedDate, event.date, event.endDate))
        .map((event) => String(event.userId))
    );

    return friends.map((friend) => {
      const userId = String(friend.user_db_id ?? friend.id);
      return {
        id: String(friend.id),
        name: friend.name,
        avatar: friend.name.slice(0, 1),
        userId,
        iconUrl: friend.icon_url ?? null,
        isAvailable: !busyUserIds.has(userId),
      };
    });
  }, [events, friends, selectedDate]);

  const filteredFriends = useMemo(() => {
    const keyword = friendSearchText.trim().toLowerCase();
    if (!keyword) {
      return selectedFriends;
    }

    return selectedFriends.filter((friend) => friend.name.toLowerCase().includes(keyword));
  }, [friendSearchText, selectedFriends]);

  const selectedDateMeta = formatSelectedDateMeta(selectedDate);

  const openDatePicker = () => {
    const parts = parseDateParts(selectedDate);
    setPickerYear(parts.year);
    setPickerMonth(parts.month);
    setPickerDay(parts.day);
    setIsDatePickerVisible(true);
  };

  const applyPickedDate = () => {
    const safeDay = Math.min(pickerDay, getDaysInMonth(pickerYear, pickerMonth));
    const pickedDate = buildDateKey(pickerYear, pickerMonth, safeDay);
    setSelectedDate(pickedDate);
    setDateWindowCenter(pickedDate);
    setFriendSearchText('');
    setIsDatePickerVisible(false);
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

  const closeInviteModal = () => {
    setInviteTarget(null);
    setInviteMessage('');
  };

  const handleInvite = async (friend: HomeFriendCard) => {
    const trimmedMessage = inviteMessage.trim();
    const message = trimmedMessage || 'もし空いてたら一緒に出かけよう！';

    try {
      setIsInviteSubmitting(true);
      if (!authSession?.publicUserId) {
        throw new Error('current user id is missing');
      }
      await createInvite({
        fromUserId: String(authSession.dbUserId ?? ''),
        toUserId: friend.userId,
        date: selectedDate,
        message,
        status: 'request',
      }, authSession);
      const inviteKey = `${selectedDate}:${friend.userId}`;
      setInvitedKeys((current) => (current.includes(inviteKey) ? current : [...current, inviteKey]));
      Alert.alert(
        'お誘いを送りました',
        trimmedMessage
          ? `${friend.name}に「${trimmedMessage}」というお誘いを送りました`
          : `${friend.name}にお誘いを送りました`
      );
      closeInviteModal();
    } catch {
      Alert.alert('申請を作れませんでした', 'APIサーバーやSupabase接続を確認してください。');
    } finally {
      setIsInviteSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.fixedContent}>
        <ScreenHeader
          eyebrow="Friend Sync"
          title="空いている友達を見つけよう"
          subtitle="日付を選ぶと、その日に空いている友達だけを表示します。"
        />

        <View style={styles.section}>
          <View style={styles.dateHeaderRow}>
            <Text style={styles.sectionTitle}>日付を選択</Text>
            <Pressable style={styles.dateSearchButton} onPress={openDatePicker}>
              <Text style={styles.dateSearchButtonText}>日付検索</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateList}>
            {dateOptions.map((date) => {
              const active = date.key === selectedDate;

              return (
                <Pressable
                  key={date.key}
                  onPress={() => setSelectedDate(date.key)}
                  style={[styles.dateCard, active && styles.dateCardActive]}>
                  <Text style={[styles.dateLabel, active && styles.dateLabelActive]}>{date.label}</Text>
                  <Text style={[styles.dateText, active && styles.dateTextActive]}>{date.dayText}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>

      <View style={styles.listSectionHeader}>
        <SectionHeader title="友達" meta={selectedDateMeta} />
        <TextInput
          value={friendSearchText}
          onChangeText={setFriendSearchText}
          placeholder="友達を検索"
          placeholderTextColor="#8a97ab"
          style={styles.searchInput}
        />
      </View>

      <ScrollView style={styles.friendScroll} contentContainerStyle={styles.friendScrollContent}>
        <View style={styles.section}>
          {isLoading ? <LoadingText>友達と予定を読み込み中です...</LoadingText> : null}
          {loadError ? <ErrorText>{loadError}</ErrorText> : null}

          {!isLoading && !loadError && filteredFriends.length > 0 ? (
            filteredFriends.map((friend) => {
              const invited = invitedKeys.includes(`${selectedDate}:${friend.userId}`);

              return (
                <AppCard key={friend.id} style={styles.friendCard}>
                  <View style={styles.friendInfo}>
                    <AvatarBadge label={friend.avatar} imageUrl={friend.iconUrl} size={52} radius={18} />
                    <View style={styles.friendTextBlock}>
                      <Text style={styles.friendName}>{friend.name}</Text>
                      <Text style={[styles.friendStatus, friend.isAvailable ? styles.friendStatusAvailable : styles.friendStatusBusy]}>
                        {friend.isAvailable ? 'この日は空いてます' : 'この日は空いてません'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.actionArea}>
                    <AppButton
                      label={invited ? '誘いました' : '誘う'}
                      variant="dark"
                      disabled={invited}
                      onPress={() => setInviteTarget(friend)}
                    />
                  </View>
                </AppCard>
              );
            })
          ) : null}

          {!isLoading && (loadError || filteredFriends.length === 0) ? (
            <AppCard style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>
                {loadError ? '表示できませんでした' : friendSearchText.trim() ? '一致する友達がいません' : '友達がまだいません'}
              </Text>
              <Text style={styles.emptyText}>
                {loadError
                  ? 'APIサーバーが起動しているか確認してください。'
                  : friendSearchText.trim()
                    ? '検索キーワードを変えてみてください。'
                    : '友達画面から友達を追加するとここに表示されます。'}
              </Text>
            </AppCard>
          ) : null}
        </View>
      </ScrollView>

      <Modal animationType="fade" transparent visible={inviteTarget !== null} onRequestClose={closeInviteModal}>
        <Pressable style={styles.modalBackdrop} onPress={closeInviteModal}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalWrap}>
            <Pressable style={styles.modalCard} onPress={() => {}}>
              {inviteTarget ? (
                <>
                  <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>{inviteTarget.name}を誘う</Text>
                    <Text style={styles.modalSubtitle}>
                      {inviteTarget.name}に送る一言メッセージを書いて、お誘いを送れます。
                    </Text>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>一言メッセージ</Text>
                      <TextInput
                        value={inviteMessage}
                        onChangeText={setInviteMessage}
                        placeholder="例: 仕事終わりに夜ごはん行かない？"
                        placeholderTextColor="#8a97ab"
                        multiline
                        returnKeyType="done"
                        onSubmitEditing={Keyboard.dismiss}
                        style={styles.messageInput}
                      />
                    </View>
                  </View>
                  <View style={styles.modalFooter}>
                    <View style={styles.modalActions}>
                      <AppButton label="閉じる" variant="secondary" onPress={closeInviteModal} />
                      <AppButton
                        label={isInviteSubmitting ? '保存中...' : '申請を作る'}
                        disabled={isInviteSubmitting}
                        onPress={() => handleInvite(inviteTarget)}
                      />
                    </View>
                  </View>
                </>
              ) : null}
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      <Modal animationType="fade" transparent visible={isDatePickerVisible} onRequestClose={() => setIsDatePickerVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setIsDatePickerVisible(false)}>
          <Pressable style={styles.datePickerModalCard} onPress={() => {}}>
            <View style={styles.datePickerHeader}>
              <Text style={styles.modalTitle}>日付を選択</Text>
              <Pressable onPress={() => setIsDatePickerVisible(false)}>
                <Text style={styles.datePickerClose}>閉じる</Text>
              </Pressable>
            </View>
            <View style={styles.wheelViewport}>
              <View style={styles.wheelSelectionBand} pointerEvents="none" />
              <ScrollView
                style={styles.wheelColumn}
                contentContainerStyle={styles.wheelContent}
                showsVerticalScrollIndicator={false}
                snapToInterval={WHEEL_ITEM_HEIGHT}
                decelerationRate="fast"
                contentOffset={{ x: 0, y: Math.max(yearOptions.indexOf(pickerYear), 0) * WHEEL_ITEM_HEIGHT }}
                onMomentumScrollEnd={(event) => updateWheelValue(event, yearOptions, setPickerYear)}
                onScrollEndDrag={(event) => updateWheelValue(event, yearOptions, setPickerYear)}>
                {yearOptions.map((year) => (
                  <Pressable key={year} onPress={() => setPickerYear(year)} style={styles.wheelOption}>
                    <Text style={[styles.wheelText, pickerYear === year && styles.wheelTextSelected]}>{year}</Text>
                    <Text style={[styles.wheelUnit, pickerYear === year && styles.wheelTextSelected]}>年</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <ScrollView
                style={styles.wheelColumn}
                contentContainerStyle={styles.wheelContent}
                showsVerticalScrollIndicator={false}
                snapToInterval={WHEEL_ITEM_HEIGHT}
                decelerationRate="fast"
                contentOffset={{ x: 0, y: Math.max(monthOptions.indexOf(pickerMonth), 0) * WHEEL_ITEM_HEIGHT }}
                onMomentumScrollEnd={(event) =>
                  updateWheelValue(event, monthOptions, (month) => {
                    setPickerMonth(month);
                    setPickerDay((current) => Math.min(current, getDaysInMonth(pickerYear, month)));
                  })
                }
                onScrollEndDrag={(event) =>
                  updateWheelValue(event, monthOptions, (month) => {
                    setPickerMonth(month);
                    setPickerDay((current) => Math.min(current, getDaysInMonth(pickerYear, month)));
                  })
                }>
                {monthOptions.map((month) => (
                  <Pressable
                    key={month}
                    onPress={() => {
                      setPickerMonth(month);
                      setPickerDay((current) => Math.min(current, getDaysInMonth(pickerYear, month)));
                    }}
                    style={styles.wheelOption}>
                    <Text style={[styles.wheelText, pickerMonth === month && styles.wheelTextSelected]}>{month}</Text>
                    <Text style={[styles.wheelUnit, pickerMonth === month && styles.wheelTextSelected]}>月</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <ScrollView
                style={styles.wheelColumn}
                contentContainerStyle={styles.wheelContent}
                showsVerticalScrollIndicator={false}
                snapToInterval={WHEEL_ITEM_HEIGHT}
                decelerationRate="fast"
                contentOffset={{ x: 0, y: Math.max(dayOptions.indexOf(pickerDay), 0) * WHEEL_ITEM_HEIGHT }}
                onMomentumScrollEnd={(event) => updateWheelValue(event, dayOptions, setPickerDay)}
                onScrollEndDrag={(event) => updateWheelValue(event, dayOptions, setPickerDay)}>
                {dayOptions.map((day) => (
                  <Pressable key={day} onPress={() => setPickerDay(day)} style={styles.wheelOption}>
                    <Text style={[styles.wheelText, pickerDay === day && styles.wheelTextSelected]}>{day}</Text>
                    <Text style={[styles.wheelUnit, pickerDay === day && styles.wheelTextSelected]}>日</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
            <View style={styles.datePickerActions}>
              <AppButton label="キャンセル" variant="secondary" onPress={() => setIsDatePickerVisible(false)} />
              <AppButton label="決定" onPress={applyPickedDate} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f6f7fb' },
  fixedContent: {
    backgroundColor: '#f6f7fb',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    gap: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#e9edf5',
  },
  friendScroll: { flex: 1, backgroundColor: '#f6f7fb' },
  friendScrollContent: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 120 },
  listSectionHeader: { backgroundColor: '#f6f7fb', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10, gap: 10 },
  section: { gap: 14 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#152033' },
  dateHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  dateSearchButton: {
    borderRadius: 999,
    backgroundColor: '#e8f0ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dateSearchButtonText: { fontSize: 13, fontWeight: '900', color: '#1f6fff' },
  dateList: { gap: 12, paddingRight: 20 },
  dateCard: {
    width: 88,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e7ebf3',
  },
  dateCardActive: { backgroundColor: '#1f6fff', borderColor: '#1f6fff' },
  dateLabel: { fontSize: 13, fontWeight: '700', color: '#6f7f95', marginBottom: 6 },
  dateLabelActive: { color: '#dce8ff' },
  dateText: { fontSize: 16, fontWeight: '800', color: '#1a2740' },
  dateTextActive: { color: '#ffffff' },
  noDateCard: {
    backgroundColor: '#f8faff',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#e7ebf3',
    justifyContent: 'center',
  },
  noDateText: { fontSize: 13, fontWeight: '700', color: '#6f7f95' },
  searchInput: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e7ebf3',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#152033',
  },
  friendCard: {
    padding: 16,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  friendInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  friendTextBlock: { flex: 1, gap: 3 },
  friendName: { fontSize: 17, fontWeight: '800', color: '#162033' },
  friendStatus: { fontSize: 13, fontWeight: '700' },
  friendStatusAvailable: { color: '#1f9d62' },
  friendStatusBusy: { color: '#d14c73' },
  actionArea: { alignItems: 'flex-end' },
  emptyCard: { padding: 24, alignItems: 'center', gap: 8, borderRadius: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#152033' },
  emptyText: { fontSize: 14, lineHeight: 21, color: '#6f7f95', textAlign: 'center' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(21, 32, 51, 0.18)',
    justifyContent: 'center',
    padding: 16,
  },
  modalWrap: { flex: 1, justifyContent: 'center', paddingVertical: 28 },
  modalCard: {
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
  modalContent: { gap: 4 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#152033' },
  modalSubtitle: { marginTop: 6, fontSize: 13, lineHeight: 20, color: '#6f7f95' },
  inputGroup: { gap: 8, marginTop: 14 },
  inputLabel: { fontSize: 14, fontWeight: '800', color: '#152033' },
  messageInput: {
    minHeight: 120,
    borderRadius: 16,
    backgroundColor: '#f6f8fc',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    lineHeight: 22,
    color: '#152033',
    textAlignVertical: 'top',
  },
  modalFooter: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#edf1f7',
    backgroundColor: '#ffffff',
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
  datePickerModalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    padding: 18,
    gap: 14,
    shadowColor: '#111827',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
    maxHeight: '82%',
  },
  datePickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  datePickerClose: { fontSize: 14, fontWeight: '900', color: '#1f6fff' },
  wheelViewport: {
    height: 272,
    borderRadius: 24,
    backgroundColor: '#f7f8fb',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  wheelSelectionBand: {
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
  wheelColumn: { flex: 1, maxHeight: 272 },
  wheelContent: { paddingVertical: 110 },
  wheelOption: {
    height: 52,
    paddingHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  wheelText: { fontSize: 24, fontWeight: '900', color: '#a0a8b5' },
  wheelUnit: { marginTop: 3, fontSize: 13, fontWeight: '900', color: '#a0a8b5' },
  wheelTextSelected: { color: '#152033' },
  datePickerActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
});
