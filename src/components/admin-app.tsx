import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Timestamp } from 'firebase/firestore';
import { useRestaurants } from '../lib/firebase-hooks';
import { useUsers } from '../lib/firebase-hooks';
import { useRestaurantOwners } from '../lib/firebase-hooks';
import { useReports } from '../lib/firebase-hooks';
import { seedFirebase } from '../lib/seed-firebase';
import { useAdminAuth } from '../lib/admin-auth';
import { calculateAdminStats } from '../lib/admin-stats';
import { UsersTab } from './users-tab';
import { AdminManagement } from './admin-management';
import { ReportDetailsDialog } from './report-details-dialog';
import { FirebaseSetupBanner } from './firebase-setup-banner';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { toast } from 'sonner';
import {
  Building2,
  TrendingUp,
  Star,
  AlertTriangle,
  Search,
  Eye,
  FileWarning,
  LayoutDashboard,
  Settings,
  CheckCircle2,
  MapPin,
  Users,
  Calendar,
  Phone,
  Mail,
  Clock,
  MessageSquare,
  ThumbsUp,
} from 'lucide-react';

interface Restaurant {
  id: string;
  name: string;
  cuisine?: string;
  location: string;
  priceRange?: string;
  status: 'active' | 'inactive' | 'pending';
  totalReviews: number;
  averageRating: number;
  recentReports: number;
  totalReservations: number;
  uniqueUsers?: number;
  activeUsers?: number;
  repeatCustomers?: number;
  featuredImage?: string;
  createdAt?: Timestamp;
}

interface Report {
  id: string;
  restaurantId: string;
  restaurantName: string;
  type: 'service' | 'food' | 'safety' | 'other';
  description: string;
  status: 'pending' | 'resolved';
  reportedAt: string;
}

export function AdminApp() {
  // Firebase hooks
  const { restaurants, loading: restaurantsLoading, error: restaurantsError } = useRestaurants();
  const { users, loading: usersLoading, error: usersError } = useUsers();
  const { restaurantOwners, loading: restaurantOwnersLoading, error: restaurantOwnersError } = useRestaurantOwners();
  const { reports, loading: reportsLoading, updateReport, error: reportsError } = useReports();
  const { updateMasterPassword } = useAdminAuth();
  
  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [reportsSearchQuery, setReportsSearchQuery] = useState('');
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [showFirebaseSetup, setShowFirebaseSetup] = useState(true);
  const [settings, setSettings] = useState({
    emailNotifications: true,
    autoApprove: false,
    maintenanceMode: false,
    criticalReportsThreshold: 3,
    minimumRatingAlert: 3.5,
  });
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Check if Firebase has connection errors
  const hasFirebaseError = restaurantsError || usersError || restaurantOwnersError || reportsError;
  const isDataEmpty = !restaurantsLoading && restaurants.length === 0 && 
                       !usersLoading && users.length === 0 &&
                       !restaurantOwnersLoading && restaurantOwners.length === 0;

  // Show Firebase error banner if there are connection errors
  useEffect(() => {
    if (hasFirebaseError) {
      const errorMessage = restaurantsError || usersError || restaurantOwnersError || reportsError;
      console.error('Firebase connection error:', errorMessage);
      
      // Only show setup banner if it's a permission or connection error
      if (errorMessage && (
        errorMessage.includes('permission') || 
        errorMessage.includes('Connection error') ||
        errorMessage.includes('security rules')
      )) {
        setShowFirebaseSetup(true);
      }
    }
  }, [hasFirebaseError, restaurantsError, usersError, restaurantOwnersError, reportsError]);

  // Seed Firebase on first load if no data
  useEffect(() => {
    if (!restaurantsLoading && restaurants.length === 0) {
      handleSeedData();
    }
  }, [restaurantsLoading, restaurants.length]);

  const handleSeedData = async () => {
    setIsSeeding(true);
    const result = await seedFirebase();
    if (result.success) {
      toast.success('Database seeded successfully!');
    } else {
      toast.error('Failed to seed database: ' + result.message);
    }
    setIsSeeding(false);
  };

  // Filter restaurant owners for the Restaurants tab
  const filteredRestaurantOwners = restaurantOwners.filter(owner => {
    const matchesSearch = owner.restaurantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         owner.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         owner.state.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Filter reports for the Reports tab
  const filteredReports = reports.filter(report => {
    const matchesSearch = report.restaurantName.toLowerCase().includes(reportsSearchQuery.toLowerCase()) ||
                         report.description.toLowerCase().includes(reportsSearchQuery.toLowerCase()) ||
                         report.type.toLowerCase().includes(reportsSearchQuery.toLowerCase());
    return matchesSearch;
  });

  // Calculate stats from actual Firebase collections
  const stats = calculateAdminStats(users, restaurantOwners, reports);

  const handleResolveReport = async (reportId: string) => {
    try {
      await updateReport(reportId, { status: 'resolved' });
      toast.success('Report marked as resolved');
    } catch (error) {
      toast.error('Failed to update report');
      console.error(error);
    }
  };

  const handleOpenDetailsDialog = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setIsDetailsDialogOpen(true);
  };

  const handleCloseDetailsDialog = () => {
    setSelectedRestaurant(null);
    setIsDetailsDialogOpen(false);
  };

  const handleOpenReportDialog = (report: Report) => {
    setSelectedReport(report);
    setIsReportDialogOpen(true);
  };

  const handleCloseReportDialog = () => {
    setSelectedReport(null);
    setIsReportDialogOpen(false);
  };

  const handleSettingsChange = (key: keyof typeof settings, value: boolean | string | number) => {
    setSettings(prevSettings => ({
      ...prevSettings,
      [key]: value,
    }));
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('New password and confirm password do not match');
      return;
    }
    
    if (!currentPassword || !newPassword) {
      toast.error('Please fill in all fields');
      return;
    }
    
    setIsChangingPassword(true);
    const result = await updateMasterPassword(currentPassword, newPassword);
    
    if (result.success) {
      toast.success('Master password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      toast.error(result.error || 'Failed to change password');
    }
    setIsChangingPassword(false);
  };

  // Show loading state
  if (restaurantsLoading || reportsLoading || isSeeding) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-300">
            {isSeeding ? 'Initializing database...' : 'Loading admin panel...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="container mx-auto p-6 max-w-[1600px]">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl text-slate-100 mb-2">Restaurant Admin Panel</h1>
            <p className="text-slate-400">Monitor restaurant performance, reviews, and reports</p>
          </div>
          {restaurants.length === 0 && !restaurantsLoading && (
            <Button
              onClick={handleSeedData}
              disabled={isSeeding}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isSeeding ? 'Seeding...' : 'Seed Database'}
            </Button>
          )}
        </div>

        {/* Firebase Setup Banner - Show when data is empty */}
        {isDataEmpty && showFirebaseSetup && !isSeeding && (
          <FirebaseSetupBanner onDismiss={() => setShowFirebaseSetup(false)} />
        )}

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-slate-800 mb-8">
            <TabsTrigger value="overview" className="data-[state=active]:bg-slate-700">
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-slate-700">
              <Users className="w-4 h-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="restaurants" className="data-[state=active]:bg-slate-700">
              <Building2 className="w-4 h-4 mr-2" />
              Restaurants
            </TabsTrigger>
            <TabsTrigger value="reports" className="data-[state=active]:bg-slate-700">
              <FileWarning className="w-4 h-4 mr-2" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-slate-700">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Top Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card className="p-6 bg-slate-800 border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <Users className="w-8 h-8 text-purple-400" />
                </div>
                <div className="text-3xl text-slate-100 mb-1">{stats.totalUsers.toLocaleString()}</div>
                <div className="text-sm text-slate-400">Registered Users</div>
                <div className="text-xs text-green-400 mt-2">{stats.activeUsers.toLocaleString()} active</div>
              </Card>

              <Card className="p-6 bg-slate-800 border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <Building2 className="w-8 h-8 text-blue-400" />
                </div>
                <div className="text-3xl text-slate-100 mb-1">{stats.totalRestaurants}</div>
                <div className="text-sm text-slate-400">Total Restaurants</div>
                <div className="text-xs text-green-400 mt-2">{stats.activeRestaurants} active</div>
              </Card>

              <Card className="p-6 bg-slate-800 border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <MessageSquare className="w-8 h-8 text-cyan-400" />
                </div>
                <div className="text-3xl text-slate-100 mb-1">{stats.totalReviews.toLocaleString()}</div>
                <div className="text-sm text-slate-400">Total Reviews</div>
                <div className="text-xs text-slate-500 mt-2">Avg: {stats.averageRating} stars</div>
              </Card>

              <Card className="p-6 bg-slate-800 border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <AlertTriangle className="w-8 h-8 text-red-400" />
                </div>
                <div className="text-3xl text-slate-100 mb-1">{stats.pendingReports}</div>
                <div className="text-sm text-slate-400">Pending Reports</div>
                <div className={`text-xs mt-2 ${stats.pendingReports > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {stats.pendingReports > 0 ? 'Needs attention' : 'All clear'}
                </div>
              </Card>

              <Card className="p-6 bg-slate-800 border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="w-8 h-8 text-green-400" />
                </div>
                <div className="text-3xl text-slate-100 mb-1">{stats.totalReservations.toLocaleString()}</div>
                <div className="text-sm text-slate-400">Total Reservations</div>
                <div className={`text-xs mt-2 ${stats.reservationGrowth.startsWith('+') || stats.reservationGrowth.startsWith('-') && parseInt(stats.reservationGrowth) < 0 ? 'text-green-400' : 'text-slate-500'}`}>
                  {stats.reservationGrowth}% this month
                </div>
              </Card>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6 bg-slate-800 border-slate-700">
                <h3 className="text-lg text-slate-100 mb-4">Recent Users</h3>
                <div className="space-y-3">
                  {users.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      No users registered yet
                    </div>
                  ) : (
                    users
                      .slice(0, 5)
                      .map((user) => (
                        <div key={user.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                              <Users className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <div className="text-slate-100">{user.displayName || user.username}</div>
                              <div className="text-sm text-slate-400">{user.email}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge className="bg-blue-500/20 text-blue-400">
                              {user.role}
                            </Badge>
                            <div className="text-xs text-slate-500 mt-1">
                              {user.stats?.totalReservations || 0} reservations
                            </div>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </Card>

              <Card className="p-6 bg-slate-800 border-slate-700">
                <h3 className="text-lg text-slate-100 mb-4">Recent Restaurants</h3>
                <div className="space-y-3">
                  {restaurantOwners.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      No restaurants registered yet
                    </div>
                  ) : (
                    restaurantOwners
                      .slice(0, 5)
                      .map((owner) => (
                        <div key={owner.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                              <Building2 className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <div className="text-slate-100">{owner.restaurantName}</div>
                              <div className="text-sm text-slate-400">{owner.city}, {owner.state}</div>
                            </div>
                          </div>
                          <Badge className={owner.hasCompletedOnboarding ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}>
                            {owner.hasCompletedOnboarding ? 'Active' : 'Pending'}
                          </Badge>
                        </div>
                      ))
                  )}
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <UsersTab />
          </TabsContent>

          {/* Restaurants Tab */}
          <TabsContent value="restaurants" className="space-y-6">
            {/* Top Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card className="p-6 bg-slate-800 border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <Building2 className="w-8 h-8 text-blue-400" />
                </div>
                <div className="text-3xl text-slate-100 mb-1">{stats.totalRestaurants}</div>
                <div className="text-sm text-slate-400">Total Restaurants</div>
              </Card>

              <Card className="p-6 bg-slate-800 border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="w-8 h-8 text-green-400" />
                </div>
                <div className="text-3xl text-slate-100 mb-1">{stats.activeRestaurants}</div>
                <div className="text-sm text-slate-400">Active Restaurants</div>
              </Card>

              <Card className="p-6 bg-slate-800 border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <MessageSquare className="w-8 h-8 text-cyan-400" />
                </div>
                <div className="text-3xl text-slate-100 mb-1">{stats.totalReviews.toLocaleString()}</div>
                <div className="text-sm text-slate-400">Total Reviews</div>
              </Card>

              <Card className="p-6 bg-slate-800 border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <Star className="w-8 h-8 text-yellow-400" />
                </div>
                <div className="text-3xl text-slate-100 mb-1">{stats.averageRating}</div>
                <div className="text-sm text-slate-400">Average Rating</div>
              </Card>

              <Card className="p-6 bg-slate-800 border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <AlertTriangle className="w-8 h-8 text-red-400" />
                </div>
                <div className="text-3xl text-slate-100 mb-1">{stats.totalReports}</div>
                <div className="text-sm text-slate-400">Active Reports</div>
              </Card>
            </div>

            {/* Search Bar */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                placeholder="Search restaurants by name or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-800 border-slate-700 text-slate-100"
              />
            </div>

            {/* Restaurants Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRestaurantOwners.map((owner) => {
                const ownerReports = reports.filter(r => r.restaurantName === owner.restaurantName).length;
                const restaurant: Restaurant = {
                  id: owner.id,
                  name: owner.restaurantName,
                  location: `${owner.city}, ${owner.state}`,
                  status: (owner.hasCompletedOnboarding ? 'active' : 'pending') as 'active' | 'inactive' | 'pending',
                  totalReviews: 0, // TODO: Add reviews collection
                  averageRating: 0, // TODO: Add reviews collection
                  recentReports: ownerReports,
                  totalReservations: 0, // TODO: Calculate from users
                  uniqueUsers: 0,
                  activeUsers: 0,
                  repeatCustomers: 0,
                };
                return (
                <motion.div
                  key={restaurant.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="p-6 bg-slate-800 border-slate-700 hover:border-slate-600 transition-colors">
                    {/* Restaurant Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                          <Building2 className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg text-slate-100">{restaurant.name}</h3>
                          <p className="text-sm text-slate-400">{restaurant.location}</p>
                        </div>
                      </div>
                      <Badge
                        className={
                          restaurant.status === 'active'
                            ? 'bg-green-500/20 text-green-400'
                            : restaurant.status === 'pending'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-red-500/20 text-red-400'
                        }
                      >
                        {restaurant.status}
                      </Badge>
                    </div>

                    {/* Reviews Section */}
                    <div className="mb-4 p-4 bg-slate-700/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-400">Customer Reviews</span>
                        <ThumbsUp className="w-4 h-4 text-slate-400" />
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                          <span className="text-2xl text-slate-100">{restaurant.averageRating > 0 ? restaurant.averageRating.toFixed(1) : 'N/A'}</span>
                        </div>
                        <div className="text-slate-400">
                          ({restaurant.totalReviews} reviews)
                        </div>
                      </div>
                    </div>

                    {/* Reports Section */}
                    <div className="mb-4 p-4 bg-slate-700/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-400">Reports & Issues</span>
                        <FileWarning className="w-4 h-4 text-slate-400" />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl text-slate-100">{restaurant.recentReports}</span>
                        {restaurant.recentReports > 0 ? (
                          <Badge className="bg-red-500/20 text-red-400">
                            Needs Attention
                          </Badge>
                        ) : (
                          <Badge className="bg-green-500/20 text-green-400">
                            No Issues
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Reservations Info */}
                    <div className="flex items-center justify-between text-sm text-slate-400 mb-4">
                      <span>Total Reservations</span>
                      <span className="text-slate-100">{restaurant.totalReservations.toLocaleString()}</span>
                    </div>

                    {/* Action Button */}
                    <Button 
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      onClick={() => handleOpenDetailsDialog(restaurant)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </Button>
                  </Card>
                </motion.div>
              );
            })}
            </div>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            <Card className="p-6 bg-slate-800 border-slate-700">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl text-slate-100">Restaurant Reports</h3>
                  <p className="text-sm text-slate-400 mt-1">
                    {stats.pendingReports > 0 
                      ? `${stats.pendingReports} pending ${stats.pendingReports === 1 ? 'report' : 'reports'} require attention`
                      : 'No pending reports - all clear'
                    }
                  </p>
                </div>
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    placeholder="Search reports..."
                    value={reportsSearchQuery}
                    onChange={(e) => setReportsSearchQuery(e.target.value)}
                    className="pl-10 bg-slate-800 border-slate-700 text-slate-100"
                  />
                </div>
              </div>

              <div className="space-y-3">
                {filteredReports.map((report) => (
                  <div key={report.id} className="p-4 bg-slate-700/50 rounded-lg border border-slate-700">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="text-slate-100">{report.restaurantName}</h4>
                          <Badge
                            className={
                              report.type === 'safety'
                                ? 'bg-red-500/20 text-red-400'
                                : report.type === 'food'
                                ? 'bg-orange-500/20 text-orange-400'
                                : report.type === 'service'
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : 'bg-slate-500/20 text-slate-400'
                            }
                          >
                            {report.type}
                          </Badge>
                          <Badge
                            className={
                              report.status === 'pending'
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : 'bg-green-500/20 text-green-400'
                            }
                          >
                            {report.status}
                          </Badge>
                        </div>
                        <p className="text-slate-300 mb-2">{report.description}</p>
                        <p className="text-sm text-slate-500">{report.reportedAt}</p>
                      </div>
                    </div>
                    {report.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleResolveReport(report.id)}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Mark Resolved
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-slate-600 text-slate-300 hover:bg-slate-700"
                          onClick={() => handleOpenReportDialog(report)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            {/* Admin Management Component */}
            <AdminManagement />
            
            <Card className="p-6 bg-slate-800 border-slate-700">
              <h3 className="text-xl text-slate-100 mb-6">Platform Settings</h3>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-slate-100 mb-1">Email Notifications</div>
                    <div className="text-sm text-slate-400">Receive email alerts for new reports and issues</div>
                  </div>
                  <Switch 
                    checked={settings.emailNotifications} 
                    onCheckedChange={(checked) => {
                      handleSettingsChange('emailNotifications', checked);
                      toast.success('Email notifications ' + (checked ? 'enabled' : 'disabled'));
                    }} 
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-slate-100 mb-1">Auto-Approve New Restaurants</div>
                    <div className="text-sm text-slate-400">Automatically approve new restaurant registrations</div>
                  </div>
                  <Switch 
                    checked={settings.autoApprove} 
                    onCheckedChange={(checked) => {
                      handleSettingsChange('autoApprove', checked);
                      toast.success('Auto-approve ' + (checked ? 'enabled' : 'disabled'));
                    }} 
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-slate-100 mb-1">Maintenance Mode</div>
                    <div className="text-sm text-slate-400">Enable system-wide maintenance mode</div>
                  </div>
                  <Switch 
                    checked={settings.maintenanceMode} 
                    onCheckedChange={(checked) => {
                      handleSettingsChange('maintenanceMode', checked);
                      toast.warning('Maintenance mode ' + (checked ? 'enabled' : 'disabled'));
                    }} 
                  />
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-slate-800 border-slate-700">
              <h3 className="text-xl text-slate-100 mb-6">Report Thresholds</h3>
              <div className="space-y-4">
                <div>
                  <Label className="text-slate-200">Critical Reports Threshold</Label>
                  <Input
                    type="number"
                    value={settings.criticalReportsThreshold}
                    onChange={(e) => handleSettingsChange('criticalReportsThreshold', parseInt(e.target.value))}
                    className="bg-slate-700 border-slate-600 text-slate-100 mt-2"
                  />
                  <p className="text-sm text-slate-400 mt-1">Number of reports before restaurant is flagged</p>
                </div>
                <div>
                  <Label className="text-slate-200">Minimum Rating Alert</Label>
                  <Input
                    type="number"
                    value={settings.minimumRatingAlert}
                    step="0.1"
                    onChange={(e) => handleSettingsChange('minimumRatingAlert', parseFloat(e.target.value))}
                    className="bg-slate-700 border-slate-600 text-slate-100 mt-2"
                  />
                  <p className="text-sm text-slate-400 mt-1">Alert when restaurant rating falls below this value</p>
                </div>
              </div>
              <Button 
                className="mt-6 bg-blue-600 hover:bg-blue-700"
                onClick={() => toast.success('Settings saved successfully!')}
              >
                Save Settings
              </Button>
            </Card>

            <Card className="p-6 bg-slate-800 border-slate-700">
              <h3 className="text-xl text-slate-100 mb-6">Change Master Password</h3>
              <div className="space-y-4">
                <div>
                  <Label className="text-slate-200">Current Password</Label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-slate-100 mt-2"
                  />
                </div>
                <div>
                  <Label className="text-slate-200">New Password</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-slate-100 mt-2"
                  />
                </div>
                <div>
                  <Label className="text-slate-200">Confirm New Password</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-slate-100 mt-2"
                  />
                </div>
              </div>
              <Button 
                className="mt-6 bg-blue-600 hover:bg-blue-700"
                onClick={handlePasswordChange}
                disabled={isChangingPassword}
              >
                {isChangingPassword ? 'Changing...' : 'Change Password'}
              </Button>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Restaurant Details Dialog */}
        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="max-w-3xl w-[95vw] sm:w-[90vw] md:w-[85vw] lg:w-full bg-slate-800 border-slate-700 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-slate-100">Restaurant Details</DialogTitle>
              <DialogDescription className="text-slate-400">
                Comprehensive information about the selected restaurant
              </DialogDescription>
            </DialogHeader>
            {selectedRestaurant && (
              <div className="space-y-4 sm:space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-slate-700/50 rounded-lg">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                    <Building2 className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg sm:text-xl text-slate-100">{selectedRestaurant.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400" />
                      <p className="text-xs sm:text-sm text-slate-400">{selectedRestaurant.location}</p>
                    </div>
                  </div>
                  <Badge
                    className={
                      selectedRestaurant.status === 'active'
                        ? 'bg-green-500/20 text-green-400'
                        : selectedRestaurant.status === 'pending'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-red-500/20 text-red-400'
                    }
                  >
                    {selectedRestaurant.status}
                  </Badge>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <Card className="p-3 sm:p-4 bg-slate-700/50 border-slate-600">
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
                      <span className="text-xs sm:text-sm text-slate-400">Average Rating</span>
                    </div>
                    <div className="text-xl sm:text-2xl text-slate-100">
                      {selectedRestaurant.averageRating > 0 ? selectedRestaurant.averageRating.toFixed(1) : 'N/A'}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Based on {selectedRestaurant.totalReviews} reviews
                    </div>
                  </Card>

                  <Card className="p-3 sm:p-4 bg-slate-700/50 border-slate-600">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
                      <span className="text-xs sm:text-sm text-slate-400">Total Reviews</span>
                    </div>
                    <div className="text-xl sm:text-2xl text-slate-100">
                      {selectedRestaurant.totalReviews.toLocaleString()}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Customer feedback
                    </div>
                  </Card>

                  <Card className="p-3 sm:p-4 bg-slate-700/50 border-slate-600">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
                      <span className="text-xs sm:text-sm text-slate-400">Reservations</span>
                    </div>
                    <div className="text-xl sm:text-2xl text-slate-100">
                      {selectedRestaurant.totalReservations.toLocaleString()}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Total bookings
                    </div>
                  </Card>

                  <Card className="p-3 sm:p-4 bg-slate-700/50 border-slate-600">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
                      <span className="text-xs sm:text-sm text-slate-400">Recent Reports</span>
                    </div>
                    <div className="text-xl sm:text-2xl text-slate-100">
                      {selectedRestaurant.recentReports}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {selectedRestaurant.recentReports > 0 ? 'Needs attention' : 'No issues'}
                    </div>
                  </Card>
                </div>

                {/* Contact Information */}
                <div>
                  <h4 className="text-xs sm:text-sm text-slate-400 mb-3">Contact Information</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 p-2 sm:p-3 bg-slate-700/30 rounded-lg">
                      <Phone className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400 flex-shrink-0" />
                      <span className="text-xs sm:text-sm text-slate-300">(555) 123-4567</span>
                    </div>
                    <div className="flex items-center gap-3 p-2 sm:p-3 bg-slate-700/30 rounded-lg">
                      <Mail className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400 flex-shrink-0" />
                      <span className="text-xs sm:text-sm text-slate-300 break-all">contact@{selectedRestaurant.name.toLowerCase().replace(' ', '')}.com</span>
                    </div>
                    <div className="flex items-center gap-3 p-2 sm:p-3 bg-slate-700/30 rounded-lg">
                      <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400 flex-shrink-0" />
                      <span className="text-xs sm:text-sm text-slate-300">Mon-Sun: 11:00 AM - 10:00 PM</span>
                    </div>
                  </div>
                </div>

                {/* User Engagement Section */}
                <div>
                  <h4 className="text-xs sm:text-sm text-slate-400 mb-3">User Engagement</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    <Card className="p-3 sm:p-4 bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
                        <span className="text-xs sm:text-sm text-slate-400">Unique Users</span>
                      </div>
                      <div className="text-xl sm:text-2xl text-slate-100">
                        {(selectedRestaurant.uniqueUsers ?? 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Total customers served
                      </div>
                    </Card>

                    <Card className="p-3 sm:p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                        <span className="text-xs sm:text-sm text-slate-400">Active Users</span>
                      </div>
                      <div className="text-xl sm:text-2xl text-slate-100">
                        {(selectedRestaurant.activeUsers ?? 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Last 30 days
                      </div>
                    </Card>

                    <Card className="p-3 sm:p-4 bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <ThumbsUp className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
                        <span className="text-xs sm:text-sm text-slate-400">Repeat Customers</span>
                      </div>
                      <div className="text-xl sm:text-2xl text-slate-100">
                        {(selectedRestaurant.repeatCustomers ?? 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {(selectedRestaurant.uniqueUsers ?? 0) > 0 ? `${(((selectedRestaurant.repeatCustomers ?? 0) / (selectedRestaurant.uniqueUsers ?? 1)) * 100).toFixed(1)}%` : '0%'} retention rate
                      </div>
                    </Card>
                  </div>
                  <div className="mt-3 p-3 bg-slate-700/30 rounded-lg">
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="text-slate-400">Average Reservations per User</span>
                      <span className="text-slate-100">
                        {(selectedRestaurant.uniqueUsers ?? 0) > 0 
                          ? (selectedRestaurant.totalReservations / (selectedRestaurant.uniqueUsers ?? 1)).toFixed(1) 
                          : '0.0'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Related Reports */}
                {reports.filter(r => r.restaurantId === selectedRestaurant.id).length > 0 && (
                  <div>
                    <h4 className="text-xs sm:text-sm text-slate-400 mb-3">Related Reports</h4>
                    <div className="space-y-2">
                      {reports
                        .filter(r => r.restaurantId === selectedRestaurant.id)
                        .slice(0, 3)
                        .map((report) => (
                          <div key={report.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 sm:p-3 bg-slate-700/30 rounded-lg">
                            <div className="flex items-start sm:items-center gap-2 flex-wrap">
                              <Badge
                                className={
                                  report.type === 'safety'
                                    ? 'bg-red-500/20 text-red-400'
                                    : report.type === 'food'
                                    ? 'bg-orange-500/20 text-orange-400'
                                    : report.type === 'service'
                                    ? 'bg-yellow-500/20 text-yellow-400'
                                    : 'bg-slate-500/20 text-slate-400'
                                }
                              >
                                {report.type}
                              </Badge>
                              <span className="text-xs sm:text-sm text-slate-300">{report.description}</span>
                            </div>
                            <Badge
                              className={
                                report.status === 'pending'
                                  ? 'bg-yellow-500/20 text-yellow-400'
                                  : 'bg-green-500/20 text-green-400'
                              }
                            >
                              {report.status}
                            </Badge>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-slate-700">
                  <Button 
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    onClick={() => {
                      toast.success(`Editing ${selectedRestaurant.name}`);
                      handleCloseDetailsDialog();
                    }}
                  >
                    Edit Restaurant
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                    onClick={handleCloseDetailsDialog}
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Report Details Dialog */}
        <ReportDetailsDialog
          isOpen={isReportDialogOpen}
          onClose={handleCloseReportDialog}
          report={selectedReport}
          restaurants={restaurants}
          onResolveReport={handleResolveReport}
          onViewRestaurant={handleOpenDetailsDialog}
        />
      </div>
    </div>
  );
}