import { initializeApp, getApps, getApp } from "firebase/app";
import Constants from "expo-constants";
import { initializeAuth, getReactNativePersistence } from "firebase/auth/react-native";

const firebaseConfig = {
  apiKey: Constants.expoConfig?.extra?.firebaseApiKey,
  authDomain: Constants.expoConfig?.extra?.firebaseAuthDomain,
  projectId: Constants.expoConfig?.extra?.firebaseProjectId,
  storageBucket: Constants.expoConfig?.extra?.firebaseStorageBucket,
  messagingSenderId: Constants.expoConfig?.extra?.firebaseSenderId,
  appId: Constants.expoConfig?.extra?.firebaseAppId,
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Lazy Auth
let authInstance: ReturnType<typeof initializeAuth> | null = null;

export const getAuthInstance = async () => {
  if (authInstance) return authInstance;

  const { getReactNativePersistence } = await import("firebase/auth/react-native");
  const AsyncStorageModule = await import("@react-native-async-storage/async-storage");

  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorageModule.default),
  });

  return authInstance;
};

// Lazy Firestore
export const getDb = async () => {
  await getAuthInstance();
  const { getFirestore } = await import("firebase/firestore");
  return getFirestore(app);
};

// Lazy Storage
export const getStorageInstance = async () => {
  await getAuthInstance();
  const { getStorage } = await import("firebase/storage");
  return getStorage(app);
};
