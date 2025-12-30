import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Switch } from './ui/switch';
import {
  ArrowLeft,
  Building2,
  Save,
  MessageSquare,
  Send,
  BarChart3,
  Users,
  Calendar,
  Star,
  TrendingUp,
  DollarSign,
  MapPin,
  Phone,
  Mail,
  Clock,
  Utensils,
  Image as ImageIcon,
  Settings,
  Eye,
  Upload,
  X,
  Plus,
  Edit,
  Trash2,
  ShoppingBag,
  Menu,
  Package,
  User,
  Shield,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  subscribeToConversations,
  subscribeToMessages,
  sendMessage,
  findOrCreateAdminRestaurantConversation,
  type Conversation,
  type Message as FirebaseMessage,
} from '../lib/firebase-messaging';
import { Timestamp } from 'firebase/firestore';
import { useRestaurantStats, useMenuItems, type MenuItem } from '../lib/firebase-hooks';

interface RestaurantOwner {
  id: string;
  restaurantName: string;
  city: string;
  state: string;
  hasCompletedOnboarding: boolean;
  address?: string;
  zipCode?: string;
  phone?: string;
  email?: string;
  cuisineType?: string;
  capacity?: number;
  openingHours?: {
    [key: string]: {
      open: string;
      close: string;
      isClosed: boolean;
    };
  };
  photos?: string[];
  authorizedHosts?: Array<{
    name: string;
    email: string;
    status: string;
    addedAt: Timestamp | Date | string;
    addedBy: string;
    masterPassword?: string;
  }>;
  displayName?: string;
  createdAt?: Timestamp | Date | string;
  updatedAt?: Timestamp | Date | string;
}

interface PlatformUser {
  id: string;
  name: string;
  email: string;
}

interface RestaurantEditScreenProps {
  restaurant: RestaurantOwner;
  onBack: () => void;
  platformUsers?: PlatformUser[];
  onViewUser?: (userId: string) => void;
}

interface CustomerInteraction {
  customerId: string;
  customerName: string;
  totalBookings: number;
  totalSpent: number;
  lastVisit: string;
  averageRating: number;
}

export function RestaurantEditScreen({ restaurant, onBack, platformUsers, onViewUser }: RestaurantEditScreenProps) {
  // Fetch real-time restaurant statistics
  const { stats: insights } = useRestaurantStats(restaurant.id);
  
  // Fetch real-time menu items
  const { 
    menuItems, 
    addMenuItem,
    updateMenuItem,
    deleteMenuItem 
  } = useMenuItems(restaurant.id);

  // Filter menu items by type
  const dineInMenu = menuItems.filter(item => item.type === 'dine-in');
  const takeoutMenu = menuItems.filter(item => item.type === 'takeout');

  // Helper function to format opening hours from Firestore
  const formatOpeningHours = (hours?: RestaurantOwner['openingHours']) => {
    if (!hours) return 'Not set';
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const openDays = days.filter(day => hours[day] && !hours[day].isClosed);
    if (openDays.length === 0) return 'Closed';
    
    // Check if all open days have same hours
    const firstDay = openDays[0];
    const allSameHours = openDays.every(day => 
      hours[day].open === hours[firstDay].open && 
      hours[day].close === hours[firstDay].close
    );
    
    if (allSameHours && openDays.length === 7) {
      return `Mon-Sun: ${hours[firstDay].open} - ${hours[firstDay].close}`;
    } else if (allSameHours) {
      return `${openDays.map(d => d.slice(0, 3)).join(', ')}: ${hours[firstDay].open} - ${hours[firstDay].close}`;
    } else {
      return `${hours[firstDay].open} - ${hours[firstDay].close} (varies by day)`;
    }
  };

  // Form state
  const [formData, setFormData] = useState({
    name: restaurant.restaurantName,
    cuisine: restaurant.cuisineType || 'Not specified',
    city: restaurant.city,
    state: restaurant.state,
    address: restaurant.address || 'Not provided',
    zipCode: restaurant.zipCode || 'Not provided',
    phone: restaurant.phone || 'Not provided',
    email: restaurant.email || 'Not provided',
    website: `www.${restaurant.restaurantName.toLowerCase().replace(/\s+/g, '')}.com`,
    description: 'A fine dining establishment offering exquisite cuisine and exceptional service.',
    priceRange: '$$',
    capacity: restaurant.capacity || 0,
    openingHours: formatOpeningHours(restaurant.openingHours),
    specialties: 'Pasta, Seafood, Wine',
    averageWaitTime: '15-20 minutes',
    parkingAvailable: true,
    outdoorSeating: true,
    wheelchairAccessible: true,
    acceptsReservations: true,
    status: restaurant.hasCompletedOnboarding ? 'active' : 'pending',
  });

  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('details');
  const [selectedCustomerConversation, setSelectedCustomerConversation] = useState<string | null>(null);
  
  // Firebase state for admin-restaurant conversations
  const [adminRestaurantConversationId, setAdminRestaurantConversationId] = useState<string | null>(null);
  const [adminRestaurantMessages, setAdminRestaurantMessages] = useState<FirebaseMessage[]>([]);
  const [currentAdminId] = useState('ADMIN_DEFAULT'); // This should come from auth context in production
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isInitializingConversation, setIsInitializingConversation] = useState(false);

  // Firebase state for user-restaurant conversations
  const [userRestaurantConversations, setUserRestaurantConversations] = useState<Conversation[]>([]);
  const [selectedConversationMessages, setSelectedConversationMessages] = useState<FirebaseMessage[]>([]);
  const [selectedConversationData, setSelectedConversationData] = useState<Conversation | null>(null);
  const [takeoutTimePeriod, setTakeoutTimePeriod] = useState<'day' | 'week' | 'month' | 'quarter' | 'year'>('week');
  
  // Menu item editing states
  const [isEditingDineInItem, setIsEditingDineInItem] = useState(false);
  const [isEditingTakeoutItem, setIsEditingTakeoutItem] = useState(false);
  const [editingDineInItem, setEditingDineInItem] = useState<MenuItem | null>(null);
  const [editingTakeoutItem, setEditingTakeoutItem] = useState<MenuItem | null>(null);
  const [dineInItemForm, setDineInItemForm] = useState({ category: '', name: '', description: '', price: 0, available: true });
  const [takeoutItemForm, setTakeoutItemForm] = useState({ category: '', name: '', description: '', price: 0, available: true });
  
  // Restaurant photos - use real Firestore photos if available, otherwise use mock
  const [restaurantPhotos, setRestaurantPhotos] = useState(() => {
    if (restaurant.photos && restaurant.photos.length > 0) {
      return restaurant.photos.map((url, index) => ({
        id: String(index + 1),
        url,
        isFeatured: index === 0,
        caption: index === 0 ? 'Main Photo' : `Photo ${index + 1}`
      }));
    }
    return [
      { id: '1', url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop', isFeatured: true, caption: 'Main Dining Area' },
      { id: '2', url: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800&h=600&fit=crop', isFeatured: false, caption: 'Elegant Interior' },
      { id: '3', url: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800&h=600&fit=crop', isFeatured: false, caption: 'Outdoor Seating' },
      { id: '4', url: 'https://images.unsplash.com/photo-1590846406792-0adc7f938f1d?w=800&h=600&fit=crop', isFeatured: false, caption: 'Signature Dish' },
      { id: '5', url: 'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=800&h=600&fit=crop', isFeatured: false, caption: 'Wine Selection' },
    ];
  });

  // Mock takeout order data by time period
  const takeoutData = {
    day: {
      orders: 18,
      revenue: 487,
      averageOrder: 27,
      topItems: ['Spaghetti Carbonara', 'Margherita Pizza', 'Chicken Parmigiana'],
      recentOrders: [
        { id: '1', customer: 'Sarah Johnson', items: 'Spaghetti Carbonara, Tiramisu', total: 34, time: '2:45 PM', status: 'completed' },
        { id: '2', customer: 'Mike Chen', items: 'Margherita Pizza', total: 18, time: '1:30 PM', status: 'completed' },
        { id: '3', customer: 'Emma Davis', items: 'Chicken Parmigiana, Penne Arrabbiata', total: 45, time: '12:15 PM', status: 'completed' },
      ]
    },
    week: {
      orders: 126,
      revenue: 3402,
      averageOrder: 27,
      topItems: ['Spaghetti Carbonara', 'Margherita Pizza', 'Chicken Parmigiana'],
      recentOrders: [
        { id: '1', customer: 'Sarah Johnson', items: 'Spaghetti Carbonara, Tiramisu', total: 34, time: 'Dec 16, 2:45 PM', status: 'completed' },
        { id: '2', customer: 'Mike Chen', items: 'Margherita Pizza x2', total: 36, time: 'Dec 16, 1:30 PM', status: 'completed' },
        { id: '3', customer: 'Emma Davis', items: 'Chicken Parmigiana, Penne Arrabbiata', total: 45, time: 'Dec 15, 7:20 PM', status: 'completed' },
        { id: '4', customer: 'John Smith', items: 'Quattro Formaggi, Bruschetta Trio', total: 36, time: 'Dec 15, 6:45 PM', status: 'completed' },
        { id: '5', customer: 'Lisa Brown', items: 'Spaghetti Carbonara', total: 22, time: 'Dec 14, 8:10 PM', status: 'completed' },
      ]
    },
    month: {
      orders: 542,
      revenue: 14634,
      averageOrder: 27,
      topItems: ['Spaghetti Carbonara', 'Margherita Pizza', 'Chicken Parmigiana'],
      recentOrders: [
        { id: '1', customer: 'Sarah Johnson', items: 'Spaghetti Carbonara, Tiramisu', total: 34, time: 'Dec 16', status: 'completed' },
        { id: '2', customer: 'Mike Chen', items: 'Margherita Pizza x2', total: 36, time: 'Dec 16', status: 'completed' },
        { id: '3', customer: 'Emma Davis', items: 'Chicken Parmigiana, Penne Arrabbiata', total: 45, time: 'Dec 15', status: 'completed' },
        { id: '4', customer: 'John Smith', items: 'Quattro Formaggi, Bruschetta Trio', total: 36, time: 'Dec 14', status: 'completed' },
        { id: '5', customer: 'Lisa Brown', items: 'Spaghetti Carbonara', total: 22, time: 'Dec 13', status: 'completed' },
      ]
    },
    quarter: {
      orders: 1628,
      revenue: 43956,
      averageOrder: 27,
      topItems: ['Spaghetti Carbonara', 'Margherita Pizza', 'Chicken Parmigiana'],
      recentOrders: [
        { id: '1', customer: 'Sarah Johnson', items: 'Spaghetti Carbonara, Tiramisu', total: 34, time: 'Dec 16', status: 'completed' },
        { id: '2', customer: 'Mike Chen', items: 'Margherita Pizza x2', total: 36, time: 'Dec 15', status: 'completed' },
        { id: '3', customer: 'Emma Davis', items: 'Chicken Parmigiana, Penne Arrabbiata', total: 45, time: 'Dec 14', status: 'completed' },
        { id: '4', customer: 'John Smith', items: 'Quattro Formaggi, Bruschetta Trio', total: 36, time: 'Dec 13', status: 'completed' },
        { id: '5', customer: 'Lisa Brown', items: 'Spaghetti Carbonara', total: 22, time: 'Dec 12', status: 'completed' },
      ]
    },
    year: {
      orders: 6512,
      revenue: 175824,
      averageOrder: 27,
      topItems: ['Spaghetti Carbonara', 'Margherita Pizza', 'Chicken Parmigiana'],
      recentOrders: [
        { id: '1', customer: 'Sarah Johnson', items: 'Spaghetti Carbonara, Tiramisu', total: 34, time: 'Dec 16, 2024', status: 'completed' },
        { id: '2', customer: 'Mike Chen', items: 'Margherita Pizza x2', total: 36, time: 'Dec 15, 2024', status: 'completed' },
        { id: '3', customer: 'Emma Davis', items: 'Chicken Parmigiana, Penne Arrabbiata', total: 45, time: 'Dec 14, 2024', status: 'completed' },
        { id: '4', customer: 'John Smith', items: 'Quattro Formaggi, Bruschetta Trio', total: 36, time: 'Dec 13, 2024', status: 'completed' },
        { id: '5', customer: 'Lisa Brown', items: 'Spaghetti Carbonara', total: 22, time: 'Dec 12, 2024', status: 'completed' },
      ]
    },
  };

  // Mock customer interactions
  const customerInteractions: CustomerInteraction[] = [
    {
      customerId: '1',
      customerName: 'Sarah Johnson',
      totalBookings: 8,
      totalSpent: 890,
      lastVisit: '2024-12-12',
      averageRating: 5,
    },
    {
      customerId: '2',
      customerName: 'Michael Chen',
      totalBookings: 5,
      totalSpent: 625,
      lastVisit: '2024-12-10',
      averageRating: 4.8,
    },
    {
      customerId: '3',
      customerName: 'Emily Davis',
      totalBookings: 12,
      totalSpent: 1450,
      lastVisit: '2024-12-15',
      averageRating: 4.9,
    },
  ];

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveChanges = () => {
    toast.success(`Restaurant "${formData.name}" updated successfully!`);
  };

  const handleSendMessage = async () => {
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }
    
    // Create conversation if it doesn't exist
    if (!adminRestaurantConversationId && !isInitializingConversation) {
      setIsInitializingConversation(true);
      try {
        const conversationId = await findOrCreateAdminRestaurantConversation(currentAdminId, restaurant.id);
        setAdminRestaurantConversationId(conversationId);
        // Now send the message
        await sendMessage(conversationId, currentAdminId, 'ADMIN', message);
        toast.success(`Message sent to ${restaurant.restaurantName}`);
        setMessage('');
      } catch (_error) {
        console.error('Error sending message:', _error);
        toast.error('Failed to send message');
      } finally {
        setIsInitializingConversation(false);
      }
      return;
    }
    
    if (!adminRestaurantConversationId) {
      toast.error('Unable to send message - please try again');
      return;
    }

    try {
      await sendMessage(adminRestaurantConversationId, currentAdminId, 'ADMIN', message);
      toast.success(`Message sent to ${restaurant.restaurantName}`);
      setMessage('');
    } catch (_error) {
      console.error('Error sending message:', _error);
      toast.error('Failed to send message');
    }
  };

  // Subscribe to ADMIN_RESTAURANT conversation and messages only if conversation exists
  useEffect(() => {
    let unsubscribeMessages: (() => void) | undefined;
    const unsubscribeConversations: (() => void) | undefined = subscribeToConversations(
      {
        type: 'ADMIN_RESTAURANT',
        restaurantId: restaurant.id,
      },
      (conversations) => {
        if (conversations.length > 0) {
          const conversation = conversations[0]; // Get the first matching conversation
          setAdminRestaurantConversationId(conversation.id);
          
          // Subscribe to messages in this conversation
          unsubscribeMessages = subscribeToMessages(
            conversation.id,
            (msgs) => {
              setAdminRestaurantMessages(msgs);
            },
            (error) => {
              console.error('Error loading messages:', error);
            }
          );
        } else {
          // No conversation exists yet - will be created when admin sends first message
          setAdminRestaurantConversationId(null);
          setAdminRestaurantMessages([]);
        }
      },
      (error) => {
        console.error('Error checking conversations:', error);
      }
    );

    return () => {
      if (unsubscribeMessages) {
        unsubscribeMessages();
      }
      if (unsubscribeConversations) {
        unsubscribeConversations();
      }
    };
  }, [restaurant.id, currentAdminId]);

  // Subscribe to USER_RESTAURANT conversations
  useEffect(() => {
    const unsubscribe = subscribeToConversations(
      {
        type: 'USER_RESTAURANT',
        restaurantId: restaurant.id,
      },
      (conversations) => {
        setUserRestaurantConversations(conversations);
      },
      (error) => {
        console.error('Error loading user-restaurant conversations:', error);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [restaurant.id]);

  // Subscribe to messages when a customer conversation is selected
  useEffect(() => {
    if (!selectedCustomerConversation) {
      setSelectedConversationMessages([]);
      setSelectedConversationData(null);
      return;
    }

    // Find the conversation data
    const conversation = userRestaurantConversations.find(c => c.id === selectedCustomerConversation);
    if (conversation) {
      setSelectedConversationData(conversation);
    }

    const unsubscribe = subscribeToMessages(
      selectedCustomerConversation,
      (msgs) => {
        setSelectedConversationMessages(msgs);
      },
      (error) => {
        console.error('Error loading conversation messages:', error);
        toast.error('Failed to load conversation messages');
      }
    );

    return () => {
      unsubscribe();
    };
  }, [selectedCustomerConversation, userRestaurantConversations]);

  // Get user name by ID helper
  const getUserName = (userId: string | undefined): string => {
    if (!userId) return 'Unknown Customer';
    if (!platformUsers || platformUsers.length === 0) return `Customer ${userId.slice(0, 8)}`;
    
    const user = platformUsers.find(u => u.id === userId);
    return user ? user.name : `Customer ${userId.slice(0, 8)}`;
  };

  // Format timestamp helper
  const formatTimestamp = (timestamp: Timestamp | undefined) => {
    if (!timestamp) return '';
    
    let date: Date;
    if (timestamp instanceof Date) {
      date = timestamp;
    } else if (typeof timestamp === 'object' && 'toDate' in timestamp) {
      date = timestamp.toDate();
    } else if (typeof timestamp === 'object' && 'seconds' in timestamp) {
      interface TimestampLike {
        seconds: number;
        nanoseconds?: number;
      }
      date = new Date((timestamp as TimestampLike).seconds * 1000);
    } else {
      return '';
    }
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Dine-In Menu Handlers
  const handleAddDineInItem = () => {
    setDineInItemForm({ category: 'Appetizers', name: '', description: '', price: 0, available: true });
    setEditingDineInItem(null);
    setIsEditingDineInItem(true);
  };

  const handleEditDineInItem = (item: MenuItem) => {
    setEditingDineInItem(item);
    setDineInItemForm({ ...item });
    setIsEditingDineInItem(true);
  };

  const handleSaveDineInItem = async () => {
    if (!dineInItemForm.name || !dineInItemForm.description || dineInItemForm.price <= 0) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      if (editingDineInItem) {
        // Update existing item in Firestore
        await updateMenuItem(editingDineInItem.id, dineInItemForm);
        toast.success(`${dineInItemForm.name} updated successfully`);
      } else {
        // Add new item to Firestore
        await addMenuItem({
          ...dineInItemForm,
          restaurantId: restaurant.id,
          type: 'dine-in',
        });
        toast.success(`${dineInItemForm.name} added successfully`);
      }

      setIsEditingDineInItem(false);
      setEditingDineInItem(null);
    } catch (_error) {
      toast.error('Failed to save menu item');
      console.error(_error);
    }
  };

  const handleCancelDineInEdit = () => {
    setIsEditingDineInItem(false);
    setEditingDineInItem(null);
    setDineInItemForm({ category: '', name: '', description: '', price: 0, available: true });
  };

  // Takeout Menu Handlers
  const handleAddTakeoutItem = () => {
    setTakeoutItemForm({ category: 'Appetizers', name: '', description: '', price: 0, available: true });
    setEditingTakeoutItem(null);
    setIsEditingTakeoutItem(true);
  };

  const handleEditTakeoutItem = (item: MenuItem) => {
    setEditingTakeoutItem(item);
    setTakeoutItemForm({ ...item });
    setIsEditingTakeoutItem(true);
  };

  const handleSaveTakeoutItem = async () => {
    if (!takeoutItemForm.name || !takeoutItemForm.description || takeoutItemForm.price <= 0) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      if (editingTakeoutItem) {
        // Update existing item in Firestore
        await updateMenuItem(editingTakeoutItem.id, takeoutItemForm);
        toast.success(`${takeoutItemForm.name} updated successfully`);
      } else {
        // Add new item to Firestore
        await addMenuItem({
          ...takeoutItemForm,
          restaurantId: restaurant.id,
          type: 'takeout',
        });
        toast.success(`${takeoutItemForm.name} added successfully`);
      }

      setIsEditingTakeoutItem(false);
      setEditingTakeoutItem(null);
    } catch (_error) {
      toast.error('Failed to save menu item');
      console.error(_error);
    }
  };

  const handleCancelTakeoutEdit = () => {
    setIsEditingTakeoutItem(false);
    setEditingTakeoutItem(null);
    setTakeoutItemForm({ category: '', name: '', description: '', price: 0, available: true });
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="container mx-auto p-6 max-w-[1600px]">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="outline"
            className="mb-4 border-slate-700 text-slate-300 hover:bg-slate-800"
            onClick={onBack}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Restaurants
          </Button>
          
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {restaurant.photos && restaurant.photos.length > 0 ? (
                <img 
                  src={restaurant.photos[0]} 
                  alt={formData.name}
                  className="w-16 h-16 rounded-lg object-cover"
                />
              ) : (
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-white" />
                </div>
              )}
              <div>
                <h1 className="text-3xl text-slate-100 mb-1">{formData.name}</h1>
                <div className="flex items-center gap-3">
                  <span className="text-slate-400">{formData.city}, {formData.state}</span>
                  <Badge
                    className={
                      formData.status === 'active'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }
                  >
                    {formData.status}
                  </Badge>
                </div>
              </div>
            </div>
            
            <Button 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handleSaveChanges}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <Card className="p-4 bg-slate-800 border-slate-700">
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8 text-blue-400" />
              <div>
                <div className="text-2xl text-slate-100">{insights.totalReservations}</div>
                <div className="text-xs text-slate-400">Total Bookings</div>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-slate-800 border-slate-700">
            <div className="flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-green-400" />
              <div>
                <div className="text-2xl text-slate-100">${(insights.totalRevenue / 1000).toFixed(0)}k</div>
                <div className="text-xs text-slate-400">Total Revenue</div>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-slate-800 border-slate-700">
            <div className="flex items-center gap-3">
              <Star className="w-8 h-8 text-yellow-400" />
              <div>
                <div className="text-2xl text-slate-100">{insights.averageRating}</div>
                <div className="text-xs text-slate-400">Avg Rating</div>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-slate-800 border-slate-700">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-purple-400" />
              <div>
                <div className="text-2xl text-slate-100">{insights.uniqueCustomers}</div>
                <div className="text-xs text-slate-400">Unique Customers</div>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-slate-800 border-slate-700">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-cyan-400" />
              <div>
                <div className="text-2xl text-slate-100">{insights.repeatCustomerRate}%</div>
                <div className="text-xs text-slate-400">Repeat Rate</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-7 bg-slate-800 mb-6">
            <TabsTrigger value="preview" className="data-[state=active]:bg-slate-700">
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="details" className="data-[state=active]:bg-slate-700">
              <Settings className="w-4 h-4 mr-2" />
              Details
            </TabsTrigger>
            <TabsTrigger value="menus" className="data-[state=active]:bg-slate-700">
              <Menu className="w-4 h-4 mr-2" />
              Menus
            </TabsTrigger>
            <TabsTrigger value="takeout" className="data-[state=active]:bg-slate-700">
              <Package className="w-4 h-4 mr-2" />
              Takeout
            </TabsTrigger>
            <TabsTrigger value="contact" className="data-[state=active]:bg-slate-700">
              <MessageSquare className="w-4 h-4 mr-2" />
              Contact
            </TabsTrigger>
            <TabsTrigger value="insights" className="data-[state=active]:bg-slate-700">
              <BarChart3 className="w-4 h-4 mr-2" />
              Insights
            </TabsTrigger>
            <TabsTrigger value="messages" className="data-[state=active]:bg-slate-700">
              <Users className="w-4 h-4 mr-2" />
              Messages
            </TabsTrigger>
          </TabsList>

          {/* Preview & Photos Tab */}
          <TabsContent value="preview" className="space-y-6">
            {/* User View Preview */}
            <Card className="p-6 bg-slate-800 border-slate-700">
              <h3 className="text-lg text-slate-100 mb-4 flex items-center gap-2">
                <Eye className="w-5 h-5 text-slate-400" />
                How Customers See This Restaurant
              </h3>
              
              {/* Restaurant Preview Card */}
              <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
                {/* Featured Image */}
                <div className="relative h-64 bg-slate-800">
                  {restaurantPhotos.find(p => p.isFeatured) && (
                    <img
                      src={restaurantPhotos.find(p => p.isFeatured)!.url}
                      alt="Featured"
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-green-500/90 text-white">
                      {formData.status === 'active' ? 'Open Now' : 'Coming Soon'}
                    </Badge>
                  </div>
                </div>
                
                {/* Restaurant Info */}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-2xl text-slate-100 mb-2">{formData.name}</h2>
                      <div className="flex items-center gap-2 text-slate-400 mb-2">
                        <MapPin className="w-4 h-4" />
                        <span className="text-sm">{formData.address}, {formData.city}, {formData.state}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <Utensils className="w-4 h-4" />
                        <span className="text-sm">{formData.cuisine} • {formData.priceRange}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                      <div>
                        <div className="text-2xl text-slate-100">{insights.averageRating}</div>
                        <div className="text-xs text-slate-500">({insights.totalReviews || 0} reviews)</div>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-slate-300 mb-4">{formData.description}</p>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-300">{formData.openingHours}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-300">{formData.phone}</span>
                    </div>
                  </div>
                  
                  {/* Amenities Tags */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {formData.parkingAvailable && (
                      <Badge className="bg-blue-500/20 text-blue-400">Parking Available</Badge>
                    )}
                    {formData.outdoorSeating && (
                      <Badge className="bg-green-500/20 text-green-400">Outdoor Seating</Badge>
                    )}
                    {formData.wheelchairAccessible && (
                      <Badge className="bg-purple-500/20 text-purple-400">Wheelchair Accessible</Badge>
                    )}
                  </div>
                  
                  <Button className="w-full bg-blue-600 hover:bg-blue-700">
                    Make a Reservation
                  </Button>
                </div>
              </div>
            </Card>
            
            {/* Photo Management */}
            <Card className="p-6 bg-slate-800 border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg text-slate-100 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-slate-400" />
                  Restaurant Photos
                </h3>
                <Button 
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => toast.success('Photo upload functionality would open here')}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Photos
                </Button>
              </div>
              
              <p className="text-sm text-slate-400 mb-6">
                Manage your restaurant photos. Click on a photo to set it as featured.
              </p>
              
              {/* Photo Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {restaurantPhotos.map((photo) => (
                  <motion.div
                    key={photo.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative group"
                  >
                    <div className="aspect-video rounded-lg overflow-hidden bg-slate-700 border-2 border-slate-700 hover:border-blue-500 transition-colors cursor-pointer">
                      <img 
                        src={photo.url}
                        alt={photo.caption}
                        className="w-full h-full object-cover"
                      />
                      
                      {/* Overlay */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-white text-white hover:bg-white hover:text-slate-900"
                          onClick={() => {
                            setRestaurantPhotos(photos =>
                              photos.map(p => ({
                                ...p,
                                isFeatured: p.id === photo.id
                              }))
                            );
                            toast.success(`"${photo.caption}" set as featured photo`);
                          }}
                        >
                          <Star className="w-3 h-3 mr-1" />
                          {photo.isFeatured ? 'Featured' : 'Set Featured'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                          onClick={() => {
                            if (restaurantPhotos.length > 1) {
                              setRestaurantPhotos(photos => photos.filter(p => p.id !== photo.id));
                              toast.success('Photo deleted');
                            } else {
                              toast.error('Cannot delete the last photo');
                            }
                          }}
                        >
                          <X className="w-3 h-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                      
                      {/* Featured Badge */}
                      {photo.isFeatured && (
                        <div className="absolute top-2 left-2">
                          <Badge className="bg-yellow-500 text-black">
                            <Star className="w-3 h-3 mr-1" />
                            Featured
                          </Badge>
                        </div>
                      )}
                    </div>
                    
                    {/* Caption */}
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm text-slate-300">{photo.caption}</span>
                    </div>
                  </motion.div>
                ))}
                
                {/* Add Photo Card */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="aspect-video rounded-lg border-2 border-dashed border-slate-600 hover:border-blue-500 transition-colors cursor-pointer flex flex-col items-center justify-center gap-2 bg-slate-700/30"
                  onClick={() => toast.success('Photo upload functionality would open here')}
                >
                  <Upload className="w-8 h-8 text-slate-400" />
                  <span className="text-sm text-slate-400">Upload New Photo</span>
                </motion.div>
              </div>
            </Card>
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Basic Information */}
              <Card className="p-6 bg-slate-800 border-slate-700">
                <h3 className="text-lg text-slate-100 mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-slate-400" />
                  Basic Information
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <Label className="text-slate-300">Restaurant Name</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="mt-2 bg-slate-700 border-slate-600 text-slate-100"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-slate-300">Cuisine Type</Label>
                    <Input
                      value={formData.cuisine}
                      onChange={(e) => handleInputChange('cuisine', e.target.value)}
                      className="mt-2 bg-slate-700 border-slate-600 text-slate-100"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-slate-300">Description</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      className="mt-2 bg-slate-700 border-slate-600 text-slate-100 resize-none"
                      rows={4}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-300">Price Range</Label>
                      <Input
                        value={formData.priceRange}
                        onChange={(e) => handleInputChange('priceRange', e.target.value)}
                        className="mt-2 bg-slate-700 border-slate-600 text-slate-100"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-slate-300">Capacity</Label>
                      <Input
                        type="number"
                        value={formData.capacity}
                        onChange={(e) => handleInputChange('capacity', parseInt(e.target.value))}
                        className="mt-2 bg-slate-700 border-slate-600 text-slate-100"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-slate-300">Specialties</Label>
                    <Input
                      value={formData.specialties}
                      onChange={(e) => handleInputChange('specialties', e.target.value)}
                      className="mt-2 bg-slate-700 border-slate-600 text-slate-100"
                      placeholder="e.g., Pasta, Seafood, Wine"
                    />
                  </div>
                </div>
              </Card>

              {/* Location Information */}
              <Card className="p-6 bg-slate-800 border-slate-700">
                <h3 className="text-lg text-slate-100 mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-slate-400" />
                  Location & Contact
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <Label className="text-slate-300">Street Address</Label>
                    <Input
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      className="mt-2 bg-slate-700 border-slate-600 text-slate-100"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-300">City</Label>
                      <Input
                        value={formData.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        className="mt-2 bg-slate-700 border-slate-600 text-slate-100"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-slate-300">State</Label>
                      <Input
                        value={formData.state}
                        onChange={(e) => handleInputChange('state', e.target.value)}
                        className="mt-2 bg-slate-700 border-slate-600 text-slate-100"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-slate-300">ZIP Code</Label>
                    <Input
                      value={formData.zipCode}
                      onChange={(e) => handleInputChange('zipCode', e.target.value)}
                      className="mt-2 bg-slate-700 border-slate-600 text-slate-100"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-slate-300">Phone</Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="mt-2 bg-slate-700 border-slate-600 text-slate-100"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-slate-300">Email</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="mt-2 bg-slate-700 border-slate-600 text-slate-100"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-slate-300">Website</Label>
                    <Input
                      value={formData.website}
                      onChange={(e) => handleInputChange('website', e.target.value)}
                      className="mt-2 bg-slate-700 border-slate-600 text-slate-100"
                    />
                  </div>
                </div>
              </Card>

              {/* Operating Hours */}
              <Card className="p-6 bg-slate-800 border-slate-700">
                <h3 className="text-lg text-slate-100 mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-slate-400" />
                  Operating Hours
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <Label className="text-slate-300">Hours</Label>
                    <Input
                      value={formData.openingHours}
                      onChange={(e) => handleInputChange('openingHours', e.target.value)}
                      className="mt-2 bg-slate-700 border-slate-600 text-slate-100"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-slate-300">Average Wait Time</Label>
                    <Input
                      value={formData.averageWaitTime}
                      onChange={(e) => handleInputChange('averageWaitTime', e.target.value)}
                      className="mt-2 bg-slate-700 border-slate-600 text-slate-100"
                    />
                  </div>
                </div>
              </Card>

              {/* Amenities */}
              <Card className="p-6 bg-slate-800 border-slate-700">
                <h3 className="text-lg text-slate-100 mb-4 flex items-center gap-2">
                  <Utensils className="w-5 h-5 text-slate-400" />
                  Amenities & Features
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-slate-200">Parking Available</div>
                      <div className="text-sm text-slate-400">On-site or nearby parking</div>
                    </div>
                    <Switch
                      checked={formData.parkingAvailable}
                      onCheckedChange={(checked) => handleInputChange('parkingAvailable', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-slate-200">Outdoor Seating</div>
                      <div className="text-sm text-slate-400">Patio or terrace available</div>
                    </div>
                    <Switch
                      checked={formData.outdoorSeating}
                      onCheckedChange={(checked) => handleInputChange('outdoorSeating', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-slate-200">Wheelchair Accessible</div>
                      <div className="text-sm text-slate-400">ADA compliant access</div>
                    </div>
                    <Switch
                      checked={formData.wheelchairAccessible}
                      onCheckedChange={(checked) => handleInputChange('wheelchairAccessible', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-slate-200">Accepts Reservations</div>
                      <div className="text-sm text-slate-400">Online booking enabled</div>
                    </div>
                    <Switch
                      checked={formData.acceptsReservations}
                      onCheckedChange={(checked) => handleInputChange('acceptsReservations', checked)}
                    />
                  </div>
                </div>
              </Card>

              {/* Authorized Hosts */}
              {restaurant.authorizedHosts && restaurant.authorizedHosts.length > 0 && (
                <Card className="p-6 bg-slate-800 border-slate-700">
                  <h3 className="text-lg text-slate-100 mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-slate-400" />
                    Authorized Staff & Hosts ({restaurant.authorizedHosts.length})
                  </h3>
                  
                  <div className="space-y-3">
                    {restaurant.authorizedHosts.map((host, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <div className="text-slate-100">{host.name}</div>
                            <div className="text-sm text-slate-400">{host.email}</div>
                            {host.addedAt && (() => {
                              let date: Date;
                              if (host.addedAt instanceof Date) {
                                date = host.addedAt;
                              } else if (typeof host.addedAt === 'object' && 'toDate' in host.addedAt) {
                                date = (host.addedAt as Timestamp).toDate();
                              } else if (typeof host.addedAt === 'object' && 'seconds' in host.addedAt) {
                                date = new Date((host.addedAt as { seconds: number }).seconds * 1000);
                              } else {
                                date = new Date(host.addedAt);
                              }
                              return (
                                <div className="text-xs text-slate-500 mt-1">
                                  Added: {date.toLocaleDateString()}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                        <Badge className={
                          host.status === 'active' 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-gray-500/20 text-gray-400'
                        }>
                          {host.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Menus Tab */}
          <TabsContent value="menus" className="space-y-6">
            {/* Edit/Add Form for Dine-In Menu */}
            {isEditingDineInItem && (
              <Card className="p-6 bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border-blue-500/30">
                <h3 className="text-lg text-slate-100 mb-4">
                  {editingDineInItem ? 'Edit Dine-In Menu Item' : 'Add New Dine-In Menu Item'}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label className="text-slate-300 mb-2">Category</Label>
                    <select
                      value={dineInItemForm.category}
                      onChange={(e) => setDineInItemForm({ ...dineInItemForm, category: e.target.value })}
                      className="w-full bg-slate-700 border-slate-600 text-slate-100 rounded-md p-2"
                    >
                      <option value="Appetizers">Appetizers</option>
                      <option value="Main Course">Main Course</option>
                      <option value="Desserts">Desserts</option>
                    </select>
                  </div>
                  
                  <div>
                    <Label className="text-slate-300 mb-2">Item Name</Label>
                    <Input
                      value={dineInItemForm.name}
                      onChange={(e) => setDineInItemForm({ ...dineInItemForm, name: e.target.value })}
                      className="bg-slate-700 border-slate-600 text-slate-100"
                      placeholder="e.g., Lobster Ravioli"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <Label className="text-slate-300 mb-2">Description</Label>
                    <Textarea
                      value={dineInItemForm.description}
                      onChange={(e) => setDineInItemForm({ ...dineInItemForm, description: e.target.value })}
                      className="bg-slate-700 border-slate-600 text-slate-100"
                      placeholder="Describe the dish..."
                      rows={3}
                    />
                  </div>
                  
                  <div>
                    <Label className="text-slate-300 mb-2">Price ($)</Label>
                    <Input
                      type="number"
                      value={dineInItemForm.price}
                      onChange={(e) => setDineInItemForm({ ...dineInItemForm, price: parseFloat(e.target.value) })}
                      className="bg-slate-700 border-slate-600 text-slate-100"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={dineInItemForm.available}
                      onCheckedChange={(checked) => setDineInItemForm({ ...dineInItemForm, available: checked })}
                    />
                    <Label className="text-slate-300">Available</Label>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Button
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={handleSaveDineInItem}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Item
                  </Button>
                  <Button
                    variant="outline"
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    onClick={handleCancelDineInEdit}
                  >
                    Cancel
                  </Button>
                </div>
              </Card>
            )}

            {/* Edit/Add Form for Takeout Menu */}
            {isEditingTakeoutItem && (
              <Card className="p-6 bg-gradient-to-br from-green-600/20 to-teal-600/20 border-green-500/30">
                <h3 className="text-lg text-slate-100 mb-4">
                  {editingTakeoutItem ? 'Edit Takeout Menu Item' : 'Add New Takeout Menu Item'}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label className="text-slate-300 mb-2">Category</Label>
                    <select
                      value={takeoutItemForm.category}
                      onChange={(e) => setTakeoutItemForm({ ...takeoutItemForm, category: e.target.value })}
                      className="w-full bg-slate-700 border-slate-600 text-slate-100 rounded-md p-2"
                    >
                      <option value="Appetizers">Appetizers</option>
                      <option value="Pasta">Pasta</option>
                      <option value="Main Course">Main Course</option>
                      <option value="Pizza">Pizza</option>
                    </select>
                  </div>
                  
                  <div>
                    <Label className="text-slate-300 mb-2">Item Name</Label>
                    <Input
                      value={takeoutItemForm.name}
                      onChange={(e) => setTakeoutItemForm({ ...takeoutItemForm, name: e.target.value })}
                      className="bg-slate-700 border-slate-600 text-slate-100"
                      placeholder="e.g., Spaghetti Carbonara"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <Label className="text-slate-300 mb-2">Description</Label>
                    <Textarea
                      value={takeoutItemForm.description}
                      onChange={(e) => setTakeoutItemForm({ ...takeoutItemForm, description: e.target.value })}
                      className="bg-slate-700 border-slate-600 text-slate-100"
                      placeholder="Describe the dish..."
                      rows={3}
                    />
                  </div>
                  
                  <div>
                    <Label className="text-slate-300 mb-2">Price ($)</Label>
                    <Input
                      type="number"
                      value={takeoutItemForm.price}
                      onChange={(e) => setTakeoutItemForm({ ...takeoutItemForm, price: parseFloat(e.target.value) })}
                      className="bg-slate-700 border-slate-600 text-slate-100"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={takeoutItemForm.available}
                      onCheckedChange={(checked) => setTakeoutItemForm({ ...takeoutItemForm, available: checked })}
                    />
                    <Label className="text-slate-300">Available</Label>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={handleSaveTakeoutItem}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Item
                  </Button>
                  <Button
                    variant="outline"
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    onClick={handleCancelTakeoutEdit}
                  >
                    Cancel
                  </Button>
                </div>
              </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Dine-In Menu */}
              <Card className="p-6 bg-slate-800 border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg text-slate-100 flex items-center gap-2">
                    <Utensils className="w-5 h-5 text-slate-400" />
                    Dine-In Menu
                  </h3>
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={handleAddDineInItem}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Item
                  </Button>
                </div>
                
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {dineInMenu.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      <Menu className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No dine-in menu items yet</p>
                      <p className="text-sm mt-1">Click "Add Item" to create your first menu item</p>
                    </div>
                  ) : (
                    ['Appetizers', 'Main Course', 'Desserts'].map(category => (
                      <div key={category}>
                        <h4 className="text-sm text-slate-400 mb-2 mt-4 first:mt-0">{category}</h4>
                        {dineInMenu.filter(item => item.category === category).map((item) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-4 bg-slate-700/50 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h5 className="text-slate-100">{item.name}</h5>
                                <Switch
                                  checked={item.available}
                                  onCheckedChange={async (checked) => {
                                    try {
                                      await updateMenuItem(item.id, { available: checked });
                                      toast.success(`${item.name} ${checked ? 'enabled' : 'disabled'}`);
                                    } catch {
                                      toast.error('Failed to update item');
                                    }
                                  }}
                                />
                              </div>
                              <p className="text-sm text-slate-400">{item.description}</p>
                            </div>
                            <div className="ml-4">
                              <div className="text-lg text-slate-100">${item.price}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-3">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-slate-600 text-slate-300 hover:bg-slate-600"
                              onClick={() => handleEditDineInItem(item)}
                            >
                              <Edit className="w-3 h-3 mr-1" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                              onClick={async () => {
                                try {
                                  await deleteMenuItem(item.id);
                                  toast.success(`${item.name} deleted`);
                                } catch {
                                  toast.error('Failed to delete item');
                                }
                              }}
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ))
                  )}
                </div>
              </Card>

              {/* Takeout Menu */}
              <Card className="p-6 bg-slate-800 border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg text-slate-100 flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-slate-400" />
                    Takeout Menu
                  </h3>
                  <Button 
                    className="bg-green-600 hover:bg-green-700"
                    onClick={handleAddTakeoutItem}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Item
                  </Button>
                </div>
                
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {takeoutMenu.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No takeout menu items yet</p>
                      <p className="text-sm mt-1">Click "Add Item" to create your first takeout item</p>
                    </div>
                  ) : (
                    ['Appetizers', 'Pasta', 'Main Course', 'Pizza'].map(category => (
                      <div key={category}>
                        <h4 className="text-sm text-slate-400 mb-2 mt-4 first:mt-0">{category}</h4>
                        {takeoutMenu.filter(item => item.category === category).map((item) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-4 bg-slate-700/50 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h5 className="text-slate-100">{item.name}</h5>
                                <Switch
                                  checked={item.available}
                                  onCheckedChange={async (checked) => {
                                    try {
                                      await updateMenuItem(item.id, { available: checked });
                                      toast.success(`${item.name} ${checked ? 'enabled' : 'disabled'}`);
                                    } catch {
                                      toast.error('Failed to update item');
                                    }
                                  }}
                                />
                              </div>
                              <p className="text-sm text-slate-400">{item.description}</p>
                            </div>
                            <div className="ml-4">
                              <div className="text-lg text-slate-100">${item.price}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-3">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-slate-600 text-slate-300 hover:bg-slate-600"
                              onClick={() => handleEditTakeoutItem(item)}
                            >
                              <Edit className="w-3 h-3 mr-1" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                              onClick={async () => {
                                try {
                                  await deleteMenuItem(item.id);
                                  toast.success(`${item.name} deleted`);
                                } catch {
                                  toast.error('Failed to delete item');
                                }
                              }}
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ))
                  )}
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Takeout Orders Tab */}
          <TabsContent value="takeout" className="space-y-6">
            {/* Time Period Selector */}
            <Card className="p-4 bg-slate-800 border-slate-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg text-slate-100 flex items-center gap-2">
                  <Package className="w-5 h-5 text-slate-400" />
                  Takeout Order History
                </h3>
                <div className="flex items-center gap-2">
                  {(['day', 'week', 'month', 'quarter', 'year'] as const).map(period => (
                    <Button
                      key={period}
                      size="sm"
                      variant={takeoutTimePeriod === period ? 'default' : 'outline'}
                      className={
                        takeoutTimePeriod === period
                          ? 'bg-blue-600 hover:bg-blue-700'
                          : 'border-slate-600 text-slate-300 hover:bg-slate-700'
                      }
                      onClick={() => setTakeoutTimePeriod(period)}
                    >
                      {period.charAt(0).toUpperCase() + period.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
            </Card>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-6 bg-slate-800 border-slate-700">
                <div className="flex items-center gap-3">
                  <ShoppingBag className="w-8 h-8 text-blue-400" />
                  <div>
                    <div className="text-2xl text-slate-100">{(insights.takeoutStats?.[takeoutTimePeriod] || takeoutData[takeoutTimePeriod]).orders}</div>
                    <div className="text-xs text-slate-400">Total Orders</div>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-slate-800 border-slate-700">
                <div className="flex items-center gap-3">
                  <DollarSign className="w-8 h-8 text-green-400" />
                  <div>
                    <div className="text-2xl text-slate-100">${(insights.takeoutStats?.[takeoutTimePeriod] || takeoutData[takeoutTimePeriod]).revenue.toLocaleString()}</div>
                    <div className="text-xs text-slate-400">Total Revenue</div>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-slate-800 border-slate-700">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-8 h-8 text-purple-400" />
                  <div>
                    <div className="text-2xl text-slate-100">${(insights.takeoutStats?.[takeoutTimePeriod] || takeoutData[takeoutTimePeriod]).averageOrder}</div>
                    <div className="text-xs text-slate-400">Average Order</div>
                  </div>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Items */}
              <Card className="p-6 bg-slate-800 border-slate-700">
                <h3 className="text-lg text-slate-100 mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-400" />
                  Top Selling Items
                </h3>
                
                <div className="space-y-3">
                  {(insights.popularDishes && insights.popularDishes.length > 0) ? (
                    insights.popularDishes.slice(0, 5).map((item, index) => (
                      <div 
                        key={index}
                        className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg"
                      >
                        <div className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm">#{index + 1}</span>
                        </div>
                        <span className="text-slate-200">{typeof item === 'string' ? item : item.name}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      No order data available yet
                    </div>
                  )}
                </div>
              </Card>

              {/* Recent Orders */}
              <Card className="p-6 bg-slate-800 border-slate-700">
                <h3 className="text-lg text-slate-100 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-400" />
                  Recent Orders
                </h3>
                
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {(insights.takeoutStats?.[takeoutTimePeriod] || takeoutData[takeoutTimePeriod]).orders > 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>{(insights.takeoutStats?.[takeoutTimePeriod] || takeoutData[takeoutTimePeriod]).orders} total orders</p>
                      <p className="text-sm text-slate-500 mt-1">
                        Detailed order history coming soon
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      No takeout orders for this period
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Contact Tab */}
          <TabsContent value="contact" className="space-y-6">
            <Card className="p-6 bg-slate-800 border-slate-700 max-w-2xl mx-auto">
              <h3 className="text-lg text-slate-100 mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-purple-400" />
                Contact Restaurant Owner
              </h3>
              
              <div className="space-y-4">
                {/* Contact Info Display */}
                <div className="p-4 bg-slate-700/50 rounded-lg space-y-3">
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-300">{formData.email}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-300">{formData.phone}</span>
                  </div>
                </div>

                {/* Message History */}
                <div className="space-y-3 max-h-[400px] overflow-y-auto p-4 bg-slate-700/30 rounded-lg">
                  <h4 className="text-sm text-slate-400 mb-3">Message History</h4>
                  {adminRestaurantMessages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-3 rounded-lg ${
                        msg.senderRole === 'ADMIN' 
                          ? 'bg-purple-600/20 ml-8' 
                          : 'bg-slate-700/50 mr-8'
                      }`}
                    >
                      <div className="text-sm text-slate-200 mb-1">{msg.text}</div>
                      <div className="text-xs text-slate-500">{formatTimestamp(msg.createdAt)}</div>
                    </motion.div>
                  ))}
                </div>

                {/* Message Input */}
                <div>
                  <Label className="text-slate-300">New Message</Label>
                  <Textarea
                    placeholder="Type your message to the restaurant owner..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="mt-2 bg-slate-700 border-slate-600 text-slate-100 resize-none"
                    rows={3}
                  />
                </div>
                
                <Button 
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  onClick={handleSendMessage}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send Message
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent value="insights" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Performance Metrics */}
              <Card className="p-6 bg-slate-800 border-slate-700">
                <h3 className="text-lg text-slate-100 mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-slate-400" />
                  Performance Metrics
                </h3>
                
                <div className="space-y-4">
                  <div className="p-4 bg-slate-700/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-400">Monthly Growth</span>
                      <span className="text-lg text-green-400">+{insights.monthlyGrowth || 0}%</span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                        style={{ width: `${(insights.monthlyGrowth || 0) * 5}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="p-4 bg-slate-700/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-400">Repeat Customer Rate</span>
                      <span className="text-lg text-blue-400">{insights.repeatCustomerRate}%</span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
                        style={{ width: `${insights.repeatCustomerRate}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-700/30 rounded">
                      <div className="text-xs text-slate-500 mb-1">Total Reviews</div>
                      <div className="text-xl text-slate-100">{insights.totalReviews || 0}</div>
                    </div>
                    <div className="p-3 bg-slate-700/30 rounded">
                      <div className="text-xs text-slate-500 mb-1">Avg Party Size</div>
                      <div className="text-xl text-slate-100">{insights.averagePartySize || 0}</div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Popular Items */}
              <Card className="p-6 bg-slate-800 border-slate-700">
                <h3 className="text-lg text-slate-100 mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-400" />
                  Popular Dishes
                </h3>
                
                <div className="space-y-3">
                  {(insights.popularDishes || []).map((dish, index) => (
                    <div 
                      key={index}
                      className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg"
                    >
                      <div className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm">#{index + 1}</span>
                      </div>
                      <span className="text-slate-200">{typeof dish === 'string' ? dish : dish.name}</span>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-blue-400" />
                    <span className="text-sm text-slate-300">Peak Hours</span>
                  </div>
                  <div className="text-lg text-slate-100">{insights.peakHours || 'N/A'}</div>
                </div>
              </Card>

              {/* Top Customers */}
              <Card className="p-6 bg-slate-800 border-slate-700 lg:col-span-2">
                <h3 className="text-lg text-slate-100 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-400" />
                  Top Customers
                </h3>
                
                <div className="space-y-3">
                  {customerInteractions.map((customer) => (
                    <motion.div
                      key={customer.customerId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-slate-700/50 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm">
                              {customer.customerName.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <div>
                            <div className="text-slate-100">{customer.customerName}</div>
                            <div className="text-sm text-slate-400">Last visit: {customer.lastVisit}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < Math.floor(customer.averageRating)
                                  ? 'text-yellow-400 fill-yellow-400'
                                  : 'text-slate-600'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4">
                        <div className="p-2 bg-slate-800/50 rounded">
                          <div className="text-xs text-slate-500">Bookings</div>
                          <div className="text-sm text-slate-200">{customer.totalBookings}</div>
                        </div>
                        <div className="p-2 bg-slate-800/50 rounded">
                          <div className="text-xs text-slate-500">Total Spent</div>
                          <div className="text-sm text-slate-200">${customer.totalSpent}</div>
                        </div>
                        <div className="p-2 bg-slate-800/50 rounded">
                          <div className="text-xs text-slate-500">Avg Rating</div>
                          <div className="text-sm text-slate-200">{customer.averageRating}</div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Customer Messages Tab */}
          <TabsContent value="messages" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Direct Messages with Admin */}
              <Card className="p-6 bg-slate-800 border-slate-700">
                <h3 className="text-lg text-slate-100 mb-4 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-purple-400" />
                  Direct Messages with Admin
                </h3>
                
                {/* Message History */}
                <div className="space-y-3 mb-4 max-h-[400px] overflow-y-auto">
                  {adminRestaurantMessages.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">No messages yet</p>
                      <p className="text-xs mt-1">Start a conversation with the admin</p>
                    </div>
                  ) : (
                    adminRestaurantMessages.map((msg) => {
                      const isAdmin = msg.senderRole === 'ADMIN';
                      return (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`p-3 rounded-lg ${
                            isAdmin 
                              ? 'bg-purple-600/20 ml-8 border border-purple-500/30' 
                              : 'bg-blue-600/20 mr-8 border border-blue-500/30'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={isAdmin ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}>
                              {isAdmin ? <Shield className="w-3 h-3 mr-1" /> : <Building2 className="w-3 h-3 mr-1" />}
                              {isAdmin ? 'Admin' : 'Restaurant'}
                            </Badge>
                            <span className="text-xs text-slate-500">{formatTimestamp(msg.createdAt)}</span>
                          </div>
                          <div className="text-sm text-slate-200">{msg.text}</div>
                        </motion.div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="space-y-3">
                  <Textarea
                    placeholder="Type your message to admin..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-slate-100 resize-none"
                    rows={3}
                  />
                  <Button 
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    onClick={handleSendMessage}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send Message
                  </Button>
                </div>
              </Card>

              {/* Customer Messages */}
              <Card className="p-6 bg-slate-800 border-slate-700">
                {selectedCustomerConversation ? (
                  // Show full conversation with selected customer
                  <>
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                      <h3 className="text-lg text-slate-100 flex items-center gap-2">
                        <User className="w-5 h-5 text-blue-400" />
                        {selectedConversationData && getUserName(selectedConversationData.participants.userId)}
                      </h3>
                      <div className="flex items-center gap-2">
                        {selectedConversationData?.participants.userId && onViewUser && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-slate-600 text-slate-300 hover:bg-slate-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewUser(selectedConversationData.participants.userId!);
                            }}
                          >
                            <User className="w-4 h-4 mr-2" />
                            View User
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-slate-600 text-slate-300 hover:bg-slate-700"
                          onClick={() => setSelectedCustomerConversation(null)}
                        >
                          <ArrowLeft className="w-4 h-4 mr-2" />
                          Back
                        </Button>
                      </div>
                    </div>
                    
                    {/* Full conversation thread */}
                    <div className="space-y-3 max-h-[500px] overflow-y-auto">
                      {selectedConversationMessages.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p className="text-sm">No messages in this conversation</p>
                        </div>
                      ) : (
                        selectedConversationMessages.map((msg) => {
                          const isRestaurant = msg.senderRole === 'RESTAURANT' || msg.senderRole === 'RESTAURANT_MANAGER' || msg.senderRole === 'RESTAURANT_HOST';
                          return (
                            <motion.div
                              key={msg.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`p-4 rounded-lg ${
                                isRestaurant 
                                  ? 'bg-blue-600/20 ml-12 border border-blue-500/30' 
                                  : 'bg-slate-700/50 mr-12 border border-slate-600/30'
                              }`}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <div className={`w-8 h-8 bg-gradient-to-br ${isRestaurant ? 'from-blue-500 to-cyan-500' : 'from-green-500 to-emerald-500'} rounded-full flex items-center justify-center`}>
                                    {isRestaurant ? <Building2 className="w-4 h-4 text-white" /> : <User className="w-4 h-4 text-white" />}
                                  </div>
                                  <span className="text-sm text-slate-100">
                                    {isRestaurant ? restaurant.restaurantName : (selectedConversationData && getUserName(selectedConversationData.participants.userId))}
                                  </span>
                                </div>
                                <Badge className={
                                  isRestaurant 
                                    ? 'bg-blue-500/20 text-blue-400' 
                                    : 'bg-green-500/20 text-green-400'
                                }>
                                  {msg.senderRole}
                                </Badge>
                              </div>
                              <div className="text-sm text-slate-300 mb-1">{msg.text}</div>
                              <div className="text-xs text-slate-500">{formatTimestamp(msg.createdAt)}</div>
                            </motion.div>
                          );
                        })
                      )}
                    </div>
                  </>
                ) : (
                  // Show list of conversations grouped by customer
                  <>
                    <h3 className="text-lg text-slate-100 mb-4 flex items-center gap-2">
                      <User className="w-5 h-5 text-blue-400" />
                      Messages with Customers
                    </h3>
                    <p className="text-sm text-slate-400 mb-4">
                      {userRestaurantConversations.length === 0 
                        ? 'No customer conversations yet' 
                        : 'Click on a conversation to view the full message thread'
                      }
                    </p>
                    
                    <div className="space-y-3 max-h-[500px] overflow-y-auto">
                      {userRestaurantConversations.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                          <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p className="text-sm">No conversations with customers</p>
                          <p className="text-xs mt-1">Conversations will appear here when customers message your restaurant</p>
                        </div>
                      ) : (
                        userRestaurantConversations.map((conversation) => {
                          const userId = conversation.participants.userId;
                          const userName = getUserName(userId);
                          
                          return (
                            <motion.div
                              key={conversation.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="p-4 bg-slate-700/50 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer"
                              onClick={() => setSelectedCustomerConversation(conversation.id)}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-3 flex-1">
                                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                                    <User className="w-6 h-6 text-white" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                      <h4 className="text-slate-100">{userName}</h4>
                                      <span className="text-xs text-slate-500">
                                        {conversation.lastMessageAt && formatTimestamp(conversation.lastMessageAt)}
                                      </span>
                                    </div>
                                    <p className="text-sm text-slate-400 truncate">
                                      {conversation.lastMessage || 'No messages yet'}
                                    </p>
                                    <div className="flex items-center gap-2 mt-2">
                                      <Badge className="bg-slate-600/50 text-slate-300 text-xs">
                                        {conversation.type}
                                      </Badge>
                                      {conversation.reservationId && (
                                        <Badge className="bg-purple-500/20 text-purple-400 text-xs">
                                          Reservation
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <Eye className="w-5 h-5 text-slate-400 ml-3 flex-shrink-0" />
                              </div>
                            </motion.div>
                          );
                        })
                      )}
                    </div>
                  </>
                )}
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}