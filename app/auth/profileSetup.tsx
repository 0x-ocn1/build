import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Image, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { auth } from "../../firebase/auth";

import { db } from "../../firebase/firestore";
import { storage } from "../../firebase/storage";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "expo-router";

export default function ProfileSetup() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [referredBy, setReferredBy] = useState("");

  const user = auth.currentUser;

  // generate referral code from user id
  const referralCode = user?.uid.slice(0, 8) || "loading";

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      setAvatar(result.assets[0].uri);
    }
  };

  const saveProfile = async () => {
    if (!username.trim()) {
      Alert.alert("Error", "Username is required");
      return;
    }

    let avatarUrl = null;

    try {
      if (avatar) {
        const imageRef = ref(storage, `avatars/${user?.uid}.jpg`);

        const img = await fetch(avatar);
        const bytes = await img.blob();

        await uploadBytes(imageRef, bytes);
        avatarUrl = await getDownloadURL(imageRef);
      }

      await setDoc(doc(db, "users", user!.uid), {
        username: username.trim(),
        avatarUrl,
        referralCode,
        referredBy: referredBy.trim() || null,
        createdAt: serverTimestamp(),
      });

      Alert.alert("Success", "Profile saved!");
      router.replace("/(tabs)");
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  return (
    <View style={{ flex: 1, padding: 20, backgroundColor: "#fff" }}>
      <Text style={{ fontSize: 22, fontWeight: "600", marginBottom: 20 }}>
        Complete Your Profile
      </Text>

      {/* Avatar */}
      <TouchableOpacity onPress={pickAvatar} style={{ alignSelf: "center" }}>
        {avatar ? (
          <Image
            source={{ uri: avatar }}
            style={{ width: 120, height: 120, borderRadius: 60 }}
          />
        ) : (
          <View
            style={{
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: "#ddd",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text>Select Avatar</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Username */}
      <Text style={{ marginTop: 20 }}>Username</Text>
      <TextInput
        value={username}
        onChangeText={setUsername}
        placeholder="Choose a username"
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          padding: 10,
          borderRadius: 8,
          marginTop: 5,
        }}
      />

      {/* Referral code input */}
      <Text style={{ marginTop: 20 }}>Referral Code (Optional)</Text>
      <TextInput
        value={referredBy}
        onChangeText={setReferredBy}
        placeholder="Enter code if someone invited you"
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          padding: 10,
          borderRadius: 8,
          marginTop: 5,
        }}
      />

      {/* Your generated referral code */}
      <Text style={{ marginTop: 20, opacity: 0.7 }}>
        Your Referral Code:{" "}
        <Text style={{ fontWeight: "600" }}>{referralCode}</Text>
      </Text>

      {/* Save button */}
      <TouchableOpacity
        onPress={saveProfile}
        style={{
          backgroundColor: "#007bff",
          padding: 15,
          borderRadius: 8,
          marginTop: 30,
        }}
      >
        <Text style={{ color: "#fff", textAlign: "center", fontWeight: "600" }}>
          Save Profile
        </Text>
      </TouchableOpacity>
    </View>
  );
}
