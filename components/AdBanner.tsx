// components/AdBanner.tsx
import React from "react";
import { View } from "react-native";
import { AdMobBanner } from "expo-ads-admob";

export default function AdBanner() {
  const unitId = __DEV__
    ? "ca-app-pub-3940256099942544/6300978111" // Google test banner
    : "ca-app-pub-4533962949749202/7206578732"; // your real ad ID

  return (
    <View style={{ alignItems: "center", marginVertical: 10 }}>
      <AdMobBanner
        bannerSize="fullBanner"
        adUnitID={unitId}
        servePersonalizedAds
        onDidFailToReceiveAdWithError={(err) => {
          console.log("Ad failed to load:", err);
        }}
      />
    </View>
  );
}
