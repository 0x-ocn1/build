// components/AdBanner.tsx
import React from "react";
import { View, StyleSheet, Platform } from "react-native";
import {
  BannerAd,
  BannerAdSize,
  TestIds,
} from "react-native-google-mobile-ads";

const unitId = __DEV__
  ? TestIds.BANNER
  : "ca-app-pub-4533962949749202/7206578732";

export default function AdBanner() {
  if (Platform.OS === "web") return null;

  return (
    <View style={styles.container}>
      <BannerAd
  unitId={unitId}
  size={BannerAdSize.BANNER}
  requestOptions={{
    requestNonPersonalizedAdsOnly: true,
  }}
  onAdFailedToLoad={(error) => {
    console.log("BannerAd error:", error);
  }}
/>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#060B1A",
    zIndex: 50,
  },
});
