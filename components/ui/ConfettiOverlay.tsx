import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Dimensions, View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const { width: W, height: H } = Dimensions.get('window');
const CX = W / 2;
const CY = H * 0.42;
const MAXD = Math.max(W, H);
const FALL_COUNT = 100;
const BURST_COUNT = 24;
const PALETTE = ['#6C63FF', '#FF6584', '#4CAF50', '#FF9800', '#F44336', '#FFD700', '#00BCD4', '#FF4081', '#FFFFFF'];
const EMOJIS = ['🎉', '🏆', '⭐', '🎊'];

/** One short, celebratory haptic (a single call so it never janks the animation). */
function fireHaptics() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

interface Burst {
  angle: number;
  distance: number;
  color: string;
  size: number;
  strip: boolean;
  spin: number;
}

/** Firework particle: pops out from the centre then fades (all at t=0). */
function BurstParticle({ p }: { p: Burst }) {
  const tx = useSharedValue(CX);
  const ty = useSharedValue(CY);
  const rot = useSharedValue(0);
  const op = useSharedValue(1);
  const scale = useSharedValue(0);

  useEffect(() => {
    const bx = CX + Math.cos(p.angle) * p.distance;
    const by = CY + Math.sin(p.angle) * p.distance;
    scale.value = withSequence(
      withTiming(1.2, { duration: 140, easing: Easing.out(Easing.back(2)) }),
      withTiming(1, { duration: 220 })
    );
    tx.value = withTiming(bx, { duration: 560, easing: Easing.out(Easing.cubic) });
    ty.value = withTiming(by, { duration: 560, easing: Easing.out(Easing.cubic) });
    rot.value = withTiming(p.spin, { duration: 1100 });
    op.value = withSequence(
      withTiming(1, { duration: 80 }),
      withDelay(450, withTiming(0, { duration: 650 }))
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { rotate: `${rot.value}deg` },
      { scale: scale.value },
    ],
    opacity: op.value,
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          width: p.strip ? Math.max(5, p.size * 0.5) : p.size,
          height: p.strip ? p.size * 1.9 : p.size,
          backgroundColor: p.color,
          borderRadius: p.strip ? 2 : p.size / 2,
        },
        style,
      ]}
    />
  );
}

interface Fall {
  x: number;
  startY: number;
  driftX: number;
  delay: number;
  duration: number;
  color: string;
  size: number;
  strip: boolean;
  spin: number;
}

/** Confetti raining from above the screen all the way down. */
function FallingParticle({ p }: { p: Fall }) {
  const ty = useSharedValue(p.startY);
  const tx = useSharedValue(p.x);
  const rot = useSharedValue(0);
  const op = useSharedValue(1);

  useEffect(() => {
    ty.value = withDelay(p.delay, withTiming(H + 60, { duration: p.duration, easing: Easing.in(Easing.quad) }));
    tx.value = withDelay(p.delay, withTiming(p.x + p.driftX, { duration: p.duration, easing: Easing.inOut(Easing.sin) }));
    rot.value = withDelay(p.delay, withTiming(p.spin, { duration: p.duration }));
    op.value = withDelay(p.delay + p.duration - 500, withTiming(0, { duration: 500 }));
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { rotate: `${rot.value}deg` },
    ],
    opacity: op.value,
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          width: p.strip ? Math.max(5, p.size * 0.5) : p.size,
          height: p.strip ? p.size * 1.9 : p.size,
          backgroundColor: p.color,
          borderRadius: p.strip ? 2 : p.size / 2,
        },
        style,
      ]}
    />
  );
}

/** Warm full-screen flash (t=0). */
function FlashLayer() {
  const op = useSharedValue(0);
  useEffect(() => {
    op.value = withSequence(
      withTiming(0.5, { duration: 90 }),
      withTiming(0, { duration: 450 })
    );
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: op.value }));
  return <Animated.View pointerEvents="none" style={[styles.flash, style]} />;
}

/** Expanding shockwave ring + a big emoji that pops (t=0). */
function CenterPop({ emoji }: { emoji: string }) {
  const ringScale = useSharedValue(0.1);
  const ringOp = useSharedValue(0.8);
  const emScale = useSharedValue(0);
  const emOp = useSharedValue(0);

  useEffect(() => {
    ringOp.value = withTiming(0, { duration: 750, easing: Easing.out(Easing.quad) });
    ringScale.value = withTiming(14, { duration: 750, easing: Easing.out(Easing.quad) });
    emOp.value = withSequence(
      withTiming(1, { duration: 120 }),
      withDelay(1500, withTiming(0, { duration: 500 }))
    );
    emScale.value = withSequence(
      withTiming(1.35, { duration: 300, easing: Easing.out(Easing.back(2.4)) }),
      withTiming(1.1, { duration: 240 })
    );
  }, []);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: ringOp.value,
    transform: [{ scale: ringScale.value }],
  }));
  const emojiStyle = useAnimatedStyle(() => ({
    opacity: emOp.value,
    transform: [{ scale: emScale.value }],
  }));

  return (
    <>
      <Animated.View pointerEvents="none" style={[styles.ring, ringStyle]} />
      <Animated.View pointerEvents="none" style={[styles.emojiWrap, emojiStyle]}>
        <Text style={styles.emoji}>{emoji}</Text>
      </Animated.View>
    </>
  );
}

interface ConfettiOverlayProps {
  visible: boolean;
  onDone?: () => void;
}

/**
 * Celebratory overlay for a success (e.g. validating a mission). Everything
 * fires at once (t=0): a warm flash, a firework pop from the centre, an
 * expanding shockwave ring, a big popping emoji, a strong haptic, and a dense
 * rain of confetti falling from the top of the screen to the bottom.
 *
 * Memoised so the parent screen re-rendering (e.g. after re-fetching data on
 * validation) does not reconcile the ~120 animated particles and stutter them.
 */
export const ConfettiOverlay = React.memo(function ConfettiOverlay({ visible, onDone }: ConfettiOverlayProps) {
  const falls = useMemo<Fall[]>(
    () =>
      Array.from({ length: FALL_COUNT }, () => ({
        x: Math.random() * W,
        startY: -30 - Math.random() * 140,
        driftX: (Math.random() - 0.5) * 120,
        delay: Math.random() * 400,
        duration: 2400 + Math.random() * 1200,
        color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
        size: 8 + Math.random() * 12,
        strip: Math.random() > 0.5,
        spin: (Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 720),
      })),
    []
  );
  const bursts = useMemo<Burst[]>(
    () =>
      Array.from({ length: BURST_COUNT }, () => ({
        angle: Math.random() * Math.PI * 2,
        distance: 110 + Math.random() * MAXD * 0.45,
        color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
        size: 11 + Math.random() * 14,
        strip: Math.random() > 0.5,
        spin: (Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 720),
      })),
    []
  );
  const emoji = useMemo(() => EMOJIS[Math.floor(Math.random() * EMOJIS.length)], []);

  useEffect(() => {
    if (!visible) return;
    fireHaptics();
    if (!onDone) return;
    const timer = setTimeout(onDone, 3200);
    return () => clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={styles.overlay} pointerEvents="none">
      <FlashLayer />
      {falls.map((p, i) => (
        <FallingParticle key={`f${i}`} p={p} />
      ))}
      {bursts.map((p, i) => (
        <BurstParticle key={`b${i}`} p={p} />
      ))}
      <CenterPop emoji={emoji} />
    </View>
  );
});

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
  flash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFF3C4',
  },
  particle: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  ring: {
    position: 'absolute',
    left: CX - 55,
    top: CY - 55,
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 6,
    borderColor: '#FFD700',
  },
  emojiWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: CY - 85,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 130,
  },
});
