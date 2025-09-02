import axios from 'axios';

// Use your local IP and backend port
export const API_URL = 'http://10.140.88.255:5000';



// ✅ Get user details by userId
export const getUserById = async (userId) => {
  try {
    const response = await axios.get(`${API_URL}/user-by-id/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching user by ID:', error);
    return null;
  }
};

export const getDriverById = async (userId) => {
  try {
    const response = await axios.get(`${API_URL}/driver-by-user-id/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching Driver by ID:', error);
    return null;
  }
};




// ✅ Fetch all users (GET /user?email=...)
export const loginUser = async (email, password) => {
    try {
        const response = await axios.post(`${API_URL}/login`, { email, password });
        return response.data;
    } catch (error) {
        console.error('Login error:', error.response?.data || error.message);
        throw error.response?.data || { message: 'Login failed' };
    }
};

export const getUser = async (email) => {
    try {
        const response = await axios.get(`${API_URL}/user?email=${email}`);
        return response.data[0]; // Return first user found
    } catch (error) {
        console.error('Error fetching user:', error);
        throw error.response?.data || { message: 'Error fetching user' };
    }
};


// ✅ Upload profile photo by UserID
export const uploadProfilePhoto = async (userId, base64Image) => {
  try {
    const formData = new FormData();
    formData.append('userId', userId); // 👈 change from 'email' to 'userId'
    formData.append('photo', {
      uri: `data:image/jpeg;base64,${base64Image}`,
      name: `profile_${Date.now()}.jpg`,
      type: 'image/jpeg'
    });

    const response = await axios.post(`${API_URL}/upload-profile-photo`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  } catch (error) {
    console.error('Upload photo error:', error.response?.data || error.message);
    throw error.response?.data || { message: 'Upload photo failed' };
  }
};

// ✅ Get user photo by UserID
export const getUserPhoto = async (userId) => {
  try {
    const response = await axios.get(`${API_URL}/get-user-photo/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching user photo:', error);
    return null;
  }
};


// ✅ Get ride history by UserID 
// api.js
export const getRideHistory = async (userId) => {
  try {
    const response = await axios.get(`${API_URL}/ride-history/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching ride history:', error);
    return [];
  }
};

// ✅ Save carpool profile 
export const saveCarpoolProfile = async (profileData) => {
  try {
    const response = await axios.post(`${API_URL}/api/carpool/save-profile`, profileData);
    return response.data;
  } catch (error) {
    console.error('Error saving carpool profile:', error);
    throw error;
  }
};
// ✅ Save carpool request
export const saveCarpoolRequest = async (profileData) => {
  try {
    const response = await axios.post(`${API_URL}/api/carpool/create-status-request`, profileData);
    return response.data;
  } catch (error) {
    console.error('Error saving carpool profile:', error);
    throw error;
  }
};

export const updateCarpoolRequest = async (requestData) => {
  try {
    const response = await axios.put(`${API_URL}/api/carpool/update-carpool-request`, requestData);
    return response;
  } catch (error) {
    console.error('Error updating carpool request:', error);
    throw error;
  }
};


// ✅Get Saved carpool profile
export const getUserCarpoolProfiles = async (userId) => {
  const response = await axios.get(`${API_URL}/api/carpool/get-user-carpool-profiles/${userId}`);
  return response.data;
};

// ✅ Delete carpool profile
export const deleteCarpoolProfile = async (profileId) => {
  return await axios.delete(`${API_URL}/api/carpool/delete-carpool-profile/${profileId}`);
};



// ✅ Fetch vehicle info by DriverID
export const getVehicleByDriverId = async (driverId) => {
  const url = `${API_URL}/vehicleDetails/${driverId}`;
  console.log('🌐 Fetching vehicle from URL:', url);
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn('⚠️ Vehicle fetch failed:', response.status);
      return null;
    }
    const data = await response.json();
    console.log('✅ Vehicle data received:', data);
    return data;
  } catch (error) {
    console.error('❌ Error fetching vehicle:', error);
    return null;
  }
};


// ✅ Delete vehicle image by driverId
export const deleteVehicleImage = async (driverId) => {
  try {
    const response = await fetch(`${API_URL}/delete-vehicle-image/${driverId}`, {
      method: 'DELETE',
    });

    const text = await response.text(); // in case plain text is returned
    const json = JSON.parse(text);      // will throw if not JSON

    return json;
  } catch (error) {
    console.error('❌ Delete vehicle image error:', error);
    return { success: false };
  }
};




export const saveVehicleDetails = async (payload) => {
  const response = await fetch(`${API_URL}/vehicleDetails`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return await response.json();
};

export const updateVehicleDetails = async (driverId, payload) => {
  const response = await fetch(`${API_URL}/vehicleDetails/${driverId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return await response.json();
};
export const saveDriverCarpoolProfile = async (profileData) => {
  try {
    const response = axios.post(`${API_URL}/api/driver/carpool/offer`, profileData);
    return response.data;
  } catch (error) {
    console.error('Error saving Driver carpool profile:', error.response?.data || error.message);
    throw error;
  }
};

// ✅ Submit complaint
export const submitComplaintApi = async ({ driverId, passengerId, description }) => {
  try {
    const response = await axios.post(`${API_URL}/api/complaints`, {
      driverId,
      passengerId,
      description
    });
    return response.data;
  } catch (error) {
    console.error('Error submitting complaint:', error);
    return null;
  }
};

// ✅ Get passenger by userId
export const getPassengerByUserId = async (userId) => {
  try {
    const response = await axios.get(`${API_URL}/api/get-passenger/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching Passenger by ID:', error);
    return null;
  }
};
