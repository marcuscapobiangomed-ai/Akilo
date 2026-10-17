import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useRouter, Link } from 'expo-router';
import { supabase } from '../../core/supabase';
import { Mail, Lock, Eye, EyeOff, ShieldCheck, Sparkles } from 'lucide-react-native';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const formatAuthError = (errMessage: string): string => {
    if (!errMessage) return 'Falha na autenticação. Verifique suas credenciais.';
    const msg = errMessage.toLowerCase();
    if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
      return 'E-mail ou senha incorretos. Por favor, verifique seus dados.';
    }
    if (msg.includes('email not confirmed')) {
      return 'E-mail ainda não confirmado. Verifique sua caixa de entrada ou spam.';
    }
    if (msg.includes('too many requests') || msg.includes('rate limit')) {
      return 'Muitas tentativas em sequência. Aguarde alguns instantes.';
    }
    return errMessage;
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Campos Obrigatórios', 'Por favor, informe seu e-mail e senha para continuar.');
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw error;
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Acesso Não Autorizado', formatAuthError(e.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>
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
});
