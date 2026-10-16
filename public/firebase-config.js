// ============================================================
// Firebase Configuration & Gate Pass Permissions Backend Service
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyB7uVIpgWJuMw0DP0isshge6PNliLa1aEU",
  authDomain: "christ-etlab.firebaseapp.com",
  projectId: "christ-etlab",
  storageBucket: "christ-etlab.firebasestorage.app",
  messagingSenderId: "247218075800",
  appId: "1:247218075800:web:c9b3a90e193f14424338ed",
  measurementId: "G-YVSD76NNV0"
};

const STORAGE_KEY = "etlab_last5_permissions";
let db = null;
let isFirebaseConfigured = false;

// Check if credentials are valid
if (
  typeof firebase !== 'undefined' &&
  firebaseConfig.apiKey &&
  firebaseConfig.apiKey !== "YOUR_API_KEY" &&
  firebaseConfig.projectId !== "YOUR_PROJECT_ID"
) {
  try {
    if (!firebase.apps || !firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    db = firebase.firestore();
    isFirebaseConfigured = true;
    console.log("[Firebase] Successfully initialized Firestore backend.");
  } catch (err) {
    console.error("[Firebase] Initialization error:", err);
  }
} else {
  console.info("[Firebase] Running in Local Storage Fallback mode. Update firebaseConfig in firebase-config.js to connect to live Firebase backend.");
}

/**
 * Stores a new gate pass permission in Firebase and keeps strictly the last 5 permissions.
 * If Firebase is not yet configured, automatically persists to localStorage fallback.
 * 
 * @param {Object} permissionData - Details of the gate pass request
 * @returns {Promise<Array>} The updated list of the last 5 permissions
 */
async function storeLast5Permissions(permissionData) {
  const newPermission = {
    ...permissionData,
    id: permissionData.id || ('gp_' + Date.now()),
    timestamp: Date.now(),
    createdAt: isFirebaseConfigured && db ? firebase.firestore.FieldValue.serverTimestamp() : new Date().toISOString()
  };

  if (isFirebaseConfigured && db) {
    try {
      const collectionRef = db.collection('gate_pass_permissions');

      // 1. Add the new permission to Firestore
      const docRef = await collectionRef.add(newPermission);
      newPermission.id = docRef.id;

      // 2. Fetch all permissions ordered by timestamp descending
      const snapshot = await collectionRef.orderBy('timestamp', 'desc').get();

      // 3. Keep strictly the last 5 permissions: prune any older entries beyond 5
      if (snapshot.size > 5) {
        const batch = db.batch();
        snapshot.docs.slice(5).forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        console.log(`[Firebase] Pruned ${snapshot.size - 5} older record(s). Strictly kept the last 5 permissions.`);
      }

      // Return the current last 5
      const latestSnapshot = await collectionRef.orderBy('timestamp', 'desc').limit(5).get();
      const last5 = latestSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      saveToLocalStorage(last5);
      return last5;
    } catch (error) {
      console.error("[Firebase] Error storing permission to Firestore, using local fallback:", error);
      return storeInLocalStorage(newPermission);
    }
  } else {
    return storeInLocalStorage(newPermission);
  }
}

/**
 * Fetches the last 5 permissions from Firebase Firestore (or localStorage fallback).
 * 
 * @returns {Promise<Array>} List of the last 5 permissions
 */
async function getLast5Permissions() {
  if (isFirebaseConfigured && db) {
    try {
      const snapshot = await db.collection('gate_pass_permissions')
        .orderBy('timestamp', 'desc')
        .limit(5)
        .get();

      if (!snapshot.empty) {
        const permissions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        saveToLocalStorage(permissions);
        return permissions;
      }
    } catch (error) {
      console.warn("[Firebase] Could not fetch permissions from Firestore:", error);
    }
  }

  // Fallback to local storage
  return getFromLocalStorage();
}

/**
 * Listens to real-time updates for the last 5 permissions (if Firebase is configured).
 * 
 * @param {Function} callback - Function called with updated permissions list
 * @returns {Function} Unsubscribe function
 */
function listenToLast5Permissions(callback) {
  if (isFirebaseConfigured && db) {
    return db.collection('gate_pass_permissions')
      .orderBy('timestamp', 'desc')
      .limit(5)
      .onSnapshot((snapshot) => {
        const permissions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(permissions);
      }, (err) => {
        console.warn("[Firebase] Real-time listener error:", err);
      });
  }
  return () => {};
}

// Local storage fallback helpers
function getFromLocalStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.slice(0, 5);
      }
    }
  } catch (e) {
    console.error("Local storage read error", e);
  }
  // Default fallback seed permission matching the reference UI
  return [
    {
      id: "gp_default_1",
      name: "user",
      address: "Kalakoduvath House, Nattika P O, Thriprayar, India, Kerala, Thrissur",
      purpose: "Outreach",
      purposeType: "Official",
      fromTime: "2026-10-09 11:00:00",
      returnTime: "2026-10-09 14:00:00",
      admNo: "2960",
      phone: "1234567890",
      exitType: "Return",
      status: "Approved",
      mail: "—",
      attachment: "Not Attached",
      profileImg: "student_profile.jpg",
      timestamp: 1728471600000
    }
  ];
}

function saveToLocalStorage(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 5)));
  } catch (e) {
    console.error("Local storage save error", e);
  }
}

function storeInLocalStorage(newPermission) {
  const current = getFromLocalStorage();
  const updated = [newPermission, ...current].slice(0, 5);
  saveToLocalStorage(updated);
  return updated;
}
