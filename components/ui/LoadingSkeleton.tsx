import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useEffect, useRef } from 'react';

export function LoadingSkeleton({ width = '100%', height = 20, borderRadius = 8, style }: {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const translateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-width as number, width as number],
  });

  return (
    <View style={[{ width, height, borderRadius, backgroundColor: '#E8F6F3', overflow: 'hidden' }, style]}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: 'rgba(255,255,255,0.5)',
            transform: [{ translateX }],
          },
        ]}
      />
    </View>
  );
}

export function CardSkeleton() {
  return (
    <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100">
      <LoadingSkeleton width="60%" height={16} borderRadius={6} />
      <LoadingSkeleton width="40%" height={12} borderRadius={4} style={{ marginTop: 8 }} />
      <LoadingSkeleton width="100%" height={40} borderRadius={8} style={{ marginTop: 12 }} />
    </View>
  );
}

export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <View className="px-4 pt-4">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </View>
  );
}

export function ProfileSkeleton() {
  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white items-center py-8">
        <LoadingSkeleton width={80} height={80} borderRadius={40} />
        <LoadingSkeleton width={150} height={20} borderRadius={8} style={{ marginTop: 12 }} />
        <LoadingSkeleton width={100} height={14} borderRadius={6} style={{ marginTop: 8 }} />
      </View>
      <View className="px-4 mt-4">
        <LoadingSkeleton width="100%" height={60} borderRadius={12} />
        <LoadingSkeleton width="100%" height={60} borderRadius={12} style={{ marginTop: 12 }} />
      </View>
    </View>
  );
}
