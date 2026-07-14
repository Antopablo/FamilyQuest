import React, { useState, useCallback, useMemo } from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  Platform,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { COLORS, BORDER_RADIUS, SPACING, FONT_SIZES } from '@/lib/constants';

const BURST_COUNT = 48;
const BURST_COLORS = ['#6C63FF', '#FF6584', '#4CAF50', '#FF9800', '#FFD700', '#00BCD4'];

interface BurstParticle {
  angle: number;
  distance: number;
  color: string;
  size: number;
  delay: number;
}

function BurstParticleView({ p, trigger }: { p: BurstParticle; trigger: number }) {
  const progress = useSharedValue(0);
  const opacity = useSharedValue(1);

  React.useEffect(() => {
    if (trigger === 0) return;
    progress.value = 0;
    opacity.value = 1;
    progress.value = withDelay(
      p.delay,
      withTiming(1, { duration: 1000, easing: Easing.out(Easing.cubic) })
    );
    opacity.value = withDelay(
      p.delay + 300,
      withTiming(0, { duration: 200 })
    );
  }, [trigger]);

  const style = useAnimatedStyle(() => {
    const dx = Math.cos(p.angle) * p.distance * progress.value;
    const dy = Math.sin(p.angle) * p.distance * progress.value;
    return {
      transform: [{ translateX: dx }, { translateY: dy }],
      opacity: opacity.value,
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: p.size,
          height: p.size,
          borderRadius: p.size / 2,
          backgroundColor: p.color,
        },
        style,
      ]}
    />
  );
}

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  celebrate?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  testID?: string;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  celebrate = false,
  style,
  textStyle,
  testID,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const [burstKey, setBurstKey] = useState(0);

  const particles = useMemo<BurstParticle[]>(
    () =>
      Array.from({ length: BURST_COUNT }, (_, i) => ({
        angle: (i / BURST_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.4,
        distance: 40 + Math.random() * 60,
        color: BURST_COLORS[Math.floor(Math.random() * BURST_COLORS.length)],
        size: 4 + Math.random() * 5,
        delay: Math.random() * 80,
      })),
    []
  );

  const handlePress = useCallback(() => {
    if (celebrate) {
      setBurstKey((k) => k + 1);
    }
    onPress();
  }, [celebrate, onPress]);

  return (
    <View style={style}>
      <Pressable
        onPress={handlePress}
        disabled={isDisabled}
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        android_ripple={{ color: 'rgba(255, 255, 255, 0.25)', borderless: false }}
        style={({ pressed }) => [
          styles.base,
          styles[variant],
          styles[`size_${size}`],
          isDisabled && styles.disabled,
          pressed && Platform.OS !== 'android' && { opacity: 0.7 },
        ]}
      >
        {loading ? (
          <ActivityIndicator
            color={variant === 'outline' ? COLORS.primary : '#fff'}
            size="small"
          />
        ) : (
          <Text
            style={[
              styles.text,
              styles[`text_${variant}`],
              styles[`textSize_${size}`],
              textStyle,
            ]}
          >
            {title}
          </Text>
        )}

        {celebrate && burstKey > 0 && (
          <View style={styles.burstContainer} pointerEvents="none">
            {particles.map((p, i) => (
              <BurstParticleView key={i} p={p} trigger={burstKey} />
            ))}
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.md,
    overflow: 'visible',
  },
  primary: {
    backgroundColor: COLORS.primary,
  },
  secondary: {
    backgroundColor: COLORS.secondary,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  danger: {
    backgroundColor: COLORS.error,
  },
  disabled: {
    opacity: 0.5,
  },
  size_sm: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  size_md: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  size_lg: {
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
  },
  text: {
    fontWeight: '600',
  },
  text_primary: {
    color: '#fff',
  },
  text_secondary: {
    color: '#fff',
  },
  text_outline: {
    color: COLORS.primary,
  },
  text_danger: {
    color: '#fff',
  },
  textSize_sm: {
    fontSize: FONT_SIZES.sm,
  },
  textSize_md: {
    fontSize: FONT_SIZES.md,
  },
  textSize_lg: {
    fontSize: FONT_SIZES.lg,
  },
  burstContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 0,
    height: 0,
    overflow: 'visible',
  },
});
