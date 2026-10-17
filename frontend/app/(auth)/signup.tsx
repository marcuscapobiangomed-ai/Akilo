import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Image, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useRouter, Link } from 'expo-router';
import { supabase } from '../../core/supabase';
import { Mail, Lock, User, Eye, EyeOff, CheckCircle, ArrowLeft, Send } from 'lucide-react-native';
import { useToast } from '../../components/Toast';

export default function Signup() {
  const router = useRouter();
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [resending, setResending] = useState(false);

  const formatSignupError = (errMessage: string): string => {
    if (!errMessage) return 'Falha ao realizar cadastro. Tente novamente.';
    const msg = errMessage.toLowerCase();
    if (msg.includes('user already registered') || msg.includes('already exists')) {
      return 'Já existe uma conta cadastrada com este e-mail.';
    }
    if (msg.includes('password should be at least')) {
      return 'A senha deve ter no mínimo 6 caracteres.';
    }
    if (msg.includes('invalid email') || msg.includes('unable to validate email')) {
      return 'Informe um formato de e-mail válido.';
    }
    return errMessage;
  };

  const handleSignup = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName || !trimmedEmail || !password) {
      showToast('Por favor, preencha todos os campos.', 'error');
      return;
    }
    
    if (password.length < 6) {
      showToast('A senha deve conter no mínimo 6 caracteres.', 'error');
      return;
    }
    
    setLoading(true);
    try {
      const { error, data } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: { 
          data: { name: trimmedName },
        }
      });
      
      if (error) throw error;
      
      // Se não precisa de confirmação por e-mail ou se já confirmou direto:
      if (data?.session) {
        showToast('Conta criada com sucesso!', 'success');
        router.replace('/(tabs)');
        return;
      }

      // Se e-mail já existe sem criar sessão
      if (data?.user?.identities?.length === 0) {
        showToast('Uma conta com este e-mail já existe.', 'error');
      } else {
        setShowConfirmation(true);
      }
    } catch (e: any) {
      showToast(formatSignupError(e.message), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    router.replace('/(auth)/login');
  };

  const handleResendEmail = async () => {
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim().toLowerCase() });
      if (error) throw error;
      showToast('E-mail de confirmação reenviado com sucesso!', 'success');
    } catch (e) {
      showToast('Não foi possível reenviar o e-mail no momento.', 'error');
    } finally {
      setResending(false);
    }
  };

  // Tela de confirmação de e-mail
  if (showConfirmation) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.confirmationContent}>
          <View style={styles.confirmationIcon}>
            <CheckCircle color="#22c55e" size={56} />
          </View>
          
          <Text style={styles.confirmationTitle}>Verifique seu E-mail</Text>
          
          <Text style={styles.confirmationText}>
            Enviamos um link de confirmação seguro para:
          </Text>
          <Text style={styles.confirmationEmail}>{email.trim()}</Text>
          
          <View style={styles.instructionBox}>
            <Text style={styles.instructionTitle}>Próximos Passos:</Text>
            <Text style={styles.instructionText}>1. Abra o e-mail que acabamos de enviar</Text>
            <Text style={styles.instructionText}>2. Clique no link de confirmação</Text>
            <Text style={styles.instructionText}>3. Retorne ao aplicativo para iniciar seus registros</Text>
          </View>

          <Text style={styles.spamNote}>
            Não encontrou o e-mail? Verifique também sua caixa de spam ou lixo eletrônico.
          </Text>

          <TouchableOpacity 
            style={[styles.resendButton, resending && { opacity: 0.6 }]} 
            onPress={handleResendEmail}
            disabled={resending}
          >
            {resending ? (
              <ActivityIndicator color="#22c55e" size="small" />
            ) : (
              <>
                <Send color="#22c55e" size={18} />
                <Text style={styles.resendText}>Reenviar E-mail de Confirmação</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={handleBackToLogin}>
            <ArrowLeft color="#9ca3af" size={18} />
            <Text style={styles.secondaryButtonText}>Voltar para o Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoBadge}>
              <Image source={require('../../assets/logo.png')} style={styles.logoImage} />
            </View>
            <Text style={styles.title}>Criar sua Conta</Text>
            <Text style={styles.subtitle}>Inicie sua jornada de emagrecimento sustentável e controle de hábitos</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nome Completo</Text>
              <View style={styles.inputWrapper}>
                <User color="#6ee7b7" size={20} />
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Seu Nome"
                  placeholderTextColor="#6b7280"
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>E-mail</Text>
              <View style={styles.inputWrapper}>
                <Mail color="#6ee7b7" size={20} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="seu.email@exemplo.com"
                  placeholderTextColor="#6b7280"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Senha (mínimo 6 caracteres)</Text>
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

            <TouchableOpacity 
              style={[styles.primaryButton, loading && styles.buttonDisabled]} 
              onPress={handleSignup}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <View style={styles.buttonContent}>
                  <ActivityIndicator color="#0a1a15" size="small" />
                  <Text style={styles.primaryButtonText}>Criando Conta...</Text>
                </View>
              ) : (
                <Text style={styles.primaryButtonText}>Criar Conta Gratuita</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Já possui uma conta cadastrada? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text style={styles.footerLink}>Entrar</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a1a15' },
  content: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    justifyContent: 'center',
    minHeight: '100%',
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  
  // Header
  header: { alignItems: 'center', marginBottom: 28 },
  logoBadge: {
    width: 76,
    height: 76,
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
    shadowRadius: 8,
    elevation: 4,
  },
  logoImage: { width: 50, height: 50, resizeMode: 'contain' },
  title: { color: '#ffffff', fontSize: 26, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  subtitle: { color: '#9ca3af', fontSize: 14, textAlign: 'center', lineHeight: 20, paddingHorizontal: 12 },
  
  // Form
  form: { marginBottom: 20 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { color: '#d1d5db', marginBottom: 8, fontSize: 14, fontWeight: '600' },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f2920',
    borderRadius: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#1f3d32',
  },
  input: { flex: 1, color: '#ffffff', paddingVertical: 15, paddingHorizontal: 12, fontSize: 15 },
  
  // Buttons
  primaryButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonDisabled: { opacity: 0.65 },
  buttonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryButtonText: { color: '#0a1a15', fontWeight: 'bold', fontSize: 16 },
  
  // Footer
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  footerText: { color: '#9ca3af', fontSize: 14 },
  footerLink: { color: '#22c55e', fontWeight: 'bold', fontSize: 14 },

  // Confirmation
  confirmationContent: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' },
  confirmationIcon: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  confirmationTitle: { color: '#ffffff', fontSize: 24, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  confirmationText: { color: '#9ca3af', fontSize: 15, textAlign: 'center' },
  confirmationEmail: { color: '#22c55e', fontSize: 16, fontWeight: 'bold', marginTop: 4, marginBottom: 24, textAlign: 'center' },
  instructionBox: {
    backgroundColor: '#0f2920',
    borderRadius: 16,
    padding: 18,
    width: '100%',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1f3d32',
  },
  instructionTitle: { color: '#ffffff', fontSize: 15, fontWeight: 'bold', marginBottom: 8 },
  instructionText: { color: '#d1d5db', fontSize: 13, lineHeight: 22 },
  spamNote: { color: '#6b7280', fontSize: 13, textAlign: 'center', marginBottom: 24, paddingHorizontal: 16 },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    marginBottom: 16,
  },
  resendText: { color: '#22c55e', fontSize: 14, fontWeight: '600' },
  secondaryButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10 },
  secondaryButtonText: { color: '#9ca3af', fontSize: 14 },
});
