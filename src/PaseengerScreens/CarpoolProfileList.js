import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Modal,
  StyleSheet, ActivityIndicator, ScrollView, Alert, Animated
} from 'react-native';
import { Ionicons, FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { API_URL, getUserCarpoolProfiles } from '../../api';
import LottieView from 'lottie-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import * as Animatable from 'react-native-animatable';
import axios from 'axios';

const primaryColor = '#D64584';

const CarpoolProfileList = ({ route, navigation }) => {
  const { userId, passengerId } = route.params || {};
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);


  const fullText = 'SAHELI';
  const [displayedText, setDisplayedText] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    let index = 0;
    const letterDelay = 600; // ms per letter (adjust to fit Lottie duration)

    const animateLetter = () => {
      setDisplayedText(fullText.slice(0, index + 1));
      fadeAnim.setValue(0);
      scaleAnim.setValue(1);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          useNativeDriver: true,
        })
      ]).start(() => {
        index++;
        if (index < fullText.length) {
          setTimeout(animateLetter, letterDelay);
        } else {
          // Wait for Lottie loop to finish
          setTimeout(() => {
            index = 0;
            setDisplayedText('');
            animateLetter();
          }, 1500); // Pause before restarting
        }
      });
    };

    animateLetter();
  }, []);

  const formatTime = (timeStr) => {
    if (!timeStr) return 'N/A';
    const [hours, minutes] = timeStr.split(':');
    const date = new Date();
    date.setHours(+hours);
    date.setMinutes(+minutes);
    return date.toLocaleTimeString('en-PK', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const fetchProfiles = async () => {
    try {
      const result = await getUserCarpoolProfiles(userId);
      setProfiles(result.data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    } finally {
      setLoading(false);
      setRefreshing(false); // ✅ stop pull-to-refresh spinner
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  // ✅ Delete with UI update + alert
  const handleDelete = (profileId) => {
    Alert.alert(
      'Delete Profile',
      'Are you sure you want to delete this carpool profile?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Delete',
          onPress: async () => {
            try {
              await axios.delete(`${API_URL}/api/carpool/delete-carpool-profile/${profileId}`);
              setProfiles(prev => prev.filter(item => item.carpool_profile_id !== profileId));
              Toast.show({
                type: 'success',
                text1: 'Deleted',
                text2: 'Carpool profile removed successfully.'
              });
            } catch (err) {
              Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to delete profile.'
              });
            }
          }
        }
      ]
    );
  };


  const renderCard = ({ item }) => {
    const isTwoWay = item.route_type === 'Two Way';
    const recurringDays = item.recurring_days?.split(',').filter(Boolean) || [];

    return (
      <View style={styles.card}>
        <View style={styles.row}>
          <FontAwesome5 name="dot-circle" size={20} color={primaryColor} />
          <Text style={styles.text}>{item.pickup_location}</Text>
          <Text style={styles.timeRight}>{formatTime(item.pickup_time)}</Text>
        </View>

        <View style={styles.arrowRow}>
          <Ionicons
            name={isTwoWay ? 'swap-vertical' : 'arrow-down'}
            size={20}
            color={'#555'}
          />
        </View>

        <View style={styles.row}>
          <FontAwesome5 name="map-marker-alt" size={20} color={primaryColor} />
          <Text style={styles.text}>{item.dropoff_location}</Text>
          {isTwoWay && (
            <Text style={styles.timeRight}>{formatTime(item.dropoff_time)}</Text>
          )}
        </View>

        {recurringDays.length > 0 && (
          <View style={styles.daysContainer}>
            {recurringDays.map((day, index) => (
              <View key={index} style={styles.dayBadge}>
                <Text style={styles.dayText}>{day.trim()}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.btnRow}>
          <TouchableOpacity onPress={() => handleDelete(item.carpool_profile_id)} style={styles.deleteBtn}>
            <MaterialIcons name="delete" size={20} color="white" />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setSelectedProfile(item)} style={styles.seeFullBtn}>
            <Text style={styles.seeFullText}>See Full</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderModal = () => {
    if (!selectedProfile) return null;

    const {
      route_type,
      pickup_location,
      dropoff_location,
      pickup_time,
      dropoff_time,
      recurring_days,
      date,
      smoking_preference,
      music_preference,
      conversation_preference,
      allows_luggage,
      is_recurring,
      special_requests
    } = selectedProfile;

    const isTwoWay = route_type === 'Two Way';

    const formatDate = (dateStr) => {
      if (!dateStr) return null;
      const d = new Date(dateStr);
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    };

    const shortDays = recurring_days?.split(',').map(day => day.trim().slice(0, 3)) || [];

    return (
      <Modal visible transparent animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.modalContentWrapper}>
            <Animatable.View animation="zoomIn" duration={300} style={styles.modalContentWrapper}>
              <ScrollView contentContainerStyle={styles.modalContent}>
                <View style={styles.routeTypeBadge}>
                  <Text style={styles.routeTypeText}>{route_type || 'One Way'}</Text>
                </View>

                <View style={styles.card}>
                  <Text style={styles.sectionHeading}>Route</Text>
                  <View style={styles.row}>
                    <FontAwesome5 name="dot-circle" size={18} color={primaryColor} />
                    <Text style={styles.text}>{pickup_location}</Text>
                    <Text style={styles.timeRight}>{formatTime(pickup_time)}</Text>
                  </View>

                  <View style={styles.arrowRow}>
                    <Ionicons name={isTwoWay ? 'swap-vertical' : 'arrow-down'} size={20} color="#555" />
                  </View>

                  <View style={styles.row}>
                    <FontAwesome5 name="map-marker-alt" size={18} color={primaryColor} />
                    <Text style={styles.text}>{dropoff_location}</Text>
                    {isTwoWay && (
                      <Text style={styles.timeRight}>{formatTime(dropoff_time)}</Text>
                    )}
                  </View>
                </View>

                {shortDays.length > 0 && (
                  <View style={[styles.card, { marginTop: 16 }]}>
                    <Text style={styles.sectionHeading}>Days</Text>
                    <View style={styles.daysContainer}>
                      {shortDays.map((day, idx) => (
                        <View key={idx} style={styles.dayBadge}>
                          <Text style={styles.dayText}>{day}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {date && (
                  <View style={[styles.card, { marginTop: 16 }]}>
                    <Text style={styles.sectionHeading}>Start Date</Text>
                    <Text style={styles.modalText}>{formatDate(date)}</Text>
                  </View>
                )}

                <View style={[styles.card, { marginTop: 16 }]}>
                  <Text style={styles.sectionHeading}>Preferences</Text>
                  <Text style={styles.modalText}>🚬 Smoking: {smoking_preference}</Text>
                  <Text style={styles.modalText}>🎵 Music: {music_preference}</Text>
                  <Text style={styles.modalText}>🗣️ Conversation: {conversation_preference}</Text>
                  <Text style={styles.modalText}>🧳 Luggage: {allows_luggage ? 'Allowed' : 'Not Allowed'}</Text>
                  <Text style={styles.modalText}>🔁 Recurring: {is_recurring ? 'Yes' : 'No'}</Text>
                </View>

                {special_requests && (
                  <View style={[styles.card, { marginTop: 16 }]}>
                    <Text style={styles.sectionHeading}>Special Request</Text>
                    <Text style={styles.modalText}>{special_requests}</Text>
                  </View>
                )}
              </ScrollView>
              {/* Use Button (FIXED at bottom) */}
              <TouchableOpacity
                style={styles.useBtnFixed}
                onPress={() => {
                  navigation.navigate("CarpoolProfile", {
                    userId, passengerId,
                    profileId: selectedProfile.carpool_profile_id,
                    distanceKm: selectedProfile.distance_km
                  });
                  setSelectedProfile(null);
                }}
              >
                <Text style={styles.useBtnText}>Use this Profile</Text>
              </TouchableOpacity>

              {/* Close (X) icon */}
              <TouchableOpacity onPress={() => setSelectedProfile(null)} style={styles.crossIcon}>
                <Ionicons name="close" size={26} color="#333" />
              </TouchableOpacity>
            </Animatable.View>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) return <ActivityIndicator size="large" color={primaryColor} style={{ marginTop: 50 }} />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={primaryColor} barStyle="light-content" />
      <View style={styles.container}>
        {/* Heading */}
        <View style={styles.headingcontainer}>
          <Text style={styles.heading}>My Carpool Profiles</Text>
        </View>
        <FlatList
          data={profiles}
          keyExtractor={(item) => item.carpool_profile_id.toString()}
          renderItem={renderCard}
          contentContainerStyle={{ padding: 20, flexGrow: 1 }}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              {/* Animated SAHELI text - Moved to top */}
              <Animated.Text style={[
                styles.saheliText,
                {
                  opacity: fadeAnim,
                  transform: [{ scale: scaleAnim }],
                  zIndex: 10, // Ensure it stays on top
                }
              ]}>
                {displayedText}
              </Animated.Text>

              <LottieView
                source={require('../../assets/pinkCar.json')}
                autoPlay
                loop
                style={{ width: 200, height: 200, marginTop: -30 }} // Adjust positioning
              />

              <Text style={styles.emptyText}>
                You have not created any carpool profiles yet.
              </Text>
            </View>
          )}
          onRefresh={() => {
            setRefreshing(true);
            fetchProfiles();
          }}
          refreshing={refreshing}
        />
        {renderModal()}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  headingcontainer: {
    borderColor: '#000000ff',
    borderWidth: 0.2,
    padding: 8
  },
  heading: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000ff',
    paddingHorizontal: 20,
    paddingTop: 15
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
    position: 'relative', // Important for z-index to work
  },
  saheliText: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#D64584',
    marginBottom: 12,
    letterSpacing: 3,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    position: 'absolute', // Position absolutely to avoid layout conflicts
    top: 50, // Adjust as needed
    zIndex: 10, // Ensure it stays on top
  },
  emptyText: {
    fontSize: 16,
    color: '#777',
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 20
  },

  card: { backgroundColor: '#fff', borderRadius: 10, padding: 16, marginBottom: 16, elevation: 2 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  arrowRow: { alignItems: 'left', marginVertical: 4, marginLeft: 24 },
  text: { marginLeft: 8, fontSize: 16, color: '#333', maxWidth: '60%' },
  timeRight: { marginLeft: 'auto', fontSize: 14, color: '#555' },
  daysContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, gap: 6 },
  dayBadge: { backgroundColor: primaryColor, borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10 },
  dayText: { color: '#fff', fontSize: 13 },
  btnRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  deleteBtn: { backgroundColor: '#D64584', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 5 },
  seeFullBtn: { backgroundColor: primaryColor, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 5 },
  seeFullText: { color: '#fff', fontSize: 14 },
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center' },
  modalContentWrapper: { flex: 1, backgroundColor: 'white', margin: 20, borderRadius: 10, overflow: 'hidden', elevation: 5 },
  modalContent: { backgroundColor: 'white', padding: 20, paddingBottom: 80 },
  modalText: { fontSize: 14, marginBottom: 6, color: '#333' },
  sectionHeading: { fontSize: 16, fontWeight: 'bold', color: primaryColor, marginBottom: 8 },
  routeTypeBadge: { backgroundColor: primaryColor, alignSelf: 'center', paddingVertical: 6, paddingHorizontal: 16, borderRadius: 20, marginBottom: 16 },
  routeTypeText: { color: '#fff', fontSize: 14, fontWeight: 'bold', textTransform: 'uppercase' },
  useBtnFixed: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: primaryColor, padding: 15, alignItems: 'center', borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  useBtnText: { color: 'white', fontWeight: 'bold' },
  crossIcon: { position: 'absolute', top: 15, right: 15, zIndex: 100 }
});

export default CarpoolProfileList;
