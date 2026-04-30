import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

type AvatarBadgeProps = {
  label: string;
  imageUrl?: string | null;
  size?: number;
  radius?: number;
  backgroundColor?: string;
  textColor?: string;
  textSize?: number;
};

export function AvatarBadge({
  label,
  imageUrl,
  size = 48,
  radius = 16,
  backgroundColor = '#e8f0ff',
  textColor = '#1f6fff',
  textSize = 18,
}: AvatarBadgeProps) {
  return (
    <View
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor,
        },
      ]}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.image} contentFit="cover" />
      ) : (
        <Text style={[styles.text, { color: textColor, fontSize: textSize }]}>{label}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  text: {
    fontWeight: '900',
  },
});
