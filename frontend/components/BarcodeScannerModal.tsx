import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  ActivityIndicator,
  TextInput,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { X, Zap, ZapOff, Camera, AlertCircle, CheckCircle2, ArrowRight, Search } from 'lucide-react-native';
import { api } from '../core/api';
import { soundHaptics } from '../core/soundHaptics';

interface BarcodeScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onFoodSelected: (food: any) => void;
  onManualCustomRequest?: (barcode: string) => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SCAN_FRAME_WIDTH = Math.min(SCREEN_WIDTH * 0.8, 300);
const SCAN_FRAME_HEIGHT = 180;

export default function BarcodeScannerModal({
  visible,
  onClose,
  onFoodSelected,
  onManualCustomRequest,
}: BarcodeScannerModalProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [isScanning, setIsScanning] = useState(true);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [loadingProduct, setLoadingProduct] = useState(false);
  const [foundProduct, setFoundProduct] = useState<any | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  // Animação da linha de laser de escaneamento
  const laserAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setIsScanning(true);
      setScannedCode(null);
      setFoundProduct(null);
      setSearchError(null);
      setManualCode('');
      setShowManualInput(false);

      // Inicia animação de laser contínuo
      Animated.loop(
        Animated.sequence([
          Animated.timing(laserAnim, {
            toValue: 1,
            duration: 1800,
            useNativeDriver: true,
          }),
          Animated.timing(laserAnim, {
            toValue: 0,
            duration: 1800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      laserAnim.stopAnimation();
      setTorch(false);
    }
  }, [visible]);

  // Processa o código lido
  const handleBarcodeScanned = async (code: string) => {
    if (!isScanning || loadingProduct) return;
    
    // Evita leituras duplicadas rápidas
    setIsScanning(false);
    setScannedCode(code);
    setSearchError(null);
    setLoadingProduct(true);

    // Efeito tátil e sonoro de trava imediata
    soundHaptics.triggerScaleLock();

    try {
      // Busca nas bases via endpoint de busca inteligente
      const res = await api.get('/api/food/search', { q: code });
      const results = [...(res?.master || []), ...(res?.custom || [])];

      if (results.length > 0) {
        soundHaptics.triggerCelebration();
        setFoundProduct(results[0]);
      } else {
        soundHaptics.triggerLightTap();
        setSearchError(`Código ${code} não catalogado na base nacional.`);
      }
    } catch (err: any) {
      soundHaptics.triggerLightTap();
      setSearchError('Erro de conexão ao consultar base nutricional.');
    } finally {
      setLoadingProduct(false);
    }
  };

  const handleManualSubmit = () => {
    const clean = manualCode.trim();
    if (clean.length >= 6) {
      handleBarcodeScanned(clean);
    }
  };

  const resetToScanAgain = () => {
    setFoundProduct(null);
    setSearchError(null);
    setScannedCode(null);
    setIsScanning(true);
    soundHaptics.triggerLightTap();
  };

  const handleConfirmProduct = () => {
    if (foundProduct) {
      soundHaptics.triggerMediumTap();
      onFoodSelected(foundProduct);
      onClose();
    }
  };

  const handleRegisterManually = () => {
    if (scannedCode && onManualCustomRequest) {
      onManualCustomRequest(scannedCode);
      onClose();
    } else {
      resetToScanAgain();
    }
  };

  const laserTranslateY = laserAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SCAN_FRAME_HEIGHT - 4],
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Top Bar / Header */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.circleBtn}
            onPress={() => {
              soundHaptics.triggerLightTap();
              onClose();
            }}
            activeOpacity={0.7}
          >
            <X color="#ffffff" size={20} />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Leitor de Alimentos</Text>
            <View style={styles.statusBadge}>
              <View style={[styles.statusDot, { backgroundColor: isScanning ? '#10b981' : '#f59e0b' }]} />
              <Text style={styles.statusText}>
                {isScanning ? 'CÂMERA ATIVA' : loadingProduct ? 'CONSULTANDO...' : 'CÓDIGO CAPTURADO'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.circleBtn, torch && styles.circleBtnActive]}
            onPress={() => {
              soundHaptics.triggerLightTap();
              setTorch((prev) => !prev);
            }}
            activeOpacity={0.7}
          >
            {torch ? <Zap color="#10b981" size={20} /> : <ZapOff color="#9ca3af" size={20} />}
          </TouchableOpacity>
        </View>

        {/* Corpo do Scanner */}
        {!permission?.granted ? (
          <View style={styles.permissionContainer}>
            <View style={styles.permissionIconWrap}>
              <Camera color="#10b981" size={44} />
            </View>
            <Text style={styles.permissionTitle}>Permissão da Câmera</Text>
            <Text style={styles.permissionDesc}>
              O Batalha da Balança utiliza a câmera exclusivamente para identificar o código de barras
              de alimentos e recuperar os dados nutricionais em miligramas e gramas.
            </Text>
            <TouchableOpacity
              style={styles.permissionBtn}
              onPress={async () => {
                soundHaptics.triggerLightTap();
                await requestPermission();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.permissionBtnText}>Habilitar Câmera</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.manualFallbackBtn}
              onPress={() => setShowManualInput(true)}
            >
              <Text style={styles.manualFallbackText}>Digitar código de barras manualmente</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.cameraWrapper}>
            <CameraView
              style={StyleSheet.absoluteFillObject}
              facing="back"
              enableTorch={torch}
              barcodeScannerSettings={{
                barcodeTypes: [
                  'ean13',
                  'ean8',
                  'upc_a',
                  'upc_e',
                  'code128',
                  'code39',
                  'qr',
                ],
              }}
              onBarcodeScanned={(result) => {
                if (result.data) {
                  handleBarcodeScanned(result.data);
                }
              }}
            />

            {/* Máscara de foco com cantos neon */}
            <View style={styles.overlay}>
              <View style={styles.maskTop} />
              <View style={styles.maskMiddle}>
                <View style={styles.maskSide} />
                <View style={styles.focusFrame}>
                  {/* Cantos estilizados */}
                  <View style={[styles.corner, styles.cornerTL]} />
                  <View style={[styles.corner, styles.cornerTR]} />
                  <View style={[styles.corner, styles.cornerBL]} />
                  <View style={[styles.corner, styles.cornerBR]} />

                  {/* Linha laser de varredura ativa */}
                  {isScanning && (
                    <Animated.View
                      style={[
                        styles.laserLine,
                        { transform: [{ translateY: laserTranslateY }] },
                      ]}
                    />
                  )}
                </View>
                <View style={styles.maskSide} />
              </View>
              <View style={styles.maskBottom}>
                <Text style={styles.instructionText}>
                  Posicione o código de barras no centro do retângulo
                </Text>

                <TouchableOpacity
                  style={styles.switchManualBtn}
                  onPress={() => {
                    soundHaptics.triggerLightTap();
                    setShowManualInput((prev) => !prev);
                  }}
                >
                  <Text style={styles.switchManualText}>
                    {showManualInput ? 'Ocultar digitação manual' : 'Digitar número do código'}
                  </Text>
                </TouchableOpacity>

                {showManualInput && (
                  <View style={styles.manualInputRow}>
                    <TextInput
                      style={styles.manualInputField}
                      placeholder="Ex: 7891000100103"
                      placeholderTextColor="#6b7280"
                      keyboardType="numeric"
                      value={manualCode}
                      onChangeText={setManualCode}
                      maxLength={14}
                    />
                    <TouchableOpacity
                      style={styles.manualInputSubmit}
                      onPress={handleManualSubmit}
                    >
                      <Search color="#0a1a15" size={18} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Modal / Card Inferior de Carregamento & Resultado */}
        {(loadingProduct || foundProduct || searchError) && (
          <View style={styles.bottomSheet}>
            {loadingProduct && (
              <View style={styles.loadingWrap}>
                <ActivityIndicator color="#10b981" size="large" />
                <Text style={styles.loadingTitle}>Localizando alimento...</Text>
                <Text style={styles.loadingSub}>Código detectado: {scannedCode}</Text>
              </View>
            )}

            {searchError && (
              <View style={styles.errorWrap}>
                <View style={styles.errorIconWrap}>
                  <AlertCircle color="#f59e0b" size={32} />
                </View>
                <Text style={styles.errorTitle}>Alimento não catalogado</Text>
                <Text style={styles.errorDesc}>{searchError}</Text>
                <View style={styles.actionButtonsRow}>
                  <TouchableOpacity
                    style={styles.secondaryBtn}
                    onPress={resetToScanAgain}
                  >
                    <Text style={styles.secondaryBtnText}>Tentar Novamente</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.primaryBtn}
                    onPress={handleRegisterManually}
                  >
                    <Text style={styles.primaryBtnText}>Criar Manualmente</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {foundProduct && (
              <View style={styles.productCard}>
                <View style={styles.productHeader}>
                  <CheckCircle2 color="#10b981" size={24} />
                  <View style={styles.productTitleWrap}>
                    <Text style={styles.productName} numberOfLines={2}>
                      {foundProduct.name}
                    </Text>
                    <Text style={styles.productCategory}>
                      {foundProduct.category || 'Industrializado'} • Base 100g
                    </Text>
                  </View>
                </View>

                {/* Grid de Macronutrientes Clínicos */}
                <View style={styles.macroPillsRow}>
                  <View style={[styles.macroPill, { borderColor: '#ef4444' }]}>
                    <Text style={[styles.macroPillVal, { color: '#ef4444' }]}>
                      {foundProduct.calories}
                    </Text>
                    <Text style={styles.macroPillLabel}>kcal</Text>
                  </View>
                  <View style={[styles.macroPill, { borderColor: '#3b82f6' }]}>
                    <Text style={[styles.macroPillVal, { color: '#3b82f6' }]}>
                      {foundProduct.protein_g}g
                    </Text>
                    <Text style={styles.macroPillLabel}>Proteína</Text>
                  </View>
                  <View style={[styles.macroPill, { borderColor: '#f59e0b' }]}>
                    <Text style={[styles.macroPillVal, { color: '#f59e0b' }]}>
                      {foundProduct.carbs_g}g
                    </Text>
                    <Text style={styles.macroPillLabel}>Carboidrato</Text>
                  </View>
                  <View style={[styles.macroPill, { borderColor: '#10b981' }]}>
                    <Text style={[styles.macroPillVal, { color: '#10b981' }]}>
                      {foundProduct.fats_g}g
                    </Text>
                    <Text style={styles.macroPillLabel}>Gorduras</Text>
                  </View>
                </View>

                {/* Alerta de Gorduras Saturadas / SBC */}
                {foundProduct.saturated_fats_g > 4 && (
                  <View style={styles.cardioWarningBadge}>
                    <AlertCircle color="#f59e0b" size={14} />
                    <Text style={styles.cardioWarningText}>
                      Atenção SBC: {foundProduct.saturated_fats_g}g de gordura saturada por 100g.
                    </Text>
                  </View>
                )}

                {/* Botões de Ação */}
                <View style={styles.actionButtonsRow}>
                  <TouchableOpacity
                    style={styles.secondaryBtn}
                    onPress={resetToScanAgain}
                  >
                    <Text style={styles.secondaryBtnText}>Outro Código</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.confirmBtn}
                    onPress={handleConfirmProduct}
                  >
                    <Text style={styles.confirmBtnText}>Selecionar Alimento</Text>
                    <ArrowRight color="#0a1a15" size={18} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  topBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 48 : 24,
    left: 16,
    right: 16,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(10, 26, 21, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleBtnActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    borderColor: '#10b981',
  },
  headerTitleWrap: {
    alignItems: 'center',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    color: '#9ca3af',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  cameraWrapper: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  maskTop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  maskMiddle: {
    height: SCAN_FRAME_HEIGHT,
    flexDirection: 'row',
  },
  maskSide: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  focusFrame: {
    width: SCAN_FRAME_WIDTH,
    height: SCAN_FRAME_HEIGHT,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#10b981',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 8,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 8,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 8,
  },
  laserLine: {
    height: 3,
    backgroundColor: '#00f0ff',
    shadowColor: '#00f0ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    borderRadius: 2,
    marginHorizontal: 8,
  },
  maskBottom: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    paddingTop: 24,
    paddingHorizontal: 20,
  },
  instructionText: {
    color: '#e5e7eb',
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
  },
  switchManualBtn: {
    marginTop: 14,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  switchManualText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  manualInputRow: {
    flexDirection: 'row',
    marginTop: 12,
    width: '100%',
    maxWidth: 300,
    gap: 8,
  },
  manualInputField: {
    flex: 1,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 10,
    color: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  manualInputSubmit: {
    backgroundColor: '#10b981',
    borderRadius: 10,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#111827',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    zIndex: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  loadingWrap: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  loadingSub: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 4,
  },
  errorWrap: {
    alignItems: 'center',
  },
  errorIconWrap: {
    marginBottom: 8,
  },
  errorTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  errorDesc: {
    color: '#9ca3af',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  productCard: {},
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  productTitleWrap: {
    flex: 1,
  },
  productName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  productCategory: {
    color: '#9ca3af',
    fontSize: 11,
    marginTop: 2,
  },
  macroPillsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 14,
  },
  macroPill: {
    flex: 1,
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  macroPillVal: {
    fontSize: 14,
    fontWeight: '800',
  },
  macroPillLabel: {
    color: '#9ca3af',
    fontSize: 10,
    marginTop: 2,
  },
  cardioWarningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 14,
  },
  cardioWarningText: {
    color: '#f59e0b',
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: '#374151',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: '#e5e7eb',
    fontSize: 13,
    fontWeight: '600',
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#0a1a15',
    fontSize: 13,
    fontWeight: '700',
  },
  confirmBtn: {
    flex: 2,
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmBtnText: {
    color: '#0a1a15',
    fontSize: 14,
    fontWeight: '700',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  permissionIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  permissionTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 10,
    textAlign: 'center',
  },
  permissionDesc: {
    color: '#9ca3af',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  permissionBtn: {
    backgroundColor: '#10b981',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
  },
  permissionBtnText: {
    color: '#0a1a15',
    fontSize: 15,
    fontWeight: '800',
  },
  manualFallbackBtn: {
    marginTop: 16,
    paddingVertical: 8,
  },
  manualFallbackText: {
    color: '#6b7280',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
});
