import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, BackHandler, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView,
  LayoutAnimation, UIManager, Platform, Animated
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import { Alert, ToastAndroid } from 'react-native';
import axios from 'axios';
import { API_URL } from '../../api';
import { registerForPushNotificationsAsync } from '../utils/NotificationSetup';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import LottieView from 'lottie-react-native';
import { collection, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/setup';
import { getUserById, getPassengerUserIdFromRequest } from '../utils/ApiCalls';
import { useFocusEffect } from '@react-navigation/native';


const primaryColor = '#D64584';
const darkGrey = '#333';
const BlackColor = '#000000'

const DriverCarpoolStatusScreen = ({ route }) => {
  const { tab, driverId, userId } = route.params;
  console.log('DriverID:', driverId, 'UserID:', userId);
  console.log('API_URL:', API_URL);
  const [activeTab, setActiveTab] = useState('Requests');
  const [loading, setLoading] = useState(true);
  const [matchedRequests, setMatchedRequests] = useState([]);
  const [allPendingRequests, setAllPendingRequests] = useState([]);
  const [upcomingRequests, setUpcomingRequests] = useState([]);
  const [showMatchedOnly, setShowMatchedOnly] = useState(false);
  const [acceptedRequests, setAcceptedRequests] = useState([]);
  const [rejectedRequests, setRejectedRequests] = useState([]);
  const [completedRequests, setCompletedRequests] = useState([]);
  const navigation = useNavigation();


  if (Platform.OS === 'android') {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }


  useFocusEffect(
    React.useCallback(() => {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        navigation.navigate('DriverHome', {
          driverId,
          userId
        });

        return true;
      });

      return () => backHandler.remove();
    }, [])
  );

  //✅enable polling every 10 seconds
  useEffect(() => {
    let interval = null;

    if (driverId) {
      interval = setInterval(() => {
        fetchRequests();
      }, 20000); // every 20 seconds
    }

    return () => clearInterval(interval);
  }, [driverId]);


  useEffect(() => {
    if (route.params?.tab === 'Accepted') {
      setActiveTab('Accepted');
    }
  }, [route.params]);

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

  const fetchPassengerUserId = async (requestId) => {
    try {
      console.log(`${API_URL}/api/become-passenger/user-by-request/${requestId}`);
      const res = await axios.get(`${API_URL}/api/become-passenger/user-by-request/${requestId}`);
      return res.data.userId;
    } catch (e) {
      console.error('Error fetching passenger userId:', e);
      return null;
    }
  };

  const fetchUserDetails = async (uid) => {
    try {
      const res = await axios.get(`${API_URL}/api/become-passenger/user-by-id/${uid}`);

      return res.data;
    } catch (e) {
      console.error('Error fetching user details:', e);
      return null;
    }
  };

  const handleChatPress = async (requestId) => {
    try {
      setLoading(true);

      // Use getPassengerUserIdFromRequest instead of fetchPassengerUserId
      const passengerData = await getPassengerUserIdFromRequest(requestId);

      if (!passengerData || !passengerData.userId || !passengerData.username) {
        ToastAndroid.show('Passenger not found for this request', ToastAndroid.SHORT);
        return;
      }

      const driverDetails = await getUserById(userId);
      if (!driverDetails) {
        ToastAndroid.show('Could not load your driver info', ToastAndroid.SHORT);
        return;
      }

      navigation.navigate('ChatUI', {
        driverId, userId,
        chatRoomId: `chat_request_${requestId}`,
        currentUser: 'driver',
        currentUserId: userId,
        currentUserName: driverDetails.username,
        currentUserPhoto: driverDetails.photo_url,
        receiverUserId: passengerData.userId,
        receiverUserName: passengerData.username,
        receiverUserPhoto: passengerData.photo_url
      });

    } catch (err) {
      console.error('Error getting passenger userId:', err);
      if (err.response?.status === 404) {
        ToastAndroid.show('Chat not available until passenger accepts your offer', ToastAndroid.SHORT);
      } else {
        ToastAndroid.show('Something went wrong opening chat', ToastAndroid.SHORT);
      }
    } finally {
      setLoading(false);
    }
  };


  const deleteChatForRequest = async (requestId) => {
    const chatRoomId = `chat_request_${requestId}`;
    const q = collection(db, chatRoomId);
    const snapshot = await getDocs(q);
    snapshot.forEach((doc) => {
      deleteDoc(doc.ref);
    });
  };


  const handleAccept = async (requestId) => {
    Alert.alert(
      "Confirm Acceptance",
      "Are you sure you want to accept this request?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Accept",
          onPress: async () => {
            try {
              // First get passenger details before accepting
              const passengerData = await getPassengerUserIdFromRequest(requestId);
              const acceptRes = await axios.post(`${API_URL}/api/driver/carpool/accept-request`, {
                requestId,
                driverId
              });

              if (acceptRes.data.success) {
                ToastAndroid.show('Request Accepted', ToastAndroid.SHORT);
                // ✅ Save in backend DB (Notification table)
                await axios.post(`${API_URL}/api/save-notification`, {
                  userId,
                  type: 'Carpool Request Accepted',
                  message: `Accepted Carpool Request for ${passengerData?.username || 'Passenger'}`
                });

                // ✅ Only call once
                try {
                  console.log('Sending notification for request:', requestId); // Debug log
                  const notifRes = await axios.post(`${API_URL}/api/notification/send-to-passenger`, {
                    requestId
                  });
                  console.log('Notification response:', notifRes.data); // Debug log
                } catch (notifError) {
                  console.error('Notification failed (non-critical):', notifError);
                }

                fetchRequests();
              } else {
                throw new Error('Failed to update request');
              }
            } catch (error) {
              console.error('Error accepting request:', error);
              ToastAndroid.show('Failed to accept request', ToastAndroid.SHORT);
            }
          }
        }
      ],
      { cancelable: true }
    );
  };

  const handleReject = async (requestId) => {
    Alert.alert(
      "Confirm Rejection",
      "Are you sure you want to reject this request?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Reject",
          style: "destructive",
          onPress: async () => {
            try {
              const rejectRes = await axios.post(`${API_URL}/api/driver/carpool/reject-request`, {
                requestId,
                driverId
              });

              if (rejectRes.data.success) {
                ToastAndroid.show('Request Rejected', ToastAndroid.SHORT);
                fetchRequests();
              } else {
                throw new Error('Failed to update request');
              }
            } catch (error) {
              console.error('Error rejecting request:', error);
              ToastAndroid.show('Failed to reject request', ToastAndroid.SHORT);
            }
          }
        }
      ],
      { cancelable: true }
    );
  };

  const handleEndCarpool = (requestId) => {
    Alert.alert(
      "End Carpool",
      "Are you sure you want to end this carpool?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "End", style: "destructive",
          onPress: async () => {
            try {
              const res = await axios.post(`${API_URL}/api/driver/carpool/end-carpool`, {
                requestId,
                driverId
              });

              if (res.data.success) {
                ToastAndroid.show('Carpool ended successfully', ToastAndroid.SHORT);
                fetchRequests(); // Refresh list
              } else {
                ToastAndroid.show('Failed to end carpool', ToastAndroid.SHORT);
              }
            } catch (err) {
              console.error('Error ending carpool:', err);
              ToastAndroid.show('Error occurred while ending carpool', ToastAndroid.SHORT);
            }
          }
        }
      ]
    );
  };

  useEffect(() => {
    const registerNotifications = async () => {
      try {
        if (userId) {
          console.log("Registering push notifications for user:", userId);
          await registerForPushNotificationsAsync(userId);
        }
      } catch (error) {
        console.error("Push notification registration error:", error);
      }
    };

    registerNotifications();

    if (driverId) {
      fetchRequests();
    }
  }, [userId, driverId]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const [
        matchedRes,
        pendingRes,
        acceptedRes,
        rejectedRes,
        upcomingRes,
        completedRes
      ] = await Promise.all([
        axios.get(`${API_URL}/api/driver/carpool/matched-requests-all/${driverId}`),
        axios.get(`${API_URL}/api/driver/carpool/all-pending-requests`),
        axios.get(`${API_URL}/api/driver/carpool/accepted-requests/${driverId}`),
        axios.get(`${API_URL}/api/driver/carpool/rejected-requests/${driverId}`),
        axios.get(`${API_URL}/api/driver/carpool/upcoming-requests/${driverId}`),
        axios.get(`${API_URL}/api/driver/carpool/completed-requests/${driverId}`)
      ]);
      // Function to add passenger names to requests
      const addPassengerNames = async (requests) => {
        if (!requests || requests.length === 0) return requests;

        const requestsWithNames = await Promise.all(
          requests.map(async (request) => {
            try {
              const passengerData = await getPassengerUserIdFromRequest(request.RequestID);
              return {
                ...request,
                passengerName: passengerData?.username || "Passenger"
              };
            } catch (error) {
              console.error('Error fetching passenger name:', error);
              return {
                ...request,
                passengerName: "Passenger"
              };
            }
          })
        );
        return requestsWithNames;
      };

      // Process all request types in parallel
      const [
        matchedWithNames,
        pendingWithNames,
        acceptedWithNames,
        rejectedWithNames,
        upcomingWithNames,
        completedWithNames
      ] = await Promise.all([
        addPassengerNames(matchedRes.data?.matched),
        addPassengerNames(pendingRes.data?.allPending),
        addPassengerNames(acceptedRes.data?.accepted),
        addPassengerNames(rejectedRes.data?.rejected),
        addPassengerNames(upcomingRes.data?.upcoming),
        addPassengerNames(completedRes.data?.completed)
      ]);

      // Update state with enriched data
      setMatchedRequests(matchedWithNames || []);
      setAllPendingRequests(pendingWithNames || []);
      setAcceptedRequests(acceptedWithNames || []);
      setRejectedRequests(rejectedWithNames || []);
      setUpcomingRequests(upcomingWithNames || []);
      setCompletedRequests(completedWithNames || []);


    } catch (e) {
      console.error('Error fetching requests:', e);
      ToastAndroid.show('Failed to load requests', ToastAndroid.SHORT);
    } finally {
      setLoading(false);
    }
  };

  const renderTab = (tabName) => (
    <TouchableOpacity
      style={[styles.tabButton, activeTab === tabName && styles.activeTab]}
      onPress={() => setActiveTab(tabName)}
    >
      <Text style={[styles.tabText, activeTab === tabName && styles.activeTabText]}
        allowFontScaling={false}       // prevents Samsung large text scaling
        adjustsFontSizeToFit           // auto-resizes text if needed
        minimumFontScale={0.8}         // won’t shrink below 80%
        numberOfLines={1} >
        {tabName}
      </Text>
    </TouchableOpacity>
  );


  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB'); // DD-MM-YYYY
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


  const renderRequestCard = (item, key, isMatched = false, tabContext = 'Requests') => {

    const formattedStartDate = formatDate(item.date);
        const formattedEndDate = item.end_date ? formatDate(item.date) : null;
    const pickupTime = formatTime(item.pickup_time);
    const dropoffTime = formatTime(item.dropoff_time);
    const routeType = (item.route_type || '').toLowerCase(); // "one way" or "two way"


    const specialReq = item.special_requests;
    const luggage = item.allows_luggage;
    const preferences = [
      { label: 'Smoking', value: item.smoking_preference },
      { label: 'Music', value: item.music_preference },
      { label: 'Conversation', value: item.conversation_preference },
    ].filter(pref => pref.value && pref.value !== 'no-preference');

    const renderStatusBadge = (status) => {
      let backgroundColor = '#999';
      let label = status?.toUpperCase();

      switch (status) {
        case 'accepted':
          backgroundColor = '#4CAF50';
          break;
        case 'joined':
          backgroundColor = '#4CAF50';
          break;
        case 'pending':
          backgroundColor = isMatched ? '#17A2B8' : '#FFC107';
          label = isMatched ? 'REQUESTED' : 'PENDING';
          break;
        case 'rejected':
          backgroundColor = '#e00f00ff';
          break;
        case 'completed':
          backgroundColor = '#6c757d';
          break;
      }

      return (
        <View style={[styles.badge, { backgroundColor }]}>
          <Text style={styles.badgeText}>{label}</Text>
        </View>
      );
    };

    const dayAbbreviations = {
      Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu',
      Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun'
    };

    const renderRecurringDays = (days) => {
      if (!days) return null;
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
      <View style={styles.card} key={key}>
        {/* Header */}
       <View style={styles.statusRow}>
             {renderStatusBadge(item.status)}
           </View>
       
           {/* Second Row: Dates */}
           <View style={styles.dateRow}>
             <View style={styles.dateContainer}>
               <Text style={styles.dateLabel}>From:</Text>
               <Text style={styles.dateValue}>{formattedStartDate}</Text>
             </View>
             {formattedEndDate && (
               <View style={styles.dateContainer}>
                 <Text style={styles.dateLabel}>To:</Text>
                 <Text style={styles.dateValue}>{formattedEndDate}</Text>
               </View>
             )}
           </View>

        {/* Pickup */}
        <View style={styles.routeRow}>
          <View style={styles.routeDot} />
          <Text style={styles.locationText}>
            <Text style={styles.locationLabel}>Pickup: </Text>{item.pickup_location}
          </Text>
          <Text style={styles.timeText}>{pickupTime}</Text>
        </View>

        {/* Route Type */}
        <View style={{ alignItems: 'flex-start', marginVertical: 4 }}>
          <Ionicons
            name={routeType === 'two way' ? 'swap-vertical' : 'arrow-down'}
            size={20}
            color={BlackColor}
          />
        </View>

        {/* Dropoff */}
        <View style={styles.routeRow}>
          <View style={[styles.routeDot, { backgroundColor: primaryColor }]} />
          <Text style={styles.locationText}>
            <Text style={styles.locationLabel}>Dropoff: </Text>{item.dropoff_location}
          </Text>
          {dropoffTime && <Text style={styles.timeText}>{dropoffTime}</Text>}
        </View>

        {/* Recurring Days */}
        {renderRecurringDays(item.recurring_days)}

        {/* Passenger Info */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
          <Text style={{ fontWeight: '400', color: '#555' }}>
            Passengers:{" "}
            <Text style={{ fontWeight: '600', color: darkGrey, fontSize: 18 }}>
              {item.seats}
              <Ionicons name="woman" size={20} color={primaryColor} style={{ marginLeft: 4 }} />
            </Text>
            {item.passengerName && (
              <Text style={{ marginLeft: 8, color: darkGrey }}>
                ({item.passengerName})
              </Text>
            )}
          </Text>
        </View>

        {/* Preferences */}
        {preferences.length > 0 && (
          <View style={styles.preferenceContainer}>
            {preferences.map((pref, index) => {
              let IconComponent = Ionicons;
              let iconName = 'options-outline';

              if (pref.label === 'Smoking') {
                IconComponent = MaterialIcons;
                iconName = 'smoking-rooms';
              } else if (pref.label === 'Music') {
                iconName = 'musical-notes-outline';
              } else if (pref.label === 'Conversation') {
                iconName = 'chatbubble-ellipses-outline';
              }

              return (
                <View key={index} style={styles.preferenceRow}>
                  <IconComponent
                    name={iconName}
                    size={18}
                    color={primaryColor}
                    style={styles.preferenceIcon}
                  />
                  <Text style={styles.preferenceLabel}>{pref.label}:</Text>
                  <Text style={styles.preferenceValue}>{pref.value}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Luggage */}
        {luggage && (
          <View style={{ marginTop: 6 }}>
            <Text style={{ color: '#555' }}>
              <Text style={{ fontWeight: '600' }}>Allow Luggage:</Text> Yes
            </Text>
          </View>
        )}

        {/* Special Requirements */}
        {specialReq && (
          <View style={{ marginTop: 4 }}>
            <Text style={{ color: '#555' }}>
              <Text style={{ fontWeight: '600' }}>Special Requirements:</Text> {specialReq}
            </Text>
          </View>
        )}

        {/* Fare */}
        <View style={styles.cardFooter}>
          <View style={styles.actionRow}>
  <Text style={styles.actionButtonText}>
    Fare (per day): {item.fare || 'N/A'}
  </Text>
</View>
        </View>

        {/* Chat Button only if accepted or joined */}
        {(item.status === 'accepted' || item.status === 'joined') && (
          <TouchableOpacity
            style={{
              marginTop: 10, padding: 4, paddingRight: 10, borderRadius: 10, alignSelf: 'flex-end',
              flexDirection: 'row', alignItems: 'center', elevation: 6, shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, backgroundColor: '#D64584'
            }}
            onPress={() => handleChatPress(item.RequestID)}
          >
            <Ionicons name="chatbubble-ellipses-sharp" size={20} color='#ffffff' />
            <Text style={{ color: '#ffffff', marginLeft: 6, fontWeight: 600 }}>Chat</Text>
          </TouchableOpacity>
        )}

        {/* Tab-specific buttons */}
        {tabContext === 'Requests' && (
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionButton} onPress={() => handleAccept(item.RequestID)}>
              <Text style={styles.acceptButtonText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => handleReject(item.RequestID)}
            >
              <Text style={styles.rejectButtonText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}

        {tabContext === 'Accepted' && (
          <View style={styles.actionsRow}>
            {/* Disabled Waiting Button */}
            <TouchableOpacity style={[styles.actionButton, styles.waitingButton]} disabled>
              <Text
                style={styles.waitingButtonText}
                numberOfLines={1}
                ellipsizeMode="tail"
              >Awaiting Passenger</Text>
            </TouchableOpacity>

            {/* Active Reject Button 
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => handleReject(item.RequestID)}
          >
            <Text style={styles.rejectButtonText}>Reject</Text>
          </TouchableOpacity>*/}
          </View>
        )}

        {tabContext === 'Upcoming' && (
          <View style={styles.actionsRow}>


            <TouchableOpacity
              style={[styles.actionButton, {
                borderColor: '#D64584', borderWidth: 1, backgroundColor: '#fafafaff', elevation: 4, // for Android
                shadowColor: '#000', // for iOS
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
              }]}
              onPress={() => handleEndCarpool(item.RequestID)}
            >
              <Text style={{ color: '#D64584', fontWeight: 'bold' }}>End Carpool</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderRequests = () => {
    if (loading) {
      return <ActivityIndicator size="large" color={primaryColor} style={{ marginTop: 50 }} />;
    }

    const matchedIds = new Set(matchedRequests.map(req => String(req.RequestID)));
    const filteredPending = allPendingRequests.filter(
      req => !matchedIds.has(String(req.RequestID))
    );

    return (
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Matched Requests */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Ionicons name="checkmark-circle-outline" size={20} color={primaryColor} />
            <Text style={styles.sectionHeaderText}>
              Matched Requests ({matchedRequests.length})
            </Text>
          </View>
          {matchedRequests.length === 0 ? (
            <Text style={styles.emptyText}>No matching requests found.</Text>
          ) : (
            matchedRequests.map((req) => renderRequestCard(req, req.RequestID, true))
          )}
        </View>

        {/* Pending Requests */}
        {!showMatchedOnly && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Ionicons name="time-outline" size={20} color="#FF8C00" />
              <Text style={styles.sectionHeaderText}>
                Pending Requests ({filteredPending.length})
              </Text>
            </View>
            {filteredPending.length === 0 ? (
              <Text style={styles.emptyText}>No pending requests.</Text>
            ) : (
              filteredPending.map((req) => renderRequestCard(req, req.RequestID, false))
            )}
          </View>
        )}
      </ScrollView>
    );
  };

  const renderAcceptedRequests = () => {
    if (loading) {
      return <ActivityIndicator size="large" color={primaryColor} style={{ marginTop: 50 }} />;
    }

    return (
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Ionicons name="checkmark-done-circle-outline" size={20} color="#28a745" />
            <Text style={styles.sectionHeaderText}>Accepted Requests ({acceptedRequests.length})</Text>
          </View>
          {acceptedRequests.length === 0 ? (
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
              />              <Text style={styles.emptyTitle}>No Acceptance Carpool rides</Text>
              <Text style={styles.emptySubtitle}>When you have Accepted Carpool rides, they'll appear here</Text>
            </View>          ) : (
            acceptedRequests.map((req) => renderRequestCard(req, req.RequestID, true, 'Accepted'))
          )}
        </View>
      </ScrollView>
    );
  };

  const renderUpcomingRequests = () => {
    if (loading) {
      return <ActivityIndicator size="large" color={primaryColor} style={{ marginTop: 50 }} />;
    }

    return (
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar-outline" size={20} color="#007BFF" />
            <Text style={styles.sectionHeaderText}>
              Upcoming Rides ({upcomingRequests.length})
            </Text>
          </View>
          {upcomingRequests.length === 0 ? (
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
              />              <Text style={styles.emptyTitle}>No Upcoming Carpool rides</Text>
              <Text style={styles.emptySubtitle}>When you have Upcoming Carpool rides, they'll appear here</Text>
            </View>
          ) : (
            upcomingRequests.map((req) =>
              renderRequestCard(req, req.RequestID, false, 'Upcoming')
            )
          )}
        </View>
      </ScrollView>
    );
  };

  const renderRejectedRequests = () => {
    if (loading) {
      return <ActivityIndicator size="large" color={primaryColor} style={{ marginTop: 50 }} />;
    }

    return (
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Ionicons name="close-circle-outline" size={20} color="#F44336" />
            <Text style={styles.sectionHeaderText}>
              Rejected Requests ({rejectedRequests.length})
            </Text>
          </View>
          {rejectedRequests.length === 0 ? (
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
              />              <Text style={styles.emptyTitle}>No Rejected Carpool rides</Text>
              <Text style={styles.emptySubtitle}>When you have Rejected Carpool rides, they'll appear here</Text>
            </View>          ) : (
            rejectedRequests.map((req) =>
              renderRequestCard(req, req.RequestID, false, 'Rejected')
            )
          )}
        </View>
      </ScrollView>
    );
  };

  const renderCompletedRequests = () => {
    if (loading) {
      return <ActivityIndicator size="large" color={primaryColor} style={{ marginTop: 50 }} />;
    }

    return (
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Ionicons name="checkmark-done-sharp" size={20} color="#6c757d" />
            <Text style={styles.sectionHeaderText}>
              Completed Rides ({completedRequests.length})
            </Text>
          </View>
          {completedRequests.length === 0 ? (
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
              />              <Text style={styles.emptyTitle}>No Completed Carpool rides</Text>
              <Text style={styles.emptySubtitle}>When you have Completed Carpool rides, they'll appear here</Text>
            </View>          ) : (
            completedRequests.map((req) =>
              renderRequestCard(req, req.RequestID, false, 'Completed')
            )
          )}
        </View>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={primaryColor} barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Carpools</Text>
        <LottieView
          source={require('../../assets/pinkCar.json')} // put your .json file in assets
          autoPlay
          loop
          style={{ width: 50, height: 50 }}
        />
      </View>
      <View style={styles.container}>
        <View style={styles.tabContainer}>
          {renderTab('Requests')}
          {renderTab('Accepted')}
          {renderTab('Upcoming')}
          {renderTab('Rejected')}
          {renderTab('Completed')}
        </View>

        {/* Filter Toggle - Only show for Requests tab */}
        {activeTab === 'Requests' && (
          <View style={styles.filterToggleContainer}>
            <TouchableOpacity
              style={[styles.filterToggleButton, !showMatchedOnly && styles.activeFilterButton]}
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setShowMatchedOnly(false);
              }}
            >
              <Text style={[styles.filterToggleText, !showMatchedOnly && styles.activeFilterText]}>
                Show All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterToggleButton, showMatchedOnly && styles.activeFilterButton]}
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setShowMatchedOnly(true);
              }}
            >
              <Text style={[styles.filterToggleText, showMatchedOnly && styles.activeFilterText]}>
                Matched Only
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'Requests'
          ? renderRequests()
          : activeTab === 'Accepted'
            ? renderAcceptedRequests()
            : activeTab === 'Upcoming'
              ? renderUpcomingRequests()
              : activeTab === 'Rejected'
                ? renderRejectedRequests()
                : activeTab === 'Completed'
                  ? renderCompletedRequests()
                  : null}

      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee'
  },
  headerTitle: { fontSize: 22, fontWeight: '600', color: darkGrey },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomColor: '#ccc',
    borderBottomWidth: 1,
    marginTop: 10,
    paddingHorizontal: 8, // Add some padding
  },
  tabButton: {
    flex: 1,                  // all 5 share row evenly
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    borderBottomColor: primaryColor,
    borderBottomWidth: 3,
  },
  tabText: {
    color: '#666',
    fontWeight: '500',
    fontSize: 12,
    includeFontPadding: false, // Android extra padding fix
    textAlign: 'center',
  },
  activeTabText: {
    color: primaryColor,
    fontWeight: 'bold',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    marginTop: 10,
    fontSize: 16,
    color: '#999',
  },
  filterToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 16,
    gap: 12
  },
  filterToggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#f9f9f9',
  },
  activeFilterButton: {
    backgroundColor: primaryColor,
    borderColor: primaryColor,
  },
  filterToggleText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeFilterText: {
    color: '#fff',
    fontWeight: '600',
  },
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
  sectionBox: {
    backgroundColor: '#fafafa',
    padding: 12,
    borderRadius: 10,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    backgroundColor: '#f2f2f2',
  },
  sectionContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    marginBottom: 20,
    marginTop: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#eee',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 6,
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: darkGrey,
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: darkGrey,
    marginBottom: 12,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginVertical: 8,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#eee'
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 12,
  },
  
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  
  dateContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  
  dateLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    marginBottom: 2,
  },
  
  dateValue: {
    fontSize: 14,
    color: '#000',
    fontWeight: '600',
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
    alignSelf: 'flex-start'
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
    color: '#666'
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16
  },
  actionRow: {
  flexDirection: 'row',
  justifyContent: 'flex-end', // pushes text to the right side
  alignItems: 'center',
  width: '100%',
  paddingHorizontal: 5,
},

actionButtonText: {
  fontWeight: '600',
  fontSize: 14,
  color: primaryColor,
},

  waitingButton: {
    backgroundColor: '#eeeeeeff',
    borderColor: '#D64584',
    borderWidth: 1,
  },
  waitingButtonText: {
    color: '#888',
  },
  rejectButton: {
    backgroundColor: '#FF4D4D',
  },
  rejectButtonText: {
    color: '#FFF',
  },
  dayCircle: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: primaryColor,
    borderRadius: 20, paddingVertical: 6, paddingHorizontal: 6,
    marginRight: 6,
    marginTop: 4,
    shadowColor: primaryColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 6,
  },
  dayText: {
    color: primaryColor, fontSize: 10
  },
  preferenceContainer: {
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#ffffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  preferenceIcon: {
    marginRight: 6,
  },
  preferenceLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#444',
    marginRight: 4,
  },
  preferenceValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
    flexShrink: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  actionButton: {
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
});
export default DriverCarpoolStatusScreen;