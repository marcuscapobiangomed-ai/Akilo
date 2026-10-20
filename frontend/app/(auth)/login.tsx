import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, Image, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useRouter, Link } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '../../core/supabase';
import { Mail, Lock, Eye, EyeOff, ShieldCheck, Sparkles, KeyRound, Send, AlertCircle, X } from 'lucide-react-native';
import { hasCompletedOnboarding } from '../../core/onboarding';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showOtpBox, setShowOtpBox] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resending, setResending] = useState(false);
  const [otpStatusMsg, setOtpStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const formatAuthError = (errMessage: string): string => {
    if (!errMessage) return 'Falha na autenticação. Verifique suas credenciais.';
    const msg = errMessage.toLowerCase();
    if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
      return 'E-mail ou senha incorretos. Por favor, verifique seus dados.';
    }
    if (msg.includes('email not confirmed')) {
      return 'E-mail ainda não ativado. Insira o código numérico recebido ou solicite novo envio.';
    }
    if (msg.includes('too many requests') || msg.includes('rate limit')) {
      return 'Muitas tentativas em sequência. Aguarde alguns instantes.';
    }
    return errMessage;
  };

  const navigateAfterAuth = async (userId: string) => {
    try {
      const completed = await hasCompletedOnboarding(userId);
      if (!completed) {
        router.replace('/(auth)/onboarding');
      } else {
        router.replace('/(tabs)');
      }
    } catch {
      router.replace('/(auth)/onboarding');
    }
  };

  const handleLogin = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) {
      Alert.alert('Campos Obrigatórios', 'Por favor, informe seu e-mail e senha para continuar.');
      return;
    }
    
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });
      if (error) {
        if (error.message.toLowerCase().includes('email not confirmed')) {
          setShowOtpBox(true);
          setOtpStatusMsg(null);
        }
        throw error;
      }
      if (data?.session?.user?.id) {
        await navigateAfterAuth(data.session.user.id);
      } else {
        router.replace('/(tabs)');
      }
    } catch (e: any) {
      Alert.alert('Acesso ao Aplicativo', formatAuthError(e.message));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const cleanToken = otpCode.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setOtpStatusMsg({ text: 'Informe seu e-mail no formulário acima.', type: 'error' });
      return;
    }
    if (!cleanToken) {
      setOtpStatusMsg({ text: 'Digite o código de confirmação numérico.', type: 'error' });
      return;
    }

    setVerifyingOtp(true);
    setOtpStatusMsg(null);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanToken,
        type: 'signup',
      });

      if (error) throw error;

      setShowOtpBox(false);
      if (data?.session?.user?.id) {
        await navigateAfterAuth(data.session.user.id);
      } else {
        Alert.alert('Conta Ativada', 'Sua conta foi confirmada com sucesso! Você já pode entrar.');
      }
    } catch (e: any) {
      setOtpStatusMsg({ 
        text: e.message?.includes('expired') ? 'Código expirado. Solicite novo reenvio.' : 'Código incorreto ou inválido.', 
        type: 'error' 
      });
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleResendConfirmation = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      Alert.alert('E-mail Necessário', 'Informe seu e-mail no campo acima para reenviar a ativação.');
      return;
    }

    setResending(true);
    try {
      const emailRedirectTo = Linking.createURL('/');
      const { error } = await supabase.auth.resend({ 
        type: 'signup', 
        email: cleanEmail,
        options: { emailRedirectTo }
      });
      if (error) throw error;
      setOtpStatusMsg({ text: 'Código reenviado com sucesso! Verifique seu e-mail.', type: 'success' });
    } catch (e: any) {
      const msg = e.message?.toLowerCase() || '';
      if (msg.includes('rate limit') || msg.includes('too many')) {
        setOtpStatusMsg({ text: 'Aguarde alguns minutos antes de solicitar novo envio.', type: 'error' });
      } else {
        setOtpStatusMsg({ text: 'Não foi possível reenviar o código no momento.', type: 'error' });
      }
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoBadge}>
              <Image source={require('../../assets/logo.png')} style={styles.logoImage} />
            </View>
            <Text style={styles.title}>Bem-vindo de Volta</Text>
            <Text style={styles.subtitle}>Acesse para continuar sua evolução e registrar seus hábitos</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>E-mail</Text>
              <View style={styles.inputWrapper}>
                <Mail color="#6ee7b7" size={20} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={(val) => {
                    setEmail(val);
                    if (showOtpBox) setShowOtpBox(false);
                  }}
                  placeholder="seu.email@exemplo.com"
                  placeholderTextColor="#6b7280"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Senha</Text>
              <View style={styles.inputWrapper}>
                <Lock color="#6ee7b7" size={20} />
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor="#6b7280"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  {showPassword ? <EyeOff color="#9ca3af" size={20} /> : <Eye color="#9ca3af" size={20} />}
                </TouchableOpacity>
              </View>
            </View>

            {/* Caixa de Ativação Rápida de Conta Não Confirmada */}
            {showOtpBox && (
              <View style={styles.otpCard}>
                <View style={styles.otpCardHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <KeyRound color="#22c55e" size={16} />
                    <Text style={styles.otpCardTitle}>Ativação de Conta Pendente</Text>
                  </View>
                  <TouchableOpacity onPress={() => setShowOtpBox(false)}>
                    <X color="#9ca3af" size={16} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.otpCardDesc}>
                  Insira o código numérico recebido no seu e-mail para validar seu acesso imediatamente:
                </Text>
                <View style={styles.otpInputRow}>
                  <TextInput
                    style={styles.otpField}
                    value={otpCode}
                    onChangeText={setOtpCode}
                    placeholder="Código (ex: 56236975)"
                    placeholderTextColor="#6b7280"
                    keyboardType="number-pad"
                    maxLength={12}
                  />
                  <TouchableOpacity 
                    style={[styles.otpSubmitBtn, (!otpCode.trim() || verifyingOtp) && styles.buttonDisabled]}
                    onPress={handleVerifyOtp}
                    disabled={!otpCode.trim() || verifyingOtp}
                  >
                    {verifyingOtp ? (
                      <ActivityIndicator color="#0a1a15" size="small" />
                    ) : (
                      <Text style={styles.otpSubmitText}>Ativar</Text>
                    )}
                  </TouchableOpacity>
                </View>
                {otpStatusMsg && (
                  <Text style={[styles.otpFeedback, otpStatusMsg.type === 'error' ? styles.otpError : styles.otpSuccess]}>
                    {otpStatusMsg.text}
                  </Text>
                )}
                <TouchableOpacity 
                  style={[styles.otpResendBtn, resending && { opacity: 0.6 }]} 
                  onPress={handleResendConfirmation}
                  disabled={resending}
                >
                  <Send color="#22c55e" size={14} />
                  <Text style={styles.otpResendText}>
                    {resending ? 'Reenviando...' : 'Reenviar Código por E-mail'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity 
              style={[styles.primaryButton, loading && styles.buttonDisabled]} 
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <View style={styles.buttonContent}>
                  <ActivityIndicator color="#0a1a15" size="small" />
                  <Text style={styles.primaryButtonText}>Entrando...</Text>
                </View>
              ) : (
                <View style={styles.buttonContent}>
                  <Sparkles color="#0a1a15" size={18} />
                  <Text style={styles.primaryButtonText}>Entrar no Aplicativo</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Não tem uma conta ainda? </Text>
            <Link href="/(auth)/signup" asChild>
              <TouchableOpacity>
                <Text style={styles.footerLink}>Cadastre-se</Text>
              </TouchableOpacity>
            </Link>
          </View>

          {/* Disclaimer Sutil */}
          <View style={styles.securityBadge}>
            <ShieldCheck color="#22c55e" size={14} />
            <Text style={styles.securityText}>Seus dados são protegidos com segurança ponta a ponta</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a1a15', width: '100%' },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
    justifyContent: 'center',
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 16,
    width: '100%',
  },
  
  // Header
  header: { alignItems: 'center', marginBottom: 32 },
  logoBadge: {
    width: 80,
    height: 80,
    borderRadius: 22,
    backgroundColor: '#0f2920',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  logoImage: { width: 52, height: 52, resizeMode: 'contain' },
  title: { color: '#ffffff', fontSize: 24, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  subtitle: { color: '#9ca3af', fontSize: 13, textAlign: 'center', lineHeight: 18, paddingHorizontal: 6, flexShrink: 1 },
  
  // Form
  form: { marginBottom: 20, width: '100%' },
  inputGroup: { marginBottom: 16 },
  inputLabel: { color: '#d1d5db', marginBottom: 6, fontSize: 13, fontWeight: '600' },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f2920',
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#1f3d32',
  },
  input: { flex: 1, color: '#ffffff', paddingVertical: 14, paddingHorizontal: 10, fontSize: 14 },
  
  // Buttons
  primaryButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonDisabled: { opacity: 0.65 },
  buttonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryButtonText: { color: '#0a1a15', fontWeight: 'bold', fontSize: 15 },
  
  // Footer
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  footerText: { color: '#9ca3af', fontSize: 13 },
  footerLink: { color: '#22c55e', fontWeight: 'bold', fontSize: 13 },

  // Segurança
  securityBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: 0.8, paddingHorizontal: 10 },
  securityText: { color: '#6b7280', fontSize: 11, textAlign: 'center', flexShrink: 1 },

  // OTP Card
  otpCard: {
    backgroundColor: '#0f2920',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.4)',
    padding: 14,
    marginBottom: 16,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  otpCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  otpCardTitle: {
    color: '#22c55e',
    fontSize: 14,
    fontWeight: 'bold',
  },
  otpCardDesc: {
    color: '#9ca3af',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 10,
  },
  otpInputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  otpField: {
    flex: 1,
    backgroundColor: '#0a1a15',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1f3d32',
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 2,
    textAlign: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  otpSubmitBtn: {
    backgroundColor: '#22c55e',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpSubmitText: {
    color: '#0a1a15',
    fontWeight: 'bold',
    fontSize: 13,
  },
  otpFeedback: {
    fontSize: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  otpError: {
    color: '#f87171',
  },
  otpSuccess: {
    color: '#4ade80',
  },
  otpResendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  otpResendText: {
    color: '#22c55e',
    fontSize: 12,
    fontWeight: '600',
  },
});
