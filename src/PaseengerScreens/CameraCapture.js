import React, { useState, useEffect } from "react";
import { View, Text, Button, Image, ActivityIndicator, StyleSheet, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "../firebase/setup";
import axios from "axios";
import { API_URL as BASE_URL } from "../../api.js";

const USER_ENDPOINT = `${BASE_URL}/user`;

export default function CameraCapture({ route, navigation }) {
  const { email, userName, password, phoneNo } = route.params;
  const [image, setImage] = useState(null);
  const [gender, setGender] = useState(null);
  const [loading, setLoading] = useState(false);

  const API_KEY = "Pu8E95qZxx5k-FENZFArK4AqxKsuQ5Un";
  const API_SECRET = "ERQP089xe3qvDRmg7csqqWy0Ew7G-qBr";

  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission required", "Camera access is needed to take pictures.");
      }
    })();
  }, []);

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "Camera access is required!");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setImage(uri);
      detectGender(uri);
    }
  };

  const detectGender = async (uri) => {
    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("api_key", API_KEY);
      formData.append("api_secret", API_SECRET);
      formData.append("return_attributes", "gender,age");
      formData.append("image_file", {
        uri,
        type: "image/jpeg",
        name: "photo.jpg",
      });

      const response = await fetch("https://api-us.faceplusplus.com/facepp/v3/detect", {
        method: "POST",
        body: formData,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const data = await response.json();
      console.log("API Response:", data);

      if (data.faces && data.faces.length > 0) {
        const face = data.faces[0];
        if (face.attributes && face.attributes.gender) {
          const detectedGender = face.attributes.gender.value;
          setGender(detectedGender);
          
          if (detectedGender === "Female") {
            await registerUser();
          } else {
            Alert.alert("Registration Failed", "Only females can register in this app.");
            setTimeout(() => {
              navigation.replace("Login");
            }, 2000);
          }
        } else {
          Alert.alert("Error", "Gender not detected, try another photo.");
        }
      } else {
        Alert.alert("Error", "No face detected in the photo.");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Something went wrong!");
    } finally {
      setLoading(false);
    }
  };

  const registerUser = async () => {
    try {
      // Create user in Firebase
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, {
        displayName: userName,
      });

      // Save to PostgreSQL
      const response = await axios.post(USER_ENDPOINT, {
        email,
        username: userName,
        password,
        phoneNo,
      });
      
      // Get user ID from PostgreSQL
      const getUserResponse = await axios.get(`${USER_ENDPOINT}`, {
        params: { email: email }
      });

      if (getUserResponse.data.length > 0) {
        const dbUser = getUserResponse.data[0];
        const dbUserId = dbUser.UserID;

        console.log(`Signup Successful! Name: ${userName}, Email: ${email}, Phone: ${phoneNo}`);
        console.log('USERID :', dbUserId);

        Alert.alert('Success', 'Registration completed successfully!', [
          {
            text: 'Continue',
            onPress: () => navigation.replace('Home', {
              userName: userName,
              userId: dbUserId,
            }),
          },
        ]);
      } else {
        throw new Error('User not found after signup.');
      }
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Error', 'Registration failed. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gender Verification</Text>
      <Text style={styles.subtitle}>We need to verify your gender to complete registration</Text>
      
      <Button title="Take Photo" onPress={openCamera} />
      
      {image && <Image source={{ uri: image }} style={styles.image} />}
      {loading && <ActivityIndicator size="large" color="#d63384" />}
      {gender && <Text style={styles.result}>Detected Gender: {gender}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 10 },
  subtitle: { fontSize: 16, color: "#666", marginBottom: 20, textAlign: "center" },
  image: { width: 250, height: 250, marginTop: 20, borderRadius: 10 },
  result: { fontSize: 20, marginTop: 20, color: "#d63384", fontWeight: "bold" },
});