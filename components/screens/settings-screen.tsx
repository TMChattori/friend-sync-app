import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useRegistration } from '@/components/auth/registration-context';
import { AvatarBadge } from '@/components/common/avatar-badge';
import { AppButton } from '@/components/common/app-button';
import { AppCard } from '@/components/common/app-card';
import { TopBannerAd } from '@/components/common/top-banner-ad';
import {
  deleteAccount,
  fetchAppUserProfile,
  updateAppUserProfile,
  updateAuthProfile,
  uploadProfileIcon,
} from '@/services/auth-api';
import { hasAuthSessionChanged, mergeAuthSession } from '@/services/auth-session';

export function SettingsScreenContent() {
  const router = useRouter();
  const { authSession, clearRegistration, updateAuthSession } = useRegistration();
  const accessToken = authSession?.accessToken ?? null;
  const currentEmail = authSession?.email ?? '';
  const [name, setName] = useState('');
  const [publicUserId, setPublicUserId] = useState('');
  const [note, setNote] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [iconUri, setIconUri] = useState<string | null>(null);
  const [pendingIconUri, setPendingIconUri] = useState<string | null>(null);
  const [planStatus, setPlanStatus] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const sessionIdentity = authSession?.authUserId ?? currentEmail;

  useEffect(() => {
    setName(authSession?.username ?? '');
    setPublicUserId(authSession?.publicUserId ?? '');
    setNote(authSession?.note ?? '');
    setEmail(currentEmail);
    setIconUri(authSession?.iconUrl ?? null);
    setPlanStatus(authSession?.planStatus ?? 'free');
    setPendingIconUri(null);
    setPassword('');
    setPasswordConfirmation('');
  }, [authSession?.iconUrl, authSession?.note, authSession?.planStatus, authSession?.publicUserId, authSession?.username, currentEmail, sessionIdentity]);

  const hydrateProfile = useCallback(async () => {
    if (!accessToken || !currentEmail) {
      return;
    }

    try {
      setIsLoadingProfile(true);
      const latestSession = await fetchAppUserProfile({
        accessToken,
        currentEmail,
      });

      setName(latestSession.username ?? '');
      setPublicUserId(latestSession.publicUserId ?? '');
      setNote(latestSession.note ?? '');
      setEmail(latestSession.email ?? '');
      setIconUri(latestSession.iconUrl ?? null);
      setPlanStatus(latestSession.planStatus ?? 'free');
      setPendingIconUri(null);

      updateAuthSession((current) => {
        if (!current) {
          return latestSession;
        }

        const nextSession = mergeAuthSession(current, latestSession);
        return hasAuthSessionChanged(current, nextSession) ? nextSession : current;
      });
    } catch {
      // ここは既存表示を残して、操作を止めないようにします。
    } finally {
      setIsLoadingProfile(false);
    }
  }, [accessToken, currentEmail, updateAuthSession]);

  useFocusEffect(
    useCallback(() => {
      void hydrateProfile();
    }, [hydrateProfile])
  );

  const avatarLabel = useMemo(() => {
    const target = name.trim() || publicUserId.trim() || email.trim();
    return target ? target.slice(0, 1).toUpperCase() : 'U';
  }, [email, name, publicUserId]);

  const handleRelogin = () => {
    clearRegistration();
    router.replace('/register');
  };

  const closeDeleteModal = () => {
    if (isDeletingAccount) {
      return;
    }
    setDeleteReason('');
    setIsDeleteModalVisible(false);
  };

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('写真アクセスが必要です', 'プロフィール画像を選ぶために写真ライブラリへのアクセスを許可してください。');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      mediaTypes: ['images'],
    });

    if (result.canceled || !result.assets[0]?.uri) {
      return;
    }

    setPendingIconUri(result.assets[0].uri);
    setIconUri(result.assets[0].uri);
  };

  const handleSaveProfile = async () => {
    if (!authSession?.accessToken || !authSession.email) {
      Alert.alert('ログイン情報を確認', '再ログインしてから設定を更新してください。');
      return;
    }

    const trimmedName = name.trim();
    const trimmedPublicUserId = publicUserId.trim();
    const trimmedNote = note.trim();

    if (!trimmedName) {
      Alert.alert('入力を確認', 'ユーザ名を入力してください。');
      return;
    }

    if (!trimmedPublicUserId) {
      Alert.alert('入力を確認', 'ユーザIDを入力してください。');
      return;
    }

    try {
      setIsSavingProfile(true);
      let uploadedIconUrl = authSession.iconUrl ?? null;

      if (pendingIconUri) {
        const uploaded = await uploadProfileIcon({
          accessToken: authSession.accessToken,
          currentEmail: authSession.email,
          imageUri: pendingIconUri,
        });
        uploadedIconUrl = uploaded.icon_url;
      }

      const nextSession = await updateAppUserProfile({
        accessToken: authSession.accessToken,
        currentEmail: authSession.email,
        username: trimmedName,
        publicUserId: trimmedPublicUserId,
        note: trimmedNote,
        iconUrl: uploadedIconUrl ?? undefined,
      });

      updateAuthSession((current) => mergeAuthSession(current, nextSession));

      setName(nextSession.username ?? trimmedName);
      setPublicUserId(nextSession.publicUserId ?? trimmedPublicUserId);
      setNote(nextSession.note ?? trimmedNote);
      setIconUri(nextSession.iconUrl ?? uploadedIconUrl ?? null);
      setPlanStatus(nextSession.planStatus ?? planStatus);
      setPendingIconUri(null);
      Alert.alert('更新しました', 'プロフィール情報を更新しました。');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'プロフィール更新に失敗しました。';
      Alert.alert('更新に失敗', message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSaveAccount = async () => {
    if (!authSession?.accessToken || !authSession.email) {
      Alert.alert('ログイン情報を確認', '再ログインしてから設定を更新してください。');
      return;
    }

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const trimmedPasswordConfirmation = passwordConfirmation.trim();

    if (!trimmedEmail) {
      Alert.alert('入力を確認', 'メールアドレスを入力してください。');
      return;
    }

    if (trimmedPassword || trimmedPasswordConfirmation) {
      if (!trimmedPassword || !trimmedPasswordConfirmation) {
        Alert.alert('入力を確認', '新しいパスワードを2回入力してください。');
        return;
      }

      if (trimmedPassword !== trimmedPasswordConfirmation) {
        Alert.alert('入力を確認', 'パスワードが一致していません。');
        return;
      }
    }

    if (trimmedEmail === authSession.email && !trimmedPassword) {
      Alert.alert('変更はありません', 'メールアドレスまたはパスワードを変更してください。');
      return;
    }

    try {
      setIsSavingAccount(true);
      const nextSession = await updateAuthProfile({
        accessToken: authSession.accessToken,
        currentEmail: authSession.email,
        email: trimmedEmail !== authSession.email ? trimmedEmail : undefined,
        password: trimmedPassword || undefined,
      });

      updateAuthSession((current) => mergeAuthSession(current, nextSession));

      setEmail(nextSession.email ?? trimmedEmail);
      setPlanStatus(nextSession.planStatus ?? planStatus);
      setPassword('');
      setPasswordConfirmation('');
      Alert.alert('更新しました', 'アカウント情報を更新しました。');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'アカウント更新に失敗しました。';
      Alert.alert('更新に失敗', message);
    } finally {
      setIsSavingAccount(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!authSession?.accessToken || !authSession.email) {
      Alert.alert('ログイン情報を確認', '再ログインしてからアカウント削除を行ってください。');
      return;
    }

    const trimmedReason = deleteReason.trim();
    if (!trimmedReason) {
      Alert.alert('入力を確認', '削除理由を入力してください。');
      return;
    }

    try {
      setIsDeletingAccount(true);
      await deleteAccount({
        accessToken: authSession.accessToken,
        currentEmail: authSession.email,
        reason: trimmedReason,
      });
      clearRegistration();
      setIsDeleteModalVisible(false);
      setDeleteReason('');
      router.replace('/register');
      Alert.alert('アカウントを削除しました', 'ご利用ありがとうございました。');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'アカウント削除に失敗しました。';
      Alert.alert('削除に失敗', message);
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <TopBannerAd />

        <AppCard style={styles.profileCard}>
          <View style={styles.profileTopRow}>
            <Pressable onPress={handlePickImage}>
              <AvatarBadge
                label={avatarLabel}
                imageUrl={iconUri}
                size={84}
                radius={28}
                textSize={28}
              />
            </Pressable>
            <View style={styles.profileTopInfo}>
              <Text style={styles.profileTitle}>プロフィール</Text>
              <Text style={styles.profileSubtitle}>{isLoadingProfile ? '最新情報を読み込み中です...' : '表示名やID、ひとことを更新できます。'}</Text>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>ユーザアイコン</Text>
            <AppButton label="画像を選ぶ" variant="secondary" onPress={handlePickImage} />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>ユーザ名</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              autoCorrect={false}
              spellCheck={false}
              placeholder="例: 田中 花子"
              placeholderTextColor="#8a97ab"
              style={styles.input}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>ユーザID</Text>
            <TextInput
              value={publicUserId}
              onChangeText={setPublicUserId}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              placeholder="例: hanako_123"
              placeholderTextColor="#8a97ab"
              style={styles.input}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>一言</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              autoCorrect={false}
              spellCheck={false}
              placeholder="近況や一言を入力"
              placeholderTextColor="#8a97ab"
              multiline
              textAlignVertical="top"
              style={[styles.input, styles.noteInput]}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>プラン</Text>
            <View style={styles.readonlyField}>
              <Text style={styles.readonlyText}>{planStatus || 'free'}</Text>
            </View>
          </View>

          <View style={styles.cardActions}>
            <AppButton label={isSavingProfile ? '更新中...' : 'プロフィールを更新'} onPress={handleSaveProfile} disabled={isSavingProfile} />
          </View>
        </AppCard>

        <AppCard style={styles.profileCard}>
          <Text style={styles.profileTitle}>アカウント</Text>
          <Text style={styles.profileSubtitle}>メールアドレスとパスワードを更新できます。</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>メールアドレス</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              keyboardType="email-address"
              placeholder="example@mail.com"
              placeholderTextColor="#8a97ab"
              style={styles.input}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>新しいパスワード</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCorrect={false}
              spellCheck={false}
              placeholder="新しいパスワード"
              placeholderTextColor="#8a97ab"
              style={styles.input}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>新しいパスワード（確認）</Text>
            <TextInput
              value={passwordConfirmation}
              onChangeText={setPasswordConfirmation}
              secureTextEntry
              autoCorrect={false}
              spellCheck={false}
              placeholder="もう一度入力"
              placeholderTextColor="#8a97ab"
              style={styles.input}
            />
          </View>

          <View style={styles.cardActions}>
            <AppButton label={isSavingAccount ? '更新中...' : 'アカウントを更新'} onPress={handleSaveAccount} disabled={isSavingAccount} />
          </View>
        </AppCard>

        <AppCard style={styles.profileCard}>
          <Text style={styles.profileTitle}>ログイン</Text>
          <Text style={styles.profileSubtitle}>セッションを切り替えたい時はここから再ログインできます。</Text>
          <View style={styles.cardActions}>
            <AppButton label="サインアウト" variant="secondary" onPress={handleRelogin} />
          </View>
          <View style={styles.cardActions}>
            <Pressable onPress={() => setIsDeleteModalVisible(true)} style={styles.deleteAccountButton}>
              <Text style={styles.deleteAccountButtonText}>アカウント削除</Text>
            </Pressable>
          </View>
        </AppCard>
      </ScrollView>

      <Modal animationType="fade" transparent visible={isDeleteModalVisible} onRequestClose={closeDeleteModal}>
        <KeyboardAvoidingView
          style={styles.modalRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable style={styles.modalBackdrop} onPress={closeDeleteModal}>
            <Pressable style={styles.modalCard} onPress={() => {}}>
              <ScrollView
                bounces={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.modalScrollContent}>
                <Text style={styles.modalTitle}>アカウントを削除</Text>
                <Text style={styles.modalSubtitle}>
                  アカウントを削除すると、プロフィール、予定、友達関係、招待履歴が削除されます。続行する理由を入力してください。
                </Text>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>削除理由</Text>
                  <TextInput
                    value={deleteReason}
                    onChangeText={setDeleteReason}
                    autoCorrect={false}
                    spellCheck={false}
                    placeholder="例: もう使わなくなったため"
                    placeholderTextColor="#8a97ab"
                    multiline
                    textAlignVertical="top"
                    style={[styles.input, styles.noteInput]}
                  />
                </View>
                <View style={styles.modalActions}>
                  <AppButton label="閉じる" variant="secondary" onPress={closeDeleteModal} disabled={isDeletingAccount} />
                  <Pressable
                    disabled={isDeletingAccount || !deleteReason.trim()}
                    onPress={handleDeleteAccount}
                    style={[styles.deleteConfirmButton, (isDeletingAccount || !deleteReason.trim()) && styles.deleteConfirmButtonDisabled]}>
                    <Text style={styles.deleteConfirmButtonText}>{isDeletingAccount ? '削除中...' : '削除する'}</Text>
                  </Pressable>
                </View>
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f6f7fb' },
  container: { flex: 1, backgroundColor: '#f6f7fb' },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40, gap: 18 },
  profileCard: { padding: 20, gap: 14 },
  profileTopRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  profileTopInfo: { flex: 1, gap: 4 },
  profileTitle: { fontSize: 19, fontWeight: '900', color: '#152033' },
  profileSubtitle: { fontSize: 13, lineHeight: 20, color: '#6c7a90' },
  formGroup: { gap: 8 },
  label: { fontSize: 14, fontWeight: '800', color: '#152033' },
  input: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: '#f6f8fc',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#152033',
  },
  readonlyField: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: '#eef2f8',
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  readonlyText: { fontSize: 15, fontWeight: '700', color: '#44536a' },
  noteInput: { minHeight: 104 },
  cardActions: { paddingTop: 6, alignItems: 'flex-start' },
  deleteAccountButton: {
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  deleteAccountButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#d14c73',
  },
  modalRoot: { flex: 1 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(21, 32, 51, 0.18)', justifyContent: 'center', padding: 16 },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    maxHeight: '82%',
    shadowColor: '#111827',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  modalScrollContent: {
    padding: 18,
    gap: 14,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#152033' },
  modalSubtitle: { fontSize: 13, lineHeight: 20, color: '#6f7f95' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  deleteConfirmButton: {
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d14c73',
  },
  deleteConfirmButtonDisabled: {
    backgroundColor: '#f1c9d5',
  },
  deleteConfirmButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
});
