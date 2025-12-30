import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { UserDetailsScreen } from './user-details-screen';
import {
  Search,
  Users,
  UserCheck,
  TrendingUp,
  Calendar,
  Star,
  CreditCard,
  Eye,
  Mail,
  Activity,
  MapPin,
  Phone,
  Heart,
  ShieldCheck,
  Ban,
  MessageCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useUsers, useRestaurantOwners, useReports } from '../lib/firebase-hooks';
import { calculateAdminStats } from '../lib/admin-stats';

interface PlatformUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  status: 'active' | 'inactive' | 'suspended';
  joinedDate: string;
  totalReservations: number;
  favoriteRestaurants: number;
  reviewsWritten: number;
  lastActive: string;
  membershipTier: 'free' | 'premium' | 'elite';
  totalSpent: number;
  averageRating: number;
}

export function UsersTab() {
  // Firebase hooks
  const { users: firebaseUsers, loading } = useUsers();
  const { restaurantOwners, loading: restaurantOwnersLoading } = useRestaurantOwners();
  const { reports, loading: reportsLoading } = useReports();
  
  // Calculate stats
  const stats = calculateAdminStats(firebaseUsers, restaurantOwners, reports);
  
  // Convert Firebase users to platform users for UI display
  const platformUsers: PlatformUser[] = firebaseUsers.map(user => ({
    id: user.id,
    name: user.displayName || user.username,
    email: user.email,
    phone: user.phoneNumber || 'N/A',
    location: 'N/A', // TODO: Add location to User type
    status: 'active' as 'active' | 'inactive' | 'suspended', // Default to active
    joinedDate: user.createdAt ? new Date(user.createdAt.seconds * 1000).toLocaleDateString() : 'N/A',
    totalReservations: user.stats?.totalReservations || 0,
    favoriteRestaurants: user.preferences?.favoriteRestaurants?.length || 0,
    reviewsWritten: 0, // TODO: Add to stats
    lastActive: user.updatedAt ? new Date(user.updatedAt.seconds * 1000).toLocaleDateString() : 'N/A',
    membershipTier: 'free' as 'free' | 'premium' | 'elite', // TODO: Add to User type
    totalSpent: 0, // TODO: Add to stats
    averageRating: 0, // TODO: Add to stats
  }));
  
  // UI state
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<PlatformUser | null>(null);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [showUserDetailsScreen, setShowUserDetailsScreen] = useState(false);
  const [userForDetailsScreen, setUserForDetailsScreen] = useState<PlatformUser | null>(null);

  const filteredUsers = platformUsers.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                         u.email.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                         u.location.toLowerCase().includes(userSearchQuery.toLowerCase());
    return matchesSearch;
  });

  const userStats = {
    total: platformUsers.length, // Use actual count from Firebase
    active: platformUsers.filter(u => u.status === 'active').length,
    inactive: platformUsers.filter(u => u.status === 'inactive').length,
    suspended: platformUsers.filter(u => u.status === 'suspended').length,
    elite: platformUsers.filter(u => u.membershipTier === 'elite').length,
    premium: platformUsers.filter(u => u.membershipTier === 'premium').length,
    free: platformUsers.filter(u => u.membershipTier === 'free').length,
  };

  const handleOpenUserDialog = (user: PlatformUser) => {
    setSelectedUser(user);
    setIsUserDialogOpen(true);
  };

  const handleCloseUserDialog = () => {
    setSelectedUser(null);
    setIsUserDialogOpen(false);
  };

  const handleOpenUserDetailsScreen = (user: PlatformUser) => {
    setUserForDetailsScreen(user);
    setShowUserDetailsScreen(true);
    setIsUserDialogOpen(false);
  };

  const handleCloseUserDetailsScreen = () => {
    setShowUserDetailsScreen(false);
    setUserForDetailsScreen(null);
  };

  // Show loading state
  if (loading || restaurantOwnersLoading || reportsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-300">Loading users...</p>
        </div>
      </div>
    );
  }

  // Show User Details Screen if active
  if (showUserDetailsScreen && userForDetailsScreen) {
    return (
      <UserDetailsScreen 
        user={userForDetailsScreen} 
        onBack={handleCloseUserDetailsScreen}
        restaurantOwners={restaurantOwners}
        onViewRestaurant={(restaurantId) => {
          // Find the restaurant and navigate to it
          const restaurant = restaurantOwners.find(r => r.id === restaurantId);
          if (restaurant) {
            // Close user details and show message about navigating to restaurant
            handleCloseUserDetailsScreen();
            toast.info('Navigate to Restaurants tab to view restaurant details');
          }
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 bg-slate-800 border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-8 h-8 text-purple-400" />
          </div>
          <div className="text-3xl text-slate-100 mb-1">{userStats.total.toLocaleString()}</div>
          <div className="text-sm text-slate-400">Total Users</div>
          <div className={`text-xs mt-2 ${stats.userGrowth.startsWith('+') ? 'text-green-400' : stats.userGrowth.startsWith('-') ? 'text-red-400' : 'text-slate-500'}`}>
            {stats.userGrowth}% this month
          </div>
        </Card>

        <Card className="p-6 bg-slate-800 border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <UserCheck className="w-8 h-8 text-green-400" />
          </div>
          <div className="text-3xl text-slate-100 mb-1">{userStats.active}</div>
          <div className="text-sm text-slate-400">Active Users</div>
          <div className="text-xs text-slate-500 mt-2">Last 30 days</div>
        </Card>

        <Card className="p-6 bg-slate-800 border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <CreditCard className="w-8 h-8 text-cyan-400" />
          </div>
          <div className="text-3xl text-slate-100 mb-1">{userStats.elite + userStats.premium}</div>
          <div className="text-sm text-slate-400">Premium Members</div>
          <div className="text-xs text-cyan-400 mt-2">{userStats.elite} elite members</div>
        </Card>

        <Card className="p-6 bg-slate-800 border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-8 h-8 text-yellow-400" />
          </div>
          <div className="text-3xl text-slate-100 mb-1">
            {Math.round(platformUsers.reduce((acc, u) => acc + u.totalReservations, 0) / platformUsers.length)}
          </div>
          <div className="text-sm text-slate-400">Avg Reservations</div>
          <div className="text-xs text-slate-500 mt-2">Per user</div>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
        <Input
          placeholder="Search users by name, email, or location..."
          value={userSearchQuery}
          onChange={(e) => setUserSearchQuery(e.target.value)}
          className="pl-10 bg-slate-800 border-slate-700 text-slate-100"
        />
      </div>

      {/* Users List */}
      <Card className="bg-slate-800 border-slate-700">
        <div className="p-6">
          <h3 className="text-xl text-slate-100 mb-4">Platform Users</h3>
          <div className="space-y-2">
            {filteredUsers.map((user) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="p-4 bg-slate-700/50 rounded-lg border border-slate-700 hover:border-slate-600 cursor-pointer transition-all"
                onClick={() => handleOpenUserDialog(user)}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* User Avatar and Info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-lg">
                        {user.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-slate-100 truncate">{user.name}</h4>
                      <p className="text-sm text-slate-400 flex items-center gap-1 truncate">
                        <Mail className="w-3 h-3 flex-shrink-0" />
                        {user.email}
                      </p>
                    </div>
                  </div>

                  {/* User Stats */}
                  <div className="flex items-center gap-4 flex-wrap">
                    {/* Location */}
                    <div className="flex items-center gap-1 text-sm text-slate-400">
                      <MapPin className="w-4 h-4" />
                      <span className="hidden md:inline">{user.location}</span>
                    </div>

                    {/* Membership Tier */}
                    <Badge
                      className={
                        user.membershipTier === 'elite'
                          ? 'bg-amber-500/20 text-amber-400'
                          : user.membershipTier === 'premium'
                          ? 'bg-purple-500/20 text-purple-400'
                          : 'bg-slate-500/20 text-slate-400'
                      }
                    >
                      {user.membershipTier}
                    </Badge>

                    {/* Status */}
                    <Badge
                      className={
                        user.status === 'active'
                          ? 'bg-green-500/20 text-green-400'
                          : user.status === 'inactive'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-red-500/20 text-red-400'
                      }
                    >
                      {user.status}
                    </Badge>

                    {/* Reservations Count */}
                    <div className="flex items-center gap-1 text-sm text-slate-300">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span>{user.totalReservations}</span>
                    </div>

                    {/* View Button */}
                    <Button 
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenUserDetailsScreen(user);
                      }}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Card>

      {/* User Details Dialog */}
      <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
        <DialogContent className="max-w-4xl w-[95vw] sm:w-[90vw] lg:w-full bg-slate-900 border-slate-700 max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>Comprehensive information about the selected user</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              {/* Compact Header with Gradient */}
              <div className="relative px-4 sm:px-6 pt-4 sm:pt-6 pb-4 bg-gradient-to-br from-purple-600/20 via-pink-600/20 to-blue-600/20 border-b border-slate-700">
                <div className="flex items-start gap-3">
                  <div className="relative flex-shrink-0">
                    <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center ring-2 ring-slate-800">
                      <span className="text-white text-lg font-medium">
                        {selectedUser.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-slate-900 ${
                      selectedUser.status === 'active' ? 'bg-green-400' : 
                      selectedUser.status === 'inactive' ? 'bg-yellow-400' : 
                      'bg-red-400'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-medium text-slate-100 mb-0.5 truncate">{selectedUser.name}</h3>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mb-2">
                      <span className="truncate max-w-[200px]">{selectedUser.email}</span>
                      <span>•</span>
                      <span>{selectedUser.location}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge
                        className={`text-[10px] px-1.5 py-0.5 ${
                          selectedUser.membershipTier === 'elite'
                            ? 'bg-amber-500 text-black'
                            : selectedUser.membershipTier === 'premium'
                            ? 'bg-purple-500 text-white'
                            : 'bg-slate-600 text-white'
                        }`}
                      >
                        {selectedUser.membershipTier === 'elite' ? '⭐ Elite' : 
                         selectedUser.membershipTier === 'premium' ? '💎 Premium' : 
                         'Free'}
                      </Badge>
                      <Badge
                        className={`text-[10px] px-1.5 py-0.5 ${
                          selectedUser.status === 'active'
                            ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                            : selectedUser.status === 'inactive'
                            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                            : 'bg-red-500/20 text-red-400 border border-red-500/50'
                        }`}
                      >
                        {selectedUser.status === 'active' ? 'Active' :
                         selectedUser.status === 'inactive' ? 'Inactive' :
                         'Suspended'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Compact Stats Grid */}
              <div className="grid grid-cols-4 gap-3 px-4 sm:px-6">
                <div className="p-3 bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20 rounded-lg">
                  <div className="flex flex-col items-center text-center">
                    <Calendar className="w-4 h-4 text-blue-400 mb-1" />
                    <div className="text-lg font-semibold text-slate-100">{selectedUser.totalReservations}</div>
                    <div className="text-[10px] text-slate-400">Bookings</div>
                  </div>
                </div>

                <div className="p-3 bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border border-yellow-500/20 rounded-lg">
                  <div className="flex flex-col items-center text-center">
                    <Star className="w-4 h-4 text-yellow-400 mb-1" />
                    <div className="text-lg font-semibold text-slate-100">{selectedUser.reviewsWritten}</div>
                    <div className="text-[10px] text-slate-400">Reviews</div>
                  </div>
                </div>

                <div className="p-3 bg-gradient-to-br from-pink-500/10 to-pink-600/10 border border-pink-500/20 rounded-lg">
                  <div className="flex flex-col items-center text-center">
                    <Heart className="w-4 h-4 text-pink-400 mb-1" />
                    <div className="text-lg font-semibold text-slate-100">{selectedUser.favoriteRestaurants}</div>
                    <div className="text-[10px] text-slate-400">Favorites</div>
                  </div>
                </div>

                <div className="p-3 bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20 rounded-lg">
                  <div className="flex flex-col items-center text-center">
                    <CreditCard className="w-4 h-4 text-green-400 mb-1" />
                    <div className="text-lg font-semibold text-slate-100">${selectedUser.totalSpent}</div>
                    <div className="text-[10px] text-slate-400">Spent</div>
                  </div>
                </div>
              </div>

              {/* Two Column Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 px-4 sm:px-6">
                {/* Left Column */}
                <div className="space-y-3">
                  {/* Contact Card */}
                  <Card className="p-4 bg-slate-800/50 border-slate-700">
                    <div className="flex items-center gap-2 mb-3">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <h4 className="text-xs font-medium text-slate-300 uppercase tracking-wide">Contact</h4>
                    </div>
                    <div className="space-y-2.5">
                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 bg-slate-700/50 rounded flex items-center justify-center flex-shrink-0">
                          <Phone className="w-3 h-3 text-slate-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[10px] text-slate-500 mb-0.5">Phone</div>
                          <div className="text-xs text-slate-200">{selectedUser.phone}</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 bg-slate-700/50 rounded flex items-center justify-center flex-shrink-0">
                          <Mail className="w-3 h-3 text-slate-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[10px] text-slate-500 mb-0.5">Email</div>
                          <div className="text-xs text-slate-200 break-all">{selectedUser.email}</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 bg-slate-700/50 rounded flex items-center justify-center flex-shrink-0">
                          <MapPin className="w-3 h-3 text-slate-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[10px] text-slate-500 mb-0.5">Location</div>
                          <div className="text-xs text-slate-200">{selectedUser.location}</div>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Activity Card */}
                  <Card className="p-4 bg-slate-800/50 border-slate-700">
                    <div className="flex items-center gap-2 mb-3">
                      <Activity className="w-3.5 h-3.5 text-slate-400" />
                      <h4 className="text-xs font-medium text-slate-300 uppercase tracking-wide">Activity</h4>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 bg-slate-700/30 rounded">
                        <span className="text-xs text-slate-400">Joined</span>
                        <span className="text-xs text-slate-200">{selectedUser.joinedDate}</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-slate-700/30 rounded">
                        <span className="text-xs text-slate-400">Last Active</span>
                        <span className="text-xs text-slate-200">{selectedUser.lastActive}</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-slate-700/30 rounded">
                        <span className="text-xs text-slate-400">Tier</span>
                        <span className="text-xs text-slate-200 capitalize">{selectedUser.membershipTier}</span>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Right Column */}
                <div className="space-y-3">
                  {/* Engagement Card */}
                  <Card className="p-4 bg-slate-800/50 border-slate-700">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
                      <h4 className="text-xs font-medium text-slate-300 uppercase tracking-wide">Engagement</h4>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] text-slate-400">Reservations</span>
                          <span className="text-xs text-slate-200">{selectedUser.totalReservations}</span>
                        </div>
                        <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
                            style={{ width: `${Math.min((selectedUser.totalReservations / 30) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] text-slate-400">Reviews</span>
                          <span className="text-xs text-slate-200">{selectedUser.reviewsWritten}</span>
                        </div>
                        <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-yellow-500 to-orange-500"
                            style={{ width: `${Math.min((selectedUser.reviewsWritten / 20) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] text-slate-400">Loyalty</span>
                          <span className="text-xs text-slate-200">{selectedUser.favoriteRestaurants}</span>
                        </div>
                        <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-pink-500 to-purple-500"
                            style={{ width: `${Math.min((selectedUser.favoriteRestaurants / 10) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Rating Card */}
                  <Card className="p-4 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Star className="w-8 h-8 text-yellow-400 fill-yellow-400" />
                        <div>
                          <div className="text-2xl font-semibold text-slate-100">{selectedUser.averageRating.toFixed(1)}</div>
                          <div className="text-[10px] text-slate-400">Avg Rating</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-slate-300">{selectedUser.reviewsWritten}</div>
                        <div className="text-[10px] text-slate-500">reviews</div>
                      </div>
                    </div>
                  </Card>

                  {/* Spending Card */}
                  <Card className="p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-semibold text-slate-100">${selectedUser.totalSpent.toLocaleString()}</div>
                        <div className="text-[10px] text-slate-400">Lifetime Value</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-green-400">
                          ${Math.round(selectedUser.totalSpent / selectedUser.totalReservations)}
                        </div>
                        <div className="text-[10px] text-slate-500">per booking</div>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 px-4 sm:px-6 pb-4 border-t border-slate-700 pt-4">
                {selectedUser.status === 'active' ? (
                  <Button 
                    variant="outline"
                    size="sm"
                    className="flex-1 border-red-600/50 text-red-400 hover:bg-red-600/10 hover:border-red-600 text-xs h-9"
                    onClick={() => {
                      // TODO: Implement user suspension when status field is added to User type
                      toast.warning(`User ${selectedUser.name} would be suspended (status field not yet in User type)`);
                      handleCloseUserDialog();
                    }}
                  >
                    <Ban className="w-3.5 h-3.5 mr-1.5" />
                    Suspend
                  </Button>
                ) : selectedUser.status === 'suspended' ? (
                  <Button 
                    variant="outline"
                    size="sm"
                    className="flex-1 border-green-600/50 text-green-400 hover:bg-green-600/10 hover:border-green-600 text-xs h-9"
                    onClick={() => {
                      // TODO: Implement user activation when status field is added to User type
                      toast.success(`User ${selectedUser.name} would be activated (status field not yet in User type)`);
                      handleCloseUserDialog();
                    }}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                    Activate
                  </Button>
                ) : null}
                
                <Button 
                  size="sm"
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-xs h-9"
                  onClick={() => {
                    handleOpenUserDetailsScreen(selectedUser);
                  }}
                >
                  <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
                  Contact
                </Button>
                
                <Button 
                  size="sm"
                  variant="outline" 
                  className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-slate-500 text-xs h-9"
                  onClick={handleCloseUserDialog}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}