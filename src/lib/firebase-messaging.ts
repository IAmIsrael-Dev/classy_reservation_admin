import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  Timestamp,
  QueryConstraint,
  getDocs,
  arrayUnion,
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';
import { db } from './firebase';

export type ConversationType = 'USER_RESTAURANT' | 'ADMIN_USER' | 'ADMIN_RESTAURANT' | 'reservation';
export type SenderRole = 'ADMIN' | 'USER' | 'RESTAURANT' | 'RESTAURANT_MANAGER' | 'RESTAURANT_HOST';

export interface Conversation {
  id: string;
  type: ConversationType;
  reservationId?: string;
  participants: {
    userId?: string;
    restaurantId?: string;
    adminIds?: string[];
  };
  restaurantParticipants?: {
    managerIds?: string[];
    hostIds?: string[];
  };
  participantRoles?: { [key: string]: string };
  lastMessage?: string;
  lastMessageAt?: Timestamp;
  createdAt: Timestamp;
  isActive?: boolean;
}

export interface Message {
  id: string;
  senderId: string;
  senderRole: SenderRole;
  text: string;
  messageType?: 'TEXT' | 'SYSTEM';
  createdAt: Timestamp;
  isRead: boolean;
}

export interface ConversationFilter {
  type?: ConversationType;
  userId?: string;
  restaurantId?: string;
}

/**
 * Subscribe to all conversations with optional filtering
 * Admins have access to all conversations
 */
export function subscribeToConversations(
  filter: ConversationFilter,
  onUpdate: (conversations: Conversation[]) => void,
  onError?: (error: Error) => void
): () => void {
  const constraints: QueryConstraint[] = [];

  // Apply filters
  if (filter.type) {
    // Handle both USER_RESTAURANT and 'reservation' type
    // In your actual database, USER_RESTAURANT conversations have type='reservation'
    if (filter.type === 'USER_RESTAURANT') {
      constraints.push(where('type', '==', 'reservation'));
    } else {
      constraints.push(where('type', '==', filter.type));
    }
  }
  if (filter.userId) {
    constraints.push(where('participants.userId', '==', filter.userId));
  }
  if (filter.restaurantId) {
    constraints.push(where('participants.restaurantId', '==', filter.restaurantId));
  }

  // Only order by lastMessageAt if no filters are applied (to avoid requiring composite index)
  // If filters are applied, we'll sort in-memory
  const needsInMemorySort = constraints.length > 0;
  if (!needsInMemorySort) {
    constraints.push(orderBy('lastMessageAt', 'desc'));
  }

  const conversationsRef = collection(db, 'conversations');
  const q = query(conversationsRef, ...constraints);

  return onSnapshot(
    q,
    (snapshot) => {
      const conversations: Conversation[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        // Normalize 'reservation' type to 'USER_RESTAURANT' for consistency
        return {
          id: doc.id,
          ...data,
          type: data.type === 'reservation' ? 'USER_RESTAURANT' : data.type,
        } as Conversation;
      });
      
      // Sort in-memory if we couldn't use orderBy in the query
      if (needsInMemorySort) {
        conversations.sort((a, b) => {
          interface TimestampLike {
            seconds: number;
          }
          const aTime = a.lastMessageAt ? (typeof a.lastMessageAt === 'object' && 'seconds' in a.lastMessageAt ? (a.lastMessageAt as TimestampLike).seconds : 0) : 0;
          const bTime = b.lastMessageAt ? (typeof b.lastMessageAt === 'object' && 'seconds' in b.lastMessageAt ? (b.lastMessageAt as TimestampLike).seconds : 0) : 0;
          return bTime - aTime;
        });
      }
      
      onUpdate(conversations);
    },
    (error) => {
      console.error('Error subscribing to conversations:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Subscribe to messages in a specific conversation
 */
export function subscribeToMessages(
  conversationId: string,
  onUpdate: (messages: Message[]) => void,
  onError?: (error: Error) => void
): () => void {
  const messagesRef = collection(db, 'conversations', conversationId, 'messages');
  const q = query(messagesRef, orderBy('createdAt', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const messages: Message[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as Message));
      onUpdate(messages);
    },
    (error) => {
      console.error('Error subscribing to messages:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Send a message in a conversation
 * Automatically updates lastMessage and lastMessageAt in the conversation
 */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  senderRole: SenderRole,
  text: string
): Promise<void> {
  try {
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    const conversationRef = doc(db, 'conversations', conversationId);

    // Add the message
    const messageData = {
      senderId,
      senderRole,
      text,
      messageType: 'TEXT' as const,
      createdAt: serverTimestamp(),
      isRead: false,
    };

    await addDoc(messagesRef, messageData);

    // Update conversation's lastMessage (just the text string based on your schema)
    await updateDoc(conversationRef, {
      lastMessage: text,
      lastMessageAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

/**
 * Create a new conversation
 */
export async function createConversation(
  type: ConversationType,
  participants: {
    userId?: string;
    restaurantId?: string;
    adminIds: string[];
  },
  reservationId?: string
): Promise<string> {
  try {
    console.log('Creating conversation with input:', { type, participants, reservationId });

    // Build a clean participants object with only defined values
    interface CleanParticipants {
      adminIds: string[];
      userId?: string;
      restaurantId?: string;
    }
    
    const cleanParticipants: CleanParticipants = {
      adminIds: participants.adminIds,
    };
    
    if (participants.userId) {
      cleanParticipants.userId = participants.userId;
    }
    
    if (participants.restaurantId) {
      cleanParticipants.restaurantId = participants.restaurantId;
    }

    console.log('Clean participants:', cleanParticipants);

    // Build participantRoles map with actual user IDs as keys
    // This matches your actual Firestore structure: { "userId123": "user", "restaurantId456": "restaurant" }
    const participantRoles: { [key: string]: string } = {};
    if (participants.userId) {
      participantRoles[participants.userId] = 'user';
    }
    if (participants.restaurantId) {
      participantRoles[participants.restaurantId] = 'restaurant';
    }
    if (participants.adminIds && participants.adminIds.length > 0) {
      // Add each admin with their ID as the key
      participants.adminIds.forEach(adminId => {
        participantRoles[adminId] = 'admin';
      });
    }

    console.log('Participant roles:', participantRoles);

    // Build conversation data with only defined values
    interface ConversationData {
      type: ConversationType;
      participants: CleanParticipants;
      participantRoles: { [key: string]: string };
      createdAt: ReturnType<typeof serverTimestamp>;
      lastMessageAt: ReturnType<typeof serverTimestamp>;
      isActive: boolean;
      reservationId?: string;
    }
    
    const conversationData: ConversationData = {
      type,
      participants: cleanParticipants,
      participantRoles,
      createdAt: serverTimestamp(),
      lastMessageAt: serverTimestamp(),
      isActive: true,
    };
    
    // Only add reservationId if it's defined
    if (reservationId) {
      conversationData.reservationId = reservationId;
    }

    // Remove any undefined values recursively (extra safety check)
    const cleanData = JSON.parse(JSON.stringify(conversationData, (key, value) => {
      return value === undefined ? null : value;
    }));

    // Replace null with actual timestamps
    cleanData.createdAt = serverTimestamp();
    cleanData.lastMessageAt = serverTimestamp();

    console.log('Final conversation data to be sent:', cleanData);

    const conversationsRef = collection(db, 'conversations');
    const docRef = await addDoc(conversationsRef, cleanData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating conversation:', error);
    throw error;
  }
}

/**
 * Join an existing conversation as an admin
 * Adds the admin ID to the conversation's adminIds array
 */
export async function joinConversationAsAdmin(
  conversationId: string,
  adminId: string
): Promise<void> {
  try {
    // Validate inputs
    if (!conversationId) {
      throw new Error('conversationId is required');
    }
    if (!adminId) {
      throw new Error('adminId is required');
    }

    console.log('Joining conversation:', { conversationId, adminId });

    const conversationRef = doc(db, 'conversations', conversationId);
    await updateDoc(conversationRef, {
      'participants.adminIds': arrayUnion(adminId),
      [`participantRoles.${adminId}`]: 'admin',
    });
    
    console.log('Successfully joined conversation');
  } catch (error) {
    console.error('Error joining conversation:', error);
    throw error;
  }
}

/**
 * Mark messages as read
 */
export async function markMessagesAsRead(
  conversationId: string,
  messageIds: string[]
): Promise<void> {
  try {
    const promises = messageIds.map((messageId) => {
      const messageRef = doc(db, 'conversations', conversationId, 'messages', messageId);
      return updateDoc(messageRef, { isRead: true });
    });
    await Promise.all(promises);
  } catch (error) {
    console.error('Error marking messages as read:', error);
    throw error;
  }
}

/**
 * Get conversation by ID
 */
export async function getConversationById(conversationId: string): Promise<Conversation | null> {
  try {
    const snapshot = await getDocs(query(collection(db, 'conversations'), where('__name__', '==', conversationId)));
    
    if (snapshot.empty) return null;
    
    const docSnap = snapshot.docs[0];
    return {
      id: docSnap.id,
      ...docSnap.data(),
    } as Conversation;
  } catch (error) {
    console.error('Error getting conversation:', error);
    throw error;
  }
}

/**
 * Search for existing conversation between specific participants
 */
export async function findConversation(
  type: ConversationType,
  userId?: string,
  restaurantId?: string
): Promise<Conversation | null> {
  try {
    const conversationsRef = collection(db, 'conversations');
    const constraints: QueryConstraint[] = [where('type', '==', type)];

    if (userId) {
      constraints.push(where('participants.userId', '==', userId));
    }
    if (restaurantId) {
      constraints.push(where('participants.restaurantId', '==', restaurantId));
    }

    const q = query(conversationsRef, ...constraints);
    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;

    return {
      id: snapshot.docs[0].id,
      ...snapshot.docs[0].data(),
    } as Conversation;
  } catch (error) {
    console.error('Error finding conversation:', error);
    throw error;
  }
}

/**
 * Find or create an ADMIN_USER conversation
 */
export async function findOrCreateAdminUserConversation(
  adminId: string,
  userId: string
): Promise<string> {
  try {
    // Try to find existing conversation
    const existing = await findConversation('ADMIN_USER', userId);
    if (existing) {
      // Make sure admin is in the conversation
      if (!existing.participants.adminIds?.includes(adminId)) {
        await joinConversationAsAdmin(existing.id, adminId);
      }
      return existing.id;
    }

    // Create new conversation
    return await createConversation('ADMIN_USER', {
      userId,
      adminIds: [adminId],
    });
  } catch (error) {
    console.error('Error finding/creating admin-user conversation:', error);
    throw error;
  }
}

/**
 * Find or create an ADMIN_RESTAURANT conversation
 */
export async function findOrCreateAdminRestaurantConversation(
  adminId: string,
  restaurantId: string
): Promise<string> {
  try {
    // Try to find existing conversation
    const existing = await findConversation('ADMIN_RESTAURANT', undefined, restaurantId);
    if (existing) {
      // Make sure admin is in the conversation
      if (!existing.participants.adminIds?.includes(adminId)) {
        await joinConversationAsAdmin(existing.id, adminId);
      }
      return existing.id;
    }

    // Create new conversation
    return await createConversation('ADMIN_RESTAURANT', {
      restaurantId,
      adminIds: [adminId],
    });
  } catch (error) {
    console.error('Error finding/creating admin-restaurant conversation:', error);
    throw error;
  }
}

/**
 * Delete a conversation and all its messages
 */
export async function deleteConversation(conversationId: string): Promise<void> {
  try {
    // First, delete all messages in the conversation
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    const messagesSnapshot = await getDocs(messagesRef);
    
    const deletePromises = messagesSnapshot.docs.map(messageDoc => 
      deleteDoc(doc(db, 'conversations', conversationId, 'messages', messageDoc.id))
    );
    
    await Promise.all(deletePromises);
    
    // Then delete the conversation document itself
    const conversationRef = doc(db, 'conversations', conversationId);
    await deleteDoc(conversationRef);
  } catch (error) {
    console.error('Error deleting conversation:', error);
    throw error;
  }
}