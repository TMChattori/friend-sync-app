import { StyleSheet, Text, TextProps } from 'react-native';

export function LoadingText(props: TextProps) {
  return <Text {...props} style={[styles.loadingText, props.style]} />;
}

export function ErrorText(props: TextProps) {
  return <Text {...props} style={[styles.errorText, props.style]} />;
}

const styles = StyleSheet.create({
  loadingText: { fontSize: 13, fontWeight: '700', color: '#6f7f95' },
  errorText: { fontSize: 13, fontWeight: '700', color: '#d14c73' },
});
