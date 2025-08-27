import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet,
  ScrollView, TouchableOpacity, KeyboardAvoidingView,
  Platform, Switch, Alert
} from 'react-native';
import Constants from 'expo-constants';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import { ActivityIndicator } from 'react-native';
import { CARPOOL_PRICE_PARAMS } from './Carpool';
import { useNavigation, useRoute } from '@react-navigation/native';
import { saveCarpoolProfile, API_URL, saveCarpoolRequest, updateCarpoolRequest } from '../../api';
import axios from 'axios';

const primaryColor = '#D64584';
const lightGrey = '#E0E0E0';

const CarpoolProfile = () => {
  const navigation = useNavigation();
  const route = useRoute();
  let {
    userId,
    passengerId,
    profileId,
    pickupLocation,
    dropoffLocation,
    distanceKm,
    isEditing,
    requestId
  } = route.params;

  // Ensure distance is a number (fix NaN issues)
  distanceKm = parseFloat(distanceKm) || 0;

  console.log("PassengerID on Carpool Profile:", passengerId);
  console.log("distance on Carpool Profile:", distanceKm);
  console.log("Editing mode:", isEditing, "Request ID:", requestId);

  const [saveProfile, setSaveProfile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fareDetails, setFareDetails] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [request, setRequest] = useState({
    pickup: '',
    dropoff: '',
    seatsNeeded: '1',
    date: new Date(),
    end_date: new Date(),
    time: new Date(),
    smoking: 'no-preference',
    music: 'no-preference',
    conversation: 'no-preference',
    luggage: false,
    recurring: false,
    daysOfWeek: [],
    specialRequests: '',
  });

  const [expandedPreferences, setExpandedPreferences] = useState(false);
  const [routeType, setRouteType] = useState('Two Way');
  const [pickupTime, setPickupTime] = useState(new Date());
  const [dropOffTime, setDropOffTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [activeDatePickerFor, setActiveDatePickerFor] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeTimePickerFor, setActiveTimePickerFor] = useState(null);
  const [showAndroidPicker, setShowAndroidPicker] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Initialize with saved profile or existing request
  useEffect(() => {
    const initializeForm = async () => {
      // If we're editing an existing request, fetch its data
      if (isEditing && requestId) {
        try {
          const res = await axios.get(`${API_URL}/api/carpool/get-carpool-request/${requestId}`);
          const requestData = res.data.data;

          console.log("Editing request data:", requestData);

          setRequest(prev => ({
            ...prev,
            pickup: requestData.pickup_location,
            dropoff: requestData.dropoff_location,
            seatsNeeded: requestData.seats.toString(),
            date: new Date(requestData.date),
            end_date: new Date(requestData.date),
            smoking: requestData.smoking_preference,
            music: requestData.music_preference,
            conversation: requestData.conversation_preference,
            luggage: requestData.allows_luggage,
            recurring: requestData.is_recurring,
            daysOfWeek: requestData.recurring_days?.split(',') || [],
            specialRequests: requestData.special_requests || '',
          }));

          setRouteType(requestData.route_type || 'One Way');
          setPickupTime(new Date(`1970-01-01T${requestData.pickup_time}`));
          if (requestData.route_type === 'Two Way' && requestData.dropoff_time) {
            setDropOffTime(new Date(`1970-01-01T${requestData.dropoff_time}`));
          }

          // Pre-calculate fare for the existing request
          setTimeout(calculateFare, 100);
        } catch (error) {
          console.error('Error fetching request:', error);
          Alert.alert("Error", "Failed to load request data");
        }
      }
      // If we're editing a profile
      else if (profileId) {
        try {
          const res = await axios.get(`${API_URL}/api/carpool/get-carpool-profile/${profileId}`);
          const profile = res.data.data;

          setRequest(prev => ({
            ...prev,
            pickup: profile.pickup_location,
            dropoff: profile.dropoff_location,
            seatsNeeded: profile.seats.toString(),
            date: new Date(profile.date),
            end_date: new Date(profile.date),
            smoking: profile.smoking_preference,
            music: profile.music_preference,
            conversation: profile.conversation_preference,
            luggage: profile.allows_luggage,
            recurring: profile.is_recurring,
            daysOfWeek: profile.recurring_days?.split(',') || [],
            specialRequests: profile.special_requests || '',
            fare: profile.fare || '',
            distance_km: distanceKm  // Add distance
          }));

          setRouteType(profile.route_type || 'One Way');
          setPickupTime(new Date(`1970-01-01T${profile.pickup_time}`));
          if (profile.route_type === 'Two Way' && profile.dropoff_time) {
            setDropOffTime(new Date(`1970-01-01T${profile.dropoff_time}`));
          }

          // Pre-calculate fare for the profile
          setTimeout(calculateFare, 100);
        } catch (error) {
          console.error('Error fetching profile:', error);
          Alert.alert("Error", "Failed to load profile data");
        }
      } else {
        // Initialize with default values first
        const defaultFormState = {
          pickup: '',
          dropoff: '',
          seatsNeeded: '1',
          date: new Date(),
          end_date: new Date(),
          time: new Date(),
          smoking: 'no-preference',
          music: 'no-preference',
          conversation: 'no-preference',
          luggage: false,
          recurring: false,
          daysOfWeek: [],
          specialRequests: ''
        };

        // Merge with any incoming form state
        const incomingState = route.params?.formState || {};

        setRequest(prev => ({
          ...defaultFormState,
          ...prev,
          ...incomingState,
          // Always override pickup and dropoff from params if they exist
          pickup: pickupLocation || incomingState.pickup || prev.pickup,
          dropoff: dropoffLocation || incomingState.dropoff || prev.dropoff,
          // Ensure date is a Date object
          date: incomingState.date ? new Date(incomingState.date) : prev.date,
          end_date: incomingState.date ? new Date(incomingState.end_date) : prev.end_date
        }));

        // Calculate fare for new request
        setTimeout(calculateFare, 100);
      }

      setIsInitialized(true);
    };

    if (!isInitialized) {
      initializeForm();
    }
  }, [pickupLocation, dropoffLocation, profileId, isInitialized, route.params?.formState, isEditing, requestId]);

  // Calculate fare whenever seats, time, route type, distance, OR selected days change
useEffect(() => {
  calculateFare();
}, [request.seatsNeeded, pickupTime, dropOffTime, routeType, distanceKm, request.daysOfWeek, request.date, request.end_date, request.recurring]);
 const calculateFare = () => {
  setIsCalculating(true);

  const dist = Number(distanceKm);
  if (isNaN(dist) || dist <= 0) {
    Alert.alert('Error', 'Invalid distance');
    setIsCalculating(false);
    return;
  }

  const seats = parseInt(request?.seatsNeeded) || 1;
  if (isNaN(seats) || seats <= 0) {
    Alert.alert('Error', 'Invalid seat count');
    setIsCalculating(false);
    return;
  }

  const {
    FUEL_PRICE_PER_LITER,
    AVERAGE_MILEAGE,
    DRIVER_PROFIT_MARGIN,
    APP_COMMISSION,
    PEAK_HOUR_SURCHARGE,
    PEAK_HOURS,
    BASE_COST_PER_KM,
    MINIMUM_FARE
  } = CARPOOL_PRICE_PARAMS;

  const getFareForTime = (rideTime) => {
    const hour = rideTime.getHours();
    const isPeakHour = PEAK_HOURS.some(h => hour >= h && hour < h + 2);

    // Fuel & Surcharge
    let baseFuelCost = (dist / AVERAGE_MILEAGE) * FUEL_PRICE_PER_LITER;
    const peakSurcharge = isPeakHour ? baseFuelCost * PEAK_HOUR_SURCHARGE : 0;
    const totalFuelCost = baseFuelCost + peakSurcharge;

    const sharedFuelPerSeat = totalFuelCost / 3;
    const maintenancePerSeat = dist * BASE_COST_PER_KM;
    const baseCostPerSeat = sharedFuelPerSeat + maintenancePerSeat;

    const driverProfitPerSeat = baseCostPerSeat * DRIVER_PROFIT_MARGIN;
    const appCommissionPerSeat = (baseCostPerSeat + driverProfitPerSeat) * APP_COMMISSION;

    let finalFarePerSeat = baseCostPerSeat + driverProfitPerSeat + appCommissionPerSeat;
    finalFarePerSeat = Math.max(finalFarePerSeat, MINIMUM_FARE);

    const totalFare = finalFarePerSeat * seats;
    const totalDriverEarnings = (baseCostPerSeat + driverProfitPerSeat) * seats;
    const totalAppCommission = appCommissionPerSeat * seats;

    return {
      isPeakHour,
      baseFuelCost,
      peakSurcharge,
      totalFuelCost,
      sharedFuelPerSeat,
      maintenancePerSeat,
      baseCostPerSeat,
      driverProfitPerSeat,
      appCommissionPerSeat,
      finalFarePerSeat,
      totalFare,
      totalDriverEarnings,
      totalAppCommission
    };
  };

  const pickupFare = getFareForTime(pickupTime);
  const dropoffFare = routeType === 'Two Way' ? getFareForTime(dropOffTime) : null;

  const totalFarePerDay = pickupFare.totalFare + (dropoffFare?.totalFare || 0);
  const totalAppCommissionPerDay = pickupFare.totalAppCommission + (dropoffFare?.totalAppCommission || 0);
  const totalDriverEarningsPerDay = pickupFare.totalDriverEarnings + (dropoffFare?.totalDriverEarnings || 0);
  
  // For display: set finalFare as combined per seat fare (per day, per person)
  const finalFarePerSeatPerDay = pickupFare.finalFarePerSeat + (dropoffFare?.finalFarePerSeat || 0);

  // Calculate the number of valid days in the date range
 const countValidDays = () => {
  const start = new Date(request.date);
  const end = new Date(request.end_date);
  
  // Reset time components to avoid timezone issues
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  let count = 0;
  let current = new Date(start);
  
  // If not recurring, count all days in the range (inclusive)
  if (!request.recurring) {
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end
    return diffDays;
  }
  
  // If recurring but no days selected, return 0
  if (request.recurring && (!request.daysOfWeek || request.daysOfWeek.length === 0)) {
    return 0;
  }
  
  // If recurring, count only selected days
  const selectedDays = request.daysOfWeek.map(d => d.toLowerCase());
  
  while (current <= end) {
    const weekday = current.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    if (selectedDays.includes(weekday)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
};

  const matchedDays = countValidDays();
  const fullRangeDays = Math.floor((request.end_date - request.date) / (1000 * 60 * 60 * 24)) + 1;

  // Per person for whole duration
  const totalFarePerPerson = finalFarePerSeatPerDay * matchedDays;

  // For all seats
  const totalFareWithDays = totalFarePerPerson * seats;

  setFareDetails({
    farePerDay: Math.round(finalFarePerSeatPerDay),       // per seat/day
    returnFare: dropoffFare ? Math.round(dropoffFare.finalFarePerSeat) : null,
    totalFare: Math.round(totalFareWithDays),            // total for N days × seats
    totalDays: matchedDays,                              // number of matched days
    fullRangeDays,                                       // total days in range
    totalFarePerPerson: Math.round(totalFarePerPerson),  // total per person
    driverEarnings: Math.round(totalDriverEarningsPerDay * matchedDays),
    appCommission: Math.round(totalAppCommissionPerDay * matchedDays),
    breakdown: {
      seats,
      pickup: {
        isPeakHour: pickupFare.isPeakHour,
        baseFuelCost: Math.round(pickupFare.baseFuelCost),
        peakSurcharge: Math.round(pickupFare.peakSurcharge),
        sharedFuelPerSeat: Math.round(pickupFare.sharedFuelPerSeat),
        maintenancePerSeat: Math.round(pickupFare.maintenancePerSeat),
        baseCostPerSeat: Math.round(pickupFare.baseCostPerSeat),
        driverProfitPerSeat: Math.round(pickupFare.driverProfitPerSeat),
        appCommissionPerSeat: Math.round(pickupFare.appCommissionPerSeat),
        finalFarePerSeat: Math.round(pickupFare.finalFarePerSeat)
      },
      dropoff: dropoffFare && {
        isPeakHour: dropoffFare.isPeakHour,
        baseFuelCost: Math.round(dropoffFare.baseFuelCost),
        peakSurcharge: Math.round(dropoffFare.peakSurcharge),
        sharedFuelPerSeat: Math.round(dropoffFare.sharedFuelPerSeat),
        maintenancePerSeat: Math.round(dropoffFare.maintenancePerSeat),
        baseCostPerSeat: Math.round(dropoffFare.baseCostPerSeat),
        driverProfitPerSeat: Math.round(dropoffFare.driverProfitPerSeat),
        appCommissionPerSeat: Math.round(dropoffFare.appCommissionPerSeat),
        finalFarePerSeat: Math.round(dropoffFare.finalFarePerSeat)
      }
    }
  });

  setIsCalculating(false);
};

  const handleTimeChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowAndroidPicker(false);
      if (event.type === 'set' && selectedDate) {
        updateTime(selectedDate);
      }
    } else {
      setShowTimePicker(false);
      if (selectedDate) {
        updateTime(selectedDate);
      }
    }
  };

  const updateTime = (selectedDate) => {
    if (activeTimePickerFor === 'pickup') {
      setPickupTime(selectedDate);
      setRequest(prev => ({ ...prev, time: selectedDate }));  // ✅ Sync
    } else if (activeTimePickerFor === 'dropoff') {
      setDropOffTime(selectedDate);
    }
  };
  const showPicker = (forWhat) => {
    if (forWhat === 'dropoff' && routeType !== 'Two Way') return;
    setActiveTimePickerFor(forWhat);

    if (Platform.OS === 'android') {
      setShowAndroidPicker(true);
    } else {
      setShowTimePicker(true);
    }
  };

  const formatTime = (date) => {
    if (!date) return 'Select Time';
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const formattedMinutes = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${formattedMinutes} ${ampm}`;
  };

  const toggleDaySelection = (day) => {
    setRequest(prev => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter(d => d !== day)
        : [...prev.daysOfWeek, day]
    }));
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      if (activeDatePickerFor === 'start') {
        setRequest({ ...request, date: selectedDate });
      } else if (activeDatePickerFor === 'end') {
        setRequest({ ...request, end_date: selectedDate });
      }
    }
  };

  const showDatePickerModal = (forWhat) => {
    setActiveDatePickerFor(forWhat);
    setShowDatePicker(true);
  };

  const formatDateForDB = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const formatTimeForDB = (date) => {
    if (!date) return null;
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}:00`;
  };

  const submitRequest = async () => {
    if (isSubmitting) return;
    if (!fareDetails) {
      Alert.alert('Error', 'Fare calculation in progress');
      return;
    }
    const { pickup, dropoff, seatsNeeded, date, recurring, daysOfWeek } = request;
    if (!pickup || !dropoff || !seatsNeeded || !date) {
      Alert.alert("Error", "Please complete all required fields.");
      return;
    }

    // ✅ New validation: If recurring ride but no day selected
    console.log("Recurring:", request.recurring, "Days selected:", request.daysOfWeek);

    // Validate recurring rides - use the destructured 'recurring' variable
    if (recurring) {
      if (!daysOfWeek || !Array.isArray(daysOfWeek) || daysOfWeek.length === 0) {
        Alert.alert("Error", "Please select at least one day for a recurring ride.");
        return;
      }
    } else {
      // If recurring is off, ensure daysOfWeek is empty
      setRequest(prev => ({ ...prev, daysOfWeek: [] }));
    }

    // Validate that endDate is not before start date
    if (request.end_date <= request.date) {
      Alert.alert("Error", "End date cannot be before or equal start date.");
      return;
    }
    setIsSubmitting(true);

    try {
      // Prepare common payload
      const ridePayload = {
        pickup_location: pickup,
        dropoff_location: dropoff,
        seats: parseInt(seatsNeeded),
        date: formatDateForDB(request.date),
        end_date: formatDateForDB(request.end_date),
        pickup_time: formatTimeForDB(pickupTime),
        dropoff_time: routeType === 'Two Way' ? formatTimeForDB(dropOffTime) : null,
        smoking_preference: request.smoking,
        music_preference: request.music,
        conversation_preference: request.conversation,
        allows_luggage: request.luggage,
        is_recurring: request.recurring,
        recurring_days: request.recurring ? request.daysOfWeek.join(',') : null,
        special_requests: request.specialRequests || null,
        route_type: routeType,
        fare: fareDetails.totalFare,
        distance_km: distanceKm  // Add distance
      };

      let carpool_profile_id = null;

      // If we're editing an existing request
      if (isEditing && requestId) {
        // Update the existing request
        const updatePayload = {
          RequestID: requestId,
          ...ridePayload
        };

        const response = await updateCarpoolRequest(updatePayload);
        if (response && response.data && response.data.success) {
          Alert.alert("Success", "Request updated successfully!");

          // Navigate back or to status screen
          navigation.navigate('CarpoolStatusScreen', {
            userId,
            passengerId,
            fareDetails,
            isUpdated: true
          });
        } else {
          throw new Error(response?.data?.error || "Failed to update request");
        }
      }
      // If we're creating a new request
      else {
        if (saveProfile) {
          const profilePayload = {
            UserID: userId,
            ...ridePayload,
            distance_km: distanceKm  // Add distance
          };

          const response = await saveCarpoolProfile(profilePayload);
          if (response && response.data && response.data.data) {
            carpool_profile_id = response.data.data.carpool_profile_id;
            Alert.alert("Success", "Profile saved successfully!");
          }
        }
        let RequestID = null;

        // Always create carpool status
        const statusPayload = {
          PassengerID: passengerId,
          carpool_profile_id: carpool_profile_id || null,
          ...ridePayload,
        };

        const response = await saveCarpoolRequest(statusPayload);
        if (response && response.data && response.data.data) {
          RequestID = response.data.data.RequestID;
        }
        console.log("Ride Request ID:", RequestID);

        // Navigate to status screen
        navigation.navigate('CarpoolStatusScreen', { userId, passengerId, fareDetails });
      }
    } catch (error) {
      console.error('Error saving profile or creating/updating request:', error);
      Alert.alert(
        "Error",
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        "Failed to process carpool request."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#d63384" barStyle="light-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              // Convert Date objects to ISO strings for serialization
              const serializableState = {
                ...request,
                date: formatDateForDB(request.date),
                end_date: formatDateForDB(request.end_date),
                time: request.time.toISOString()
              };

              navigation.navigate('Carpool', {
                pickupLocation: request.pickup,
                dropoffLocation: request.dropoff,
                formState: serializableState
              });
            }}
          >
            <Ionicons name="arrow-back" size={24} color="#070707ff" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            {isEditing && requestId ? 'Edit Carpool Request' :
              profileId ? 'Edit Carpool Profile' : 'Create Carpool Profile'}
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.contentContainer}>
          {/* Route Type Toggle */}
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                routeType === 'One Way' && styles.toggleButtonActiveLeft,
              ]}
              onPress={() => setRouteType('One Way')}
            >
              <Text
                style={[
                  styles.toggleButtonText,
                  routeType === 'One Way' && styles.toggleButtonTextActive,
                ]}
              >
                One Way
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                styles.toggleButtonRight,
                routeType === 'Two Way' && styles.toggleButtonActiveRight,
              ]}
              onPress={() => setRouteType('Two Way')}
            >
              <Text
                style={[
                  styles.toggleButtonText,
                  routeType === 'Two Way' && styles.toggleButtonTextActive,
                ]}
              >
                Two Way
              </Text>
            </TouchableOpacity>
          </View>


          {/* Location Card */}
          <View style={styles.locationCard}>
            <View style={styles.locationRow}>
              <FontAwesome5 name="dot-circle" size={20} color={primaryColor} />
              <TextInput
                style={styles.locationInput}
                value={request.pickup}
                onChangeText={(text) => setRequest({ ...request, pickup: text })}
                placeholder="Pickup location"
                editable={false}
                selectTextOnFocus={false}
                multiline={true}
                numberOfLines={2}
                textAlignVertical="top"
              />
              <TouchableOpacity onPress={() => showPicker('pickup')}>
                <Text style={styles.timeText}>{formatTime(pickupTime)}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.directionArrowContainer}>
              {routeType === 'Two Way' ? (
                <Ionicons name="swap-vertical" size={20} color={"#000000"} style={{ marginRight: 300 }} />
              ) : (
                <Ionicons name="arrow-down" size={20} color={"#000000"} style={{ marginRight: 300 }} />
              )}
            </View>

            <View style={styles.locationRow}>
              <FontAwesome5 name="map-marker-alt" size={20} color={primaryColor} />
              <TextInput
                style={styles.locationInput}
                value={request.dropoff}
                onChangeText={(text) => setRequest({ ...request, dropoff: text })}
                placeholder="Dropoff location"
                editable={false}
                selectTextOnFocus={false}
                multiline={true}
                numberOfLines={2}
                textAlignVertical="top"
              />
              {routeType === 'Two Way' ? (
                <TouchableOpacity onPress={() => showPicker('dropoff')}>
                  <Text style={styles.timeText}>{formatTime(dropOffTime)}</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.timeTextInactive}>  </Text>
              )}
            </View>
            <Text style={styles.distanceText}>
              Distance: {isNaN(distanceKm) ? 'N/A' : distanceKm.toFixed(1)} km
            </Text>
          </View>

          {/* Time Pickers */}
          <DateTimePickerModal
            isVisible={showTimePicker}
            mode="time"
            onConfirm={(date) => handleTimeChange({ type: 'set' }, date)}
            onCancel={() => setShowTimePicker(false)}
            date={activeTimePickerFor === 'pickup' ? pickupTime : dropOffTime}
            buttonTextColorIOS={primaryColor}
            accentColor={primaryColor}
            themeVariant="light"
            customHeaderIOS={() => (
              <View style={{
                backgroundColor: primaryColor,
                padding: 15,
                borderTopLeftRadius: 10,
                borderTopRightRadius: 10
              }}>
                <Text style={{ color: 'white', fontSize: 48, fontWeight: 'bold' }}>
                  {activeTimePickerFor === 'pickup' ? 'Pick Pickup Time' : 'Pick Dropoff Time'}
                </Text>
              </View>
            )}
          />

          {Platform.OS === 'android' && showAndroidPicker && (
            <DateTimePicker
              value={activeTimePickerFor === 'pickup' ? pickupTime : dropOffTime}
              mode="time"
              display="spinner"
              onChange={handleTimeChange}
              textColor={primaryColor}
              themeVariant="light"
              style={styles.androidPicker}
            />
          )}

          {/* Seats Needed */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Seats Needed <Text style={{ color: "#c61a09" }}>*</Text>
            </Text>
            <View style={styles.pickerField}>
              <Picker
                selectedValue={request.seatsNeeded}
                onValueChange={(itemValue) => setRequest({ ...request, seatsNeeded: itemValue })}
                style={styles.picker}
                dropdownIconColor="#D64584"
              >
                {[1, 2, 3, 4].map((num) => (
                  <Picker.Item
                    key={num}
                    label={num.toString()}
                    value={num.toString()}
                    color="#050505"
                  />
                ))}
              </Picker>
            </View>
          </View>

          {/* Date - Start and End in one row */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
              <Text style={styles.label}>FROM</Text>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => showDatePickerModal('start')}
              >
                <Text>{request.date.toLocaleDateString()}</Text>
                <MaterialIcons name="calendar-today" size={20} color="#D64584" />
              </TouchableOpacity>
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
              <Text style={styles.label}>TO</Text>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => showDatePickerModal('end')}
              >
                <Text>{request.end_date.toLocaleDateString()}</Text>
                <MaterialIcons name="calendar-today" size={20} color="#D64584" />
              </TouchableOpacity>
            </View>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={activeDatePickerFor === 'start' ? request.date : request.end_date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              themeVariant="light"
              textColor="#D64584"
              accentColor="#D64584"
              style={styles.pickerStyle}
              positiveButton={{ label: 'OK', textColor: '#D64584' }}
              negativeButton={{ label: 'Cancel', textColor: '#D64584' }}
            />
          )}


          {/* Fare Breakdown */}
         {fareDetails && (
  <View style={styles.fareCard}>
    <Text style={styles.fareHeader}>Fare Summary</Text>

    <View style={styles.fareRow}>
      <Text>Distance:</Text>
      <Text>{distanceKm?.toFixed(1)} km</Text>
    </View>

    <View style={styles.fareRow}>
      <Text>Fare per Person (per day):</Text>
      <Text>{fareDetails.farePerDay} PKR</Text>
    </View>

    <View style={styles.fareRow}>
      <Text>FROM:</Text>
      <Text>{request.date.toLocaleDateString()} </Text>
    </View>
    <View style={styles.fareRow}>
      <Text>TO:</Text>
      <Text>{request.end_date.toLocaleDateString()}</Text>
    </View>

    {/*<View style={styles.fareRow}>
      <Text>Days in Range:</Text>
      <Text>{fareDetails.fullRangeDays}</Text>
    </View>*/}

    <View style={styles.fareRow}>
      <Text>Total of Days:</Text>
      <Text>{fareDetails.totalDays}</Text>
    </View>

    <View style={styles.fareRow}>
      <Text>Total Fare per Person:</Text>
      <Text>{fareDetails.totalFarePerPerson} PKR</Text>
    </View>

    <View style={[styles.fareRow, { marginTop: 6 }]}>
      <Text>Total Fare for {fareDetails.breakdown.seats} Seat(s):</Text>
      <Text>{fareDetails.totalFare} PKR</Text>
    </View>
  </View>
)}


          {/* Recurring */}
          <View style={styles.switchContainer}>
            <Text style={styles.label}>Recurring Ride</Text>
            <Switch
              value={request.recurring}
              onValueChange={(value) => setRequest({ ...request, recurring: value })}
              trackColor={{ false: "#767577", true: "#D64584" }}
              thumbColor={request.recurring ? "#fff" : "#f4f3f4"}
            />
          </View>

          {request.recurring && (
            <View style={styles.daysContainer}>
              <Text style={styles.smallLabel}>Select days:</Text>
              <View style={styles.daysRow}>
                {days.map(day => (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.dayButton,
                      request.daysOfWeek.includes(day) && styles.dayButtonSelected
                    ]}
                    onPress={() => toggleDaySelection(day)}
                  >
                    <Text style={[
                      styles.dayButtonText,
                      request.daysOfWeek.includes(day) && styles.dayButtonTextSelected
                    ]}>
                      {day.substring(0, 3)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Ride Preferences Toggle */}
          <TouchableOpacity
            style={styles.preferencesHeader}
            onPress={() => setExpandedPreferences(!expandedPreferences)}
          >
            <Text style={styles.preferencesHeaderText}>Ride Preferences</Text>
            <MaterialIcons
              name={expandedPreferences ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
              size={24}
              color="#555"
            />
          </TouchableOpacity>

          {expandedPreferences && (
            <>
              {/* Smoking Preference */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Smoking Preference</Text>
                <Picker
                  selectedValue={request.smoking}
                  onValueChange={(itemValue) => setRequest({ ...request, smoking: itemValue })}
                  style={styles.picker}
                  dropdownIconColor="#D64584"
                >
                  <Picker.Item label="No preference" value="no-preference" />
                  <Picker.Item label="Smoking Not Allowed" value="Smoking Not Allowed" />
                  <Picker.Item label="Smoking Allowed" value="Smoking Allowed" />
                </Picker>
              </View>

              {/* Music Preference */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Music Preference</Text>
                <Picker
                  selectedValue={request.music}
                  onValueChange={(itemValue) => setRequest({ ...request, music: itemValue })}
                  style={styles.picker}
                  dropdownIconColor="#D64584"
                >
                  <Picker.Item label="No preference" value="no-preference" />
                  <Picker.Item label="Quiet ride" value="Quiet ride" />
                  <Picker.Item label="Music OK" value="Music Ok!" />
                </Picker>
              </View>

              {/* Conversation Preference */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Conversation</Text>
                <Picker
                  selectedValue={request.conversation}
                  onValueChange={(itemValue) => setRequest({ ...request, conversation: itemValue })}
                  style={styles.picker}
                  dropdownIconColor="#D64584"
                >
                  <Picker.Item label="No preference" value="no-preference" />
                  <Picker.Item label="Quiet Ride" value="Quiet Ride" />
                  <Picker.Item label="Friendly Chat" value="Friendly Chat" />
                </Picker>
              </View>
            </>
          )}
          {/* Luggage */}
          <View style={styles.switchContainer}>
            <Text style={styles.label}>Have Luggage</Text>
            <Switch
              value={request.luggage}
              onValueChange={(value) => setRequest({ ...request, luggage: value })}
              trackColor={{ false: "#767577", true: "#D64584" }}
              thumbColor={request.luggage ? "#fff" : "#f4f3f4"}
            />
          </View>



          {/* Special Requests */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Special Requests</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              value={request.specialRequests}
              onChangeText={(text) => setRequest({ ...request, specialRequests: text })}
              placeholder="Any special requirements or notes for the driver"
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Save Profile - Only show for new requests, not when editing */}
          {!isEditing && (
            <View style={styles.switchContainer}>
              <Text style={styles.label}>Save Profile</Text>
              <Switch
                value={saveProfile}
                onValueChange={(value) => setSaveProfile(value)}
                trackColor={{ false: "#767577", true: "#D64584" }}
                thumbColor={saveProfile ? "#fff" : "#f4f3f4"}
              />
            </View>
          )}

        </ScrollView>

        {/* Submit Button */}
        <TouchableOpacity
          style={styles.submitButton}
          onPress={submitRequest}
          disabled={isSubmitting || isCalculating}
        >
          {isSubmitting || isCalculating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>
              {isEditing && requestId ? 'Update Request' : 'Confirm Booking'}
            </Text>
          )}
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  contentContainer: { padding: 20, paddingBottom: 40 },
  statusBar: {
    height: Constants.statusBarHeight,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 56,
    backgroundColor: '#F5F5F5',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 16,
    marginTop: -12,
    color: 'black',
  },
  toggleContainer: {
    flexDirection: 'row',
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 18,
    marginLeft: 64,
    marginRight: 64,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: lightGrey,
    backgroundColor: lightGrey,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  toggleButtonRight: {
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  toggleButtonActiveLeft: {
    backgroundColor: primaryColor,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  toggleButtonActiveRight: {
    backgroundColor: primaryColor,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  toggleButtonText: {
    fontSize: 16,
    color: 'black',
  },
  toggleButtonTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  officeReportTime: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  locationCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
    paddingVertical: 0,
    minHeight: 40,
    textAlignVertical: 'top',
  },
  directionArrowContainer: {
    alignItems: 'flex-start',
    marginVertical: 4,
    marginLeft: 10,
  },
  timeText: {
    fontSize: 14,
    color: '#000000ff',
    fontWeight: '500',
    padding: 8,
    borderRadius: 6,
  },
  timeTextInactive: {
    fontSize: 14,
    color: '#ccc',
    fontWeight: '500',
    padding: 8,
  },
  distanceText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'left',
  },
  inputGroup: {
    marginBottom: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: lightGrey,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  smallLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: '#666',
  },
  pickerField: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: 'white',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
    color: '#333',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: 'white',
  },
  fareCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  fareHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
    textAlign: 'center',
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  daysContainer: {
    marginBottom: 16,
  },

  dayButton: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 8,
    alignItems: 'center',
    marginRight: 6,
    borderRadius: 20,
    marginTop: 4
  },
  dayButtonSelected: {
    backgroundColor: primaryColor,
    borderColor: primaryColor,
  },
  dayButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  dayButtonTextSelected: {
    color: 'white',
    fontWeight: '600',
  },

  // Also update the daysRow style to match the spacing:
  daysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginTop: 8,
  },
  preferencesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 16,
  },
  preferencesHeaderText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: primaryColor,
    borderRadius: 25,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  androidPicker: {
    height: 150,
    marginTop: -20,
  },
  pickerStyle: {
    height: 120,
    marginTop: -10,
  },
});

export default CarpoolProfile;