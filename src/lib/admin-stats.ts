import type { User, RestaurantOwner, Report } from './firebase-hooks';
import { Timestamp } from 'firebase/firestore';

export interface AdminStats {
  // Restaurant stats
  totalRestaurants: number;
  activeRestaurants: number;
  restaurantGrowth: string;
  
  // User stats
  totalUsers: number;
  activeUsers: number;
  userGrowth: string;
  
  // Reservation stats
  totalReservations: number;
  reservationGrowth: string;
  
  // Report stats
  pendingReports: number;
  totalReports: number;
  
  // Review stats (placeholder)
  totalReviews: number;
  averageRating: number;
}

// Helper to check if a timestamp is within a date range
const isWithinRange = (timestamp: Timestamp | Date | undefined, start: Date, end: Date): boolean => {
  if (!timestamp) return false;
  const date = timestamp instanceof Timestamp ? timestamp.toDate() : (timestamp instanceof Date ? timestamp : new Date(timestamp));
  return date >= start && date <= end;
};

// Calculate growth percentage
const calculateGrowth = (current: number, previous: number): string => {
  if (previous === 0) {
    return current > 0 ? '+100' : '0';
  }
  const growth = (((current - previous) / previous) * 100).toFixed(0);
  return parseInt(growth) >= 0 ? `+${growth}` : growth;
};

export function calculateAdminStats(
  users: User[],
  restaurantOwners: RestaurantOwner[],
  reports: Report[]
): AdminStats {
  // Calculate date ranges
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  // Calculate users created this month vs last month
  const usersThisMonth = users.filter(u => isWithinRange(u.createdAt, thisMonthStart, now)).length;
  const usersLastMonth = users.filter(u => isWithinRange(u.createdAt, lastMonthStart, lastMonthEnd)).length;
  const userGrowth = calculateGrowth(usersThisMonth, usersLastMonth);
  
  // Calculate restaurants created this month vs last month
  const restaurantsThisMonth = restaurantOwners.filter(r => 
    isWithinRange(r.createdAt, thisMonthStart, now)
  ).length;
  const restaurantsLastMonth = restaurantOwners.filter(r => 
    isWithinRange(r.createdAt, lastMonthStart, lastMonthEnd)
  ).length;
  const restaurantGrowth = calculateGrowth(restaurantsThisMonth, restaurantsLastMonth);
  
  // Calculate total reservations and estimate monthly growth
  const totalReservations = users.reduce((acc, u) => acc + (u.stats?.totalReservations || 0), 0);
  const avgReservationsPerUser = users.length > 0 ? totalReservations / users.length : 0;
  const estimatedReservationsThisMonth = usersThisMonth * avgReservationsPerUser;
  const estimatedReservationsLastMonth = usersLastMonth * avgReservationsPerUser;
  const reservationGrowth = calculateGrowth(
    Math.round(estimatedReservationsThisMonth),
    Math.round(estimatedReservationsLastMonth)
  );
  
  // Calculate active users (users with reservations OR created in last 30 days)
  const activeUsers = users.filter(u => {
    const hasReservations = (u.stats?.totalReservations || 0) > 0;
    const recentlyCreated = isWithinRange(u.createdAt, thirtyDaysAgo, now);
    return hasReservations || recentlyCreated;
  }).length;
  
  return {
    // Restaurant stats from restaurant-owners collection
    totalRestaurants: restaurantOwners.length,
    activeRestaurants: restaurantOwners.filter(r => r.hasCompletedOnboarding).length,
    restaurantGrowth,
    
    // User stats from users collection
    totalUsers: users.length,
    activeUsers: activeUsers,
    userGrowth,
    
    // Aggregate stats from users collection
    totalReservations,
    reservationGrowth,
    
    // Report stats
    pendingReports: reports.filter(r => r.status === 'pending').length,
    totalReports: reports.length,
    
    // Review stats (placeholder - will be calculated from reviews collection later)
    totalReviews: 0,
    averageRating: 0,
  };
}