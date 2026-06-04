import type { ExpoConfig } from 'expo/config';

const androidAppId = process.env.GOOGLE_MOBILE_ADS_ANDROID_APP_ID ?? process.env.GOOGLE_MOBILE_ADS_APP_ID;
const iosAppId = process.env.GOOGLE_MOBILE_ADS_IOS_APP_ID;
const googleMobileAdsPlugin: [string, Record<string, string>] | null =
  androidAppId || iosAppId
    ? [
        'react-native-google-mobile-ads',
        {
          ...(androidAppId ? { androidAppId } : {}),
          ...(iosAppId ? { iosAppId } : {}),
        },
      ]
    : null;

const config: ExpoConfig = {
  name: 'friend-sync-app',
  slug: 'friend-sync-app',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'friendsyncapp',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.tmchattori.friendsyncapp',
    infoPlist: {
      NSPhotoLibraryUsageDescription: 'プロフィール画像を選ぶために写真フォルダを使用します。',
    },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-camera',
      {
        cameraPermission: '友達追加用のQRコードを読み取るためにカメラを使用します。',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'プロフィール画像を選ぶために写真フォルダを使用します。',
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/images/icon.png',
        color: '#1f6fff',
      },
    ],
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#ffffff',
        dark: {
          backgroundColor: '#000000',
        },
      },
    ],
    'expo-secure-store',
    ...(googleMobileAdsPlugin ? [googleMobileAdsPlugin] : []),
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default config;
