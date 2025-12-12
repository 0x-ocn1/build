import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Animated,
  Easing,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../supabase/client"; // 🔥 use your client

const { width } = Dimensions.get("window");
const CARD_W = Math.floor((width - 48) / 2);

// SAMPLE ITEMS
const SAMPLE_MARKET_ITEMS = [
  {
    id: "land-001",
    title: "Oceanfront Parcel #001",
    collection: "VAD Estates",
    price: 1250,
    currency: "VAD",
    img: null,
    badge: "Limited",
  },
  {
    id: "art-023",
    title: "Neon Raven #023",
    collection: "Raven Rush x VAD",
    price: 350,
    currency: "VAD",
    img: null,
    badge: "Featured",
  },
  {
    id: "prop-12",
    title: "Sky Tower - Token #12",
    collection: "Urban Tokens",
    price: 4200,
    currency: "VAD",
    img: null,
    badge: "Auction",
  },
  {
    id: "asset-77",
    title: "Mystic Gem Pack",
    collection: "Genesis Drops",
    price: 80,
    currency: "VAD",
    img: null,
    badge: "New",
  },
];

export default function Explore() {
  return <ExploreScreen />;
}

function ExploreScreen() {
  const [userLabel, setUserLabel] = useState("Guest");

  const fade = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(10)).current;

  // ⭐ LOAD USER FROM SUPABASE
  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        if (user.email) setUserLabel(user.email.split("@")[0]);
        else setUserLabel(user.id.slice(0, 6));
      } else {
        setUserLabel("Guest");
      }
    })();
  }, []);

  // ANIMATION
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 450,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      }),
      Animated.timing(slideY, {
        toValue: 0,
        duration: 550,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const goSoon = (label?: string) => {
    Alert.alert(
      "Launching Soon",
      label ? `${label} — launching soon!` : "Feature launching soon!"
    );
  };

  const renderCard = (item: any) => {
    const scale = useRef(new Animated.Value(1)).current;

    return (
      <Animated.View
        key={item.id}
        style={[
          styles.marketCard,
          {
            opacity: fade,
            transform: [{ scale }],
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => goSoon(item.title)}
          onPressIn={() =>
            Animated.spring(scale, {
              toValue: 0.96,
              useNativeDriver: true,
            }).start()
          }
          onPressOut={() =>
            Animated.spring(scale, {
              toValue: 1,
              friction: 5,
              useNativeDriver: true,
            }).start()
          }
          style={{ flex: 1 }}
        >
          <View style={styles.media}>
            <View style={styles.mediaPlaceholder}>
              <Ionicons
                name="image"
                size={32}
                color="rgba(255,255,255,0.15)"
              />
            </View>

            <View style={styles.badgeWrap}>
              <Text style={styles.badgeText}>{item.badge}</Text>
            </View>
          </View>

          <View style={styles.cardBody}>
            <Text numberOfLines={1} style={styles.cardTitle}>
              {item.title}
            </Text>

            <Text numberOfLines={1} style={styles.cardCollection}>
              {item.collection}
            </Text>

            <View style={styles.cardFooter}>
              <View>
                <Text style={styles.pricePrimary}>
                  {item.price.toLocaleString()} {item.currency}
                </Text>
                <Text style={styles.priceSub}>Reserve · Tokenized Asset</Text>
              </View>

              <TouchableOpacity
                onPress={() => goSoon("Buy / Trade")}
                style={styles.buyBtn}
              >
                <Text style={styles.buyText}>BUY</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <Animated.View
        style={[
          styles.header,
          {
            opacity: fade,
            transform: [{ translateY: slideY }],
          },
        ]}
      >
        <View>
          <Text style={styles.title}>Marketplace</Text>
          <Text style={styles.subtitle}>Earn • Trade • Own</Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => goSoon("Wallet")}
            style={styles.iconBtn}
          >
            <Ionicons name="wallet" size={18} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => goSoon("Notifications")}
            style={styles.iconBtn}
          >
            <Ionicons name="notifications" size={18} color="#fff" />
          </TouchableOpacity>

          <View style={styles.userTag}>
            <Ionicons name="person" size={15} color="#000" />
            <Text style={styles.userTagText}>{userLabel}</Text>
          </View>
        </View>
      </Animated.View>

      {/* CONTENT */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* HERO */}
        <Animated.View
          style={[
            styles.hero,
            {
              opacity: fade,
              transform: [{ translateY: slideY }],
            },
          ]}
        >
          <Text style={styles.heroTitle}>Featured Drop</Text>
          <Text style={styles.heroSub}>
            Trade rare art, tokenized land parcels, and exclusive VAD
            collections.
          </Text>

          <View style={styles.heroActions}>
            <TouchableOpacity
              style={styles.ghostBtn}
              onPress={() => goSoon("Explore Drops")}
            >
              <Text style={styles.ghostText}>Explore</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => goSoon("Create Listing")}
            >
              <Text style={styles.primaryText}>Create</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* FILTERS */}
        <View style={styles.filtersRow}>
          <TouchableOpacity
            onPress={() => goSoon("Filters")}
            style={styles.filterPill}
          >
            <Ionicons name="funnel" size={14} color="#fff" />
            <Text style={styles.filterText}>Filters</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => goSoon("Sort")}
            style={styles.filterPill}
          >
            <Ionicons name="swap-vertical" size={14} color="#fff" />
            <Text style={styles.filterText}>Sort</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => goSoon("Collections")}
            style={styles.filterPill}
          >
            <Ionicons name="layers" size={14} color="#fff" />
            <Text style={styles.filterText}>Collections</Text>
          </TouchableOpacity>
        </View>

        {/* GRID */}
        <View style={styles.grid}>
          {SAMPLE_MARKET_ITEMS.map((it) => renderCard(it))}
        </View>

        {/* INFO CARDS */}
        <View style={styles.infoRow}>
          <TouchableOpacity
            style={styles.infoCard}
            onPress={() => goSoon("VAD Staking")}
          >
            <Ionicons name="trending-up" size={20} color="#5865F2" />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.infoTitle}>Stake & Earn</Text>
              <Text style={styles.infoSub}>Earn passive VAD rewards.</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.infoCard}
            onPress={() => goSoon("Tokenization 101")}
          >
            <Ionicons name="cube" size={20} color="#5865F2" />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.infoTitle}>Tokenization 101</Text>
              <Text style={styles.infoSub}>
                Learn how assets become tokens.
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* COLORS */
const BG = "#000";
const CARD = "#0D0D0D";
const BLUE = "#5865F2";
const MUTED = "rgba(255,255,255,0.55)";

/* STYLES */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },

  header: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  title: {
    fontSize: 19,
    fontWeight: "800",
    color: "#fff",
  },
  subtitle: {
    fontSize: 12,
    color: MUTED,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconBtn: {
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 8,
    borderRadius: 10,
  },
  userTag: {
    backgroundColor: BLUE,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  userTagText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 12,
  },

  scroll: {
    paddingHorizontal: 18,
    paddingTop: 18,
  },

  hero: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
  },
  heroTitle: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },
  heroSub: {
    color: MUTED,
    fontSize: 13,
    marginTop: 6,
    lineHeight: 18,
  },
  heroActions: {
    flexDirection: "row",
    marginTop: 14,
    gap: 10,
  },
  ghostBtn: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  ghostText: {
    color: "#fff",
    fontWeight: "700",
  },
  primaryBtn: {
    backgroundColor: BLUE,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  primaryText: {
    color: "#fff",
    fontWeight: "800",
  },

  filtersRow: {
    flexDirection: "row",
    marginBottom: 14,
    gap: 10,
  },
  filterPill: {
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  filterText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  marketCard: {
    width: CARD_W,
    backgroundColor: CARD,
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 16,
  },
  media: {
    height: CARD_W,
    backgroundColor: "rgba(255,255,255,0.03)",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  mediaPlaceholder: {
    width: "90%",
    height: "88%",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  badgeWrap: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "rgba(88,101,242,0.15)",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  badgeText: {
    color: BLUE,
    fontSize: 10,
    fontWeight: "800",
  },

  cardBody: {
    padding: 12,
  },
  cardTitle: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
  },
  cardCollection: {
    color: MUTED,
    fontSize: 11,
    marginTop: 3,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pricePrimary: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
  },
  priceSub: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 11,
  },

  buyBtn: {
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  buyText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
  },

  infoRow: {
    marginTop: 10,
    gap: 10,
  },
  infoCard: {
    backgroundColor: CARD,
    padding: 14,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  infoTitle: {
    color: "#fff",
    fontWeight: "800",
  },
  infoSub: {
    color: MUTED,
    marginTop: 3,
    fontSize: 12,
  },
});
