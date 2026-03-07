// components/ui/Skeleton.tsx
import { useTheme } from '@/context/ThemeContext';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';

interface SkeletonProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width, height, borderRadius, style }: SkeletonProps) {
  const { theme } = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: borderRadius ?? height / 2,
          backgroundColor: theme.colors.border,
          opacity,
        },
        style,
      ]}
    />
  );
}

// Pre-built skeleton layouts
export function ProfileSkeleton() {
  const { theme } = useTheme();
  return (
    <View style={[skeletonStyles.container, { backgroundColor: theme.colors.background }]}>
      <View style={skeletonStyles.profileHeader}>
        <Skeleton width={80} height={80} borderRadius={40} />
        <View style={skeletonStyles.profileInfo}>
          <Skeleton width={140} height={18} />
          <Skeleton width={100} height={14} style={{ marginTop: 8 }} />
        </View>
      </View>
      <View style={skeletonStyles.section}>
        <Skeleton width={80} height={14} />
        <Skeleton width="100%" height={40} borderRadius={10} style={{ marginTop: 8 }} />
        <Skeleton width="100%" height={40} borderRadius={10} style={{ marginTop: 8 }} />
        <Skeleton width="100%" height={40} borderRadius={10} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
}

export function ConversationListSkeleton() {
  const { theme } = useTheme();
  return (
    <View style={[skeletonStyles.container, { backgroundColor: theme.colors.background }]}>
      {[0, 1, 2, 3, 4].map(i => (
        <View key={i} style={skeletonStyles.convRow}>
          <Skeleton width={48} height={48} borderRadius={24} />
          <View style={{ flex: 1, gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Skeleton width={100 + i * 10} height={14} />
              <Skeleton width={40} height={12} />
            </View>
            <Skeleton width={160 + i * 15} height={12} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function EventListSkeleton() {
  const { theme } = useTheme();
  return (
    <View style={[skeletonStyles.container, { backgroundColor: theme.colors.background }]}>
      {[0, 1, 2].map(i => (
        <View key={i} style={[skeletonStyles.eventCard, { backgroundColor: theme.colors.card }]}>
          <Skeleton width="100%" height={160} borderRadius={12} />
          <View style={{ padding: 12, gap: 8 }}>
            <Skeleton width={180} height={16} />
            <Skeleton width={120} height={12} />
            <Skeleton width={140} height={12} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function SwiperSkeleton() {
  const { theme } = useTheme();
  return (
    <View style={[skeletonStyles.swiperContainer, { backgroundColor: theme.colors.background }]}>
      <Skeleton width="90%" height={500} borderRadius={20} style={{ alignSelf: 'center' }} />
      <View style={skeletonStyles.swiperButtons}>
        <Skeleton width={60} height={60} borderRadius={30} />
        <Skeleton width={60} height={60} borderRadius={30} />
      </View>
    </View>
  );
}

export function ListSkeleton() {
  const { theme } = useTheme();
  return (
    <View style={[skeletonStyles.container, { backgroundColor: theme.colors.background }]}>
      {[0, 1, 2, 3, 4, 5].map(i => (
        <View key={i} style={[skeletonStyles.listRow, { borderBottomColor: theme.colors.border }]}>
          <Skeleton width={36} height={36} borderRadius={18} />
          <View style={{ flex: 1, gap: 6 }}>
            <Skeleton width={120 + i * 15} height={14} />
            <Skeleton width={180 + i * 10} height={12} />
          </View>
        </View>
      ))}
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 },
  profileInfo: { flex: 1 },
  section: { marginBottom: 20 },
  convRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  eventCard: { borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
  swiperContainer: { flex: 1, justifyContent: 'center', gap: 20 },
  swiperButtons: { flexDirection: 'row', justifyContent: 'center', gap: 40 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1 },
});
