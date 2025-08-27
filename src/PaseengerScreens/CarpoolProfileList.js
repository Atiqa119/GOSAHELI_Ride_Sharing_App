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
import moment from 'moment';

const primaryColor = '#D64584';
const darkGrey = '#333';

const CarpoolProfileList = ({ route, navigation }) => {
  const { userId, passengerId } = route.params || {};
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const fullText = 'SAHELI';
  const [displayedText, setDisplayedText] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    let index = 0;
    const letterDelay = 600;

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
          setTimeout(() => {
            index = 0;
            setDisplayedText('');
            animateLetter();
          }, 1500);
        }
      });
    };

    animateLetter();
  }, []);

  const formatTime = (timeStr) => {
    if (!timeStr) return 'N/A';
    return moment(timeStr, 'HH:mm:ss').format('hh:mm A');
  };

  const fetchProfiles = async () => {
    try {
      const result = await getUserCarpoolProfiles(userId);
      setProfiles(result.data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

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
              setIsDeleting(true);
              setDeletingId(profileId);
              await axios.delete(`${API_URL}/api/carpool/delete-carpool-profile/${profileId}`);
              setProfiles(prev => prev.filter(item => item.carpool_profile_id !== profileId));
              Alert.alert('Success', 'Carpool profile removed successfully.');
            } catch (err) {
              Alert.alert('Error', 'Failed to delete profile.');
            } finally {
              setIsDeleting(false);
              setDeletingId(null);
            }
          }
        }
      ]
    );
  };

  const renderRecurringDays = (recurringDays) => {
    if (!recurringDays) return null;
    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
        {recurringDays.split(',').map((day, index) => (
          <View key={index} style={styles.dayCircle}>
            <Text style={styles.dayText}>{day.trim().slice(0, 3)}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderCard = ({ item }) => {
    const lower = (str) => (str || '').toLowerCase();
    const isTwoWay = lower(item.route_type) === 'two way';
    const formattedDate = item.date ? moment(item.date).format('DD-MM-YYYY') : null;
    const pickupTime = formatTime(item.pickup_time);
    const dropoffTime = item.dropoff_time ? formatTime(item.dropoff_time) : null;

    const showPreferences =
      (item.smoking_preference && lower(item.smoking_preference) !== 'no preference') ||
      (item.music_preference && lower(item.music_preference) !== 'no preference') ||
      (item.conversation_preference && lower(item.conversation_preference) !== 'no requirements') ||
      item.allows_luggage;

    const preferences = [];

    if (item.smoking_preference && lower(item.smoking_preference) !== 'no-preference') {
      preferences.push({
        icon: <MaterialIcons name="smoking-rooms" size={16} color={primaryColor} />,
        label: `Smoking: ${item.smoking_preference}`
      });
    }
    if (item.music_preference && lower(item.music_preference) !== 'no-preference') {
      preferences.push({
        icon: <Ionicons name="musical-notes" size={16} color={primaryColor} />,
        label: `Music: ${item.music_preference}`
      });
    }
    if (item.conversation_preference && lower(item.conversation_preference) !== 'no-preference' &&
      lower(item.conversation_preference) !== 'no requirements') {
      preferences.push({
        icon: <Ionicons name="chatbubble-ellipses" size={16} color={primaryColor} />,
        label: `Conversation: ${item.conversation_preference}`
      });
    }
    if (item.allows_luggage) {
      preferences.push({
        icon: <FontAwesome5 name="suitcase-rolling" size={16} color={primaryColor} />,
        label: 'Luggage Allowed'
      });
    }

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          {formattedDate && <Text style={styles.cardDate}>Start From: {formattedDate}</Text>}
          <View style={[styles.badge, { backgroundColor: "#ffffff"}]}>
            <Text style={styles.badgeText}>{item.route_type || 'One Way'}</Text>
          </View>
        </View>

        {/* Pickup Row */}
        <View style={styles.routeRow}>
          <View style={styles.routeDot} />
          <Text style={styles.locationText}>
            <Text style={styles.locationLabel}>Pickup: </Text>
            {item.pickup_location}
          </Text>
          <Text style={styles.timeText}>{pickupTime}</Text>
        </View>

        {/* Arrow Between */}
        <View style={{ alignItems: 'start', marginVertical: 4 }}>
          <Ionicons
            name={isTwoWay ? 'swap-vertical' : 'arrow-down'}
            size={20}
            color='#555'
          />
        </View>

        {/* Dropoff Row */}
        <View style={styles.routeRow}>
          <View style={[styles.routeDot, { backgroundColor: primaryColor }]} />
          <Text style={styles.locationText}>
            <Text style={styles.locationLabel}>Dropoff: </Text>
            {item.dropoff_location}
          </Text>
          {dropoffTime && <Text style={styles.timeText}>{dropoffTime}</Text>}
        </View>

        {/* Recurring Days */}
        {renderRecurringDays(item.recurring_days)}

        {/* Preferences */}
        {showPreferences && (
          <View style={{ marginTop: 8 }}>
            <Text style={styles.sectionHeading}>Preferences</Text>
            {preferences.map((pref, index) => (
              <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                {pref.icon}
                <Text style={{ fontSize: 13, color: '#555', marginLeft: 6 }}>{pref.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Special Requests */}
        {item.special_requests && (
          <View style={{ marginTop: 8 }}>
            <Text style={styles.sectionHeading}>Special Request</Text>
            <Text style={{ fontSize: 13, color: '#555' }}>{item.special_requests}</Text>
          </View>
        )}

        {/* Footer with Actions */}
        <View style={styles.cardFooter}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            {/* Delete Button */}
            <TouchableOpacity
              onPress={() => handleDelete(item.carpool_profile_id)}
              disabled={isDeleting && deletingId === item.carpool_profile_id}
              style={styles.deleteBtn}
            >
              {isDeleting && deletingId === item.carpool_profile_id ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="delete" size={16} color="white" />
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Use Profile Button */}
            <TouchableOpacity
              style={styles.useBtn}
              onPress={() => {
                navigation.navigate("CarpoolProfile", {
                  userId,
                  passengerId,
                  profileId: item.carpool_profile_id,
                  distanceKm: item.distance_km
                });
              }}
            >
              <Text style={styles.useBtnText}>Use Profile</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Animated.Text style={[
                styles.saheliText,
                {
                  opacity: fadeAnim,
                  transform: [{ scale: scaleAnim }],
                  zIndex: 10,
                }
              ]}>
                {displayedText}
              </Animated.Text>

              <LottieView
                source={require('../../assets/pinkCar.json')}
                autoPlay
                loop
                style={{ width: 200, height: 200, marginTop: -30 }}
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
  listContent: { paddingHorizontal: 15, paddingBottom: 20 },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
    position: 'relative',
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
    position: 'absolute',
    top: 50,
    zIndex: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#777',
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 20
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginVertical: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#eee'
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  cardDate: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500'
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderColor:primaryColor,
    borderWidth:1,
    alignSelf: 'flex-start',
    shadowColor: primaryColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 6,

  },
  badgeText: {
    color: primaryColor,
    fontSize: 12,
    fontWeight: '600'
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4CAF50'
  },
  locationLabel: {
    fontWeight: '600',
    color: '#666'
  },
  locationText: {
    flex: 1,
    fontSize: 14,
    color: '#000',
    flexWrap: 'wrap'
  },
  timeText: {
    fontSize: 13,
    color: '#666'
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '600',
    color: primaryColor,
    marginBottom: 6
  },
  dayCircle: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: primaryColor,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 6,
    marginRight: 6,
    marginTop: 4,
    shadowColor: primaryColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 6,
  },
  dayText: {
    color: primaryColor,
    fontSize: 10,
    fontWeight: '600'
  },
  cardFooter: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee'
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e00f00ff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 6
  },
  deleteBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14
  },
  useBtn: {
    backgroundColor: primaryColor,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6
  },
  useBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14
  }
});

export default CarpoolProfileList;