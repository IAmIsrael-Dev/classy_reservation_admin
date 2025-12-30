import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  ArrowLeft,
  Send,
  MessageSquare,
  Calendar,
  Star,
  Award,
  TrendingUp,
  Mail,
  Phone,
  MapPin,
  Clock,
  Heart,
  CreditCard,
  Gift,
  Target,
  CheckCircle2,
  Building2,
  User,
  Eye,
  Shield,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  subscribeToConversations,
  subscribeToMessages,
  sendMessage,
  findOrCreateAdminUserConversation,
  type Conversation,
  type Message as FirebaseMessage,
} from '../lib/firebase-messaging';
import { Timestamp } from 'firebase/firestore';

interface Booking {
  id: string;
  restaurantName: string;
  date: string;
  time: string;
  guests: number;
  status: 'completed' | 'upcoming' | 'cancelled';
  totalSpent?: number;
}

interface Review {
  id: string;
  restaurantName: string;
  rating: number;
  comment: string;
  date: string;
  helpful: number;
}

interface LoyaltyTier {
  name: string;
  points: number;
  nextTier: string;
  pointsToNext: number;
  benefits: string[];
}

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
  photoURL?: string;
  username?: string;
}

interface RestaurantOwner {
  id: string;
  restaurantName: string;
  city?: string;
  state?: string;
}

interface UserDetailsScreenProps {
  user: PlatformUser;
  onBack: () => void;
  restaurantOwners?: RestaurantOwner[];
  onViewRestaurant?: (restaurantId: string) => void;
}

export function UserDetailsScreen({ user, onBack, restaurantOwners, onViewRestaurant }: UserDetailsScreenProps) {
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedRestaurantConversation, setSelectedRestaurantConversation] = useState<string | null>(null);
  
  // Firebase state for admin-user conversations
  const [adminUserConversationId, setAdminUserConversationId] = useState<string | null>(null);
  const [adminUserMessages, setAdminUserMessages] = useState<FirebaseMessage[]>([]);
  const [currentAdminId] = useState('ADMIN_DEFAULT'); // This should come from auth context in production
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isInitializingConversation, setIsInitializingConversation] = useState(false);

  // Firebase state for user-restaurant conversations
  const [userRestaurantConversations, setUserRestaurantConversations] = useState<Conversation[]>([]);
  const [selectedConversationMessages, setSelectedConversationMessages] = useState<FirebaseMessage[]>([]);
  const [selectedConversationData, setSelectedConversationData] = useState<Conversation | null>(null);

  const bookings: Booking[] = [
    {
      id: '1',
      restaurantName: 'The Gourmet Kitchen',
      date: '2024-12-16',
      time: '7:00 PM',
      guests: 4,
      status: 'upcoming',
      totalSpent: 0,
    },
    {
      id: '2',
      restaurantName: 'Sunset Bistro',
      date: '2024-12-10',
      time: '7:30 PM',
      guests: 2,
      status: 'completed',
      totalSpent: 125,
    },
    {
      id: '3',
      restaurantName: 'Urban Fusion',
      date: '2024-12-05',
      time: '6:00 PM',
      guests: 6,
      status: 'completed',
      totalSpent: 340,
    },
    {
      id: '4',
      restaurantName: 'Coastal Grill',
      date: '2024-11-28',
      time: '8:00 PM',
      guests: 2,
      status: 'completed',
      totalSpent: 95,
    },
    {
      id: '5',
      restaurantName: 'The Garden Room',
      date: '2024-11-20',
      time: '6:30 PM',
      guests: 3,
      status: 'cancelled',
    },
  ];

  const reviews: Review[] = [
    {
      id: '1',
      restaurantName: 'Sunset Bistro',
      rating: 5,
      comment: 'Absolutely incredible experience! The food was exceptional and the service was impeccable. Will definitely be returning!',
      date: '2024-12-11',
      helpful: 12,
    },
    {
      id: '2',
      restaurantName: 'Urban Fusion',
      rating: 4,
      comment: 'Great fusion cuisine with creative dishes. Atmosphere was vibrant and lively. Portions were generous.',
      date: '2024-12-06',
      helpful: 8,
    },
    {
      id: '3',
      restaurantName: 'Coastal Grill',
      rating: 5,
      comment: 'Best seafood in the city! Fresh ingredients and perfectly prepared. The sunset view was an added bonus.',
      date: '2024-11-29',
      helpful: 15,
    },
  ];

  const loyaltyData: LoyaltyTier = {
    name: user.membershipTier === 'elite' ? 'Elite' : user.membershipTier === 'premium' ? 'Premium' : 'Free',
    points: user.membershipTier === 'elite' ? 2850 : user.membershipTier === 'premium' ? 1250 : 450,
    nextTier: user.membershipTier === 'elite' ? 'Max Level' : user.membershipTier === 'premium' ? 'Elite' : 'Premium',
    pointsToNext: user.membershipTier === 'elite' ? 0 : user.membershipTier === 'premium' ? 750 : 550,
    benefits: user.membershipTier === 'elite' 
      ? ['Priority reservations', 'Exclusive events', '20% dining rewards', 'Personal concierge', 'VIP access']
      : user.membershipTier === 'premium'
      ? ['Priority booking', '10% dining rewards', 'Birthday perks', 'Early access']
      : ['Basic booking', 'Review privileges', 'Favorites list'],
  };

  const handleSendMessage = async () => {
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }
    
    // Create conversation if it doesn't exist
    if (!adminUserConversationId && !isInitializingConversation) {
      setIsInitializingConversation(true);
      try {
        const conversationId = await findOrCreateAdminUserConversation(currentAdminId, user.id);
        setAdminUserConversationId(conversationId);
        // Now send the message
        await sendMessage(conversationId, currentAdminId, 'ADMIN', message);
        toast.success(`Message sent to ${user.name}`);
        setMessage('');
      } catch (error) {
        console.error('Error sending message:', error);
        toast.error('Failed to send message');
      } finally {
        setIsInitializingConversation(false);
      }
      return;
    }
    
    if (!adminUserConversationId) {
      toast.error('Unable to send message - please try again');
      return;
    }

    try {
      await sendMessage(adminUserConversationId, currentAdminId, 'ADMIN', message);
      toast.success(`Message sent to ${user.name}`);
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  // Subscribe to ADMIN_USER conversation and messages only if conversation exists
  useEffect(() => {
    let unsubscribeMessages: (() => void) | undefined;
    const unsubscribeConversations: (() => void) | undefined = subscribeToConversations(
      {
        type: 'ADMIN_USER',
        userId: user.id,
      },
      (conversations) => {
        if (conversations.length > 0) {
          const conversation = conversations[0]; // Get the first matching conversation
          setAdminUserConversationId(conversation.id);
          
          // Subscribe to messages in this conversation
          unsubscribeMessages = subscribeToMessages(
            conversation.id,
            (msgs) => {
              setAdminUserMessages(msgs);
            },
            (error) => {
              console.error('Error loading messages:', error);
            }
          );
        } else {
          // No conversation exists yet - will be created when admin sends first message
          setAdminUserConversationId(null);
          setAdminUserMessages([]);
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
  }, [user.id, currentAdminId]);

  // Subscribe to USER_RESTAURANT conversations
  useEffect(() => {
    const unsubscribe = subscribeToConversations(
      {
        type: 'USER_RESTAURANT',
        userId: user.id,
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
  }, [user.id]);

  // Subscribe to messages when a restaurant conversation is selected
  useEffect(() => {
    if (!selectedRestaurantConversation) {
      setSelectedConversationMessages([]);
      setSelectedConversationData(null);
      return;
    }

    // Find the conversation data
    const conversation = userRestaurantConversations.find(c => c.id === selectedRestaurantConversation);
    if (conversation) {
      setSelectedConversationData(conversation);
    }

    const unsubscribe = subscribeToMessages(
      selectedRestaurantConversation,
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
  }, [selectedRestaurantConversation, userRestaurantConversations]);

  // Get restaurant name by ID helper
  const getRestaurantName = (restaurantId: string | undefined): string => {
    if (!restaurantId) return 'Unknown Restaurant';
    if (!restaurantOwners || restaurantOwners.length === 0) return `Restaurant ${restaurantId.slice(0, 8)}`;
    
    const restaurant = restaurantOwners.find(r => r.id === restaurantId);
    return restaurant ? restaurant.restaurantName : `Restaurant ${restaurantId.slice(0, 8)}`;
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
      const timestampWithSeconds = timestamp as { seconds: number };
      date = new Date(timestampWithSeconds.seconds * 1000);
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
            Back to Users
          </Button>
          
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {user.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt={user.name}
                  className="w-16 h-16 rounded-full object-cover border-2 border-purple-500"
                />
              ) : (
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-2xl">
                    {user.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
              )}
              <div>
                <h1 className="text-3xl text-slate-100 mb-1">{user.name}</h1>
                <div className="flex items-center gap-3">
                  <Badge
                    className={
                      user.membershipTier === 'elite'
                        ? 'bg-amber-500 text-black'
                        : user.membershipTier === 'premium'
                        ? 'bg-purple-500 text-white'
                        : 'bg-slate-600 text-white'
                    }
                  >
                    {user.membershipTier === 'elite' ? '⭐ Elite Member' : 
                     user.membershipTier === 'premium' ? '💎 Premium Member' : 
                     'Free Member'}
                  </Badge>
                  <Badge
                    className={
                      user.status === 'active'
                        ? 'bg-green-500/20 text-green-400'
                        : user.status === 'inactive'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-red-500/20 text-red-400'
                    }
                  >
                    {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <Card className="p-4 bg-slate-800 border-slate-700">
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8 text-blue-400" />
              <div>
                <div className="text-2xl text-slate-100">{user.totalReservations}</div>
                <div className="text-xs text-slate-400">Total Bookings</div>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-slate-800 border-slate-700">
            <div className="flex items-center gap-3">
              <Star className="w-8 h-8 text-yellow-400" />
              <div>
                <div className="text-2xl text-slate-100">{user.reviewsWritten}</div>
                <div className="text-xs text-slate-400">Reviews Written</div>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-slate-800 border-slate-700">
            <div className="flex items-center gap-3">
              <Heart className="w-8 h-8 text-pink-400" />
              <div>
                <div className="text-2xl text-slate-100">{user.favoriteRestaurants}</div>
                <div className="text-xs text-slate-400">Favorite Places</div>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-slate-800 border-slate-700">
            <div className="flex items-center gap-3">
              <CreditCard className="w-8 h-8 text-green-400" />
              <div>
                <div className="text-2xl text-slate-100">${user.totalSpent}</div>
                <div className="text-xs text-slate-400">Total Spent</div>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-slate-800 border-slate-700">
            <div className="flex items-center gap-3">
              <Award className="w-8 h-8 text-purple-400" />
              <div>
                <div className="text-2xl text-slate-100">{loyaltyData.points}</div>
                <div className="text-xs text-slate-400">Loyalty Points</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-slate-800 mb-6">
            <TabsTrigger value="overview" className="data-[state=active]:bg-slate-700">
              <User className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="messages" className="data-[state=active]:bg-slate-700">
              <MessageSquare className="w-4 h-4 mr-2" />
              Messages
            </TabsTrigger>
            <TabsTrigger value="bookings" className="data-[state=active]:bg-slate-700">
              <Calendar className="w-4 h-4 mr-2" />
              Bookings
            </TabsTrigger>
            <TabsTrigger value="reviews" className="data-[state=active]:bg-slate-700">
              <Star className="w-4 h-4 mr-2" />
              Reviews
            </TabsTrigger>
            <TabsTrigger value="loyalty" className="data-[state=active]:bg-slate-700">
              <Gift className="w-4 h-4 mr-2" />
              Loyalty
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Contact Information */}
              <Card className="p-6 bg-slate-800 border-slate-700">
                <h3 className="text-lg text-slate-100 mb-4 flex items-center gap-2">
                  <Phone className="w-5 h-5 text-slate-400" />
                  Contact Information
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <div>
                      <div className="text-xs text-slate-500">Email</div>
                      <div className="text-sm text-slate-200">{user.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <div>
                      <div className="text-xs text-slate-500">Phone</div>
                      <div className="text-sm text-slate-200">{user.phone}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <div>
                      <div className="text-xs text-slate-500">Location</div>
                      <div className="text-sm text-slate-200">{user.location}</div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Activity Timeline */}
              <Card className="p-6 bg-slate-800 border-slate-700">
                <h3 className="text-lg text-slate-100 mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-slate-400" />
                  Account Timeline
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                    <span className="text-sm text-slate-400">Member Since</span>
                    <span className="text-sm text-slate-200">{user.joinedDate}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                    <span className="text-sm text-slate-400">Last Active</span>
                    <span className="text-sm text-slate-200">{user.lastActive}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                    <span className="text-sm text-slate-400">Account Status</span>
                    <Badge className={
                      user.status === 'active'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }>
                      {user.status}
                    </Badge>
                  </div>
                </div>
              </Card>

              {/* Engagement Metrics */}
              <Card className="p-6 bg-slate-800 border-slate-700 lg:col-span-2">
                <h3 className="text-lg text-slate-100 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-slate-400" />
                  Engagement Metrics
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-400">Booking Frequency</span>
                      <span className="text-sm text-slate-200">{user.totalReservations} total</span>
                    </div>
                    <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
                        style={{ width: `${Math.min((user.totalReservations / 30) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-400">Review Activity</span>
                      <span className="text-sm text-slate-200">{user.reviewsWritten} reviews</span>
                    </div>
                    <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-yellow-500 to-orange-500"
                        style={{ width: `${Math.min((user.reviewsWritten / 20) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-400">Loyalty Level</span>
                      <span className="text-sm text-slate-200">{loyaltyData.points} pts</span>
                    </div>
                    <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                        style={{ width: `${Math.min((loyaltyData.points / 3000) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Direct Messages with User */}
              <Card className="p-6 bg-slate-800 border-slate-700">
                <h3 className="text-lg text-slate-100 mb-4 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-purple-400" />
                  Direct Messages
                </h3>
                
                {/* Message History */}
                <div className="space-y-3 mb-4 max-h-[400px] overflow-y-auto">
                  {adminUserMessages.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">No messages yet</p>
                      <p className="text-xs mt-1">Start a conversation with this user</p>
                    </div>
                  ) : (
                    adminUserMessages.map((msg) => {
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
                              {isAdmin ? <Shield className="w-3 h-3 mr-1" /> : <User className="w-3 h-3 mr-1" />}
                              {isAdmin ? 'Admin' : 'User'}
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
                    placeholder="Type your message..."
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

              {/* Restaurant Messages */}
              <Card className="p-6 bg-slate-800 border-slate-700">
                {selectedRestaurantConversation ? (
                  // Show full conversation with selected restaurant
                  <>
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                      <h3 className="text-lg text-slate-100 flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-blue-400" />
                        {selectedConversationData && getRestaurantName(selectedConversationData.participants.restaurantId)}
                      </h3>
                      <div className="flex items-center gap-2">
                        {selectedConversationData?.participants.restaurantId && onViewRestaurant && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-slate-600 text-slate-300 hover:bg-slate-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewRestaurant(selectedConversationData.participants.restaurantId!);
                            }}
                          >
                            <Building2 className="w-4 h-4 mr-2" />
                            View Restaurant
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-slate-600 text-slate-300 hover:bg-slate-700"
                          onClick={() => setSelectedRestaurantConversation(null)}
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
                          const isUser = msg.senderRole === 'USER';
                          return (
                            <motion.div
                              key={msg.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`p-4 rounded-lg ${
                                isUser 
                                  ? 'bg-blue-600/20 mr-12 border border-blue-500/30' 
                                  : 'bg-slate-700/50 ml-12 border border-slate-600/30'
                              }`}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <div className={`w-8 h-8 bg-gradient-to-br ${isUser ? 'from-blue-500 to-cyan-500' : 'from-green-500 to-emerald-500'} rounded-full flex items-center justify-center`}>
                                    {isUser ? <User className="w-4 h-4 text-white" /> : <Building2 className="w-4 h-4 text-white" />}
                                  </div>
                                  <span className="text-sm text-slate-100">
                                    {isUser ? user.name : (selectedConversationData && getRestaurantName(selectedConversationData.participants.restaurantId))}
                                  </span>
                                </div>
                                <Badge className={
                                  isUser 
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
                  // Show list of conversations grouped by restaurant
                  <>
                    <h3 className="text-lg text-slate-100 mb-4 flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-blue-400" />
                      Messages with Restaurants
                    </h3>
                    <p className="text-sm text-slate-400 mb-4">
                      {userRestaurantConversations.length === 0 
                        ? 'No restaurant conversations yet' 
                        : 'Click on a conversation to view the full message thread'
                      }
                    </p>
                    
                    <div className="space-y-3 max-h-[500px] overflow-y-auto">
                      {userRestaurantConversations.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p className="text-sm">No conversations with restaurants</p>
                          <p className="text-xs mt-1">Conversations will appear here when {user.name} messages a restaurant</p>
                        </div>
                      ) : (
                        userRestaurantConversations.map((conversation) => {
                          const restaurantId = conversation.participants.restaurantId;
                          const restaurantName = getRestaurantName(restaurantId);
                          
                          return (
                            <motion.div
                              key={conversation.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="p-4 bg-slate-700/50 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer"
                              onClick={() => setSelectedRestaurantConversation(conversation.id)}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-3 flex-1">
                                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                                    <Building2 className="w-6 h-6 text-white" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                      <h4 className="text-slate-100">{restaurantName}</h4>
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

          {/* Bookings Tab */}
          <TabsContent value="bookings" className="space-y-6">
            <Card className="p-6 bg-slate-800 border-slate-700">
              <h3 className="text-lg text-slate-100 mb-4">Booking History</h3>
              
              <div className="space-y-3">
                {bookings.map((booking) => (
                  <motion.div
                    key={booking.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-slate-700/50 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                          <Building2 className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h4 className="text-slate-100">{booking.restaurantName}</h4>
                          <div className="flex items-center gap-2 text-sm text-slate-400">
                            <Calendar className="w-3 h-3" />
                            {booking.date} at {booking.time}
                          </div>
                        </div>
                      </div>
                      <Badge
                        className={
                          booking.status === 'completed'
                            ? 'bg-green-500/20 text-green-400'
                            : booking.status === 'upcoming'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-red-500/20 text-red-400'
                        }
                      >
                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-2 bg-slate-800/50 rounded">
                        <div className="text-xs text-slate-500">Guests</div>
                        <div className="text-sm text-slate-200">{booking.guests} people</div>
                      </div>
                      {booking.totalSpent !== undefined && (
                        <div className="p-2 bg-slate-800/50 rounded">
                          <div className="text-xs text-slate-500">Total Spent</div>
                          <div className="text-sm text-slate-200">
                            {booking.totalSpent > 0 ? `$${booking.totalSpent}` : 'Pending'}
                          </div>
                        </div>
                      )}
                      {booking.status === 'completed' && (
                        <div className="p-2 bg-slate-800/50 rounded">
                          <div className="text-xs text-slate-500">Points Earned</div>
                          <div className="text-sm text-green-400">
                            +{booking.totalSpent ? Math.round(booking.totalSpent / 10) : 0} pts
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews" className="space-y-6">
            <Card className="p-6 bg-slate-800 border-slate-700">
              <h3 className="text-lg text-slate-100 mb-4">Reviews Written</h3>
              
              <div className="space-y-4">
                {reviews.map((review) => (
                  <motion.div
                    key={review.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-slate-700/50 rounded-lg border border-slate-700"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="text-slate-100 mb-1">{review.restaurantName}</h4>
                        <div className="flex items-center gap-1 mb-2">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < review.rating
                                  ? 'text-yellow-400 fill-yellow-400'
                                  : 'text-slate-600'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <span className="text-xs text-slate-500">{review.date}</span>
                    </div>
                    
                    <p className="text-sm text-slate-300 mb-3">{review.comment}</p>
                    
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        {review.helpful} found helpful
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* Loyalty Tab */}
          <TabsContent value="loyalty" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Loyalty Overview */}
              <Card className="p-6 bg-gradient-to-br from-purple-600/20 to-pink-600/20 border-purple-500/30">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg text-slate-100 flex items-center gap-2">
                    <Award className="w-5 h-5 text-purple-400" />
                    Loyalty Status
                  </h3>
                  <Badge className={
                    loyaltyData.name === 'Elite'
                      ? 'bg-amber-500 text-black'
                      : loyaltyData.name === 'Premium'
                      ? 'bg-purple-500 text-white'
                      : 'bg-slate-600 text-white'
                  }>
                    {loyaltyData.name}
                  </Badge>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-300">Current Points</span>
                      <span className="text-2xl text-slate-100">{loyaltyData.points}</span>
                    </div>
                    {loyaltyData.pointsToNext > 0 && (
                      <>
                        <div className="h-3 bg-slate-700/50 rounded-full overflow-hidden mb-2">
                          <div 
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                            style={{ 
                              width: `${((loyaltyData.points) / (loyaltyData.points + loyaltyData.pointsToNext)) * 100}%` 
                            }}
                          />
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <Target className="w-3 h-3" />
                          {loyaltyData.pointsToNext} points to {loyaltyData.nextTier}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </Card>

              {/* Benefits */}
              <Card className="p-6 bg-slate-800 border-slate-700">
                <h3 className="text-lg text-slate-100 mb-4 flex items-center gap-2">
                  <Gift className="w-5 h-5 text-slate-400" />
                  Active Benefits
                </h3>
                
                <div className="space-y-2">
                  {loyaltyData.benefits.map((benefit, index) => (
                    <div 
                      key={index}
                      className="flex items-center gap-2 p-2 bg-slate-700/30 rounded"
                    >
                      <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                      <span className="text-sm text-slate-300">{benefit}</span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Points History */}
              <Card className="p-6 bg-slate-800 border-slate-700">
                <h3 className="text-lg text-slate-100 mb-4">Recent Points Activity</h3>
                
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                        <TrendingUp className="w-4 h-4 text-green-400" />
                      </div>
                      <div>
                        <div className="text-sm text-slate-200">Dining at Sunset Bistro</div>
                        <div className="text-xs text-slate-500">December 10, 2024</div>
                      </div>
                    </div>
                    <span className="text-green-400">+125 pts</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                        <Star className="w-4 h-4 text-green-400" />
                      </div>
                      <div>
                        <div className="text-sm text-slate-200">Review Bonus</div>
                        <div className="text-xs text-slate-500">December 11, 2024</div>
                      </div>
                    </div>
                    <span className="text-green-400">+50 pts</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                        <TrendingUp className="w-4 h-4 text-green-400" />
                      </div>
                      <div>
                        <div className="text-sm text-slate-200">Dining at Urban Fusion</div>
                        <div className="text-xs text-slate-500">December 5, 2024</div>
                      </div>
                    </div>
                    <span className="text-green-400">+340 pts</span>
                  </div>
                </div>
              </Card>

              {/* Redemption History */}
              <Card className="p-6 bg-slate-800 border-slate-700">
                <h3 className="text-lg text-slate-100 mb-4 flex items-center gap-2">
                  <Gift className="w-5 h-5 text-amber-400" />
                  Redemption History
                </h3>
                
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg border border-amber-500/20">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-amber-500/20 rounded-full flex items-center justify-center">
                        <Gift className="w-4 h-4 text-amber-400" />
                      </div>
                      <div>
                        <div className="text-sm text-slate-200">$50 Dining Credit</div>
                        <div className="text-xs text-slate-500">Redeemed on Nov 15, 2024</div>
                      </div>
                    </div>
                    <span className="text-red-400">-500 pts</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg border border-amber-500/20">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-amber-500/20 rounded-full flex items-center justify-center">
                        <Gift className="w-4 h-4 text-amber-400" />
                      </div>
                      <div>
                        <div className="text-sm text-slate-200">Free Dessert Voucher</div>
                        <div className="text-xs text-slate-500">Redeemed on Oct 28, 2024</div>
                      </div>
                    </div>
                    <span className="text-red-400">-200 pts</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg border border-amber-500/20">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-amber-500/20 rounded-full flex items-center justify-center">
                        <Gift className="w-4 h-4 text-amber-400" />
                      </div>
                      <div>
                        <div className="text-sm text-slate-200">Priority Reservation Pass</div>
                        <div className="text-xs text-slate-500">Redeemed on Oct 10, 2024</div>
                      </div>
                    </div>
                    <span className="text-red-400">-300 pts</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg border border-amber-500/20">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-amber-500/20 rounded-full flex items-center justify-center">
                        <Gift className="w-4 h-4 text-amber-400" />
                      </div>
                      <div>
                        <div className="text-sm text-slate-200">$25 Dining Credit</div>
                        <div className="text-xs text-slate-500">Redeemed on Sep 22, 2024</div>
                      </div>
                    </div>
                    <span className="text-red-400">-250 pts</span>
                  </div>
                </div>
              </Card>

              {/* Total Redeemed Summary */}
              <Card className="p-6 bg-gradient-to-br from-amber-600/20 to-orange-600/20 border-amber-500/30 lg:col-span-2">
                <h3 className="text-lg text-slate-100 mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-400" />
                  Lifetime Redemptions
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-800/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Gift className="w-5 h-5 text-amber-400" />
                      <span className="text-sm text-slate-400">Total Gifts Received</span>
                    </div>
                    <div className="text-2xl text-slate-100">12 Gifts</div>
                  </div>
                  
                  <div className="p-4 bg-slate-800/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-5 h-5 text-red-400" />
                      <span className="text-sm text-slate-400">Points Redeemed</span>
                    </div>
                    <div className="text-2xl text-slate-100">3,450 pts</div>
                  </div>
                  
                  <div className="p-4 bg-slate-800/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CreditCard className="w-5 h-5 text-green-400" />
                      <span className="text-sm text-slate-400">Estimated Value</span>
                    </div>
                    <div className="text-2xl text-slate-100">$345</div>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}