import { useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRegistration } from '@/components/auth/registration-context';
import { AppCard } from '@/components/common/app-card';
import { ScreenHeader } from '@/components/common/screen-header';
import { getCurrentUserProfile } from '@/data/mock-data';
import { updateAuthProfile } from '@/services/auth-api';

type PlanStatus = 'free' | 'premium';

const PLAN_LABELS: Record<PlanStatus, string> = {
  free: '無料プラン',
  premium: 'プレミアムプラン',
};

export function SettingsScreenContent() {
  const { authSession, updateAuthSession } = useRegistration();
  const initialProfile = getCurrentUserProfile();
  const [savedProfile, setSavedProfile] = useState(initialProfile);
  const [draftProfile, setDraftProfile] = useState(initialProfile);
  const [savedPlan, setSavedPlan] = useState<PlanStatus>('free');
  const [draftPlan, setDraftPlan] = useState<PlanStatus>('free');
  const [draftEmail, setDraftEmail] = useState(authSession?.email ?? '');
  const [draftPassword, setDraftPassword] = useState('');
  const [draftPasswordConfirmation, setDraftPasswordConfirmation] = useState('');
  const [isAuthUpdating, setIsAuthUpdating] = useState(false);

  const updateProfile = (key: keyof typeof draftProfile, value: string) => {
    setDraftProfile((current) => ({ ...current, [key]: value }));
  };

  const pickProfileImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('写真へのアクセス許可が必要です', 'プロフィール画像を選ぶために、写真フォルダへのアクセスを許可してください。');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      updateProfile('icon', result.assets[0].uri);
    }
  };

  const updateLoginInfo = async () => {
    const trimmedEmail = draftEmail.trim();

    if (!authSession?.accessToken) {
      Alert.alert('ログイン情報を変更できません', '再度ログインしてから変更してください。');
      return;
    }

    if (trimmedEmail && !trimmedEmail.includes('@')) {
      Alert.alert('メールアドレスを確認してください', '正しいメールアドレスを入力してください。');
      return;
    }

    if (draftPassword && draftPassword.length < 8) {
      Alert.alert('パスワードを確認してください', '新しいパスワードは8文字以上で入力してください。');
      return;
    }

    if (draftPassword && draftPassword !== draftPasswordConfirmation) {
      Alert.alert('パスワードを確認してください', '新しいパスワードが2回とも一致しているか確認してください。');
      return;
    }

    if (!trimmedEmail && !draftPassword) {
      Alert.alert('変更内容がありません', 'メールアドレスまたは新しいパスワードを入力してください。');
      return;
    }

    try {
      setIsAuthUpdating(true);
      const updatedSession = await updateAuthProfile({
        accessToken: authSession.accessToken,
        currentEmail: authSession.email,
        email: trimmedEmail && trimmedEmail !== authSession.email ? trimmedEmail : undefined,
        password: draftPassword || undefined,
      });
      updateAuthSession(updatedSession);
      setDraftEmail(updatedSession.email);
      setDraftPassword('');
      setDraftPasswordConfirmation('');
      Alert.alert('ログイン情報を更新しました', 'メールアドレスまたはパスワードを更新しました。');
    } catch {
      Alert.alert('ログイン情報を更新できませんでした', '入力内容または認証状態を確認してください。');
    } finally {
      setIsAuthUpdating(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <ScreenHeader title="設定" subtitle="MVPではプロフィール編集を中心に、最小限の設定だけを扱います。" />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>プロフィール</Text>
          <AppCard style={styles.profileCard}>
            <View style={styles.profileAvatar}>
              <Image source={{ uri: savedProfile.icon }} style={styles.profileAvatarImage} contentFit="cover" />
            </View>
            <View style={styles.profileInfo}>
              <View style={styles.profileNameRow}>
                <Text style={styles.profileName}>{savedProfile.name || '名前未設定'}</Text>
                <View style={[styles.planBadge, savedPlan === 'premium' && styles.planBadgePremium]}>
                  <Text style={[styles.planBadgeText, savedPlan === 'premium' && styles.planBadgeTextPremium]}>
                    {PLAN_LABELS[savedPlan]}
                  </Text>
                </View>
              </View>
              <Text style={styles.profileId}>ユーザーID: {savedProfile.userId || '未設定'}</Text>
              <Text style={styles.profileNote}>{savedProfile.note || '一言はまだ設定されていません'}</Text>
            </View>
          </AppCard>

          <AppCard style={styles.formCard}>
            <Text style={styles.cardTitle}>ログイン情報</Text>
            <Text style={styles.authDescription}>
              登録・ログインに使うメールアドレスとパスワードを変更できます。
            </Text>
            <InputGroup
              label="メールアドレス"
              value={draftEmail}
              onChangeText={setDraftEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <InputGroup
              label="新しいパスワード"
              value={draftPassword}
              onChangeText={setDraftPassword}
              autoCapitalize="none"
              secureTextEntry
              placeholder="変更する場合のみ入力"
            />
            <InputGroup
              label="新しいパスワード確認"
              value={draftPasswordConfirmation}
              onChangeText={setDraftPasswordConfirmation}
              autoCapitalize="none"
              secureTextEntry
              placeholder="同じパスワードをもう一度入力"
            />
            <View style={styles.formActionRow}>
              <Text style={styles.formHint}>パスワードは画面上に保存表示しません。</Text>
              <Pressable
                onPress={updateLoginInfo}
                disabled={isAuthUpdating}
                style={[styles.updateButton, isAuthUpdating && styles.updateButtonDisabled]}>
                <Text style={styles.updateButtonText}>{isAuthUpdating ? '更新中...' : '更新'}</Text>
              </Pressable>
            </View>
          </AppCard>

          <AppCard style={styles.formCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>アイコン画像</Text>
              <View style={styles.iconPickerRow}>
                <View style={styles.draftAvatar}>
                  <Image source={{ uri: draftProfile.icon }} style={styles.profileAvatarImage} contentFit="cover" />
                </View>
                <View style={styles.iconPickerTextBlock}>
                  <Text style={styles.iconPickerTitle}>写真フォルダから選択</Text>
                  <Text style={styles.iconPickerHint}>選んだ画像は更新ボタンでプロフィールに反映されます。</Text>
                </View>
                <Pressable onPress={pickProfileImage} style={styles.imagePickButton}>
                  <Text style={styles.imagePickButtonText}>選択</Text>
                </Pressable>
              </View>
            </View>
            <InputGroup label="名前" value={draftProfile.name} onChangeText={(value) => updateProfile('name', value)} />
            <InputGroup label="ID" value={draftProfile.userId} onChangeText={(value) => updateProfile('userId', value)} autoCapitalize="none" />
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>ステータス</Text>
              <View style={styles.planSelectRow}>
                {(['free', 'premium'] as const).map((plan) => {
                  const active = draftPlan === plan;

                  return (
                    <Pressable
                      key={plan}
                      onPress={() => setDraftPlan(plan)}
                      style={[styles.planSelectButton, active && styles.planSelectButtonActive, plan === 'premium' && active && styles.planSelectButtonPremium]}>
                      <Text style={[styles.planSelectText, active && styles.planSelectTextActive]}>
                        {PLAN_LABELS[plan]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <InputGroup
              label="一言"
              value={draftProfile.note}
              onChangeText={(value) => updateProfile('note', value)}
              multiline
            />
            <View style={styles.formActionRow}>
              <Text style={styles.formHint}>入力内容は更新ボタンで反映されます。</Text>
              <Pressable
                onPress={() => {
                  setSavedProfile(draftProfile);
                  setSavedPlan(draftPlan);
                }}
                style={styles.updateButton}>
                <Text style={styles.updateButtonText}>更新</Text>
              </Pressable>
            </View>
          </AppCard>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InputGroup({
  label,
  value,
  onChangeText,
  multiline = false,
  autoCapitalize,
  keyboardType,
  secureTextEntry = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  multiline?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address';
  secureTextEntry?: boolean;
  placeholder?: string;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? `${label}を入力`}
        placeholderTextColor="#8a97ab"
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        style={[styles.input, multiline && styles.noteInput]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f6f7fb' },
  container: { flex: 1, backgroundColor: '#f6f7fb' },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40, gap: 18 },
  section: { gap: 12 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#152033' },
  profileCard: { padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: '#e8f0ff',
    overflow: 'hidden',
  },
  profileAvatarImage: { width: '100%', height: '100%' },
  profileInfo: { flex: 1, gap: 6 },
  profileNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  profileName: { fontSize: 20, fontWeight: '800', color: '#152033' },
  planBadge: {
    borderRadius: 999,
    backgroundColor: '#eef2f7',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  planBadgePremium: { backgroundColor: '#fff4d8' },
  planBadgeText: { fontSize: 12, fontWeight: '900', color: '#6c7a90' },
  planBadgeTextPremium: { color: '#b7791f' },
  profileId: { fontSize: 14, fontWeight: '700', color: '#1f6fff' },
  profileNote: { fontSize: 13, lineHeight: 19, color: '#6c7a90' },
  formCard: { padding: 18, gap: 14 },
  cardTitle: { fontSize: 18, fontWeight: '900', color: '#152033' },
  authDescription: { fontSize: 13, lineHeight: 19, color: '#6c7a90' },
  inputGroup: { gap: 8 },
  inputLabel: { fontSize: 14, fontWeight: '800', color: '#152033' },
  iconPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    backgroundColor: '#f6f8fc',
    padding: 12,
  },
  draftAvatar: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#e8f0ff',
    overflow: 'hidden',
  },
  iconPickerTextBlock: { flex: 1, gap: 4 },
  iconPickerTitle: { fontSize: 15, fontWeight: '800', color: '#152033' },
  iconPickerHint: { fontSize: 12, lineHeight: 17, color: '#6c7a90' },
  imagePickButton: { borderRadius: 999, backgroundColor: '#1f6fff', paddingHorizontal: 14, paddingVertical: 10 },
  imagePickButtonText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
  planSelectRow: { flexDirection: 'row', gap: 10 },
  planSelectButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: '#f6f8fc',
    borderWidth: 1,
    borderColor: '#e7ebf3',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  planSelectButtonActive: { backgroundColor: '#1f6fff', borderColor: '#1f6fff' },
  planSelectButtonPremium: { backgroundColor: '#f4a71d', borderColor: '#f4a71d' },
  planSelectText: { fontSize: 14, fontWeight: '900', color: '#6c7a90' },
  planSelectTextActive: { color: '#ffffff' },
  input: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: '#f6f8fc',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#152033',
  },
  noteInput: { minHeight: 96, textAlignVertical: 'top' },
  formActionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  formHint: { flex: 1, fontSize: 13, lineHeight: 19, color: '#6c7a90' },
  updateButton: { paddingVertical: 11, paddingHorizontal: 18, borderRadius: 999, backgroundColor: '#1f6fff' },
  updateButtonDisabled: { backgroundColor: '#aebbea' },
  updateButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
});
