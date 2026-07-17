import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Animated, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

const ICONS = {
  success: 'checkmark-circle',
  error: 'close-circle',
  info: 'information-circle',
  warning: 'warning',
};

const COLORS = {
  success: '#00B894',
  error: '#FF6B6B',
  info: '#7ECDC0',
  warning: '#FDCB6E',
};

let toastListener: ((toast: ToastMessage) => void) | null = null;

export function showToast(message: string, type: ToastMessage['type'] = 'info', duration = 3000) {
  if (toastListener) {
    toastListener({ id: Date.now().toString(), message, type, duration });
  }
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    toastListener = (toast: ToastMessage) => {
      setToasts(prev => [...prev, toast]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toast.id));
      }, toast.duration || 3000);
    };
    return () => { toastListener = null; };
  }, []);

  useEffect(() => {
    if (toasts.length > 0) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [toasts]);

  if (toasts.length === 0) return null;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]} pointerEvents="box-none">
      {toasts.map(toast => (
        <View key={toast.id} style={[styles.toast, { backgroundColor: COLORS[toast.type] }]}>
          <Ionicons name={ICONS[toast.type] as any} size={20} color="#fff" />
          <Text style={styles.message}>{toast.message}</Text>
          <TouchableOpacity onPress={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}>
            <Ionicons name="close" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingHorizontal: 16,
    gap: 8,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    gap: 10,
  },
  message: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
    fontWeight: '500',
  },
});
