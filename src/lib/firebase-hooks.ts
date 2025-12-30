import { useState, useEffect } from 'react';
import {
  collection,
  query,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  orderBy,
  Timestamp,
  type DocumentData,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';

// Types matching exact Firebase structure
export interface User {
  id: string;
  uid: string;
  email: string;
  username: string;
  displayName: string;
  phoneNumber?: string;
  photoURL?: string;
  role: string;
  preferences?: {
    cuisine?: string[];
    dietaryRestrictions?: string[];
    favoriteRestaurants?: string[];
    priceRange?: string;
  };
  stats?: {
    totalReservations?: number;
    upcomingReservations?: number;
    cancelledReservations?: number;
    noShowCount?: number;
  };
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface RestaurantOwner {
  id: string;
  email: string;
  displayName: string;
  restaurantName: string;
  cuisineType: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  capacity?: number;
  photos?: string[];
  hasCompletedOnboarding: boolean;
  openingHours?: {
    monday?: { open: string; close: string; isClosed: boolean };
    tuesday?: { open: string; close: string; isClosed: boolean };
    wednesday?: { open: string; close: string; isClosed: boolean };
    thursday?: { open: string; close: string; isClosed: boolean };
    friday?: { open: string; close: string; isClosed: boolean };
    saturday?: { open: string; close: string; isClosed: boolean };
    sunday?: { open: string; close: string; isClosed: boolean };
  };
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// Keep Restaurant type for backward compatibility with existing UI
export interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  location: string;
  priceRange: string;
  averageRating: number;
  totalReviews: number;
  totalReservations: number;
  status: 'active' | 'inactive';
  featuredImage?: string;
  recentReports: number;
  createdAt?: Timestamp;
}

export interface Report {
  id: string;
  restaurantId: string;
  restaurantName: string;
  type: 'safety' | 'food' | 'service' | 'other';
  description: string;
  status: 'pending' | 'resolved';
  reportedAt: string;
  createdAt?: Timestamp;
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  type: 'dine-in' | 'takeout';
  category: string;
  name: string;
  description: string;
  price: number;
  available: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface RestaurantStats {
  totalReservations: number;
  totalRevenue: number;
  averageRating: number;
  uniqueCustomers: number;
  repeatCustomerRate: number;
  totalReviews?: number;
  monthlyGrowth?: number;
  peakHours?: string;
  averagePartySize?: number;
  takeoutStats?: {
    [key: string]: {
      orders: number;
      revenue: number;
      averageOrder: number;
    };
  };
  popularDishes?: Array<{
    name: string;
    orders: number;
    revenue: number;
  }>;
}

// Helper to convert Firestore doc to typed object
const docToData = <T extends { id: string }>(doc: QueryDocumentSnapshot<DocumentData>): T => {
  const data = doc.data();
  return {
    ...data,
    id: doc.id,
  } as T;
};

// Users Hook (Platform Users)
export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const usersData = snapshot.docs.map(doc => docToData<User>(doc));
        setUsers(usersData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        // Suppress noisy transport errors but handle actual permission issues
        if (err.code === 'permission-denied') {
          console.error('Error fetching users:', err);
          setError('Firebase security rules are blocking access. Please update your Firestore rules.');
          setLoading(false);
        } else if (err.code === 'unavailable' || err.message.includes('transport errored') || err.message.includes('WebChannel')) {
          // Network/connection errors - silently ignore, Firestore will retry automatically
          // These are normal and don't indicate a problem
        } else {
          console.error('Error fetching users:', err);
          setError(err.message);
          setLoading(false);
        }
      }
    );

    return () => unsubscribe();
  }, []);

  const addUser = async (user: Omit<User, 'id'>) => {
    try {
      await addDoc(collection(db, 'users'), {
        ...user,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Error adding user:', err);
      throw err;
    }
  };

  const updateUser = async (id: string, updates: Partial<User>) => {
    try {
      const userRef = doc(db, 'users', id);
      await updateDoc(userRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Error updating user:', err);
      throw err;
    }
  };

  const deleteUser = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'users', id));
    } catch (err) {
      console.error('Error deleting user:', err);
      throw err;
    }
  };

  return {
    users,
    loading,
    error,
    addUser,
    updateUser,
    deleteUser,
  };
}

// Restaurant Owners Hook
export function useRestaurantOwners() {
  const [restaurantOwners, setRestaurantOwners] = useState<RestaurantOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'restaurant-owners'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const ownersData = snapshot.docs.map(doc => docToData<RestaurantOwner>(doc));
        setRestaurantOwners(ownersData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        // Suppress noisy transport errors but handle actual permission issues
        if (err.code === 'permission-denied') {
          console.error('Error fetching restaurant owners:', err);
          setError('Firebase security rules are blocking access. Please update your Firestore rules.');
          setLoading(false);
        } else if (err.code === 'unavailable' || err.message.includes('transport errored') || err.message.includes('WebChannel')) {
          // Network/connection errors - silently ignore, Firestore will retry automatically
          // These are normal and don't indicate a problem
        } else {
          console.error('Error fetching restaurant owners:', err);
          setError(err.message);
          setLoading(false);
        }
      }
    );

    return () => unsubscribe();
  }, []);

  const addRestaurantOwner = async (owner: Omit<RestaurantOwner, 'id'>) => {
    try {
      await addDoc(collection(db, 'restaurant-owners'), {
        ...owner,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Error adding restaurant owner:', err);
      throw err;
    }
  };

  const updateRestaurantOwner = async (id: string, updates: Partial<RestaurantOwner>) => {
    try {
      const ownerRef = doc(db, 'restaurant-owners', id);
      await updateDoc(ownerRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Error updating restaurant owner:', err);
      throw err;
    }
  };

  const deleteRestaurantOwner = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'restaurant-owners', id));
    } catch (err) {
      console.error('Error deleting restaurant owner:', err);
      throw err;
    }
  };

  return {
    restaurantOwners,
    loading,
    error,
    addRestaurantOwner,
    updateRestaurantOwner,
    deleteRestaurantOwner,
  };
}

// Restaurants Hooks (Keep for backward compatibility)
export function useRestaurants() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'restaurants'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const restaurantsData = snapshot.docs.map(doc => docToData<Restaurant>(doc));
        setRestaurants(restaurantsData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        // Suppress noisy transport errors but handle actual permission issues
        if (err.code === 'permission-denied') {
          console.error('Error fetching restaurants:', err);
          setError('Firebase security rules are blocking access. Please update your Firestore rules.');
          setLoading(false);
        } else if (err.code === 'unavailable' || err.message.includes('transport errored') || err.message.includes('WebChannel')) {
          // Network/connection errors - silently ignore, Firestore will retry automatically
          // These are normal and don't indicate a problem
        } else {
          console.error('Error fetching restaurants:', err);
          setError(err.message);
          setLoading(false);
        }
      }
    );

    return () => unsubscribe();
  }, []);

  const addRestaurant = async (restaurant: Omit<Restaurant, 'id'>) => {
    try {
      await addDoc(collection(db, 'restaurants'), {
        ...restaurant,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Error adding restaurant:', err);
      throw err;
    }
  };

  const updateRestaurant = async (id: string, updates: Partial<Restaurant>) => {
    try {
      const restaurantRef = doc(db, 'restaurants', id);
      await updateDoc(restaurantRef, updates);
    } catch (err) {
      console.error('Error updating restaurant:', err);
      throw err;
    }
  };

  const deleteRestaurant = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'restaurants', id));
    } catch (err) {
      console.error('Error deleting restaurant:', err);
      throw err;
    }
  };

  return {
    restaurants,
    loading,
    error,
    addRestaurant,
    updateRestaurant,
    deleteRestaurant,
  };
}

// Reports Hooks
export function useReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const reportsData = snapshot.docs.map(doc => docToData<Report>(doc));
        setReports(reportsData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        // Suppress noisy transport errors but handle actual permission issues
        if (err.code === 'permission-denied') {
          console.error('Error fetching reports:', err);
          setError('Firebase security rules are blocking access. Please update your Firestore rules.');
          setLoading(false);
        } else if (err.code === 'unavailable' || err.message.includes('transport errored') || err.message.includes('WebChannel')) {
          // Network/connection errors - silently ignore, Firestore will retry automatically
          // These are normal and don't indicate a problem
        } else {
          console.error('Error fetching reports:', err);
          setError(err.message);
          setLoading(false);
        }
      }
    );

    return () => unsubscribe();
  }, []);

  const addReport = async (report: Omit<Report, 'id'>) => {
    try {
      await addDoc(collection(db, 'reports'), {
        ...report,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Error adding report:', err);
      throw err;
    }
  };

  const updateReport = async (id: string, updates: Partial<Report>) => {
    try {
      const reportRef = doc(db, 'reports', id);
      await updateDoc(reportRef, updates);
    } catch (err) {
      console.error('Error updating report:', err);
      throw err;
    }
  };

  const deleteReport = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'reports', id));
    } catch (err) {
      console.error('Error deleting report:', err);
      throw err;
    }
  };

  return {
    reports,
    loading,
    error,
    addReport,
    updateReport,
    deleteReport,
  };
}

// Restaurant Stats Hook
export function useRestaurantStats(restaurantId: string) {
  const [stats, setStats] = useState<RestaurantStats>({
    totalReservations: 0,
    totalRevenue: 0,
    averageRating: 0,
    uniqueCustomers: 0,
    repeatCustomerRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'restaurant-stats'),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const statsDoc = snapshot.docs.find(doc => doc.data().restaurantId === restaurantId);
        if (statsDoc) {
          const data = statsDoc.data();
          setStats({
            totalReservations: data.totalReservations || 0,
            totalRevenue: data.totalRevenue || 0,
            averageRating: data.averageRating || 0,
            uniqueCustomers: data.uniqueCustomers || 0,
            repeatCustomerRate: data.repeatCustomerRate || 0,
          });
        } else {
          // Use default stats if none exist
          setStats({
            totalReservations: 0,
            totalRevenue: 0,
            averageRating: 0,
            uniqueCustomers: 0,
            repeatCustomerRate: 0,
          });
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        if (err.code === 'permission-denied') {
          console.error('Error fetching restaurant stats:', err);
          setError('Firebase security rules are blocking access.');
          setLoading(false);
        } else if (err.code === 'unavailable' || err.message.includes('transport errored') || err.message.includes('WebChannel')) {
          // Network/connection errors - silently ignore
        } else {
          console.error('Error fetching restaurant stats:', err);
          setError(err.message);
          setLoading(false);
        }
      }
    );

    return () => unsubscribe();
  }, [restaurantId]);

  return { stats, loading, error };
}

// Menu Items Hook
export function useMenuItems(restaurantId: string) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'menu-items'),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs
          .map(doc => docToData<MenuItem>(doc))
          .filter(item => item.restaurantId === restaurantId);
        setMenuItems(items);
        setLoading(false);
        setError(null);
      },
      (err) => {
        if (err.code === 'permission-denied') {
          console.error('Error fetching menu items:', err);
          setError('Firebase security rules are blocking access.');
          setLoading(false);
        } else if (err.code === 'unavailable' || err.message.includes('transport errored') || err.message.includes('WebChannel')) {
          // Network/connection errors - silently ignore
        } else {
          console.error('Error fetching menu items:', err);
          setError(err.message);
          setLoading(false);
        }
      }
    );

    return () => unsubscribe();
  }, [restaurantId]);

  const addMenuItem = async (menuItem: Omit<MenuItem, 'id'>) => {
    try {
      await addDoc(collection(db, 'menu-items'), {
        ...menuItem,
        restaurantId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Error adding menu item:', err);
      throw err;
    }
  };

  const updateMenuItem = async (id: string, updates: Partial<MenuItem>) => {
    try {
      const menuItemRef = doc(db, 'menu-items', id);
      await updateDoc(menuItemRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Error updating menu item:', err);
      throw err;
    }
  };

  const deleteMenuItem = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'menu-items', id));
    } catch (err) {
      console.error('Error deleting menu item:', err);
      throw err;
    }
  };

  return {
    menuItems,
    loading,
    error,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
  };
}