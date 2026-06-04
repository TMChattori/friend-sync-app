import type { ComponentType } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { AppCard } from '@/components/common/app-card';

type BannerModule = {
  BannerAd: ComponentType<{ unitId: string; size: string }>;
  BannerAdSize: {
    ADAPTIVE_BANNER?: string;
    FULL_BANNER?: string;
    BANNER?: string;
  };
  TestIds: {
    BANNER: string;
  };
};

const configuredAdUnitId = process.env.EXPO_PUBLIC_FRIENDSYNC_HOME_TOP_BANNER;

let googleMobileAds: BannerModule | null = null;

if (Platform.OS !== 'web') {
  try {
    googleMobileAds = require('react-native-google-mobile-ads') as BannerModule;
  } catch {
    googleMobileAds = null;
  }
}

export function TopBannerAd() {
  if (!configuredAdUnitId && !googleMobileAds?.TestIds?.BANNER) {
    return null;
  }

  if (!googleMobileAds?.BannerAd) {
    return (
      <AppCard style={styles.fallbackCard}>
        <Text style={styles.fallbackLabel}>広告</Text>
        <Text style={styles.fallbackText}>AdMob バナー表示エリア</Text>
      </AppCard>
    );
  }

  const BannerAd = googleMobileAds.BannerAd;
  const adUnitId = __DEV__ ? googleMobileAds.TestIds.BANNER : configuredAdUnitId;
  const bannerSize =
    googleMobileAds.BannerAdSize.ADAPTIVE_BANNER ??
    googleMobileAds.BannerAdSize.FULL_BANNER ??
    googleMobileAds.BannerAdSize.BANNER ??
    'ADAPTIVE_BANNER';

  if (!adUnitId) {
    return null;
  }

  return (
    <AppCard style={styles.card}>
      <View style={styles.bannerWrap}>
        <BannerAd unitId={adUnitId} size={bannerSize} />
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
  },
  bannerWrap: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fallbackCard: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 20,
    backgroundColor: '#fff7e8',
  },
  fallbackLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#c76a14',
    marginBottom: 4,
  },
  fallbackText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8b5a1b',
  },
});
