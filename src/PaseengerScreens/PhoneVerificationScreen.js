import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import { PhoneAuthProvider, signInWithCredential, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { useNavigation } from '@react-navigation/native';
import { auth } from '../firebase/setup';
import { firebaseConfig } from '../firebase/setup';
import axios from 'axios';
import { API_URL as BASE_URL } from '../../api.js'; // ✅ alias to avoid name clash

const USER_ENDPOINT = `${BASE_URL}/user`; // ✅ final usable endpoint

export default function PhoneVerificationScreen({ route, navigation }) {
  const { email, userName, password, phoneNo } = route.params;

  const [verificationId, setVerificationId] = useState(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const recaptchaVerifier = useRef(null);

  useEffect(() => {
    sendOTP();
  }, []);

  const sendOTP = async () => {
    try {
      const phoneProvider = new PhoneAuthProvider(auth);
      const verificationId = await phoneProvider.verifyPhoneNumber(phoneNo, recaptchaVerifier.current);
      setVerificationId(verificationId);
      Alert.alert('OTP Sent', 'A verification code has been sent to your phone');
    } catch (error) {
      console.error('Error sending OTP:', error);
      Alert.alert('Error', 'Failed to send OTP. Please check the number and try again.');
    }
  };

  const verifyOTP = async () => {
    setLoading(true);
    try {
      const credential = PhoneAuthProvider.credential(verificationId, code);
      await signInWithCredential(auth, credential);
      
      // Navigate to CameraCapture screen for gender verification
      navigation.replace('CameraCapture', {
        email,
        userName,
        password,
        phoneNo
      });
      
    } catch (error) {
      console.error('Verification error:', error);
      Alert.alert('Error', 'Verification failed. Please check the code and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <FirebaseRecaptchaVerifierModal
        ref={recaptchaVerifier}
        firebaseConfig={firebaseConfig}
      />
      <Text style={styles.title}>Verify Phone Number</Text>
      <Text style={styles.subtitle}>Enter the 6-digit OTP sent to:</Text>
      <Text style={styles.phone}>{phoneNo}</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter OTP"
        keyboardType="number-pad"
        value={code}
        onChangeText={setCode}
        maxLength={6}
      />

      <TouchableOpacity style={styles.button} onPress={verifyOTP} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify & Continue</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={sendOTP}>
        <Text style={styles.resend}>Resend OTP</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10, color: '#333' },
  subtitle: { fontSize: 16, color: '#666' },
  phone: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, color: '#D64584' },
  input: {
    width: '80%',
    fontSize: 20,
    borderBottomWidth: 2,
    borderColor: '#D64584',
    marginBottom: 20,
    textAlign: 'center',
    paddingVertical: 8,
  },
  button: {
    backgroundColor: '#D64584',
    padding: 15,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  resend: { color: '#D64584', marginTop: 10, fontSize: 14 },
});