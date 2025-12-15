import { useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  type User as FirebaseUser
} from 'firebase/auth';
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

interface UserProfile {
  email: string;
  role: 'admin' | 'user';
  name: string;
  createdAt: Timestamp;
}

export function useAuth() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set persistence to LOCAL (survives browser restarts)
    setPersistence(auth, browserLocalPersistence).catch((error) => {
      console.error('Error setting persistence:', error);
    });

    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Fetch user profile from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'userProfiles', firebaseUser.uid));
          if (userDoc.exists()) {
            setUserProfile(userDoc.data() as UserProfile);
          } else {
            // Create default user profile if it doesn't exist
            const defaultProfile: UserProfile = {
              email: firebaseUser.email || '',
              role: 'user',
              name: firebaseUser.email?.split('@')[0] || 'User',
              createdAt: Timestamp.now(),
            };
            try {
              await setDoc(doc(db, 'userProfiles', firebaseUser.uid), defaultProfile);
              setUserProfile(defaultProfile);
            } catch (createError) {
              console.error('Error creating user profile:', createError);
              // Even if we can't create the profile, set a default one locally
              setUserProfile(defaultProfile);
            }
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          
          // If it's a permission error, create a local-only profile
          if (error && typeof error === 'object' && 'code' in error && error.code === 'permission-denied') {
            console.warn('Permission denied - using local profile. Please configure Firestore security rules.');
            const localProfile: UserProfile = {
              email: firebaseUser.email || '',
              role: firebaseUser.email === 'admin@demo.com' ? 'admin' : 'user',
              name: firebaseUser.email?.split('@')[0] || 'User',
              createdAt: Timestamp.now(),
            };
            setUserProfile(localProfile);
          }
        }
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return { success: true, user: result.user };
    } catch (error) {
      console.error('Sign in error:', error);
      const errorCode = error && typeof error === 'object' && 'code' in error ? error.code : '';
      return { 
        success: false, 
        error: errorCode === 'auth/invalid-credential' || errorCode === 'auth/user-not-found' || errorCode === 'auth/wrong-password'
          ? 'Invalid email or password' 
          : errorCode === 'auth/too-many-requests'
          ? 'Too many failed login attempts. Please try again later.'
          : 'An error occurred during sign in'
      };
    }
  };

  const signUp = async (email: string, password: string, name: string, role: 'admin' | 'user' = 'user') => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create user profile in Firestore
      const userProfile: UserProfile = {
        email: email,
        role: role,
        name: name,
        createdAt: Timestamp.now(),
      };
      
      await setDoc(doc(db, 'userProfiles', result.user.uid), userProfile);
      
      return { success: true, user: result.user };
    } catch (error) {
      console.error('Sign up error:', error);
      const errorCode = error && typeof error === 'object' && 'code' in error ? error.code : '';
      return { 
        success: false, 
        error: errorCode === 'auth/email-already-in-use'
          ? 'Email is already in use'
          : errorCode === 'auth/weak-password'
          ? 'Password should be at least 6 characters'
          : 'An error occurred during sign up'
      };
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      return { success: false, error: 'An error occurred during sign out' };
    }
  };

  return {
    user,
    userProfile,
    loading,
    signIn,
    signUp,
    signOut,
    isAuthenticated: !!user,
    isAdmin: userProfile?.role === 'admin',
  };
}