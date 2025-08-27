import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator
} from 'react-native';
import { BackHandler } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import { FontAwesome5, MaterialIcons, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { uploadProfilePhoto, getUserPhoto, getVehicleByDriverId, API_URL, getDriverById } from '../../api';
import { deleteCarpoolOffer } from '../utils/ApiCalls';
const primaryColor = '#D64584';
const darkGrey = '#333';


export default function OfferCarpool({ navigation, route }) {
  const userId = route?.params?.userId;
  const driverId = route?.params?.driverId;

  const [showAlert, setShowAlert] = useState(true);
  const [userName, setUserName] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [driverOffers, setDriverOffers] = useState([]);
  const [loadingOffers, setLoadingOffers] = useState(true);



  const fetchUserData = async () => {
    try {
      const response = await fetch(`${API_URL}/user-by-id/${userId}`);
      const data = await response.json();
      setUserName(data.username || '');
      setPhotoURL(data.photo_url || '');
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  };

  const loadUserPhoto = async () => {
    try {
      const response = await getUserPhoto(userId);
      if (response?.photo_url) {
        setPhotoURL(response.photo_url);
      }
    } catch (error) {
      console.error('Error loading user photo:', error);
      setPhotoURL('');
    }
  };

  // Delete carpool offer function
  const deleteCarpoolOfferHandler = async (offerId) => {
    try {
      const response = await deleteCarpoolOffer(offerId);

      if (response.success) {
        // Remove the deleted offer from the state
        setDriverOffers(prevOffers =>
          prevOffers.filter(offer => offer.CarpoolOfferID !== offerId)
        );
        Alert.alert('Success', 'Carpool offer deleted successfully');
      } else {
        throw new Error(response.message || 'Failed to delete carpool offer');
      }
    } catch (error) {
      console.error('Error deleting carpool offer:', error);
      Alert.alert('Error', 'Failed to delete carpool offer. Please try again.');
    }
  };

  const confirmDelete = (offerId) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this carpool offer? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteCarpoolOfferHandler(offerId),
        },
      ],
      { cancelable: true }
    );
  };

  // Fetch user data immediately when component mounts
  useEffect(() => {
    fetchUserData();
    loadUserPhoto();
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      // Handle Android hardware back button
      const onBackPress = () => {
        navigation.navigate("DriverHome", { userId, driverId });
        return true; // prevent default behavior
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress
      );

      // Handle navigation back (header back button or swipe)
      const unsubscribe = navigation.addListener("beforeRemove", (e) => {
        e.preventDefault(); // prevent default back action
        navigation.navigate("DriverHome", { userId, driverId });
      });

      return () => {
        subscription.remove();
        unsubscribe();
      };
    }, [navigation, userId, driverId])
  );

  useFocusEffect(
    useCallback(() => {
      const checkVehicleData = async () => {
        try {
          const data = await getVehicleByDriverId(driverId);

          if (!data || Object.keys(data).length === 0) {
            console.warn('🚨 No vehicle record found.');
            setShowAlert(true); // No vehicle row
            return;
          }

          // Explicitly check if any required field is missing or null
          const fieldsMissing =
            !data.VehicleID ||
            !data.VehicleModel ||
            !data.VehicleType ||
            !data.capacity ||
            !data.color ||
            !data.PlateNumber ||
            !data.vehicle_url ||
            !data.license_front_url ||
            !data.license_back_url;

          setShowAlert(fieldsMissing);
        } catch (error) {
          console.error('🚨 Error fetching vehicle data:', error);
          setShowAlert(true); // On error, assume missing
        }

        await fetchUserData();
        await loadUserPhoto();
      };

      checkVehicleData();
    }, [])
  );

  // ✅ NEW: fetch driver offers
  const fetchDriverOffers = async () => {
    try {
      setLoadingOffers(true);
      const response = await fetch(`${API_URL}/api/driver/carpool/driver-offers/${driverId}`);

      if (response.status === 404) {
        // ✅ No offers found → not an error
        console.warn("⚠️ No driver offers found.");
        setDriverOffers([]);
        return; // Stop execution here
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      // Check if data is an array or if it's nested in a property
      if (Array.isArray(data)) {
        setDriverOffers(data);
      } else if (data.rows) {
        setDriverOffers(data.rows);
      } else {
        setDriverOffers([]);
      }
    } catch (error) {
      console.error("Error fetching driver offers:", error);
      setDriverOffers([]);
    } finally {
      setLoadingOffers(false);
    }
  };

  // Call fetchDriverOffers when component mounts or driverId changes
  useEffect(() => {
    if (driverId) {
      fetchDriverOffers();
    }
  }, [driverId]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow photo library access.');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0].base64) {
        await saveProfilePhoto(result.assets[0].base64);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image.');
    }
  };

  const saveProfilePhoto = async (base64Image) => {
    try {
      setUploading(true);
      setUploadProgress(0);

      const interval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + 10;
          if (newProgress >= 100) {
            clearInterval(interval);
            return 100;
          }
          return newProgress;
        });
      }, 200);

      const response = await uploadProfilePhoto(userId, base64Image);
      clearInterval(interval);
      setUploadProgress(100);

      if (response?.success && response.photo_url) {
        setPhotoURL(response.photo_url);
        Alert.alert('Success', 'Profile photo updated!');
      } else {
        Alert.alert('Error', 'Failed to update profile photo.');
      }
    } catch (error) {
      console.error('Error saving profile photo:', error);
      Alert.alert('Error', 'Failed to upload profile photo.');
    } finally {
      setUploading(false);
    }
  };

  const handleRegisterRoute = async () => {
    // 1. Check profile photo
    if (!photoURL) {
      Alert.alert(
        'Profile Photo Required',
        'Please upload your profile photo before registering your route.'
      );
      return;
    }

    try {
      // 2. Check vehicle information
      const vehicleData = await getVehicleByDriverId(driverId);

      if (!vehicleData || Object.keys(vehicleData).length === 0) {
        Alert.alert(
          'Vehicle Information Required',
          'Please complete your vehicle registration before creating a route.'
        );
        return;
      }

      // Define required fields with user-friendly names
      const requiredFields = {
        'VehicleID': 'Vehicle ID',
        'VehicleModel': 'Vehicle Model',
        'VehicleType': 'Vehicle Type',
        'capacity': 'Passengers Capacity',
        'color': 'Vehicle Color',
        'PlateNumber': 'License Plate Number',
        'vehicle_url': 'Vehicle Image (Your front side and number plate should be clearly visible)',
        'license_front_url': 'License Front Image',
        'license_back_url': 'License Back Image'
      };

      // Check for missing fields
      const missingFields = Object.entries(requiredFields)
        .filter(([field]) => !vehicleData[field])
        .map(([_, friendlyName]) => friendlyName);

      if (missingFields.length > 0) {
        Alert.alert(
          'Incomplete Vehicle Information',
          `Please complete the following vehicle details:\n\n• ${missingFields.join('\n• ')}`
        );
        return;
      }

      // 3. Check driver approval status
      const driverData = await getDriverById(userId);
      console.log("Driver data:", driverData);

      if (!driverData) {
        Alert.alert(
          'Driver Registration Incomplete',
          'We could not find your driver registration.\n\nPlease complete your driver profile first.'
        );
        return;
      }

      // Handle driver status
      switch (driverData.status.toLowerCase()) {
        case 'pending':
          Alert.alert(
            'Approval Pending',
            'Your driver application is under review.\n\nWe typically complete reviews within 2-3 business days.\n\nYou will receive a notification when approved.'
          );
          return;

        case 'rejected':
          Alert.alert(
            'Application Not Approved',
            `Your driver application was not approved at this time.\n\nReason: ${driverData.rejection_reason || 'Not specified'}\n\nPlease contact support if you have questions.`
          );
          return;

        case 'accepted':
          // All checks passed - navigate to route registration
          navigation.navigate('DriverCarpoolMap', {
            userId,
            driverId,
            vehicleData // Pass vehicle data to the next screen
          });
          return;

        default:
          Alert.alert(
            'Verification Status Unknown',
            'We couldn\'t determine your approval status.\n\nPlease contact support for assistance.'
          );
          return;
      }

    } catch (error) {
      console.error('Error during verification:', error);
      Alert.alert(
        'Verification Error',
        'Failed to verify your information. Please try again.'
      );
    }
  };

  // Format date and time functions
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB');
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return null;
    const [hours, minutes] = timeStr.split(':');
    const date = new Date();
    date.setHours(hours, minutes);
    return date.toLocaleTimeString('en-PK', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Render recurring days
  const renderRecurringDays = (days) => {
    if (!days) return null;

    const dayAbbreviations = {
      Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu',
      Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun'
    };

    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
        {days.split(',').map((day, idx) => (
          <View key={idx} style={styles.dayCircle}>
            <Text style={styles.dayText}>{dayAbbreviations[day.trim()] || day}</Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#d63384" barStyle="light-content" />
      <View style={styles.container}>
        {/* Fixed Header Section */}
        <View style={styles.header}>
          {/* Profile Row */}
          <View style={styles.profileRow}>
            <TouchableOpacity onPress={pickImage} disabled={uploading}>
              {uploading ? (
                <View style={styles.profileImageLoading}>
                  <ActivityIndicator size="large" color="#D64584" />
                  <Text style={styles.uploadProgressText}>
                    {Math.round(uploadProgress)}%
                  </Text>
                </View>
              ) : photoURL ? (
                <Image
                  source={{
                    uri: photoURL.startsWith('/') ? `${API_URL}${photoURL}` : photoURL,
                  }}
                  style={styles.profileImage}
                />
              ) : (
                <View style={styles.initialCircle}>
                  <Text style={styles.initialLetter}>
                    {userName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <Text style={styles.profileName}>{userName}</Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.buttonBox} onPress={handleRegisterRoute}>
              <FontAwesome5 name="route" size={28} color="white" />
              <Text style={styles.buttonText}>Register{"\n"}Your Route</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.buttonBox, { position: 'relative' }]}
              onPress={() => navigation.navigate('VehicleSetupScreen', { userId, driverId })}
            >
              <MaterialIcons name="directions-car" size={28} color="white" />
              <Text style={styles.buttonText}>Register{"\n"}Your Vehicle</Text>
              {showAlert && (
                <View style={styles.alertDot}>
                  <Text style={styles.alertText}>!</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>


        {/* ✅ Driver Offers Section */}
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 200 }]}>
          {loadingOffers ? (
            <ActivityIndicator size="large" color="#D64584" style={{ marginTop: 20 }} />
          ) : driverOffers.length > 0 ? (
            <View style={styles.offersContainer}>
              <Text style={styles.offersTitle}>Your Offered Carpools</Text>
              {driverOffers.map((offer, index) => {
                const formattedDate = formatDate(offer.date);
                const pickupTime = formatTime(offer.pickup_time);
                const dropoffTime = formatTime(offer.dropoff_time);

                return (
                  <View key={index} style={styles.offerCard}>
                    {/* Card Header */}
                    <View style={styles.cardHeader}>
                      <TouchableOpacity
                        style={[styles.badge, { backgroundColor: '#da0202ff' }]}
                        onPress={() => confirmDelete(offer.CarpoolOfferID)}                      >
                        <Text style={styles.badgeText}>DELETE</Text>
                      </TouchableOpacity>

                    </View>

                    {/* Route Information */}
                    <View style={styles.routeRow}>
                      <View style={styles.routeDot} />
                      <Text style={styles.locationText}>
                        <Text style={styles.locationLabel}>Pickup: </Text>{offer.pickup_location}
                      </Text>
                      <Text style={styles.timeText}>{pickupTime}</Text>
                    </View>

                    <View style={{ alignItems: 'flex-start', marginVertical: 4 }}>
                      <Ionicons name="arrow-down" size={20} color="#000" />
                    </View>

                    <View style={styles.routeRow}>
                      <View style={[styles.routeDot, { backgroundColor: primaryColor }]} />
                      <Text style={styles.locationText}>
                        <Text style={styles.locationLabel}>Dropoff: </Text>{offer.dropoff_location}
                      </Text>
                      {dropoffTime && <Text style={styles.timeText}>{dropoffTime}</Text>}
                    </View>

                    {/* Recurring Days */}
                    {renderRecurringDays(offer.recurring_days)}

                    {/* Additional Details */}
                    <View style={styles.detailsRow}>
                      <View style={styles.detailItem}>
                        <Ionicons name="people-outline" size={16} color={primaryColor} />
                        <Text style={styles.detailText}>Seats: {offer.seats}</Text>
                      </View>

                      {offer.fare && (
                        <View style={styles.detailItem}>
                          <Ionicons name="cash-outline" size={16} color={primaryColor} />
                          <Text style={styles.detailText}>Fare: {offer.fare}</Text>
                        </View>
                      )}
                    </View>

                    {/* Action Button */}
                    <View style={styles.buttonRowCard}>
                      <TouchableOpacity
                        style={[styles.viewButton, { flex: 1, marginRight: 6 }]}
                        onPress={() => navigation.navigate('DriverCarpoolStatusScreen', {
                          driverId,
                          userId,
                          tab: 'Requests'
                        })}
                      >
                        <Text style={styles.viewButtonText}>View matched Requests</Text>
                        <Ionicons name="arrow-forward" size={16} color="#fff" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.viewButton, { flex: 1, backgroundColor: '#17A2B8', marginLeft: 6 }]}
                        onPress={() => navigation.navigate('DriverCarpoolProfile', {
                          driverId,
                          userId,
                          offer: offer,   // send full offer object
                          offerId: offer.CarpoolOfferID,
                          isEditing: true, // <-- pass unique ID of offer
                        })}
                      >
                        <Text style={styles.viewButtonText}>Edit</Text>
                        <Ionicons name="create-outline" size={16} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="car-outline" size={60} color="#ccc" />
              <Text style={styles.emptyTitle}>No Carpool Offers Yet</Text>
              <Text style={styles.emptySubtitle}>
                Create your first carpool offer to start receiving ride requests
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff", // To match your header background
  },
  container: {
    backgroundColor: '#fff',
    padding: 20,
    flexGrow: 1,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: '#D64584',
    marginRight: 15,
  },
  profileImageLoading: {
    width: 50,
    height: 50,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    marginRight: 15,
  },
  uploadProgressText: {
    marginTop: 8,
    color: '#D64584',
    fontSize: 14,
  },
  initialCircle: {
    width: 50,
    height: 50,
    borderRadius: 35,
    backgroundColor: '#D64584',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  initialLetter: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  profileName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#D64584',
    fontStyle: 'italic',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  buttonBox: {
    backgroundColor: '#D64584',
    padding: 15,
    borderRadius: 10,
    width: '48%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'white',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    marginTop: 8,
    fontSize: 14,
    fontWeight: 'bold',
  },
  alertDot: {
    position: 'absolute',
    top: 6,
    right: 10,
    backgroundColor: 'red',
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: 'white',
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 5,
    paddingBottom: 24,
    flexGrow: 1
  },
  offersContainer: {
    marginBottom: 20,
  },
  offersTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#D64584',
    marginBottom: 15,
    textAlign: 'center',
  },
  offerCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginVertical: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#eee'
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 8,
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
    marginLeft:270,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600'
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
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
    color: '#666',
    fontWeight: '500'
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
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500'
  },
  buttonRowCard: {
    flexDirection: 'row',
    marginTop: 12,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: primaryColor,
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  viewButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 11,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: darkGrey,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});
