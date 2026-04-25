import { useCallback, useState } from 'react';
import { Alert, Linking, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AppButton } from '@/components/common/app-button';
import { AppCard } from '@/components/common/app-card';
import { ScreenHeader } from '@/components/common/screen-header';
import { DATE_OPTIONS, SELF_USER_ID, users, type NotificationItem } from '@/data/mock-data';
import { fetchInvites, type ApiInvite } from '@/services/invites-api';

function getUserName(userId: string) {
  return users.find((user) => user.id === userId || user.name === userId)?.name ?? userId;
}

function getDateText(date: string) {
  return DATE_OPTIONS.find((dateOption) => dateOption.key === date)?.dayText ?? date;
}

function inviteToNotification(invite: ApiInvite): NotificationItem {
  const dateText = getDateText(invite.date);

  if (invite.status === 'request' && invite.to_user_id === SELF_USER_ID) {
    return {
      id: invite.id,
      title: `${getUserName(invite.from_user_id)}から${dateText}のお誘い申請が来ました`,
      type: 'request',
      message: invite.message,
    };
  }

  if (invite.status === 'friend_request_sent') {
    return {
      id: invite.id,
      title: `${getUserName(invite.to_user_id)}に友達申請を送りました`,
      type: 'sent',
      message: invite.message,
    };
  }

  return {
    id: invite.id,
    title: `${getUserName(invite.to_user_id)}に${dateText}の誘いを送りました`,
    type: 'sent',
    message: invite.message,
  };
}

export function NotificationsScreenContent() {
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
          const invites = await fetchInvites();
          if (!isActive) {
            return;
          }

          setNotifications(
            invites
              .filter(
                (invite) =>
                  invite.to_user_id === SELF_USER_ID ||
                  (invite.status === 'friend_request_sent' && invite.from_user_id === SELF_USER_ID)
              )
              .map(inviteToNotification)
          );
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
    }, [])
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <ScreenHeader title="通知" subtitle="お誘いの送信や返事をまとめて確認できます。" />

        <AppCard style={styles.infoCard}>
          <Text style={styles.infoTitle}>MVPの進め方</Text>
          <Text style={styles.infoText}>
            このアプリでは「誘う」までを完結させて、その後の集合時間や場所などの細かい調整はLINEで進める想定です。
          </Text>
        </AppCard>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>通知一覧</Text>
          <View style={styles.notificationList}>
            {isLoading ? <Text style={styles.loadingText}>通知を読み込み中です...</Text> : null}
            {loadError ? <Text style={styles.errorText}>{loadError}</Text> : null}
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
  infoCard: { padding: 18, borderWidth: 1, borderColor: '#e7ebf3' },
  infoTitle: { fontSize: 16, fontWeight: '800', color: '#152033' },
  infoText: { marginTop: 8, fontSize: 14, lineHeight: 22, color: '#6c7a90' },
  section: { gap: 12 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#152033' },
  notificationList: { gap: 12 },
  notificationCard: { padding: 16, gap: 14 },
  notificationBody: { gap: 6 },
  notificationTitle: { fontSize: 16, lineHeight: 24, fontWeight: '800', color: '#152033' },
  messageCard: { marginTop: 4, borderRadius: 16, backgroundColor: '#f6f8fc', padding: 12, gap: 4 },
  messageLabel: { fontSize: 12, fontWeight: '800', color: '#1f6fff' },
  messageText: { fontSize: 14, lineHeight: 21, color: '#5f6c80' },
  loadingText: { fontSize: 13, fontWeight: '700', color: '#6f7f95' },
  errorText: { fontSize: 13, fontWeight: '700', color: '#d14c73' },
  emptyCard: { padding: 22, alignItems: 'center', gap: 8, borderRadius: 24 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: '#152033' },
  emptyText: { fontSize: 14, lineHeight: 21, color: '#6f7f95', textAlign: 'center' },
});
