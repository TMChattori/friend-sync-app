import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useRegistration } from '@/components/auth/registration-context';
import { AppButton } from '@/components/common/app-button';
import { AppCard } from '@/components/common/app-card';
import { loginWithEmail, registerWithEmail, requestPasswordReset } from '@/services/auth-api';
import { type AuthSession } from '@/services/auth-session';

type AuthMode = 'login' | 'register';

export function RegistrationScreenContent() {
  const router = useRouter();
  const { completeRegistration, isReady, isRegistered } = useRegistration();
  const [authMode, setAuthMode] = useState<AuthMode>('register');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [isPrivacyModalVisible, setIsPrivacyModalVisible] = useState(false);
  const [isResetModalVisible, setIsResetModalVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetSubmitting, setIsResetSubmitting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (isReady && isRegistered) {
      router.replace('/(tabs)');
    }
  }, [isReady, isRegistered, router]);

  const enterApp = (session: AuthSession) => {
    completeRegistration(session);
    router.replace('/(tabs)');
  };

  const validateEmailAndPassword = () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail.includes('@')) {
      Alert.alert('メールアドレスを確認してください', 'ログインに使うメールアドレスを入力してください。');
      return false;
    }

    if (!password) {
      Alert.alert('パスワードを入力してください', 'ログインに使うパスワードを入力してください。');
      return false;
    }

    return true;
  };

  const handleLogin = async () => {
    setAuthError(null);

    if (!validateEmailAndPassword()) {
      return;
    }

    try {
      setIsSubmitting(true);
      const session = await loginWithEmail(email.trim(), password);
      enterApp(session);
    } catch (error) {
      const rawMessage =
        error instanceof Error ? error.message : 'メールアドレスまたはパスワードを確認してください。';
      const message =
        rawMessage.toLowerCase().includes('email not confirmed')
          ? '確認メールの認証がまだ完了していません。メール内のリンクを開いてからログインしてください。'
          : rawMessage;
      setAuthError(message);
      Alert.alert(
        'ログインできませんでした',
        message
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async () => {
    setAuthError(null);

    if (!validateEmailAndPassword()) {
      return;
    }

    if (password.length < 8) {
      Alert.alert('パスワードを確認してください', 'パスワードは8文字以上で入力してください。');
      return;
    }

    if (password !== passwordConfirmation) {
      Alert.alert('パスワードを確認してください', 'パスワードが2回とも一致しているか確認してください。');
      return;
    }

    if (!username.trim()) {
      Alert.alert('ユーザ名を入力してください', '新規登録ではユーザ名を入力してください。');
      return;
    }

    if (!agreedToPrivacy) {
      Alert.alert('プライバシー規約への同意が必要です', '個人情報の取り扱い内容を確認し、同意してください。');
      return;
    }

    try {
      setIsSubmitting(true);
      const session = await registerWithEmail(username.trim(), email.trim(), password);

      if (!session.accessToken) {
        setAuthError('確認メールを送りました。メール内のリンクで認証してからログインしてください。');
        setAuthMode('login');
        Alert.alert(
          '登録は完了しました',
          '確認メールを送りました。メール内のリンクで認証してからログインしてください。'
        );
        return;
      }

      enterApp(session);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : '「新規登録」タブを選んでいるか、すでに登録済みのメールアドレスではないか確認してください。';
      setAuthError(message);
      Alert.alert(
        '登録できませんでした',
        message
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const openResetModal = () => {
    setResetEmail(email.trim());
    setIsResetModalVisible(true);
  };

  const handlePasswordReset = async () => {
    const trimmedEmail = resetEmail.trim();

    if (!trimmedEmail.includes('@')) {
      Alert.alert('メールアドレスを確認してください', '登録したメールアドレスを入力してください。');
      return;
    }

    try {
      setIsResetSubmitting(true);
      await requestPasswordReset(trimmedEmail);
      setIsResetModalVisible(false);
      Alert.alert('再設定メールを送りました', '届いたメールから新しいパスワードを設定してください。');
    } catch {
      Alert.alert('メールを送れませんでした', 'メールアドレスやサーバー接続を確認してください。');
    } finally {
      setIsResetSubmitting(false);
    }
  };

  const isRegisterMode = authMode === 'register';

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardWrap}>
        <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>Friend Sync</Text>
            <Text style={styles.title}>{isRegisterMode ? 'はじめる準備をしましょう' : 'おかえりなさい'}</Text>
            <Text style={styles.subtitle}>
              {isRegisterMode
                ? '予定や友達情報を安全に扱うため、ユーザ名・メールアドレス・パスワードを登録してください。'
                : 'すでに登録済みのメールアドレスとパスワードでログインできます。'}
            </Text>
          </View>

          <AppCard style={styles.formCard}>
            <View style={styles.modeSwitch}>
              {(['login', 'register'] as const).map((mode) => {
                const active = authMode === mode;

                return (
                  <Pressable
                    key={mode}
                    onPress={() => setAuthMode(mode)}
                    style={[styles.modeButton, active && styles.modeButtonActive]}>
                    <Text style={[styles.modeButtonText, active && styles.modeButtonTextActive]}>
                      {mode === 'login' ? 'ログイン' : '新規登録'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <InputGroup
              label="メールアドレス"
              value={email}
              onChangeText={setEmail}
              placeholder="example@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {isRegisterMode ? (
              <InputGroup
                label="ユーザ名"
                value={username}
                onChangeText={setUsername}
                placeholder="表示したい名前を入力"
                autoCorrect={false}
              />
            ) : null}
            <InputGroup
              label="パスワード"
              value={password}
              onChangeText={setPassword}
              placeholder="8文字以上で入力"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
            {isRegisterMode ? (
              <InputGroup
                label="パスワード確認"
                value={passwordConfirmation}
                onChangeText={setPasswordConfirmation}
                placeholder="同じパスワードをもう一度入力"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            ) : null}

            {isRegisterMode ? (
              <>
                <Pressable style={styles.privacyRow} onPress={() => setAgreedToPrivacy((current) => !current)}>
                  <View style={[styles.checkbox, agreedToPrivacy && styles.checkboxActive]}>
                    {agreedToPrivacy ? <Text style={styles.checkboxMark}>✓</Text> : null}
                  </View>
                  <View style={styles.privacyTextBlock}>
                    <Text style={styles.privacyTitle}>プライバシー規約に同意する</Text>
                    <Text style={styles.privacyText}>
                      メールアドレス、予定、友達情報などの個人情報をサービス提供のために扱います。
                    </Text>
                  </View>
                </Pressable>

                <Pressable onPress={() => setIsPrivacyModalVisible(true)} style={styles.policyLink}>
                  <Text style={styles.policyLinkText}>プライバシー規約を確認する</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.loginHint}>登録済みのメールアドレスとパスワードでログインします。</Text>
                <Pressable onPress={openResetModal} style={styles.policyLink}>
                  <Text style={styles.policyLinkText}>パスワードを忘れた場合</Text>
                </Pressable>
              </>
            )}

            {authError ? <Text style={styles.errorText}>{authError}</Text> : null}

            <AppButton
              label={isSubmitting ? '通信中...' : isRegisterMode ? '確認メールを送って登録' : 'ログイン'}
              onPress={isRegisterMode ? handleRegister : handleLogin}
              disabled={isSubmitting || (isRegisterMode && !agreedToPrivacy)}
            />
          </AppCard>

          <Text style={styles.notice}>User テーブルにはユーザ名とメールアドレス、パスワードは Supabase Auth 側で管理します。</Text>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        animationType="fade"
        transparent
        visible={isPrivacyModalVisible}
        onRequestClose={() => setIsPrivacyModalVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setIsPrivacyModalVisible(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>プライバシー規約</Text>
            <Text style={styles.modalText}>
              Friend Sync は、アカウント作成、予定管理、友達とのお誘い機能を提供するために、メールアドレス、パスワード、
              予定情報、友達情報、プロフィール情報を取り扱います。
            </Text>
            <Text style={styles.modalText}>
              パスワードは安全な認証基盤で管理する前提とし、アプリ画面上では他人に表示しません。予定の詳細はMVPでは自分用の情報として扱い、
              友達には空き状況の判断に必要な範囲だけを使う想定です。
            </Text>
            <Text style={styles.modalText}>
              今後リリース前には、正式な利用規約・プライバシーポリシー・問い合わせ先を整備してください。
            </Text>
            <View style={styles.modalActions}>
              <AppButton label="閉じる" variant="secondary" onPress={() => setIsPrivacyModalVisible(false)} />
              <AppButton
                label="同意する"
                onPress={() => {
                  setAgreedToPrivacy(true);
                  setIsPrivacyModalVisible(false);
                }}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        animationType="fade"
        transparent
        visible={isResetModalVisible}
        onRequestClose={() => setIsResetModalVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setIsResetModalVisible(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>パスワード再設定</Text>
            <Text style={styles.modalText}>
              登録したメールアドレスを入力してください。パスワードそのものではなく、安全な再設定メールを送ります。
            </Text>
            <InputGroup
              label="メールアドレス"
              value={resetEmail}
              onChangeText={setResetEmail}
              placeholder="example@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.modalActions}>
              <AppButton label="閉じる" variant="secondary" onPress={() => setIsResetModalVisible(false)} />
              <AppButton
                label={isResetSubmitting ? '送信中...' : '送信'}
                disabled={isResetSubmitting}
                onPress={handlePasswordReset}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function InputGroup({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  secureTextEntry = false,
  autoCapitalize,
  autoCorrect,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'email-address';
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#8a97ab"
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f6f7fb' },
  keyboardWrap: { flex: 1 },
  container: { flex: 1, backgroundColor: '#f6f7fb' },
  content: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 40, gap: 20 },
  hero: { gap: 10, paddingTop: 16 },
  eyebrow: { fontSize: 13, fontWeight: '900', color: '#1f6fff', letterSpacing: 0.4 },
  title: { fontSize: 30, lineHeight: 38, fontWeight: '900', color: '#152033' },
  subtitle: { fontSize: 15, lineHeight: 23, color: '#6c7a90' },
  formCard: { padding: 18, gap: 16, borderRadius: 28 },
  modeSwitch: {
    flexDirection: 'row',
    borderRadius: 18,
    backgroundColor: '#f1f4f9',
    padding: 4,
    gap: 4,
  },
  modeButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeButtonActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#111827',
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  modeButtonText: { fontSize: 14, fontWeight: '900', color: '#7b8798' },
  modeButtonTextActive: { color: '#1f6fff' },
  inputGroup: { gap: 8 },
  inputLabel: { fontSize: 14, fontWeight: '800', color: '#152033' },
  input: {
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: '#f6f8fc',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#152033',
  },
  privacyRow: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: 18,
    backgroundColor: '#f6f8fc',
    padding: 14,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#c8d2e2',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  checkboxActive: { backgroundColor: '#1f6fff', borderColor: '#1f6fff' },
  checkboxMark: { color: '#ffffff', fontSize: 15, fontWeight: '900' },
  privacyTextBlock: { flex: 1, gap: 4 },
  privacyTitle: { fontSize: 15, fontWeight: '900', color: '#152033' },
  privacyText: { fontSize: 12, lineHeight: 18, color: '#6c7a90' },
  loginHint: {
    borderRadius: 16,
    backgroundColor: '#f6f8fc',
    padding: 13,
    fontSize: 12,
    lineHeight: 18,
    color: '#6c7a90',
  },
  errorText: {
    borderRadius: 16,
    backgroundColor: '#fff1f5',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13,
    lineHeight: 19,
    color: '#c13b67',
    fontWeight: '700',
  },
  policyLink: { alignSelf: 'flex-start' },
  policyLinkText: { fontSize: 13, fontWeight: '900', color: '#1f6fff' },
  notice: { fontSize: 12, lineHeight: 18, color: '#8a97ab', textAlign: 'center' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(21, 32, 51, 0.22)',
    justifyContent: 'center',
    padding: 18,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    padding: 20,
    gap: 12,
    shadowColor: '#111827',
    shadowOpacity: 0.14,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  modalTitle: { fontSize: 21, fontWeight: '900', color: '#152033' },
  modalText: { fontSize: 14, lineHeight: 22, color: '#5f6c80' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 6 },
});
