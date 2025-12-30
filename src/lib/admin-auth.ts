import { useState, useEffect } from 'react';
import { db } from './firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc
} from 'firebase/firestore';

interface AdminUser {
  id: string;  // Add id field (will be the email)
  email: string;
  name: string;
  role: string;
  createdAt: Date;
  lastLogin?: Date;
}

interface FirestoreAdminData {
  email: string;
  name: string;
  role: string;
  createdAt: { toDate?: () => Date } | Date | string;
  lastLogin?: { toDate?: () => Date } | Date | string;
}

interface AuthState {
  isAuthenticated: boolean;
  currentAdmin: AdminUser | null;
  loading: boolean;
}

const AUTH_STORAGE_KEY = 'reserveai_admin_session';

// Helper function to convert Firestore data to AdminUser with proper date handling
function convertToAdminUser(data: FirestoreAdminData): AdminUser {
  // Helper to safely convert a Firestore timestamp or date
  const toDate = (value: { toDate?: () => Date } | Date | string): Date => {
    if (typeof value === 'object' && value !== null && 'toDate' in value && typeof value.toDate === 'function') {
      return value.toDate();
    }
    return new Date(value as string | Date);
  };

  return {
    id: data.email,
    email: data.email,
    name: data.name,
    role: data.role,
    createdAt: toDate(data.createdAt),
    lastLogin: data.lastLogin ? toDate(data.lastLogin) : undefined,
  };
}

export function useAdminAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    currentAdmin: null,
    loading: true,
  });

  // Check for existing session on mount
  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      const sessionData = localStorage.getItem(AUTH_STORAGE_KEY);
      if (sessionData) {
        const { email } = JSON.parse(sessionData);
        
        // Verify admin still exists in database
        const adminDoc = await getDoc(doc(db, 'admins', email));
        if (adminDoc.exists()) {
          setAuthState({
            isAuthenticated: true,
            currentAdmin: convertToAdminUser(adminDoc.data() as FirestoreAdminData),
            loading: false,
          });
          return;
        } else {
          // Session invalid, clear it
          localStorage.removeItem(AUTH_STORAGE_KEY);
        }
      }
    } catch (error) {
      console.error('Error checking session:', error);
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
    
    setAuthState({
      isAuthenticated: false,
      currentAdmin: null,
      loading: false,
    });
  };

  const signIn = async (email: string, password: string) => {
    try {
      // Get master password from settings
      const settingsDoc = await getDoc(doc(db, 'settings', 'adminConfig'));
      
      if (!settingsDoc.exists()) {
        // Auto-create initial configuration with default password
        console.log('Creating initial admin configuration...');
        await setDoc(doc(db, 'settings', 'adminConfig'), {
          masterPassword: 'admin0987',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        
        // Try again with the default password
        if (password !== 'admin0987') {
          return { 
            success: false, 
            error: 'System initialized with default password "admin0987". Please try again.' 
          };
        }
        
        // If password matches default, continue with sign in
      }

      const settingsData = settingsDoc.exists() 
        ? settingsDoc.data() 
        : { masterPassword: 'admin0987' };
      
      const { masterPassword } = settingsData;

      // Verify master password
      if (password !== masterPassword) {
        return { 
          success: false, 
          error: 'Invalid password' 
        };
      }

      // Check if admin exists
      const adminDoc = await getDoc(doc(db, 'admins', email));
      
      let adminData: AdminUser;
      
      if (adminDoc.exists()) {
        // Update last login
        adminData = adminDoc.data() as AdminUser;
        await setDoc(doc(db, 'admins', email), {
          ...adminData,
          lastLogin: new Date(),
        });
      } else {
        // Create new admin user
        adminData = {
          id: email,
          email: email,
          name: email.split('@')[0],
          role: 'admin',
          createdAt: new Date(),
          lastLogin: new Date(),
        };
        await setDoc(doc(db, 'admins', email), adminData);
      }

      // Create session
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ email }));
      
      setAuthState({
        isAuthenticated: true,
        currentAdmin: adminData,
        loading: false,
      });

      return { success: true };
    } catch (error) {
      console.error('Sign in error:', error);
      
      // If permission denied, provide helpful message
      if (error && typeof error === 'object' && 'code' in error && error.code === 'permission-denied') {
        return { 
          success: false, 
          error: 'Please configure Firebase security rules. See console for details.' 
        };
      }
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'An error occurred during sign in' 
      };
    }
  };

  const signOut = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setAuthState({
      isAuthenticated: false,
      currentAdmin: null,
      loading: false,
    });
    return { success: true };
  };

  const updateMasterPassword = async (currentPassword: string, newPassword: string) => {
    try {
      // Get current master password
      const settingsDoc = await getDoc(doc(db, 'settings', 'adminConfig'));
      
      if (!settingsDoc.exists()) {
        return { 
          success: false, 
          error: 'Settings not found' 
        };
      }

      const { masterPassword } = settingsDoc.data();

      // Verify current password
      if (currentPassword !== masterPassword) {
        return { 
          success: false, 
          error: 'Current password is incorrect' 
        };
      }

      // Update to new password
      await setDoc(doc(db, 'settings', 'adminConfig'), {
        masterPassword: newPassword,
        updatedAt: new Date(),
        updatedBy: authState.currentAdmin?.email,
      });

      return { success: true };
    } catch (error) {
      console.error('Error updating password:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update password' 
      };
    }
  };

  const getAllAdmins = async () => {
    try {
      const adminsSnapshot = await getDocs(collection(db, 'admins'));
      return adminsSnapshot.docs.map(doc => convertToAdminUser(doc.data() as FirestoreAdminData));
    } catch (error) {
      console.error('Error fetching admins:', error);
      return [];
    }
  };

  return {
    isAuthenticated: authState.isAuthenticated,
    currentAdmin: authState.currentAdmin,
    loading: authState.loading,
    signIn,
    signOut,
    updateMasterPassword,
    getAllAdmins,
  };
}