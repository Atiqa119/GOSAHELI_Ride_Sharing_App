// CarpoolStatusScreen.js
import { Animated } from 'react-native';
import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList, Image, StatusBar,
  ActivityIndicator, Alert, TextInput, ToastAndroid
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { Rating } from 'react-native-ratings';
import { getCarpoolRequestsByPassenger, deleteCarpoolRequest, updateCarpoolStatus, getPassengerUserIdFromRequest } from '../utils/ApiCalls';
import { API_URL } from '../../api';
import moment from 'moment';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import { getUserById, getFeedbackByRequestId, addFavourite, removeFavourite, fetchFavourites } from '../utils/ApiCalls';

const primaryColor = '#D64584';
const darkGrey = '#333';

const CarpoolStatusScreen = ({ route }) => {
  const { userId, passengerId } = route.params || {};
  const navigation = useNavigation();
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [favouriteDrivers, setFavouriteDrivers] = useState([]); // store DriverIDs
  const [selectedTab, setSelectedTab] = useState('upcoming');
  const [rides, setRides] = useState({
    upcoming: [],
    completed: [],
    cancelled: [],
    pending: [],
    accepted: []
  });
  const [loading, setLoading] = useState(true);


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


  // Load favourites when the screen mounts
  // In your useEffect or wherever you call fetchFavourites
  useEffect(() => {
    const loadFavourites = async () => {
      try {
        if (!passengerId) {
          console.warn("Cannot fetch favourites - passengerId missing");
          return;
        }

        const res = await fetchFavourites(passengerId);

        if (res.success) {
          // Only update state if passenger has favorites
          if (res.exists) {
            setFavouriteDrivers(res.favourites || []);
          } else {
            // Passenger has no favorites, keep empty array
            setFavouriteDrivers([]);
          }
        }
      } catch (err) {
        console.error("Error fetching favourites:", err);
      }
    };

    if (passengerId && selectedTab === 'completed' || selectedTab === 'accepted') {
      loadFavourites();
    }
  }, [selectedTab, passengerId]);


  const handleEdit = (request) => {
  // Navigate to CarpoolProfile with the necessary parameters
  navigation.navigate('CarpoolProfile', {
    userId,
    passengerId,
    isEditing: true, // Flag to indicate we're editing
    requestId: request.RequestID, // The ID of the request to update
    pickupLocation: request.pickup_location,
    dropoffLocation: request.dropoff_location,
    distanceKm: request.distance_km || 0
  });
};

  // Toggle favourite
  const toggleFavourite = async (driverID) => {
    try {
      const isFav = favouriteDrivers.includes(driverID);

      if (isFav) {
        // Remove from favourites
        await removeFavourite(passengerId, driverID);
        setFavouriteDrivers(favouriteDrivers.filter(id => id !== driverID));
      } else {
        // Add to favourites
        await addFavourite(passengerId, driverID);
        setFavouriteDrivers([...favouriteDrivers, driverID]);
      }
    } catch (err) {
      console.error("Error toggling favourite:", err);
      Alert.alert("Error", "Could not update favourite");
    }
  };



  // ⭐ Added for feedback
  const [feedbackData, setFeedbackData] = useState({});

  // ⭐ Handlers for feedback
  const handleRatingChange = (requestId, rating) => {
    setFeedbackData(prev => ({
      ...prev,
      [requestId]: { ...(prev[requestId] || {}), rating }
    }));
  };

  const handleFeedbackMessageChange = (requestId, text) => {
    setFeedbackData(prev => ({
      ...prev,
      [requestId]: { ...(prev[requestId] || {}), message: text }
    }));
  };

  const submitFeedback = async (item) => {
    const { rating, message } = feedbackData[item.RequestID] || {};

    if (!rating) {
      Alert.alert("Error", "Please select a rating before submitting.");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          RateValue: rating,
          DriverID: item.DriverID,       // ✅ from Carpool_Request_Status
          PassengerID: passengerId, // ✅ from Carpool_Request_Status
          message,
          RequestID: item.RequestID,
        })
      });
      console.log('feedback info: RateValue_', rating, ', DriverID_', item.DriverID, ', PassengerID_', passengerId, ', message_', message, ', requestID_', item.RequestID)

      const json = await res.json();
      if (json.success) {
        Alert.alert("Thank you!", "Your feedback has been submitted.");
        await fetchRides();
      } else {
        Alert.alert("Error", json.message || "Failed to submit feedback.");
      }
    } catch (err) {
      console.error("Feedback submit error:", err);
      Alert.alert("Error", "Could not submit feedback.");
    }
  };



  //✅enable polling every 10 seconds
  useEffect(() => {
    let interval = null;

    if (passengerId) {
      interval = setInterval(() => {
        fetchRides();
      }, 20000); // every 20 seconds
    }

    return () => clearInterval(interval);
  }, [passengerId]);

  useEffect(() => {
    if (passengerId) {
      fetchRides();
      fetchFavourites(passengerId);
    }
  }, [passengerId]);
  useEffect(() => {
    if (selectedTab === 'accepted') {
      fetchAcceptedRides(); // fetch only when selected
    }
  }, [selectedTab]);
  useEffect(() => {
    if (selectedTab === 'pending') {
      console.log('Pending rides:', rides.pending);
    }
  }, [selectedTab, rides]);

  useEffect(() => {
    if (route.params?.tab === 'Accepted') {
      setActiveTab('Accepted');
    }
  }, [route.params]);

  const handleAccept = (requestId) => {
    Alert.alert(
      "Confirm",
      "Do you want to join this ride?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes",
          onPress: async () => {
            try {
              const passengerData = await getPassengerUserIdFromRequest(requestId);
              console.log('API Response:', passengerData);

              // Handle case where driverusername might be undefined
              const driverName = passengerData.driverusername || 'your driver';
              console.log('Using driver name:', driverName);
              const res = await updateCarpoolStatus(requestId, "joined");

              if (res.success) {
                ToastAndroid.show('Joined', ToastAndroid.SHORT);

                try {
                  await axios.post(`${API_URL}/api/save-notification`, {
                    userId,
                    type: 'Joined Carpool',
                    message: `You joined the carpool with with Driver`,
                  });
                  console.log("Notification saved successfully");
                } catch (notifError) {
                  console.error("Failed to save notification:", notifError);
                }


                // ✅ Instant UI update
                setRides(prev => {
                  const movedRide = prev.accepted.find(r => r.RequestID === requestId);
                  return {
                    ...prev,
                    accepted: prev.accepted.filter(r => r.RequestID !== requestId),
                    upcoming: movedRide ? [...prev.upcoming, { ...movedRide, status: "joined" }] : prev.upcoming
                  };
                });

                // ⏳ Silent backend refresh
                setTimeout(fetchRides, 1500);
              }
            } catch {
              Alert.alert("Error", "Failed to join the ride");
            }
          }
        }
      ]
    );
  };


  const handleReject = (requestId) => {
    Alert.alert(
      "Confirm",
      "Do you want to reject this ride?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes",
          onPress: async () => {
            try {
              const res = await updateCarpoolStatus(requestId, "rejected");
              if (res.success) {
                Alert.alert("Success", "You have rejected the ride");

                // ✅ Instant UI update
                setRides(prev => {
                  const movedRide = prev.accepted.find(r => r.RequestID === requestId);
                  return {
                    ...prev,
                    accepted: prev.accepted.filter(r => r.RequestID !== requestId),
                    rejected: movedRide ? [...prev.rejected, { ...movedRide, status: "rejected" }] : prev.rejected
                  };
                });

                // ⏳ Silent backend refresh
                setTimeout(fetchRides, 1500);
              }
            } catch {
              Alert.alert("Error", "Failed to reject the ride");
            }
          }
        }
      ]
    );
  };



  const handleChatPress = async (requestId, driverUserId, driverName, driverPhoto) => {
    try {
      setLoading(true);

      // Get passenger details
      const passengerDetails = await getUserById(userId);
      if (!passengerDetails) {
        Alert.alert("Error", "Could not load your passenger info");
        return;
      }

      // Get driver details
      const driverDetails = await getUserById(driverUserId);
      if (!driverDetails) {
        Alert.alert("Error", "Could not load driver info");
        return;
      }

      navigation.navigate('ChatUI', {
        driverId: driverUserId,
        userId,
        chatRoomId: `chat_request_${requestId}`,
        currentUser: 'passenger',
        currentUserId: userId,
        currentUserName: passengerDetails.username,
        currentUserPhoto: passengerDetails.photo_url,
        receiverUserId: driverUserId,
        receiverUserName: driverName,
        receiverUserPhoto: driverPhoto
      });

    } catch (err) {
      console.error('Error opening chat:', err);
      Alert.alert("Error", "Failed to open chat");
    } finally {
      setLoading(false);
    }
  };

  const fetchAcceptedRides = async () => {
    try {
      const res = await fetch(`${API_URL}/api/carpool/accepted-requests/${passengerId}`);
      const json = await res.json();
      console.log("Accepted rides data:", json.data);

      if (json.success) {
        setRides(prev => ({ ...prev, accepted: json.data }));
      } else {
        Alert.alert("Error", json.message || "Could not fetch accepted rides");
      }
    } catch (err) {
      console.error("Fetch accepted rides error:", err);
    }
  };


  const handleDelete = async (requestId) => {
    Alert.alert(
      'Confirm Deletion',
      'Are you sure you want to delete this ride?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              setIsDeleting(true);              // ✅ Moved here
              setDeletingId(requestId);         // ✅ Moved here

              const response = await deleteCarpoolRequest(requestId);

              if (response.success) {
                await fetchRides();
                Alert.alert('Success', response.message || 'Carpool Request deleted successfully');
              } else {
                Alert.alert('Error', response.message || 'Failed to delete carpool');
              }
            } catch (error) {
              console.error('Delete error:', error);
              Alert.alert(
                'Error',
                error.response?.data?.message ||
                error.message ||
                'Failed to delete ride'
              );
            } finally {
              setIsDeleting(false);             // ✅ Will now properly reset spinner
              setDeletingId(null);
            }
          },
          style: 'destructive'
        },
      ],
      { cancelable: true }
    );
  };



  const fetchRides = async () => {
    try {
      const response = await getCarpoolRequestsByPassenger(passengerId);
      if (response.success) {
        const ridesData = response.data;

        // Fetch feedback for completed rides
        const completedWithFeedback = await Promise.all(
          ridesData.completed.map(async (ride) => {
            const feedbackRes = await getFeedbackByRequestId(ride.RequestID);
            if (feedbackRes.success && feedbackRes.data) {
              return {
                ...ride,
                feedback: {
                  rating: feedbackRes.data.RateValue,
                  message: feedbackRes.data.message
                }
              };
            }
            return ride;
          })
        );

        setRides({
          ...ridesData,
          completed: completedWithFeedback
        });
      } else {
        console.error("API Error:", response.message);
      }
    } catch (err) {
      console.error("Error fetching rides:", err);
    } finally {
      setLoading(false);
    }
  };


  const renderStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return <View style={[styles.badge, { backgroundColor: '#4CAF50' }]}><Text style={styles.badgeText}>Confirmed</Text></View>;
      case 'pending':
        return <View style={[styles.badge, { backgroundColor: '#FFC107' }]}><Text style={styles.badgeText}>Pending</Text></View>;
      case 'rejected':
        return <View style={[styles.badge, { backgroundColor: '#e00f00ff' }]}><Text style={styles.badgeText}>Rejected</Text></View>;
      default:
        return null;
    }
  };

  const renderRecurringDays = (recurringDays) => {
    if (!recurringDays) return null;
    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
        {recurringDays.split(',').map((day, index) => (
          <View key={index} style={styles.dayCircle}>
            <Text style={styles.dayText}>{day.slice(0, 3)}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderCard = ({ item }) => {

    const formattedDate = moment(item.date).format('DD-MM-YYYY');
    const pickupTime = moment(item.pickup_time, 'HH:mm:ss').format('hh:mm A');
    const dropoffTime = item.dropoff_time ? moment(item.dropoff_time, 'HH:mm:ss').format('hh:mm A') : null;
    // Inside renderCard function
    const displayFare = item.fare ? `Rs ${item.fare}` : 'fare not set';
    const lower = (str) => (str || '').toLowerCase();


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
    if (item.conversation_preference && lower(item.conversation_preference) !== 'no-preference' && lower(item.conversation_preference) !== 'no requirements') {
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



    const isTwoWay = lower(item.route_type) === 'two way';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardDate}>Start From:  {formattedDate}</Text>
          {renderStatusBadge(item.status)}
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

        {/* Seats */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>

          <Text style={{ fontWeight: '400', color: '#555' }}>Passengers: <Text style={{ fontWeight: '600', color: darkGrey, fontSize: 22 }}>   {item.seats}<Ionicons name="woman" size={24} color={primaryColor} style={{ marginRight: 4 }} /></Text></Text>
        </View>

        {/* Preferences */}
        {preferences.length > 0 && (
          <View style={{ marginTop: 8 }}>
            {preferences.map((pref, index) => (
              <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                {pref.icon}
                <Text style={{ fontSize: 13, color: '#555', marginLeft: 6 }}>{pref.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Driver Info */}
        {(selectedTab === 'accepted' || selectedTab === 'upcoming' || selectedTab === 'completed') && item.driver_name && (
          <View style={styles.driverInfoContainer}>
            <Image
              source={{
                uri: item.driver_photo?.startsWith('/')
                  ? `${API_URL}${item.driver_photo}`
                  : `${API_URL}/uploads/${item.driver_photo}`
              }}
              style={styles.driverImage}
              onError={(e) => console.log("Image loading error:", e.nativeEvent.error)}
              defaultSource={require('../../assets/empty_avatar.jpg')}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.driverName}>{item.driver_name}</Text>
              <Text style={styles.vehicleInfo}>
                {item.color ? `${item.color} ` : ''}
                {item.VehicleModel || 'No vehicle info'}
                {item.PlateNumber ? ` (${item.PlateNumber})` : ''}
              </Text>
              <View style={styles.ratingContainer}>
                <Rating
                  type="star"
                  ratingCount={5}
                  imageSize={12}
                  readonly
                  startingValue={Number(item.Rating ?? 4.5)}
                  style={styles.ratingStars}
                />
                <Text style={styles.ratingText}>
                  {Number(item.Rating ?? 4.5).toFixed(1)} {/* Convert to number first */}
                  {item.RatingCount > 0 && ` (${item.RatingCount})`}
                </Text>
              </View>


            </View>

            {/* Favourite in completed tab (original position) */}
            {selectedTab === 'completed' && (
              <TouchableOpacity
                style={{
                  marginRight: 8,
                  backgroundColor: '#fff', // white circle behind for contrast
                  padding: 6,
                  borderRadius: 30,
                  // iOS shadow
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 4,
                  // Android shadow
                  elevation: 5,
                }}
                onPress={() => toggleFavourite(item.DriverID)}
              >
                <Ionicons
                  name={favouriteDrivers.includes(item.DriverID) ? "heart" : "heart-outline"}
                  size={24}
                  color={favouriteDrivers.includes(item.DriverID) ? "#e40000ff" : "#999"}
                />
              </TouchableOpacity>
            )}

            {/* Favourite in accepted tab (new position - top right) */}
            {selectedTab === 'accepted' && favouriteDrivers.includes(item.DriverID) && (
              <View style={{
                position: 'absolute',
                top: 10,
                right: 10
              }}>
                <Ionicons
                  name="heart"
                  size={20}
                  color="#e40000ff"
                />
              </View>
            )}

            {/* Chat only in accepted & upcoming */}
            {(selectedTab === 'accepted' || selectedTab === 'upcoming') && (
              <TouchableOpacity
                style={{
                  marginTop: 10,
                  padding: 4,
                  paddingRight: 10,
                  borderRadius: 10,
                  alignSelf: 'flex-end',
                  flexDirection: 'row',
                  alignItems: 'center',
                  elevation: 6,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  backgroundColor: '#D64584'
                }}
                onPress={() => handleChatPress(
                  item.RequestID,
                  item.driver_user_id,
                  item.driver_name,
                  item.driver_photo
                )}
              >
                <Ionicons name="chatbubble-ellipses-sharp" size={20} color="#ffffff" />
                <Text style={{ color: '#ffffff', marginLeft: 6, fontWeight: 600 }}>Chat</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        {/* Feedback section for completed rides */}
        {selectedTab === 'completed' && item.driver_name && (
          <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#eee' }}>

            {item.feedback ? (
              // ✅ Already Rated - Show stars + text

              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <Ionicons
                    key={star}
                    name={item.feedback.rating >= star ? 'star' : 'star-outline'}
                    size={24}
                    color="#e3c204ff"
                    style={{ marginHorizontal: 2 }}
                  />
                ))}
                <Text style={{ marginLeft: 10, fontWeight: '600', color: '#555' }}>
                  Rated
                </Text>
              </View>
            ) : (
              // ⭐ No rating yet → Show current input UI
              <>
                {/* Rating Stars */}
                <Text style={{ fontWeight: '600', marginBottom: 4, color: '#555' }}>
                  Rate this driver
                </Text>
                <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => handleRatingChange(item.RequestID, star)}
                    >
                      <Ionicons
                        name={
                          (feedbackData[item.RequestID]?.rating || 0) >= star
                            ? 'star'
                            : 'star-outline'
                        }
                        size={24}
                        color="#e3c204ff"
                        style={{ marginHorizontal: 2 }}
                      />
                    </TouchableOpacity>
                  ))}
                </View>

                {(feedbackData[item.RequestID]?.rating || 0) > 0 && (
                  <>
                    <TextInput
                      style={{
                        borderWidth: 1,
                        borderColor: '#ccc',
                        borderRadius: 8,
                        padding: 8,
                        minHeight: 60,
                        textAlignVertical: 'top',
                        marginBottom: 10
                      }}
                      placeholder="Write a complaint or suggestion about the driver..."
                      multiline
                      value={feedbackData[item.RequestID]?.message || ''}
                      onChangeText={text => handleFeedbackMessageChange(item.RequestID, text)}
                    />
                    <TouchableOpacity
                      style={{
                        backgroundColor: primaryColor,
                        paddingVertical: 10,
                        borderRadius: 8,
                        alignItems: 'center'
                      }}
                      onPress={() => submitFeedback(item)}
                    >
                      <Text style={{ color: '#fff', fontWeight: '600' }}>Submit Feedback</Text>
                    </TouchableOpacity>
                  </>
                )}
              </>
            )}
          </View>
        )}

        {/* Footer */}
        <View style={styles.cardFooter}>
          <View style={{
            borderBottomWidth: 1,
            borderBottomColor: '#eee', marginBottom: 15
          }}>
            <Text style={[styles.actionButtonText, { color: primaryColor, marginTop: 10, marginBottom: 10 }]}>
              Fare (per day): {displayFare}
            </Text>
          </View>

          {selectedTab === 'accepted' && (
            <View style={styles.acceptRejectContainer}>
              <TouchableOpacity
                style={[styles.actionBtn]}
                onPress={() => handleAccept(item.RequestID)}
              >
                <Text style={styles.acceptButtonText}>Join</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn]}
                onPress={() => handleReject(item.RequestID)}
              >
                <Text style={styles.rejectButtonText}>Reject</Text>
              </TouchableOpacity>
            </View>
          )}

          {selectedTab !== 'accepted' &&
            item.status?.toLowerCase() !== 'completed' &&
            item.status?.toLowerCase() !== 'joined' &&
            item.status?.toLowerCase() !== 'rejected' && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>

                {/* Edit Button (Left side, medium size) */}
                <TouchableOpacity
                  style={[
                    styles.viewButton,
                    {
                      backgroundColor: '#17A2B8',
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 6,
                      flexDirection: 'row',
                      alignItems: 'center',
                    },
                  ]}
                   onPress={() => handleEdit(item)}>
                  <Text style={[styles.viewButtonText, { marginRight: 6 }]}>Edit</Text>
                  <Ionicons name="create-outline" size={16} color="#fff" />
                </TouchableOpacity>

                {/* Delete Icon (Right side) */}
                <TouchableOpacity
                  onPress={() => handleDelete(item.RequestID)}
                  disabled={isDeleting && deletingId === item.RequestID}
                >
                  {isDeleting && deletingId === item.RequestID ? (
                    <ActivityIndicator size="small" color={primaryColor} />
                  ) : (
                    <Ionicons name="trash-outline" size={20} color={primaryColor} />
                  )}
                </TouchableOpacity>
              </View>
            )}

        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Carpools</Text>
        <TouchableOpacity>
          <LottieView
            source={require('../../assets/pinkCar.json')} // put your .json file in assets
            autoPlay
            loop
            style={{ width: 50, height: 50 }}
          />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {['pending', 'accepted', 'upcoming', 'completed', 'rejected'].map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, selectedTab === tab && styles.activeTab]}
            onPress={() => setSelectedTab(tab)}
          >
            <Text style={[styles.tabText, selectedTab === tab && styles.activeTabText]}
              allowFontScaling={false}       // prevents Samsung large text scaling
              adjustsFontSizeToFit           // auto-resizes text if needed
              minimumFontScale={0.8}         // won’t shrink below 80%
              numberOfLines={1} >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
            {selectedTab === tab && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={primaryColor} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={rides[selectedTab]}
          keyExtractor={(item, index) => `${item.RequestID || item.requestid}-${index}`}
          renderItem={renderCard}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              {/* Animated SAHELI text */}
              <Animated.Text style={[
                styles.saheliText,
                { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
              ]}>
                {displayedText}
              </Animated.Text>
              {/* Lottie Animation */}
              <LottieView
                source={require('../../assets/pinkCar.json')}
                autoPlay
                loop
                style={{ width: 200, height: 200 }}
              />              <Text style={styles.emptyTitle}>No {selectedTab} rides</Text>
              <Text style={styles.emptySubtitle}>When you have {selectedTab} rides, they'll appear here</Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee'
  },
  headerTitle: { fontSize: 22, fontWeight: '600', color: darkGrey },
  tabRow: {
    flexDirection: 'row', justifyContent: 'space-around', marginTop: 10,
    borderBottomWidth: 1, borderBottomColor: '#eee', paddingHorizontal: 8,
  },
  tab: {
    flex: 1,                  // all 5 share row evenly
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: { position: 'relative' },
  tabText: {
    color: '#666',
    fontWeight: '500',
    fontSize: 12,
    includeFontPadding: false, // Android extra padding fix
    textAlign: 'center',
  },
  activeTabText: { color: primaryColor, fontWeight: '600' },
  tabIndicator: { position: 'absolute', bottom: 0, height: 3, width: '100%', backgroundColor: primaryColor },
  listContent: { paddingHorizontal: 15, paddingBottom: 20 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, marginVertical: 8, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1,
    shadowRadius: 4, elevation: 3, borderWidth: 1, borderColor: '#eee'
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardDate: { fontSize: 14, color: '#666', fontWeight: '500' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  routeRow: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 8
  },
  routeDot: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: '#4CAF50'
  },
  locationLabel: { fontWeight: '600', color: '#666' },
  locationText: { flex: 1, fontSize: 14, color: '#000', flexWrap: 'wrap' },
  timeText: { fontSize: 13, color: '#666' },
  iconButton: {
    padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#D64584'
  },
  cardFooter: {
    marginTop: 16,
    paddingBottom: 10,
  },
  viewButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  acceptRejectContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 6,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: primaryColor,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  acceptButtonText: {
    color: primaryColor,
    fontWeight: '600',
    textAlign: 'center',
  },
  rejectButton: {
    borderColor: '#aaa',
    backgroundColor: '#f9f9f9',
  },
  rejectButtonText: {
    color: '#555',
    fontWeight: '600',
  },
  actionButtonText: { fontWeight: '600', fontSize: 14 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  saheliText: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#D64584',
    marginBottom: 12,
    letterSpacing: 3,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  emptyImage: { width: 150, height: 150, marginBottom: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: darkGrey, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20 },
  dayCircle: {
    backgroundColor: primaryColor, paddingVertical: 6, paddingHorizontal: 6,
    borderRadius: 20, marginRight: 6, marginTop: 4
  },
  dayText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  driverInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },

  driverImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#ccc',
  },

  driverName: {
    fontSize: 16,
    fontWeight: '600',
    color: darkGrey,
  },

  vehicleInfo: {
    fontSize: 14,
    color: '#666',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingStars: {
    alignSelf: 'flex-start',
    marginRight: 8,
  },
  ratingText: {
    color: '#d63384',
    fontWeight: '600',
    fontSize: 16,
  },
  chatButton: {
    padding: 8,
    marginLeft: 10,
  },

});


export default CarpoolStatusScreen;