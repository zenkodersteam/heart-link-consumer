import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { TokenCache } from '@clerk/clerk-expo/dist/cache';

const webStore: TokenCache = {
  async getToken(key) {
    try {
      return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
    } catch {
      return null;
    }
  },
  async saveToken(key, value) {
    try {
      if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
    } catch {
      // ignore
    }
  },
};

const nativeStore: TokenCache = {
  async getToken(key) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async saveToken(key, value) {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // ignore
    }
  },
};

export const tokenCache: TokenCache = Platform.OS === 'web' ? webStore : nativeStore;
