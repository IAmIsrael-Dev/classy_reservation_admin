import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import {
  MessageSquare,
  Send,
  Filter,
  Search,
  User,
  Building2,
  Shield,
  Calendar,
  ArrowLeft,
  Plus,
  Trash2,
  Check,
  ChevronsUpDown,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  subscribeToConversations,
  subscribeToMessages,
  sendMessage,
  createConversation,
  joinConversationAsAdmin,
  deleteConversation,
  type Conversation,
  type Message,
  type ConversationType,
  type ConversationFilter,
} from '../lib/firebase-messaging';
import { Timestamp } from 'firebase/firestore';
import { useUsers, useRestaurantOwners } from '../lib/firebase-hooks';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

interface AdminMessagingScreenProps {
  currentAdminId: string;
  currentAdminEmail: string;
}

export function AdminMessagingScreen({ currentAdminId, currentAdminEmail }: AdminMessagingScreenProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<ConversationType | 'ALL'>('ALL');
  const [showNewConversation, setShowNewConversation] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // New conversation form state
  const [newConvType, setNewConvType] = useState<ConversationType>('ADMIN_USER');
  const [newConvUserId, setNewConvUserId] = useState('');
  const [newConvRestaurantId, setNewConvRestaurantId] = useState('');
  
  // Popover state for searchable dropdowns
  const [openUserSelect, setOpenUserSelect] = useState(false);
  const [openRestaurantSelect, setOpenRestaurantSelect] = useState(false);

  // Fetch users and restaurant owners for name lookups
  const { users } = useUsers();
  const { restaurantOwners } = useRestaurantOwners();

  // Create lookup maps for names
  const userNamesMap = new Map(users.map(u => [u.id, u.displayName || u.username || u.email]));
  const restaurantNamesMap = new Map(restaurantOwners.map(r => [r.id, r.restaurantName || r.displayName]));

  // Subscribe to conversations
  useEffect(() => {
    // Admin messaging screen should ONLY show conversations involving admins
    // Filter by type: ADMIN_USER or ADMIN_RESTAURANT
    // USER_RESTAURANT conversations are shown in user/restaurant detail screens
    const filter: ConversationFilter = {};
    
    // If filterType is ALL, we still only want admin conversations
    if (filterType === 'ALL') {
      // We'll fetch all conversations and filter in-memory for admin types only
      filter.type = undefined;
    } else {
      filter.type = filterType;
    }

    const unsubscribe = subscribeToConversations(
      filter,
      (updatedConversations) => {
        // Filter to only show admin conversations (ADMIN_USER and ADMIN_RESTAURANT)
        const adminConversations = updatedConversations.filter(
          (conv) => conv.type === 'ADMIN_USER' || conv.type === 'ADMIN_RESTAURANT'
        );
        setConversations(adminConversations);
      },
      (error) => {
        toast.error('Failed to load conversations');
        console.error(error);
      }
    );

    return () => unsubscribe();
  }, [filterType]);

  // Subscribe to messages when conversation is selected
  useEffect(() => {
    if (!selectedConversation) {
      setMessages([]);
      return;
    }

    const unsubscribe = subscribeToMessages(
      selectedConversation.id,
      (updatedMessages) => {
        setMessages(updatedMessages);
        scrollToBottom();
      },
      (error) => {
        toast.error('Failed to load messages');
        console.error(error);
      }
    );

    return () => unsubscribe();
  }, [selectedConversation]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedConversation) {
      toast.error('Please enter a message');
      return;
    }

    try {
      // Check if admin is in the conversation, if not join first
      if (!selectedConversation.participants?.adminIds?.includes(currentAdminId)) {
        await joinConversationAsAdmin(selectedConversation.id, currentAdminId);
      }

      await sendMessage(selectedConversation.id, currentAdminId, 'ADMIN', messageText);
      setMessageText('');
      toast.success('Message sent');
    } catch (error) {
      toast.error('Failed to send message');
      console.error(error);
    }
  };

  const handleCreateConversation = async () => {
    try {
      interface ConversationParticipants {
        adminIds: string[];
        userId?: string;
        restaurantId?: string;
      }

      const participants: ConversationParticipants = {
        adminIds: [currentAdminId],
      };

      // Validate and add userId if needed
      if (newConvType === 'ADMIN_USER' || newConvType === 'USER_RESTAURANT') {
        if (!newConvUserId) {
          toast.error('Please select a user');
          return;
        }
        participants.userId = newConvUserId;
      }

      // Validate and add restaurantId if needed
      if (newConvType === 'ADMIN_RESTAURANT' || newConvType === 'USER_RESTAURANT') {
        if (!newConvRestaurantId) {
          toast.error('Please select a restaurant');
          return;
        }
        participants.restaurantId = newConvRestaurantId;
      }

      console.log('About to create conversation:', {
        type: newConvType,
        participants,
        userId: newConvUserId,
        restaurantId: newConvRestaurantId,
      });

      await createConversation(newConvType, participants);
      toast.success('Conversation created successfully');
      setShowNewConversation(false);
      setNewConvUserId('');
      setNewConvRestaurantId('');
    } catch (error) {
      toast.error('Failed to create conversation');
      console.error(error);
    }
  };

  const handleDeleteConversation = async (conversationId: string) => {
    try {
      await deleteConversation(conversationId);
      toast.success('Conversation deleted successfully');
      setSelectedConversation(null);
    } catch (error) {
      toast.error('Failed to delete conversation');
      console.error(error);
    }
  };

  const formatTimestamp = (timestamp: Timestamp | undefined) => {
    if (!timestamp) return '';
    
    // Handle different timestamp formats
    let date: Date;
    if (timestamp instanceof Date) {
      date = timestamp;
    } else if (typeof timestamp === 'object' && 'toDate' in timestamp) {
      date = timestamp.toDate();
    } else if (typeof timestamp === 'object' && 'seconds' in timestamp) {
      // Handle plain object with seconds (serialized Timestamp)
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

  const getConversationTitle = (conv: Conversation) => {
    switch (conv.type) {
      case 'USER_RESTAURANT':
        return `User ↔ Restaurant`;
      case 'ADMIN_USER':
        return `Admin ↔ User`;
      case 'ADMIN_RESTAURANT':
        return `Admin ↔ Restaurant`;
      default:
        return 'Conversation';
    }
  };

  const getConversationSubtitle = (conv: Conversation) => {
    const parts: string[] = [];
    
    // Use actual names instead of IDs
    if (conv.participants?.userId) {
      const userName = userNamesMap.get(conv.participants.userId) || `User ${conv.participants.userId.substring(0, 8)}`;
      parts.push(userName);
    }
    
    if (conv.participants?.restaurantId) {
      const restaurantName = restaurantNamesMap.get(conv.participants.restaurantId) || `Restaurant ${conv.participants.restaurantId.substring(0, 8)}`;
      parts.push(restaurantName);
    }
    
    if (conv.reservationId) {
      parts.push(`Reservation: ${conv.reservationId.substring(0, 8)}`);
    }
    
    return parts.join(' • ') || 'No details available';
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <Shield className="w-4 h-4 text-purple-400" />;
      case 'USER':
        return <User className="w-4 h-4 text-blue-400" />;
      case 'RESTAURANT':
        return <Building2 className="w-4 h-4 text-green-400" />;
      default:
        return <MessageSquare className="w-4 h-4 text-slate-400" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-500/20 text-purple-400';
      case 'USER':
        return 'bg-blue-500/20 text-blue-400';
      case 'RESTAURANT':
        return 'bg-green-500/20 text-green-400';
      default:
        return 'bg-slate-500/20 text-slate-400';
    }
  };

  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      conv.id?.toLowerCase().includes(query) ||
      conv.participants?.userId?.toLowerCase().includes(query) ||
      conv.participants?.restaurantId?.toLowerCase().includes(query) ||
      conv.lastMessage?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="container mx-auto p-6 max-w-[1800px]">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl text-slate-100 mb-2">Admin Messages</h1>
              <p className="text-slate-400">Direct conversations between admins and users or restaurants</p>
            </div>
            <Button
              className="bg-purple-600 hover:bg-purple-700"
              onClick={() => setShowNewConversation(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Conversation
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4 bg-slate-800 border-slate-700">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-8 h-8 text-blue-400" />
                <div>
                  <div className="text-2xl text-slate-100">{conversations.length}</div>
                  <div className="text-xs text-slate-400">Total Conversations</div>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-slate-800 border-slate-700">
              <div className="flex items-center gap-3">
                <User className="w-8 h-8 text-blue-400" />
                <div>
                  <div className="text-2xl text-slate-100">
                    {conversations.filter((c) => c.type.includes('USER')).length}
                  </div>
                  <div className="text-xs text-slate-400">User Conversations</div>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-slate-800 border-slate-700">
              <div className="flex items-center gap-3">
                <Building2 className="w-8 h-8 text-green-400" />
                <div>
                  <div className="text-2xl text-slate-100">
                    {conversations.filter((c) => c.type.includes('RESTAURANT')).length}
                  </div>
                  <div className="text-xs text-slate-400">Restaurant Conversations</div>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-slate-800 border-slate-700">
              <div className="flex items-center gap-3">
                <Shield className="w-8 h-8 text-purple-400" />
                <div>
                  <div className="text-2xl text-slate-100">
                    {conversations.filter((c) => c.participants?.adminIds?.includes(currentAdminId)).length}
                  </div>
                  <div className="text-xs text-slate-400">Your Active Chats</div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* New Conversation Modal */}
        <AnimatePresence>
          {showNewConversation && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowNewConversation(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg"
              >
                <Card className="p-6 bg-slate-800 border-slate-700">
                  <h3 className="text-xl text-slate-100 mb-4">Create New Conversation</h3>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-slate-300 mb-2 block">Conversation Type</label>
                      <select
                        value={newConvType}
                        onChange={(e) => setNewConvType(e.target.value as ConversationType)}
                        className="w-full bg-slate-700 border-slate-600 text-slate-100 rounded-md p-2"
                      >
                        <option value="ADMIN_USER">Admin ↔ User</option>
                        <option value="ADMIN_RESTAURANT">Admin ↔ Restaurant</option>
                        <option value="USER_RESTAURANT">User ↔ Restaurant (Intervene)</option>
                      </select>
                    </div>

                    {(newConvType === 'ADMIN_USER' || newConvType === 'USER_RESTAURANT') && (
                      <div>
                        <label className="text-sm text-slate-300 mb-2 block">Select User</label>
                        <Popover open={openUserSelect} onOpenChange={setOpenUserSelect}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={openUserSelect}
                              className="w-full justify-between bg-slate-700 border-slate-600 text-slate-100 hover:bg-slate-600"
                            >
                              {newConvUserId 
                                ? userNamesMap.get(newConvUserId) || 'Select user...' 
                                : 'Select user...'}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[400px] p-0 bg-slate-800 border-slate-700">
                            <Command className="bg-slate-800">
                              <CommandInput placeholder="Search users..." className="bg-slate-700 text-slate-100" />
                              <CommandList>
                                <CommandEmpty className="text-slate-400 py-6 text-center">No users found</CommandEmpty>
                                <CommandGroup>
                                  {users.map((user) => (
                                    <CommandItem
                                      key={user.id}
                                      value={user.displayName || user.username || user.email}
                                      onSelect={() => {
                                        setNewConvUserId(user.id);
                                        setOpenUserSelect(false);
                                      }}
                                      className="text-slate-200 hover:bg-slate-700"
                                    >
                                      <Check
                                        className={`mr-2 h-4 w-4 ${
                                          newConvUserId === user.id ? 'opacity-100' : 'opacity-0'
                                        }`}
                                      />
                                      <User className="mr-2 h-4 w-4 text-blue-400" />
                                      <div className="flex flex-col">
                                        <span>{user.displayName || user.username || user.email}</span>
                                        <span className="text-xs text-slate-400">{user.email}</span>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                    )}

                    {(newConvType === 'ADMIN_RESTAURANT' || newConvType === 'USER_RESTAURANT') && (
                      <div>
                        <label className="text-sm text-slate-300 mb-2 block">Select Restaurant</label>
                        <Popover open={openRestaurantSelect} onOpenChange={setOpenRestaurantSelect}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={openRestaurantSelect}
                              className="w-full justify-between bg-slate-700 border-slate-600 text-slate-100 hover:bg-slate-600"
                            >
                              {newConvRestaurantId 
                                ? restaurantNamesMap.get(newConvRestaurantId) || 'Select restaurant...' 
                                : 'Select restaurant...'}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[400px] p-0 bg-slate-800 border-slate-700">
                            <Command className="bg-slate-800">
                              <CommandInput placeholder="Search restaurants..." className="bg-slate-700 text-slate-100" />
                              <CommandList>
                                <CommandEmpty className="text-slate-400 py-6 text-center">No restaurants found</CommandEmpty>
                                <CommandGroup>
                                  {restaurantOwners.map((restaurant) => (
                                    <CommandItem
                                      key={restaurant.id}
                                      value={restaurant.restaurantName || restaurant.displayName}
                                      onSelect={() => {
                                        setNewConvRestaurantId(restaurant.id);
                                        setOpenRestaurantSelect(false);
                                      }}
                                      className="text-slate-200 hover:bg-slate-700"
                                    >
                                      <Check
                                        className={`mr-2 h-4 w-4 ${
                                          newConvRestaurantId === restaurant.id ? 'opacity-100' : 'opacity-0'
                                        }`}
                                      />
                                      <Building2 className="mr-2 h-4 w-4 text-green-400" />
                                      <div className="flex flex-col">
                                        <span>{restaurant.restaurantName || restaurant.displayName}</span>
                                        <span className="text-xs text-slate-400">{restaurant.cuisineType} • {restaurant.city}</span>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                    )}

                    <div className="flex items-center gap-3 pt-4">
                      <Button
                        className="flex-1 bg-purple-600 hover:bg-purple-700"
                        onClick={handleCreateConversation}
                      >
                        Create Conversation
                      </Button>
                      <Button
                        variant="outline"
                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
                        onClick={() => setShowNewConversation(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Conversations List */}
          <Card className="p-6 bg-slate-800 border-slate-700 lg:col-span-1">
            <div className="space-y-4">
              {/* Search and Filter */}
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-slate-700 border-slate-600 text-slate-100"
                    placeholder="Search conversations..."
                  />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Filter className="w-4 h-4 text-slate-400" />
                  <Button
                    size="sm"
                    variant={filterType === 'ALL' ? 'default' : 'outline'}
                    className={
                      filterType === 'ALL'
                        ? 'bg-purple-600 hover:bg-purple-700'
                        : 'border-slate-600 text-slate-300'
                    }
                    onClick={() => setFilterType('ALL')}
                  >
                    All
                  </Button>
                  <Button
                    size="sm"
                    variant={filterType === 'ADMIN_USER' ? 'default' : 'outline'}
                    className={
                      filterType === 'ADMIN_USER'
                        ? 'bg-purple-600 hover:bg-purple-700'
                        : 'border-slate-600 text-slate-300'
                    }
                    onClick={() => setFilterType('ADMIN_USER')}
                  >
                    Admin-User
                  </Button>
                  <Button
                    size="sm"
                    variant={filterType === 'ADMIN_RESTAURANT' ? 'default' : 'outline'}
                    className={
                      filterType === 'ADMIN_RESTAURANT'
                        ? 'bg-purple-600 hover:bg-purple-700'
                        : 'border-slate-600 text-slate-300'
                    }
                    onClick={() => setFilterType('ADMIN_RESTAURANT')}
                  >
                    Admin-Restaurant
                  </Button>
                </div>
              </div>

              {/* Conversations */}
              <div className="space-y-2 max-h-[calc(100vh-400px)] overflow-y-auto">
                {filteredConversations.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No conversations found</p>
                  </div>
                ) : (
                  filteredConversations.map((conv) => (
                    <motion.div
                      key={conv.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-4 rounded-lg border transition-colors relative group ${
                        selectedConversation?.id === conv.id
                          ? 'bg-purple-600/20 border-purple-500'
                          : 'bg-slate-700/50 border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      {/* Delete button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500/10 hover:bg-red-500/20 text-red-400 p-1 h-auto"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
                            handleDeleteConversation(conv.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>

                      <div onClick={() => setSelectedConversation(conv)} className="cursor-pointer">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0 pr-8">
                            <h4 className="text-slate-100 mb-1 truncate">{getConversationTitle(conv)}</h4>
                            <p className="text-xs text-slate-400 truncate">{getConversationSubtitle(conv)}</p>
                          </div>
                          <span className="text-xs text-slate-500 ml-2 flex-shrink-0">
                            {formatTimestamp(conv.lastMessageAt)}
                          </span>
                        </div>

                        {conv.lastMessage && (
                          <p className="text-sm text-slate-400 truncate mb-2">{conv.lastMessage}</p>
                        )}

                        <div className="flex items-center gap-2">
                          <Badge className={getRoleBadgeColor(conv.type.split('_')[0])}>
                            {conv.type.replace('_', ' ↔ ')}
                          </Badge>
                          {conv.reservationId && (
                            <Badge className="bg-amber-500/20 text-amber-400">
                              <Calendar className="w-3 h-3 mr-1" />
                              Reservation
                            </Badge>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </Card>

          {/* Chat Area */}
          <Card className="p-6 bg-slate-800 border-slate-700 lg:col-span-2">
            {selectedConversation ? (
              <div className="flex flex-col h-[calc(100vh-250px)]">
                {/* Chat Header */}
                <div className="pb-4 border-b border-slate-700 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg text-slate-100 mb-1">
                        {getConversationTitle(selectedConversation)}
                      </h3>
                      <p className="text-sm text-slate-400">{getConversationSubtitle(selectedConversation)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
                            handleDeleteConversation(selectedConversation.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="lg:hidden border-slate-600 text-slate-300"
                        onClick={() => setSelectedConversation(null)}
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge className={getRoleBadgeColor(selectedConversation.type)}>
                      {selectedConversation.type.replace('_', ' ↔ ')}
                    </Badge>
                    {selectedConversation.reservationId && (
                      <Badge className="bg-amber-500/20 text-amber-400">
                        <Calendar className="w-3 h-3 mr-1" />
                        Reservation ID: {selectedConversation.reservationId.substring(0, 8)}
                      </Badge>
                    )}
                    {selectedConversation.participants?.adminIds?.includes(currentAdminId) && (
                      <Badge className="bg-green-500/20 text-green-400">
                        <Shield className="w-3 h-3 mr-1" />
                        Active Participant
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                  {messages.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-30" />
                      <p>No messages yet</p>
                      <p className="text-sm mt-2">Be the first to send a message</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isCurrentAdmin = msg.senderId === currentAdminId;

                      return (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`flex ${isCurrentAdmin ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[70%] p-4 rounded-lg ${
                              isCurrentAdmin
                                ? 'bg-purple-600/20 border border-purple-500/30'
                                : msg.senderRole === 'USER'
                                ? 'bg-blue-600/20 border border-blue-500/30'
                                : msg.senderRole === 'RESTAURANT'
                                ? 'bg-green-600/20 border border-green-500/30'
                                : 'bg-slate-700/50 border border-slate-600'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              {getRoleIcon(msg.senderRole)}
                              <Badge className={getRoleBadgeColor(msg.senderRole)}>{msg.senderRole}</Badge>
                              <span className="text-xs text-slate-500">
                                {formatTimestamp(msg.createdAt)}
                              </span>
                            </div>
                            <p className="text-sm text-slate-200">{msg.text}</p>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="space-y-3">
                  <Textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="bg-slate-700 border-slate-600 text-slate-100 resize-none"
                    placeholder="Type your message as admin..."
                    rows={3}
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500">
                      Sending as: <span className="text-purple-400">ADMIN</span> ({currentAdminEmail})
                    </p>
                    <Button className="bg-purple-600 hover:bg-purple-700" onClick={handleSendMessage}>
                      <Send className="w-4 h-4 mr-2" />
                      Send Message
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[calc(100vh-250px)] text-slate-400">
                <div className="text-center">
                  <MessageSquare className="w-20 h-20 mx-auto mb-4 opacity-20" />
                  <p className="text-lg">Select a conversation to view messages</p>
                  <p className="text-sm mt-2">Or create a new conversation to get started</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}