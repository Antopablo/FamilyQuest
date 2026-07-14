import React from 'react';
import {
  Pressable,
  PressableProps,
  Platform,
  StyleProp,
  ViewStyle,
} from 'react-native';

interface TouchableProps extends Omit<PressableProps, 'style'> {
  activeOpacity?: number;
  style?: StyleProp<ViewStyle>;
}

export function Touchable({
  activeOpacity = 0.7,
  style,
  children,
  ...props
}: TouchableProps) {
  return (
    <Pressable
      accessibilityRole="button"
      android_ripple={{ color: 'rgba(0, 0, 0, 0.1)', borderless: false }}
      style={({ pressed }) => [
        style as ViewStyle,
        pressed && Platform.OS !== 'android' && { opacity: activeOpacity },
      ]}
      {...props}
    >
      {children}
    </Pressable>
  );
}
