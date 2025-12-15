import { collection, addDoc, serverTimestamp, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

// Seed data for restaurants
const seedRestaurants = [
  {
    name: 'The Gilded Oak',
    cuisine: 'French Fine Dining',
    location: 'Manhattan, NY',
    priceRange: '$$$',
    averageRating: 4.8,
    totalReviews: 247,
    totalReservations: 1842,
    status: 'active' as const,
    recentReports: 0,
  },
  {
    name: 'Sakura Omakase',
    cuisine: 'Japanese',
    location: 'San Francisco, CA',
    priceRange: '$$$$',
    averageRating: 4.9,
    totalReviews: 189,
    totalReservations: 2156,
    status: 'active' as const,
    recentReports: 1,
  },
  {
    name: 'Coastal Prime',
    cuisine: 'Seafood & Steakhouse',
    location: 'Miami, FL',
    priceRange: '$$$',
    averageRating: 4.6,
    totalReviews: 342,
    totalReservations: 3421,
    status: 'active' as const,
    recentReports: 2,
  },
  {
    name: 'Ember & Ash',
    cuisine: 'Modern American',
    location: 'Chicago, IL',
    priceRange: '$$',
    averageRating: 4.7,
    totalReviews: 298,
    totalReservations: 2894,
    status: 'active' as const,
    recentReports: 0,
  },
  {
    name: 'La Dolce Vita',
    cuisine: 'Italian',
    location: 'Boston, MA',
    priceRange: '$$$',
    averageRating: 4.5,
    totalReviews: 412,
    totalReservations: 1967,
    status: 'inactive' as const,
    recentReports: 5,
  },
];

const seedUsers = [
  {
    uid: 'uid-sarah-001',
    email: 'sarah.j@email.com',
    username: 'sarahj',
    displayName: 'Sarah Johnson',
    phoneNumber: '+1 (555) 234-5678',
    role: 'user',
    preferences: {
      cuisine: ['French', 'Italian'],
      dietaryRestrictions: [],
      favoriteRestaurants: ['rest-001', 'rest-002'],
      priceRange: '$$$',
    },
    stats: {
      totalReservations: 24,
      upcomingReservations: 2,
      cancelledReservations: 1,
      noShowCount: 0,
    },
  },
  {
    uid: 'uid-michael-002',
    email: 'michael.chen@email.com',
    username: 'mchen',
    displayName: 'Michael Chen',
    phoneNumber: '+1 (555) 345-6789',
    role: 'user',
    preferences: {
      cuisine: ['Japanese', 'Asian Fusion'],
      dietaryRestrictions: [],
      favoriteRestaurants: ['rest-002'],
      priceRange: '$$$$',
    },
    stats: {
      totalReservations: 18,
      upcomingReservations: 1,
      cancelledReservations: 0,
      noShowCount: 0,
    },
  },
  {
    uid: 'uid-emily-003',
    email: 'emily.r@email.com',
    username: 'emilyr',
    displayName: 'Emily Rodriguez',
    phoneNumber: '+1 (555) 456-7890',
    role: 'user',
    preferences: {
      cuisine: ['Mexican', 'American'],
      dietaryRestrictions: ['Vegetarian'],
      favoriteRestaurants: [],
      priceRange: '$$',
    },
    stats: {
      totalReservations: 8,
      upcomingReservations: 0,
      cancelledReservations: 0,
      noShowCount: 0,
    },
  },
  {
    uid: 'uid-david-004',
    email: 'david.w@email.com',
    username: 'davidw',
    displayName: 'David Williams',
    phoneNumber: '+1 (555) 567-8901',
    role: 'user',
    preferences: {
      cuisine: ['Steakhouse', 'Fine Dining'],
      dietaryRestrictions: [],
      favoriteRestaurants: ['rest-001', 'rest-004'],
      priceRange: '$$$$',
    },
    stats: {
      totalReservations: 31,
      upcomingReservations: 3,
      cancelledReservations: 2,
      noShowCount: 0,
    },
  },
  {
    uid: 'uid-jessica-005',
    email: 'jessica.m@email.com',
    username: 'jessicam',
    displayName: 'Jessica Martinez',
    phoneNumber: '+1 (555) 678-9012',
    role: 'user',
    preferences: {
      cuisine: ['Italian', 'Mediterranean'],
      dietaryRestrictions: ['Gluten-Free'],
      favoriteRestaurants: [],
      priceRange: '$$$',
    },
    stats: {
      totalReservations: 12,
      upcomingReservations: 0,
      cancelledReservations: 1,
      noShowCount: 1,
    },
  },
];

const seedRestaurantOwners = [
  {
    email: 'owner.gildedoak@email.com',
    displayName: 'Jean-Pierre Rousseau',
    restaurantName: 'The Gilded Oak',
    cuisineType: 'French Fine Dining',
    phone: '+1 (212) 555-0100',
    address: '123 Park Avenue',
    city: 'Manhattan',
    state: 'NY',
    zipCode: '10016',
    capacity: 80,
    photos: [],
    hasCompletedOnboarding: true,
    openingHours: {
      monday: { open: '17:00', close: '22:00', isClosed: false },
      tuesday: { open: '17:00', close: '22:00', isClosed: false },
      wednesday: { open: '17:00', close: '22:00', isClosed: false },
      thursday: { open: '17:00', close: '22:00', isClosed: false },
      friday: { open: '17:00', close: '23:00', isClosed: false },
      saturday: { open: '17:00', close: '23:00', isClosed: false },
      sunday: { open: '', close: '', isClosed: true },
    },
  },
  {
    email: 'owner.sakura@email.com',
    displayName: 'Kenji Tanaka',
    restaurantName: 'Sakura Omakase',
    cuisineType: 'Japanese',
    phone: '+1 (415) 555-0200',
    address: '567 Mission Street',
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94103',
    capacity: 20,
    photos: [],
    hasCompletedOnboarding: true,
    openingHours: {
      monday: { open: '', close: '', isClosed: true },
      tuesday: { open: '18:00', close: '22:00', isClosed: false },
      wednesday: { open: '18:00', close: '22:00', isClosed: false },
      thursday: { open: '18:00', close: '22:00', isClosed: false },
      friday: { open: '18:00', close: '23:00', isClosed: false },
      saturday: { open: '18:00', close: '23:00', isClosed: false },
      sunday: { open: '18:00', close: '22:00', isClosed: false },
    },
  },
  {
    email: 'owner.coastalprime@email.com',
    displayName: 'Marcus Thompson',
    restaurantName: 'Coastal Prime',
    cuisineType: 'Seafood & Steakhouse',
    phone: '+1 (305) 555-0300',
    address: '789 Ocean Drive',
    city: 'Miami',
    state: 'FL',
    zipCode: '33139',
    capacity: 120,
    photos: [],
    hasCompletedOnboarding: true,
    openingHours: {
      monday: { open: '11:00', close: '22:00', isClosed: false },
      tuesday: { open: '11:00', close: '22:00', isClosed: false },
      wednesday: { open: '11:00', close: '22:00', isClosed: false },
      thursday: { open: '11:00', close: '22:00', isClosed: false },
      friday: { open: '11:00', close: '23:00', isClosed: false },
      saturday: { open: '11:00', close: '23:00', isClosed: false },
      sunday: { open: '11:00', close: '22:00', isClosed: false },
    },
  },
  {
    email: 'owner.emberash@email.com',
    displayName: 'Sarah Mitchell',
    restaurantName: 'Ember & Ash',
    cuisineType: 'Modern American',
    phone: '+1 (312) 555-0400',
    address: '456 Michigan Avenue',
    city: 'Chicago',
    state: 'IL',
    zipCode: '60611',
    capacity: 60,
    photos: [],
    hasCompletedOnboarding: true,
    openingHours: {
      monday: { open: '', close: '', isClosed: true },
      tuesday: { open: '', close: '', isClosed: true },
      wednesday: { open: '17:00', close: '22:00', isClosed: false },
      thursday: { open: '17:00', close: '22:00', isClosed: false },
      friday: { open: '17:00', close: '23:00', isClosed: false },
      saturday: { open: '17:00', close: '23:00', isClosed: false },
      sunday: { open: '17:00', close: '21:00', isClosed: false },
    },
  },
  {
    email: 'owner.ladolcevita@email.com',
    displayName: 'Antonio Ricci',
    restaurantName: 'La Dolce Vita',
    cuisineType: 'Italian',
    phone: '+1 (617) 555-0500',
    address: '321 Hanover Street',
    city: 'Boston',
    state: 'MA',
    zipCode: '02113',
    capacity: 45,
    photos: [],
    hasCompletedOnboarding: false,
    openingHours: {
      monday: { open: '11:00', close: '21:00', isClosed: false },
      tuesday: { open: '11:00', close: '21:00', isClosed: false },
      wednesday: { open: '11:00', close: '21:00', isClosed: false },
      thursday: { open: '11:00', close: '21:00', isClosed: false },
      friday: { open: '11:00', close: '22:00', isClosed: false },
      saturday: { open: '11:00', close: '22:00', isClosed: false },
      sunday: { open: '12:00', close: '21:00', isClosed: false },
    },
  },
];

const seedReports = [
  {
    restaurantId: 'temp-1',
    restaurantName: 'La Dolce Vita',
    type: 'safety' as const,
    description: 'Customer reported finding a foreign object in their pasta dish. The issue was addressed immediately and the customer was offered a full refund.',
    status: 'pending' as const,
    reportedAt: 'Dec 10, 2024',
  },
  {
    restaurantId: 'temp-2',
    restaurantName: 'Coastal Prime',
    type: 'service' as const,
    description: 'Multiple complaints about slow service during peak hours. Management has been notified and additional staff training is scheduled.',
    status: 'resolved' as const,
    reportedAt: 'Dec 8, 2024',
  },
  {
    restaurantId: 'temp-3',
    restaurantName: 'Sakura Omakase',
    type: 'food' as const,
    description: 'Customer reported that the fish quality was below standard for an omakase experience. Chef reviewed supplier contracts.',
    status: 'resolved' as const,
    reportedAt: 'Dec 5, 2024',
  },
];

export async function seedFirebase() {
  try {
    // Check if data already exists
    const restaurantsSnapshot = await getDocs(collection(db, 'restaurants'));
    if (!restaurantsSnapshot.empty) {
      console.log('Firebase already seeded. Skipping...');
      return { success: true, message: 'Data already exists' };
    }

    // Create admin config with master password
    console.log('Creating admin configuration...');
    await setDoc(doc(db, 'settings', 'adminConfig'), {
      masterPassword: 'admin123',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Create default admin user
    console.log('Creating default admin...');
    await setDoc(doc(db, 'admins', 'admin@demo.com'), {
      email: 'admin@demo.com',
      name: 'Admin User',
      role: 'admin',
      createdAt: serverTimestamp(),
    });

    console.log('Seeding restaurants...');
    const restaurantIds: { [key: string]: string } = {};
    for (let i = 0; i < seedRestaurants.length; i++) {
      const docRef = await addDoc(collection(db, 'restaurants'), {
        ...seedRestaurants[i],
        createdAt: serverTimestamp(),
      });
      restaurantIds[`temp-${i + 1}`] = docRef.id;
    }

    console.log('Seeding users...');
    for (const user of seedUsers) {
      await addDoc(collection(db, 'users'), {
        ...user,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    console.log('Seeding restaurant owners...');
    for (const owner of seedRestaurantOwners) {
      await addDoc(collection(db, 'restaurant-owners'), {
        ...owner,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    console.log('Seeding reports...');
    for (const report of seedReports) {
      // Map temp IDs to actual restaurant IDs
      const actualRestaurantId = restaurantIds[report.restaurantId] || report.restaurantId;
      await addDoc(collection(db, 'reports'), {
        ...report,
        restaurantId: actualRestaurantId,
        createdAt: serverTimestamp(),
      });
    }

    console.log('Firebase seeding completed successfully!');
    return { success: true, message: 'Firebase seeded successfully' };
  } catch (error) {
    console.error('Error seeding Firebase:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error occurred' };
  }
}