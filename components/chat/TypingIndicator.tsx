import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';

interface Props {
  avatarLetter: string;
  color?: string;
}

export function TypingIndicator({ avatarLetter, color = '#5DB9AA' }: Props) {
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];

  useEffect(() => {
    const animations = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(dot, { toValue: -6, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay((dots.length - i - 1) * 150 + 100),
        ])
      )
    );
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, []);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, paddingBottom: 8, marginTop: 4 }}>
      <View
        style={{
          width: 30, height: 30, borderRadius: 15,
          backgroundColor: color,
          alignItems: 'center', justifyContent: 'center', marginRight: 8,
        }}
      >
        <Animated.Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
          {avatarLetter}
        </Animated.Text>
      </View>
      <View
        style={{
          backgroundColor: '#fff',
          borderColor: '#E8F6F3', borderWidth: 1,
          borderRadius: 18, borderBottomLeftRadius: 4,
          paddingHorizontal: 16, paddingVertical: 12,
          flexDirection: 'row', alignItems: 'center', gap: 5,
        }}
      >
        {dots.map((dot, i) => (
          <Animated.View
            key={i}
            style={{
              width: 7, height: 7, borderRadius: 4,
              backgroundColor: '#7ECDC0',
              transform: [{ translateY: dot }],
            }}
          />
        ))}
      </View>
    </View>
  );
}
