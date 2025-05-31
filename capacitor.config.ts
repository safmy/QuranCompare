import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.qurancompare.app',
  appName: 'QuranCompare',
  webDir: 'build',
  bundledWebRuntime: false,
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#ffffff',
    allowsLinkPreview: false,
    preferredContentMode: 'mobile'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      backgroundColor: '#2c5aa0',
      showSpinner: false,
      iosSpinnerStyle: 'small',
      spinnerColor: '#ffffff'
    }
  },
  server: {
    allowNavigation: ['*'],
    iosScheme: 'capacitor',
    androidScheme: 'https',
    hostname: 'localhost'
  }
};

export default config;
