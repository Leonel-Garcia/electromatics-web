/**
 * firebase-config.js
 * Firebase Configuration and Initialization
 * 
 * IMPORTANT: Replace the firebaseConfig values with your actual Firebase project credentials
 * To get these values:
 * 1. Go to https://console.firebase.google.com/
 * 2. Create a new project or select existing
 * 3. Go to Project Settings > General
 * 4. Scroll to "Your apps" and click the web icon (</>)
 * 5. Copy the configuration object
 */

// Firebase configuration - REPLACE WITH YOUR ACTUAL CONFIG
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
let app, auth, db;

try {
  app = firebase.initializeApp(firebaseConfig);
  auth = firebase.auth();
  db = firebase.firestore();
  
  // Enable email verification
  auth.useDeviceLanguage(); // Use browser language for emails
  
  console.log('✅ Firebase initialized successfully');
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
}

// Firestore helpers
const FirebaseDB = {
  /**
   * Create or update user profile in Firestore
   */
  async createUserProfile(userId, userData) {
    try {
      await db.collection('users').doc(userId).set({
        email: userData.email,
        displayName: userData.displayName,
        isPremium: true, // BETA: Everyone gets premium
        isAdmin: userData.isAdmin || false,
        emailVerified: userData.emailVerified || false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastLogin: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      
      console.log('User profile created/updated');
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }
  },

  /**
   * Get user profile from Firestore
   */
  async getUserProfile(userId) {
    try {
      const doc = await db.collection('users').doc(userId).get();
      if (doc.exists) {
        return { id: doc.id, ...doc.data() };
      }
      return null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  },

  /**
   * Update user's last login
   */
  async updateLastLogin(userId) {
    try {
      await db.collection('users').doc(userId).update({
        lastLogin: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating last login:', error);
    }
  },

  /**
   * Get all users (admin only)
   */
  async getAllUsers() {
    try {
      const snapshot = await db.collection('users').orderBy('createdAt', 'desc').get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting users:', error);
      throw error;
    }
  },

  /**
   * Update user role (admin only)
   */
  async updateUserRole(userId, updates) {
    try {
      await db.collection('users').doc(userId).update(updates);
      console.log('User role updated');
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  },

  /**
   * Get user statistics
   */
  async getStats() {
    try {
      const snapshot = await db.collection('users').get();
      const users = snapshot.docs.map(doc => doc.data());
      
      return {
        totalUsers: users.length,
        verifiedUsers: users.filter(u => u.emailVerified).length,
        premiumUsers: users.filter(u => u.isPremium).length,
        adminUsers: users.filter(u => u.isAdmin).length
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      throw error;
    }
  }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { auth, db, FirebaseDB };
}
