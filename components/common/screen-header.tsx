import { StyleSheet, Text, View } from 'react-native';
import { AppCard } from '@/components/common/app-card';

type ScreenHeaderProps = {
  title: string;
  subtitle: string;
  eyebrow?: string;
};

export function ScreenHeader({ title, subtitle, eyebrow }: ScreenHeaderProps) {
  return (
    <AppCard style={styles.card}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </AppCard>
  );
}

export function SectionHeader({ title, meta }: { title: string; meta?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {meta ? <Text style={styles.sectionMeta}>{meta}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 22,
    borderRadius: 24,
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '700',
    color: '#5b6c8f',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#152033',
    lineHeight: 34,
  },
  subtitle: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: '#5f6c80',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#152033',
  },
  sectionMeta: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6c7a90',
  },
});
