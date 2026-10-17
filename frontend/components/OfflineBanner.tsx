import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Platform } from 'react-native';
import { useNetwork } from '../core/network';
import { WifiOff } from 'lucide-react-native';

export const OfflineBanner = () => {
  const { isOnline, pendingCount } = useNetwork();
  const slideAnim = useRef(new Animated.Value(-60)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: isOnline ? -60 : 0,
      useNativeDriver: Platform.OS !== 'web',
      tension: 80,
      friction: 12,
    }).start();
  }, [isOnline]);

  if (isOnline) return null;

  return (
    <Animated.View style={[styles.banner, { transform: [{ translateY: slideAnim }] }]}>
      <WifiOff color="#fbbf24" size={16} />
      <Text style={styles.text}>
        Você está offline
        {pendingCount > 0 ? ` • ${pendingCount} alteraç${pendingCount > 1 ? 'ões' : 'ão'} pendente${pendingCount > 1 ? 's' : ''}` : ' • sincronização automática ativa'}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1c1917',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
    zIndex: 1000,
    borderBottomWidth: 1,
    borderBottomColor: '#fbbf2430',
  },
  text: {
    color: '#fbbf24',
    fontSize: 13,
    fontWeight: '600',
  },
});
