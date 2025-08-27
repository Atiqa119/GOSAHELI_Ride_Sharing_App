import React, { useEffect } from 'react';
import { LogBox } from 'react-native';  // ✅ Import LogBox
import { NavigationContainer } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { createStackNavigator } from '@react-navigation/stack';
import Toast from 'react-native-toast-message'; // ✅ In-app toast

// ✅ Ignore specific warning
LogBox.ignoreLogs([
  'Text strings must be rendered within a <Text>'
]);

// ✅ Notification Setup
import { registerForPushNotificationsAsync } from './src//utils/NotificationSetup';

/* Components */
import CustomBackButton from './src/components/CustomBackButton';

/* Passenger Screens */
import LandingActivity from './src/PaseengerScreens/LandingActivity';
import Signup from './src/PaseengerScreens/Signup';
import PhoneVerificationScreen from './src/PaseengerScreens/PhoneVerificationScreen';
import CameraCapture from './src/PaseengerScreens/CameraCapture';
import Login from './src/PaseengerScreens/Login';
import ForgotPassword from './src/PaseengerScreens/ForgotPassword';
import Home from './src/PaseengerScreens/Home';
import Carpool from './src/PaseengerScreens/Carpool';
import CarpoolProfileList from './src/PaseengerScreens/CarpoolProfileList';
import CarpoolProfile from './src/PaseengerScreens/CarpoolProfile';
import CarpoolStatusScreen from './src/PaseengerScreens/CarpoolStatusScreen';
import ChatUI from './src/PaseengerScreens/ChatUI';
import about from './src/PaseengerScreens/about';
import Support from './src/PaseengerScreens/Support';
import Favourite from './src/PaseengerScreens/Favourite';
import Offers from './src/PaseengerScreens/Offers';
import History from './src/PaseengerScreens/History';
import Profile from './src/PaseengerScreens/Profile';
import SettingsScreen from './src/PaseengerScreens/SettingsScreen';
import ChangePassword from './src/PaseengerScreens/ChangePassword';

/* Driver Screens */
import DriverHome from './src/DriverScreens/DriverHome';
import DriverMenuOverlay from './src/components/DriverMenuOverlay';
import DriverCarpoolMap from './src/DriverScreens/DriverCarpoolMap';
import DriverCarpoolProfile from './src/DriverScreens/DriverCarpoolProfile';
import DriverCarpoolStatusScreen from './src/DriverScreens/DriverCarpoolStatusScreen';
import OfferCarpool from './src/DriverScreens/OfferCarpool';
import VehicleSetupScreen from './src/DriverScreens/VehicleSetupScreen';
import UploadVehiclePictureScreen from './src/DriverScreens/UploadVehiclePictureScreen';
import VehicleDetailsScreen from './src/DriverScreens/VehicleDetailsScreen';
import LicensePictureScreen from './src/DriverScreens/LicensePictureScreen';

const Stack = createStackNavigator();

export default function App() {
   // ✅ Register for push notifications
 // App.js
useEffect(() => {
  const initializeApp = async () => {
    // Wait for splash screen to complete
    await new Promise(resolve => setTimeout(resolve, 2000)); // Or your splash duration
    
    // Then check for user and register notifications
    const userId = await AsyncStorage.getItem('UserID');
    if (userId) {
      await registerForPushNotificationsAsync(userId);
    }
  };

  initializeApp();
}, []);

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

  return (
    <>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="LandingActivity">
          {/* Passenger Screens */}
          <Stack.Screen name="LandingActivity" component={LandingActivity} options={{ headerShown: false }} />
          <Stack.Screen name="Signup" component={Signup} options={{ headerShown: false }} />
          <Stack.Screen name="PhoneVerificationScreen" component={PhoneVerificationScreen} />
          <Stack.Screen name="CameraCapture" component={CameraCapture} options={{ headerShown: false }}/>
          <Stack.Screen name="Login" component={Login} options={{ headerShown: false }} />
          <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
          <Stack.Screen name="Home" component={Home} options={{ headerShown: false }} />
          <Stack.Screen name="Carpool" component={Carpool} options={{ headerShown: false }} />
          <Stack.Screen name="CarpoolProfile" component={CarpoolProfile} options={{ headerShown: false }} />
          <Stack.Screen name="CarpoolProfileList" component={CarpoolProfileList} options={{ headerShown: false }} />
          <Stack.Screen name="CarpoolStatusScreen" component={CarpoolStatusScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ChatUI" component={ChatUI} options={{ headerShown: false }} />
          <Stack.Screen name="History" component={History} options={{ headerShown: false }}/>
          <Stack.Screen name="Favourite" component={Favourite} options={{ headerShown: false }}/>
          <Stack.Screen name="Offers" component={Offers}options={{ headerShown: false }} />
          <Stack.Screen name="Profile" component={Profile} options={{ headerShown: false }} />
          <Stack.Screen name="about" component={about} />
          <Stack.Screen name="Support" component={Support}options={{ headerShown: false }} />
          <Stack.Screen name="SettingsScreen" component={SettingsScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ChangePassword" component={ChangePassword} options={{ headerShown: false }} />

          {/* Driver Screens */}
          <Stack.Screen name="DriverHome" component={DriverHome} options={{ headerShown: false }} />
          <Stack.Screen name="DriverMenuOverlay" component={DriverMenuOverlay} />
          <Stack.Screen name="DriverCarpoolMap" component={DriverCarpoolMap} options={{ headerShown: false }} />
          <Stack.Screen name="DriverCarpoolProfile" component={DriverCarpoolProfile} />
          <Stack.Screen name="DriverCarpoolStatusScreen" component={DriverCarpoolStatusScreen} options={{ headerShown: false }} />
          <Stack.Screen
            name="OfferCarpool"
            component={OfferCarpool}
            options={{
              headerStyle: { backgroundColor: '#fff' },
              headerLeft: () => <CustomBackButton />,
              headerTitle: '',
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen name="VehicleSetupScreen" component={VehicleSetupScreen} options={{ headerShown: false }} />
          <Stack.Screen
            name="VehicleDetailsScreen"
            component={VehicleDetailsScreen}
            options={{
              headerStyle: { backgroundColor: '#fff' },
              headerLeft: () => <CustomBackButton />,
              headerTitle: '',
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="UploadVehiclePictureScreen"
            component={UploadVehiclePictureScreen}
            options={{
              headerStyle: { backgroundColor: '#fff' },
              headerLeft: () => <CustomBackButton />,
              headerTitle: '',
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="LicensePictureScreen"
            component={LicensePictureScreen}
            options={{
              headerStyle: { backgroundColor: '#fff' },
              headerLeft: () => <CustomBackButton />,
              headerTitle: '',
              headerShadowVisible: false,
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>

      {/* ✅ Toast UI */}
      <Toast
        position="bottom"
        bottomOffset={60}
        visibilityTime={3000}
      />
    </>
  );
}
