import { PropsWithChildren } from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';

type AppCardProps = PropsWithChildren<ViewProps>;

export function AppCard({ children, style, ...props }: AppCardProps) {
  return (
    <View style={[styles.card, style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    shadowColor: '#111827',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
});
