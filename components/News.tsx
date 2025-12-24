// components/News.tsx

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../supabase/client";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function News({ visible, onClose }: Props) {
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!visible) return;

    let channel: any;

    const fetchNews = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("vad_news")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (data) setNews(data);
      setLoading(false);
    };

    fetchNews();

    channel = supabase
      .channel("vad-news-modal")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vad_news" },
        fetchNews
      )
      .subscribe();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* HEADER */}
          <View style={styles.header}>
            <Text style={styles.title}>Latest News</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={26} color="#fff" />
            </Pressable>
          </View>

          {/* CONTENT */}
          {loading ? (
            <ActivityIndicator size="large" color="#8B5CF6" style={{ marginTop: 40 }} />
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {news.map((n) => (
                <View key={n.id} style={styles.newsBlock}>
                  {n.image_url && (
                    <Image source={{ uri: n.image_url }} style={styles.image} />
                  )}
                  <Text style={styles.headline}>{n.title}</Text>
                  <Text style={styles.body}>{n.body}</Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  card: {
    height: "85%",
    backgroundColor: "#060B1A",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 18,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
  },
  newsBlock: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  image: {
    height: 160,
    borderRadius: 12,
    marginBottom: 10,
  },
  headline: {
    color: "#8B5CF6",
    fontWeight: "800",
    marginBottom: 6,
  },
  body: {
    color: "#fff",
    fontSize: 13,
    lineHeight: 18,
  },
});
