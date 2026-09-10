import { Image, type ImageProps } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';

import { duration } from '../lib/motion';
import { Skeleton } from './Skeleton';

/**
 * An image with a shimmer underneath it until it has arrived.
 *
 * Photos over a network do not appear, they accumulate: a grey rectangle, then
 * a partial paint, then the picture. Holding a shimmer in that gap does two
 * things - it says the wait is the app working rather than a hole in the
 * layout, and it reserves the exact space the photo will take, so nothing
 * around it jumps when the bytes land.
 *
 * The shimmer fades rather than cutting: at typical decode times a hard swap
 * reads as a flicker.
 *
 * Recycling is why `loaded` is keyed on the source. A row in a virtualized list
 * is reused for the next person as it scrolls, and without this the incoming
 * photo would inherit the outgoing one's "already loaded" and show the wrong
 * face for a frame before it repaints.
 */
export function SkeletonImage({
  style,
  radius,
  ...imageProps
}: Omit<ImageProps, 'style'> & { style?: StyleProp<ViewStyle>; radius?: number }) {
  const key = sourceKey(imageProps.source);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const loaded = loadedKey === key;

  return (
    <View style={[styles.wrap, style]}>
      <Image
        {...imageProps}
        recyclingKey={imageProps.recyclingKey ?? key}
        style={StyleSheet.absoluteFill}
        onLoadEnd={() => {
          setLoadedKey(key);
          imageProps.onLoadEnd?.();
        }}
      />
      {loaded ? null : (
        <Animated.View
          style={StyleSheet.absoluteFill}
          exiting={FadeOut.duration(duration.base)}
          pointerEvents="none"
        >
          <Skeleton style={radius != null ? [styles.fill, { borderRadius: radius }] : styles.fill} />
        </Animated.View>
      )}
    </View>
  );
}

/** What counts as "a different picture", for the load latch above. */
function sourceKey(source: ImageProps['source']): string {
  if (typeof source === 'number') return `module:${source}`;
  if (typeof source === 'string') return source;
  if (Array.isArray(source)) return source.map(sourceKey).join('|');
  if (source && typeof source === 'object' && 'uri' in source) return String(source.uri ?? '');
  return 'none';
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden' },
  fill: { width: '100%', height: '100%' },
});
