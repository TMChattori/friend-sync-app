import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useRegistration } from '@/components/auth/registration-context';
import { AvatarBadge } from '@/components/common/avatar-badge';
import { AppButton } from '@/components/common/app-button';
import { AppCard } from '@/components/common/app-card';
import { ScreenHeader } from '@/components/common/screen-header';
import {
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <ScreenHeader title="設定" subtitle="プロフィールとアカウント情報をここで整えられます。" />

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
        </AppCard>
      </ScrollView>
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
});
