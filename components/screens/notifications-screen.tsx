import { useCallback, useState } from 'react';
import { Alert, Linking, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRegistration } from '@/components/auth/registration-context';
import { AppButton } from '@/components/common/app-button';
import { AppCard } from '@/components/common/app-card';
import { ErrorText, LoadingText } from '@/components/common/feedback-text';
import { TopBannerAd } from '@/components/common/top-banner-ad';
import { DATE_OPTIONS, type NotificationItem } from '@/data/mock-data';
import { fetchInvites, type ApiInvite } from '@/services/invites-api';

function getUserName(invite: ApiInvite, side: 'from' | 'to') {
  if (side === 'from') {
    return invite.from_user_name || invite.from_user_id;
  }

  return invite.to_user_name || invite.to_user_id;
}

function getDateText(date: string) {
  return DATE_OPTIONS.find((dateOption) => dateOption.key === date)?.dayText ?? date;
}

function inviteToNotification(invite: ApiInvite): NotificationItem {
  const dateText = getDateText(invite.date);

  return {
    id: invite.id,
    title: `${getUserName(invite, 'from')}から${dateText}のお誘い申請が来ました`,
    type: 'request',
    message: invite.message,
  };
}

export function NotificationsScreenContent() {
  const { authSession } = useRegistration();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const openLine = async () => {
    try {
      await Linking.openURL('line://');
    } catch {
      Alert.alert('LINEを開けませんでした', 'LINEがインストールされているか確認してください。');
    }
  };

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function loadNotifications() {
        try {
          setIsLoading(true);
          const invites = await fetchInvites(authSession);
          if (!isActive) {
            return;
          }

          const currentUserId = String(authSession?.dbUserId ?? '');
          setNotifications(invites.filter((invite) => invite.to_user_id === currentUserId).map(inviteToNotification));
          setLoadError(null);
        } catch {
          if (isActive) {
            setLoadError('通知を取得できませんでした。サーバー接続を確認してください。');
          }
        } finally {
          if (isActive) {
            setIsLoading(false);
          }
        }
      }

      loadNotifications();

      return () => {
        isActive = false;
      };
    }, [authSession])
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <TopBannerAd />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>通知一覧</Text>
          <View style={styles.notificationList}>
            {isLoading ? <LoadingText>通知を読み込み中です...</LoadingText> : null}
            {loadError ? <ErrorText>{loadError}</ErrorText> : null}
            {notifications.map((item) => (
              <AppCard key={item.id} style={styles.notificationCard}>
                <View style={styles.notificationBody}>
                  <Text style={styles.notificationTitle}>{item.title}</Text>
                  <View style={styles.messageCard}>
                    <Text style={styles.messageLabel}>{item.type === 'request' ? '届いた一言' : '送った一言'}</Text>
                    <Text style={styles.messageText}>{item.message}</Text>
                  </View>
                </View>
                {item.type === 'request' ? <AppButton label="LINEを開く" onPress={openLine} /> : null}
              </AppCard>
            ))}
            {!isLoading && !loadError && notifications.length === 0 ? (
              <AppCard style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>通知はまだありません</Text>
                <Text style={styles.emptyText}>お誘い申請が届くとここに表示されます。</Text>
              </AppCard>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f6f7fb' },
  container: { flex: 1, backgroundColor: '#f6f7fb' },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40, gap: 18 },
  section: { gap: 12 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#152033' },
  notificationList: { gap: 12 },
  notificationCard: { padding: 16, gap: 14 },
  notificationBody: { gap: 6 },
  notificationTitle: { fontSize: 16, lineHeight: 24, fontWeight: '800', color: '#152033' },
  messageCard: { marginTop: 4, borderRadius: 16, backgroundColor: '#f6f8fc', padding: 12, gap: 4 },
  messageLabel: { fontSize: 12, fontWeight: '800', color: '#1f6fff' },
  messageText: { fontSize: 14, lineHeight: 21, color: '#5f6c80' },
  emptyCard: { padding: 22, alignItems: 'center', gap: 8, borderRadius: 24 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: '#152033' },
  emptyText: { fontSize: 14, lineHeight: 21, color: '#6f7f95', textAlign: 'center' },
});
