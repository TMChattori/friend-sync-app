import { useCallback, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import QRCode from 'react-native-qrcode-svg';
import { useRegistration } from '@/components/auth/registration-context';
import { AppButton } from '@/components/common/app-button';
import { AppCard } from '@/components/common/app-card';
import { AvatarBadge } from '@/components/common/avatar-badge';
import { ErrorText, LoadingText } from '@/components/common/feedback-text';
import { fetchAppUserProfile } from '@/services/auth-api';
import { mergeAuthSession } from '@/services/auth-session';
import {
  createFriendByDbId,
  deleteFriend,
  fetchFriendCandidateByPublicUserId,
  fetchFriends,
  type ApiFriend,
  type ApiFriendCandidate,
} from '@/services/friends-api';

type QrMode = 'scan' | 'show';

function normalizeQrId(value: string) {
  const trimmed = value.trim();
  const matched = trimmed.match(/(?:id=|userId=)([^&]+)/i);
  return decodeURIComponent(matched?.[1] ?? trimmed);
}

export function FriendsScreenContent() {
  const { authSession, updateAuthSession } = useRegistration();
  const [searchText, setSearchText] = useState('');
  const [isIdModalVisible, setIsIdModalVisible] = useState(false);
  const [isQrModalVisible, setIsQrModalVisible] = useState(false);
  const [friendIdInput, setFriendIdInput] = useState('');
  const [qrMode, setQrMode] = useState<QrMode>('scan');
  const [hasScannedQr, setHasScannedQr] = useState(false);
  const [foundFriend, setFoundFriend] = useState<ApiFriendCandidate | null>(null);
  const [isFoundModalVisible, setIsFoundModalVisible] = useState(false);
  const [friends, setFriends] = useState<ApiFriend[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(true);
  const [friendsError, setFriendsError] = useState<string | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const profileName = authSession?.username?.trim() || '名前未取得';
  const profileUserId = authSession?.publicUserId?.trim() || 'ID未取得';
  const profileIconUrl = authSession?.iconUrl ?? null;
  const myQrValue = useMemo(() => `friendsyncapp://friend?id=${encodeURIComponent(profileUserId)}`, [profileUserId]);

  useFocusEffect(
    useCallback(() => {
      if (!authSession?.accessToken || !authSession.email) {
        return;
      }

      if (authSession.username && authSession.publicUserId) {
        return;
      }

      const accessToken = authSession.accessToken;
      const currentEmail = authSession.email;

      let isActive = true;

      async function hydrateProfile() {
        try {
          const latestSession = await fetchAppUserProfile({
            accessToken,
            currentEmail,
          });

          if (!isActive) {
            return;
          }

          if (latestSession.username || latestSession.publicUserId) {
            updateAuthSession((current) => mergeAuthSession(current, latestSession));
          }
        } catch {
          // 表示の補完だけなので、失敗時は何もしません。
        }
      }

      void hydrateProfile();

      return () => {
        isActive = false;
      };
    }, [authSession, updateAuthSession])
  );

  const loadFriends = useCallback(async () => {
    try {
      setIsLoadingFriends(true);
      const apiFriends = await fetchFriends(authSession);
      setFriends(apiFriends);
      setFriendsError(null);
    } catch {
      setFriendsError('友達一覧を取得できませんでした。サーバー接続を確認してください。');
    } finally {
      setIsLoadingFriends(false);
    }
  }, [authSession]);

  useFocusEffect(
    useCallback(() => {
      loadFriends();
    }, [loadFriends])
  );

  const filteredFriends = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    if (!keyword) return friends;
    return friends.filter(
      (friend) =>
        friend.name.toLowerCase().includes(keyword) ||
        (friend.public_user_id ?? '').toLowerCase().includes(keyword)
    );
  }, [friends, searchText]);
  const hasSearchKeyword = searchText.trim().length > 0;

  const handleDeleteFriend = (friend: ApiFriend) => {
    Alert.alert('友達を削除', `${friend.name}を友達一覧から削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteFriend(friend.id, authSession);
            await loadFriends();
          } catch {
            Alert.alert('削除に失敗', 'サーバー接続を確認してください。');
          }
        },
      },
    ]);
  };

  const closeIdModal = () => {
    setFriendIdInput('');
    setIsIdModalVisible(false);
  };

  const openFoundFriend = (candidate: ApiFriendCandidate) => {
    const alreadyAdded = friends.some(
      (friend) =>
        String(friend.user_db_id ?? '') === String(candidate.id) ||
        ((friend.public_user_id ?? '') && friend.public_user_id === candidate.user_id)
    );

    if (alreadyAdded) {
      Alert.alert('追加済みです', `${candidate.name}はすでに友達一覧にいます。`);
      return;
    }

    setFoundFriend(candidate);
    setIsFoundModalVisible(true);
  };

  const handleSearchId = async () => {
    const keyword = friendIdInput.trim();

    if (!keyword) {
      Alert.alert('IDを入力してください', '追加したい友達のユーザIDを入力してください。');
      return;
    }

    try {
      const candidate = await fetchFriendCandidateByPublicUserId(keyword, authSession);
      openFoundFriend(candidate);
      closeIdModal();
    } catch {
      Alert.alert('見つかりませんでした', '一致するユーザIDが見つかりませんでした。');
    }
  };

  const handleAddFoundFriend = async () => {
    if (!foundFriend) {
      return;
    }

    try {
      await createFriendByDbId(foundFriend.id, authSession);
      await loadFriends();
      setIsFoundModalVisible(false);
      setFoundFriend(null);
      setIsQrModalVisible(false);
      setHasScannedQr(false);
      Alert.alert('追加しました', `${foundFriend.name}を友達一覧に追加しました。`);
    } catch {
      Alert.alert('追加に失敗', 'サーバー接続を確認してください。');
    }
  };

  const openQrModal = async () => {
    setQrMode('scan');
    setHasScannedQr(false);
    setIsQrModalVisible(true);

    if (!cameraPermission?.granted) {
      await requestCameraPermission();
    }
  };

  const handleQrScanned = ({ data }: { data: string }) => {
    if (hasScannedQr) {
      return;
    }

    const publicUserId = normalizeQrId(data);
    setHasScannedQr(true);
    void (async () => {
      try {
        const candidate = await fetchFriendCandidateByPublicUserId(publicUserId, authSession);
        openFoundFriend(candidate);
      } catch {
        Alert.alert('見つかりませんでした', '一致するユーザーIDが見つかりませんでした。');
      }
    })();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <AppCard style={styles.selfCard}>
          <AvatarBadge
            label={profileName.slice(0, 1) || 'U'}
            imageUrl={profileIconUrl}
            size={56}
            radius={18}
            backgroundColor="#1f6fff"
            textColor="#ffffff"
            textSize={20}
          />
          <View style={styles.selfInfo}>
            <Text style={styles.selfLabel}>新規登録した情報</Text>
            <Text numberOfLines={1} ellipsizeMode="tail" style={styles.selfName}>{profileName}</Text>
            <Text style={styles.selfId}>ユーザID: {profileUserId}</Text>
          </View>
        </AppCard>

        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          placeholder="名前やIDで友達を探す"
          placeholderTextColor="#8a97ab"
          style={styles.searchInput}
        />

        <View style={styles.actionRow}>
          <AppButton label="IDで追加" onPress={() => setIsIdModalVisible(true)} />
          <AppButton label="QRで追加" variant="secondary" onPress={openQrModal} />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>友達一覧</Text>
            {!isLoadingFriends && !friendsError ? <Text style={styles.friendCount}>{filteredFriends.length}人</Text> : null}
          </View>
          {friendsError ? <ErrorText>{friendsError}</ErrorText> : null}
          {isLoadingFriends ? <LoadingText>友達一覧を読み込み中です...</LoadingText> : null}
          <View style={styles.friendList}>
            {!isLoadingFriends && !friendsError && filteredFriends.length > 0 ? (
              filteredFriends.map((friend) => (
                <AppCard key={friend.id} style={styles.friendCard}>
                  <AvatarBadge label={friend.name.slice(0, 1)} imageUrl={friend.icon_url} />
                  <View style={styles.friendInfo}>
                    <Text numberOfLines={1} ellipsizeMode="tail" style={styles.friendName}>{friend.name}</Text>
                    <Text style={styles.friendId}>ID: {friend.public_user_id ?? '未設定'}</Text>
                  </View>
                  <AppButton label="削除" variant="secondary" onPress={() => handleDeleteFriend(friend)} />
                </AppCard>
              ))
            ) : null}

            {!isLoadingFriends && (friendsError || filteredFriends.length === 0) ? (
              <AppCard style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>
                  {friendsError ? '友達一覧を表示できません' : hasSearchKeyword ? '一致する友達がいません' : '友達はまだいません'}
                </Text>
                <Text style={styles.emptyText}>
                  {friendsError
                    ? 'APIサーバーが起動しているか確認してください。'
                    : hasSearchKeyword
                      ? '名前かIDを変えて探してみてください。'
                      : 'ID追加かQR追加から友達を追加できます。'}
                </Text>
              </AppCard>
            ) : null}
          </View>
        </View>
      </ScrollView>

      <Modal animationType="fade" transparent visible={isIdModalVisible} onRequestClose={closeIdModal}>
        <Pressable style={styles.modalBackdrop} onPress={closeIdModal}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>IDで友達追加</Text>
            <Text style={styles.modalSubtitle}>友達のユーザIDを入力して、合致するユーザーを検索します。</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>ユーザID</Text>
              <TextInput
                value={friendIdInput}
                onChangeText={setFriendIdInput}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="例: hanako_123"
                placeholderTextColor="#8a97ab"
                style={styles.modalInput}
              />
            </View>
            <View style={styles.modalActions}>
              <AppButton label="閉じる" variant="secondary" onPress={closeIdModal} />
              <AppButton label="検索" onPress={handleSearchId} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal animationType="fade" transparent visible={isFoundModalVisible} onRequestClose={() => setIsFoundModalVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setIsFoundModalVisible(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            {foundFriend ? (
              <>
                <Text style={styles.modalTitle}>友達が見つかりました</Text>
                <Text style={styles.modalSubtitle}>このユーザーを友達一覧に追加しますか？</Text>
                <View style={styles.foundFriendCard}>
                  <AvatarBadge label={foundFriend.name.slice(0, 1)} />
                  <View style={styles.friendInfo}>
                    <Text numberOfLines={1} ellipsizeMode="tail" style={styles.friendName}>{foundFriend.name}</Text>
                    <Text style={styles.friendId}>ID: {foundFriend.user_id}</Text>
                    <Text style={styles.friendNote}>{foundFriend.note ?? 'ひとことは未設定です'}</Text>
                  </View>
                </View>
                <View style={styles.modalActions}>
                  <AppButton label="閉じる" variant="secondary" onPress={() => setIsFoundModalVisible(false)} />
                  <AppButton label="追加" onPress={handleAddFoundFriend} />
                </View>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal animationType="slide" transparent visible={isQrModalVisible} onRequestClose={() => setIsQrModalVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setIsQrModalVisible(false)}>
          <Pressable style={styles.qrModalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>QRで友達追加</Text>
            <Text style={styles.modalSubtitle}>QRを読み取るか、自分のQRを表示できます。</Text>

            <View style={styles.qrSwitch}>
              <Pressable onPress={() => setQrMode('scan')} style={[styles.qrSwitchButton, qrMode === 'scan' && styles.qrSwitchButtonActive]}>
                <Text style={[styles.qrSwitchText, qrMode === 'scan' && styles.qrSwitchTextActive]}>読み取る</Text>
              </Pressable>
              <Pressable onPress={() => setQrMode('show')} style={[styles.qrSwitchButton, qrMode === 'show' && styles.qrSwitchButtonActive]}>
                <Text style={[styles.qrSwitchText, qrMode === 'show' && styles.qrSwitchTextActive]}>自分のQR</Text>
              </Pressable>
            </View>

            {qrMode === 'scan' ? (
              <View style={styles.cameraBox}>
                {cameraPermission?.granted ? (
                  <CameraView
                    style={styles.camera}
                    facing="back"
                    barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                    onBarcodeScanned={hasScannedQr ? undefined : handleQrScanned}
                  />
                ) : (
                  <View style={styles.cameraFallback}>
                    <Text style={styles.cameraFallbackTitle}>カメラ許可が必要です</Text>
                    <Text style={styles.cameraFallbackText}>QRを読み取るためにカメラの使用を許可してください。</Text>
                    <AppButton label="カメラを許可" onPress={requestCameraPermission} />
                  </View>
                )}
                <View style={styles.scanFrame} pointerEvents="none" />
              </View>
            ) : (
              <View style={styles.myQrCard}>
                <View style={styles.fakeQr}>
                  <QRCode value={myQrValue} size={164} backgroundColor="#ffffff" color="#152033" />
                </View>
                <Text style={styles.myQrName}>{profileName}</Text>
                <Text style={styles.myQrId}>ID: {profileUserId}</Text>
                <Text style={styles.myQrHint}>友達にこのQRを読み取ってもらう想定です。</Text>
              </View>
            )}

            <View style={styles.modalActions}>
              <AppButton label="閉じる" variant="secondary" onPress={() => setIsQrModalVisible(false)} />
              {qrMode === 'scan' && hasScannedQr ? (
                <AppButton label="もう一度読み取る" onPress={() => setHasScannedQr(false)} />
              ) : null}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f6f7fb' },
  container: { flex: 1, backgroundColor: '#f6f7fb' },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 120, gap: 18 },
  selfCard: { padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  selfInfo: { flex: 1, minWidth: 0, gap: 3 },
  selfLabel: { fontSize: 12, fontWeight: '900', color: '#6f7f95' },
  selfName: { fontSize: 19, fontWeight: '900', color: '#152033' },
  selfId: { fontSize: 13, fontWeight: '800', color: '#1f6fff' },
  searchInput: {
    height: 48,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#152033',
    borderWidth: 1,
    borderColor: '#e7ebf3',
  },
  actionRow: { flexDirection: 'row', gap: 12 },
  section: { gap: 12 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#152033' },
  friendCount: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1f6fff',
    backgroundColor: '#e8f0ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  friendList: { gap: 12 },
  friendCard: { padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  friendInfo: { flex: 1, justifyContent: 'center', minWidth: 0 },
  friendName: { fontSize: 17, fontWeight: '800', color: '#152033' },
  friendId: { marginTop: 4, fontSize: 13, fontWeight: '700', color: '#1f6fff' },
  friendNote: { marginTop: 4, fontSize: 13, lineHeight: 19, color: '#6c7a90' },
  foundFriendCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 20, backgroundColor: '#f6f8fc', padding: 14 },
  emptyCard: { padding: 24, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: '#152033' },
  emptyText: { fontSize: 14, lineHeight: 21, color: '#6f7f95', textAlign: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(21, 32, 51, 0.18)', justifyContent: 'center', padding: 16 },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    padding: 18,
    gap: 14,
    shadowColor: '#111827',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  qrModalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    padding: 18,
    gap: 14,
    shadowColor: '#111827',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#152033' },
  modalSubtitle: { fontSize: 13, lineHeight: 20, color: '#6f7f95' },
  inputGroup: { gap: 8 },
  inputLabel: { fontSize: 14, fontWeight: '800', color: '#152033' },
  modalInput: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: '#f6f8fc',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#152033',
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  qrSwitch: { flexDirection: 'row', backgroundColor: '#f6f8fc', borderRadius: 999, padding: 4 },
  qrSwitchButton: { flex: 1, borderRadius: 999, paddingVertical: 10, alignItems: 'center' },
  qrSwitchButtonActive: { backgroundColor: '#1f6fff' },
  qrSwitchText: { fontSize: 14, fontWeight: '800', color: '#6f7f95' },
  qrSwitchTextActive: { color: '#ffffff' },
  cameraBox: { height: 320, borderRadius: 24, overflow: 'hidden', backgroundColor: '#152033' },
  camera: { flex: 1 },
  cameraFallback: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 18, gap: 10 },
  cameraFallbackTitle: { fontSize: 17, fontWeight: '800', color: '#ffffff' },
  cameraFallbackText: { fontSize: 13, lineHeight: 20, color: '#d4def0', textAlign: 'center' },
  scanFrame: {
    position: 'absolute',
    top: 74,
    left: 54,
    right: 54,
    bottom: 74,
    borderWidth: 3,
    borderColor: '#ffffff',
    borderRadius: 24,
  },
  myQrCard: { alignItems: 'center', gap: 10, padding: 18, borderRadius: 24, backgroundColor: '#f6f8fc' },
  fakeQr: { width: 196, height: 196, borderRadius: 22, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' },
  myQrName: { fontSize: 18, fontWeight: '800', color: '#152033' },
  myQrId: { fontSize: 14, fontWeight: '800', color: '#1f6fff' },
  myQrHint: { fontSize: 13, lineHeight: 20, color: '#6f7f95', textAlign: 'center' },
});
