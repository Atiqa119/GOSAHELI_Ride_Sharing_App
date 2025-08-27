//backend/routes/carpool.js
const express = require('express');
const router = express.Router();
const client = require('../db');



// Get a specific carpool profile by ID to use that profile
router.get('/get-carpool-profile/:profileId', async (req, res) => {
  const { profileId } = req.params;
  console.log("Fetching profile for ID:", profileId);

  try {
    const result = await client.query(
      'SELECT * FROM carpool_profile WHERE carpool_profile_id = $1',
      [profileId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }

    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching carpool profile:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch carpool profile' });
  }
});


//fetch the saved carpool profiles
router.get('/get-user-carpool-profiles/:userId', async (req, res) => {
  const userId = req.params.userId;

  try {
    const result = await client.query(
      `SELECT * FROM carpool_profile WHERE "UserID" = $1 ORDER BY carpool_profile_id DESC`,
      [userId]
    );

    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching profiles:', error);
    res.status(500).json({ success: false, message: 'Failed to feetch profiles' });
  }
});


// Save carpool profile
router.post('/save-profile', async (req, res) => {
  console.log('Received request with body:', req.body);
  try {
    const {
      UserID,
      pickup_location,
      dropoff_location,
      seats,
      date,
      pickup_time,
      dropoff_time,
      smoking_preference,
      music_preference,
      conversation_preference,
      allows_luggage,
      is_recurring,
      recurring_days,
      special_requests,
      route_type,
      fare
    } = req.body;

    console.log("Final route_type going to DB:", route_type);

    const query = `
  INSERT INTO carpool_profile (
    "UserID",
    pickup_location,
    dropoff_location,
    seats,
    date,
    pickup_time,
    dropoff_time,
    smoking_preference,
    music_preference,
    conversation_preference,
    allows_luggage,
    is_recurring,
    recurring_days,
    special_requests,
    route_type,
    fare,
    distance_km
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,$16,$17)
  RETURNING carpool_profile_id;
`;

    const values = [
      UserID,
      pickup_location,
      dropoff_location,
      seats,
      date,
      pickup_time,
      dropoff_time,
      smoking_preference,
      music_preference,
      conversation_preference,
      allows_luggage,
      is_recurring,
      recurring_days,
      special_requests || null,
      route_type,
      req.body.fare || null,
      req.body.distance_km || null  // Add distance

    ];

    const result = await client.query(query, values);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Carpool profile saved successfully'
    });
  } catch (error) {
    console.error('Error saving carpool profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save carpool profile',
      error: error.message
    });
  }
});



// ✅ Delete carpool profile
router.delete('/delete-carpool-profile/:profileId', async (req, res) => {
  const { profileId } = req.params;

  try {
    const result = await client.query(
      'DELETE FROM carpool_profile WHERE carpool_profile_id = $1',
      [profileId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }

    res.status(200).json({ success: true, message: 'Carpool profile deleted successfully' });
  } catch (error) {
    console.error('Error deleting profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete carpool profile',
      error: error.message
    });
  }
});



// ✅ save carpool request
router.post('/create-status-request', async (req, res) => {
  const {
    PassengerID,
    DriverID = null,
    status = 'pending',
    accepted_time = null,
    completed_time = null,
    pickup_location,
    dropoff_location,
    seats,
    date,
    pickup_time,
    dropoff_time,
    smoking_preference,
    music_preference,
    conversation_preference,
    allows_luggage,
    is_recurring,
    recurring_days,
    special_requests,
    route_type,
    end_date

  } = req.body;

  try {
    const result = await client.query(
      `
      INSERT INTO "Carpool_Request_Status" (
        "PassengerID",
        "DriverID",
        status,
        accepted_time,
        completed_time,
        pickup_location,
        dropoff_location,
        seats,
        date,
        pickup_time,
        dropoff_time,
        smoking_preference,
        music_preference,
        conversation_preference,
        allows_luggage,
        is_recurring,
        recurring_days,
        special_requests,
        route_type,
        fare,
        distance_km,
        end_date
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15,
        $16, $17, $18, $19,$20,$21,$22
      )
      RETURNING *;
      `,
      [
        PassengerID,
        DriverID,
        status,
        accepted_time,
        completed_time,
        pickup_location,
        dropoff_location,
        seats,
        date,
        pickup_time,
        dropoff_time,
        smoking_preference,
        music_preference,
        conversation_preference,
        allows_luggage,
        is_recurring,
        recurring_days,
        special_requests,
        route_type,
        req.body.fare || null,
        req.body.distance_km || null , // Add distance
        end_date


      ]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Carpool request (unsaved profile) created successfully'
    });
  } catch (error) {
    console.error('Error creating carpool request status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create request status',
      error: error.message
    });
  }
});

// Get a specific carpool request by ID
router.get('/get-carpool-request/:requestId', async (req, res) => {
  const { requestId } = req.params;
  console.log("Fetching carpool request for ID:", requestId);

  try {
    const result = await client.query(
      'SELECT * FROM "Carpool_Request_Status" WHERE "RequestID" = $1',
      [requestId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Carpool request not found' });
    }

    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching carpool request:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch carpool request' });
  }
});

// PUT /api/carpool/update-carpool-request
router.put('/update-carpool-request', async (req, res) => {
  try {
    const {
      RequestID,
      pickup_location,
      dropoff_location,
      seats,
      date,
      pickup_time,
      dropoff_time,
      smoking_preference,
      music_preference,
      conversation_preference,
      allows_luggage,
      is_recurring,
      recurring_days,
      special_requests,
      route_type,
      fare,
      distance_km
    } = req.body;

    const query = `
      UPDATE "Carpool_Request_Status" 
      SET 
        pickup_location = $1,
        dropoff_location = $2,
        seats = $3,
        date = $4,
        pickup_time = $5,
        dropoff_time = $6,
        smoking_preference = $7,
        music_preference = $8,
        conversation_preference = $9,
        allows_luggage = $10,
        is_recurring = $11,
        recurring_days = $12,
        special_requests = $13,
        route_type = $14,
        fare = $15,
        distance_km = $16
      WHERE "RequestID" = $17
      RETURNING *;
    `;

    const values = [
      pickup_location,
      dropoff_location,
      seats,
      date,
      pickup_time,
      dropoff_time,
      smoking_preference,
      music_preference,
      conversation_preference,
      allows_luggage,
      is_recurring,
      recurring_days,
      special_requests,
      route_type,
      fare,
      distance_km,
      RequestID
    ];

    const result = await client.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0],
      message: 'Carpool request updated successfully'
    });
  } catch (error) {
    console.error('Error updating carpool request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update carpool request',
      error: error.message
    });
  }
});

// ✅ Delete carpool request 
router.delete('/delete-status-request/:requestId', async (req, res) => {
  const { requestId } = req.params;

  try {
    // First verify the request exists
    const checkResult = await client.query(
      'SELECT * FROM "Carpool_Request_Status" WHERE "RequestID" = $1',
      [requestId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ride request not found'
      });
    }

    // Then delete it
    const deleteResult = await client.query(
      'DELETE FROM "Carpool_Request_Status" WHERE "RequestID" = $1 RETURNING *',
      [requestId]
    );

    res.status(200).json({
      success: true,
      message: 'Ride request deleted successfully',
      data: deleteResult.rows[0]
    });
  } catch (error) {
    console.error('Error deleting ride request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete ride request',
      error: error.message,
      stack: error.stack // Include stack trace for debugging
    });
  }
});

// ✅ Get all carpool requests for a passenger
router.get('/get-status-by-passenger/:passengerId', async (req, res) => {
  const { passengerId } = req.params;
  console.log("🔍 Received PassengerID:", passengerId);

  try {
    const query = `
 WITH driver_ratings AS (
  SELECT 
    fe."DriverID",
    fe."RateValue",
    fe."CreatedAt",
    EXP(-0.1 * EXTRACT(DAY FROM (NOW() - fe."CreatedAt"))) AS time_weight
  FROM "Feedback" fe
  WHERE fe."DriverID" IS NOT NULL
),
rating_summary AS (
  SELECT
    d."DriverID",
    COALESCE(
  ROUND(
    CASE 
      WHEN SUM(dr.time_weight) > 0
      THEN SUM(dr."RateValue" * dr.time_weight) / SUM(dr.time_weight)
      ELSE 4.5
    END, 1
  ),
  4.5
) AS "WeightedRating",

    COUNT(dr."RateValue") AS "RatingCount"
  FROM "Driver" d
  LEFT JOIN driver_ratings dr ON d."DriverID" = dr."DriverID"
  GROUP BY d."DriverID"
)
      
      SELECT
        crs."RequestID",
        crs.date,
        crs.pickup_location,
        crs.dropoff_location,
        crs.pickup_time,
        crs.dropoff_time,
        crs.seats,
        crs.status,
        crs.route_type,
        crs.recurring_days,
        crs.fare,
        crs.smoking_preference,
        crs.music_preference,
        crs.conversation_preference,
        crs.allows_luggage,
        crs.distance_km,
        d."DriverID",
        d."UserID" AS driver_user_id,
        u.username AS driver_name,
        u.photo_url AS driver_photo,
        v."VehicleModel",
        v."PlateNumber",
        v.color,
        rs."WeightedRating" AS "Rating",
        rs."RatingCount"
      FROM "Carpool_Request_Status" crs
      LEFT JOIN "Driver" d ON crs."DriverID" = d."DriverID"
      LEFT JOIN "User" u ON d."UserID" = u."UserID"
      LEFT JOIN "Vehicle" v ON d."DriverID" = v."DriverID"
      LEFT JOIN rating_summary rs ON d."DriverID" = rs."DriverID"
      WHERE crs."PassengerID" = $1
      ORDER BY crs.date ASC;
    `;

    const { rows } = await client.query(query, [passengerId]);

    const categorized = {
      pending: [],
      accepted: [],
      upcoming: [],
      completed: [],
      rejected: []
    };

    rows.forEach(ride => {
      const status = (ride.status || '').toLowerCase();

      if (status === 'pending') {
        ride.driver_user_id = null;
        ride.driver_name = null;
        ride.driver_photo = null;
        ride.VehicleModel = null;
        ride.PlateNumber = null;
        ride.color = null;
        ride.Rating = null;
        ride.RatingCount = null;
      }

      if (status === 'pending') categorized.pending.push(ride);
      else if (status === 'accepted') categorized.accepted.push(ride);
      else if (status === 'joined') categorized.upcoming.push(ride);
      else if (status === 'completed') categorized.completed.push(ride);
      else if (status === 'rejected') categorized.rejected.push(ride);
    });

    res.status(200).json({ success: true, data: categorized });

  } catch (err) {
    console.error("Error fetching all rides:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


// PATCH /api/carpool/update-status/:requestId
router.patch('/update-status/:requestId', async (req, res) => {
  const { requestId } = req.params;
  const { status } = req.body;

  try {
    const updateQuery = `
      UPDATE "Carpool_Request_Status"
      SET status = $1
      WHERE "RequestID" = $2
      RETURNING *;
    `;
    const result = await client.query(updateQuery, [status, requestId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }

    res.status(200).json({ success: true, message: `Status updated to ${status}`, data: result.rows[0] });
  } catch (err) {
    console.error("Error updating status:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// POST /api/favourites
router.post('/favourites', async (req, res) => {
  const { PassengerID, DriverID } = req.body;
  try {
    await pool.query(`
      INSERT INTO "Favourites" ("PassengerID", "DriverID")
      VALUES ($1, $2)
      ON CONFLICT ("PassengerID", "DriverID") DO NOTHING
    `, [PassengerID, DriverID]);
    res.json({ success: true, message: "Driver favourited" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Error adding favourite" });
  }
});

// DELETE /api/favourites/:passengerId/:driverId
router.delete('/favourites/:passengerId/:driverId', async (req, res) => {
  const { passengerId, driverId } = req.params;
  try {
    await pool.query(`
      DELETE FROM "Favourites" WHERE "PassengerID"=$1 AND "DriverID"=$2
    `, [passengerId, driverId]);
    res.json({ success: true, message: "Driver removed from favourites" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Error removing favourite" });
  }
});

// POST /api/feedback
router.post('/feedback', async (req, res) => {
  const { RateValue, DriverID, PassengerID, Message } = req.body;
  try {
    await pool.query(`
      INSERT INTO "Feedback" ("RateValue", "DriverID", "PassengerID", "Message")
      VALUES ($1, $2, $3, $4)
      ON CONFLICT ("DriverID", "PassengerID") 
      DO UPDATE SET "RateValue"=EXCLUDED."RateValue", "Message"=EXCLUDED."Message"
    `, [RateValue, DriverID, PassengerID, Message]);
    res.json({ success: true, message: "Feedback submitted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Error submitting feedback" });
  }
});



module.exports = router;