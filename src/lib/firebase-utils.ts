import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    increment,
    arrayUnion,
    collection,
    getDocs,
    query,
    orderBy,
    limit,
    where,
    deleteDoc,
    Timestamp,
    documentId,
    serverTimestamp,
    addDoc,
    writeBatch,
    DocumentData,
    getFirestore,
} from "firebase/firestore";
import { getApp } from "firebase/app";
import { db } from "@/lib/firebase";
import { ContentItem, isVideoContent, isBlogPost } from "@/types";

// Collection names
const VISITS_COLLECTION = "content_visits";
const VISIT_LOGS_COLLECTION = "log_visit";
const CHAT_HISTORY_COLLECTION = "chat_history";
const CHAT_MESSAGES_COLLECTION = "chat_messages";

// Interface for visit data
export interface ContentVisitData {
    id: string;
    count: number;
    lastUpdated: Date;
}

// Chat history interfaces
export interface ChatSession {
    id: string;
    userId: string;
    title: string;
    createdAt: Date;
    updatedAt: Date;
    firstUserMessage?: string;
    lastMessageContent?: string;
    lastMessageAt?: Date;
    messageCount: number;
}

export interface ChatMessage {
    id: string;
    sessionId: string;
    content: string;
    role: "user" | "assistant";
    createdAt: Date;
}

/**
 * Get the content ID from a content item
 */
export function getContentId(item: ContentItem): string {
    return isVideoContent(item) ? item.name_video : item.name_blog;
}

/**
 * Get the visit count for a specific content item
 *
 * @param contentId The ID of the content
 * @returns The visit count and timestamp data
 */
export async function getContentVisits(
    contentId: string,
): Promise<ContentVisitData> {
    try {
        const visitsRef = doc(db, VISITS_COLLECTION, contentId);
        const visitDoc = await getDoc(visitsRef);

        if (visitDoc.exists()) {
            return {
                id: contentId,
                count: visitDoc.data().count || 0,
                lastUpdated:
                    visitDoc.data().lastUpdated?.toDate() || new Date(),
            };
        }

        // If no document exists, return default values
        return {
            id: contentId,
            count: 0,
            lastUpdated: new Date(),
        };
    } catch (error) {
        console.error("Error getting content visits:", error);
        return {
            id: contentId,
            count: 0,
            lastUpdated: new Date(),
        };
    }
}

/**
 * Get visit counts for multiple content items
 *
 * @param contentIds Array of content IDs
 * @returns Map of content IDs to visit data
 */
export async function getMultipleContentVisits(
    contentIds: string[],
): Promise<Map<string, ContentVisitData>> {
    const visitMap = new Map<string, ContentVisitData>();

    try {
        // Fetch all docs from the visits collection
        const visitCollection = collection(db, VISITS_COLLECTION);
        const visitQuery = query(visitCollection);
        const visitSnapshot = await getDocs(visitQuery);

        // Process all visit data into the map
        visitSnapshot.forEach((doc) => {
            if (contentIds.includes(doc.id)) {
                visitMap.set(doc.id, {
                    id: doc.id,
                    count: doc.data().count || 0,
                    lastUpdated: doc.data().lastUpdated?.toDate() || new Date(),
                });
            }
        });

        // Add default entries for any missing IDs
        contentIds.forEach((id) => {
            if (!visitMap.has(id)) {
                visitMap.set(id, {
                    id,
                    count: 0,
                    lastUpdated: new Date(),
                });
            }
        });

        return visitMap;
    } catch (error) {
        console.error("Error getting multiple content visits:", error);

        // Return a map with default values for all content IDs
        contentIds.forEach((id) => {
            visitMap.set(id, {
                id,
                count: 0,
                lastUpdated: new Date(),
            });
        });

        return visitMap;
    }
}

/**
 * Increment the visit count for a specific content item
 *
 * @param contentId The ID of the content to increment
 * @returns The updated visit count
 */
export async function incrementContentVisit(
    contentId: string,
): Promise<number> {
    try {
        const visitsRef = doc(db, VISITS_COLLECTION, contentId);
        const visitDoc = await getDoc(visitsRef);

        if (visitDoc.exists()) {
            // Increment the existing count
            await updateDoc(visitsRef, {
                count: increment(1),
                lastUpdated: new Date(),
            });

            return (visitDoc.data().count || 0) + 1;
        } else {
            // Create a new document with count 1
            await setDoc(visitsRef, {
                count: 1,
                lastUpdated: new Date(),
            });

            return 1;
        }
    } catch (error) {
        console.error("Error incrementing content visit:", error);
        return 0;
    }
}

/**
 * Get the most visited content
 *
 * @param limit Maximum number of items to return
 * @returns Array of content visit data sorted by visit count
 */
export async function getMostVisitedContent(
    maxItems: number = 10,
): Promise<ContentVisitData[]> {
    try {
        const visitCollection = collection(db, VISITS_COLLECTION);
        const visitQuery = query(
            visitCollection,
            orderBy("count", "desc"),
            limit(maxItems),
        );

        const visitSnapshot = await getDocs(visitQuery);
        const visitData: ContentVisitData[] = [];

        visitSnapshot.forEach((doc) => {
            visitData.push({
                id: doc.id,
                count: doc.data().count || 0,
                lastUpdated: doc.data().lastUpdated?.toDate() || new Date(),
            });
        });

        return visitData;
    } catch (error) {
        console.error("Error getting most visited content:", error);
        return [];
    }
}

/**
 * Get user submitted content
 *
 * @param userId The ID of the user whose content to fetch
 * @returns Array of content items submitted by the user
 */
export async function getUserSubmittedContent(userId: string) {
    try {
        const contentRef = collection(db, "content");
        const userContentQuery = query(
            contentRef,
            where("authorId", "==", userId),
        );
        const querySnapshot = await getDocs(userContentQuery);

        const contentItems: any[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            contentItems.push({
                id: doc.id,
                ...data,
                submittedAt: data.submittedAt?.toDate() || new Date(),
                approvedAt: data.approvedAt?.toDate() || null,
                rejectedAt: data.rejectedAt?.toDate() || null,
            });
        });

        // Sort by submission date (newest first)
        contentItems.sort(
            (a, b) => b.submittedAt.getTime() - a.submittedAt.getTime(),
        );

        return contentItems;
    } catch (error) {
        console.error("Error fetching user submitted content:", error);
        return [];
    }
}

/**
 * Delete a user's account and all associated data
 *
 * @param userId The ID of the user to delete
 * @returns Promise that resolves when all data is deleted
 */
export async function deleteUserAccount(userId: string) {
    try {
        // Delete user's content submissions
        const contentRef = collection(db, "content");
        const userContentQuery = query(
            contentRef,
            where("authorId", "==", userId),
        );
        const contentSnapshot = await getDocs(userContentQuery);

        const contentDeletions = contentSnapshot.docs.map((doc) =>
            deleteDoc(doc.ref),
        );

        // Delete user document
        const userRef = doc(db, "users", userId);
        const userDeletions = deleteDoc(userRef);

        // Wait for all deletions to complete
        await Promise.all([...contentDeletions, userDeletions]);
    } catch (error) {
        console.error("Error deleting user account:", error);
        throw error;
    }
}

/**
 * Log a content visit to the visit logs collection
 *
 * @param contentId The ID of the visited content
 * @param contentType The type of content ('blog' or 'video')
 * @param userId The ID of the user who visited (null for anonymous users)
 * @param categories Array of categories/tags related to the content
 * @returns Promise that resolves when the log is created
 */
export async function logContentVisit(
    contentId: string,
    contentType: "blog" | "video",
    userId: string | null,
    categories: string[] = [],
): Promise<void> {
    try {
        const logRef = collection(db, VISIT_LOGS_COLLECTION);

        await setDoc(doc(logRef), {
            timestamp: new Date(),
            visitor: userId ? doc(db, "users", userId) : null,
            document: contentId,
            type: contentType,
            categories: categories,
        });
    } catch (error) {
        console.error("Error logging content visit:", error);
    }
}

/**
 * Get a list of chat sessions for a user
 * @param userId The ID of the user
 * @returns An array of chat sessions, sorted by most recent first
 */
export async function getUserChatSessions(
    userId: string,
): Promise<ChatSession[]> {
    try {
        const chatSessionsRef = collection(db, "chat_history");

        // Try to query with ordering by updatedAt
        try {
            const q = query(
                chatSessionsRef,
                where("userId", "==", userId),
                orderBy("updatedAt", "desc"),
            );

            const querySnapshot = await getDocs(q);
            const sessions: ChatSession[] = [];

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                sessions.push({
                    id: doc.id,
                    userId: data.userId,
                    title: data.title,
                    createdAt: data.createdAt.toDate(),
                    updatedAt: data.updatedAt.toDate(),
                    firstUserMessage: data.firstUserMessage,
                    lastMessageContent: data.lastMessageContent,
                    lastMessageAt: data.lastMessageAt
                        ? data.lastMessageAt.toDate()
                        : undefined,
                    messageCount: data.messageCount || 0,
                });
            });

            return sessions;
        } catch (indexError) {
            // If we get an index error, try a simpler query without the orderBy
            // This is a fallback that will at least return results even if not sorted
            console.warn(
                "Missing Firestore index for chat history query. Falling back to unordered results:",
                indexError,
            );

            const simpleQuery = query(
                chatSessionsRef,
                where("userId", "==", userId),
            );

            const querySnapshot = await getDocs(simpleQuery);
            const sessions: ChatSession[] = [];

            // Manually sort the results
            type DocWithData = {
                id: string;
                data: DocumentData;
            };

            const docsWithData: DocWithData[] = [];

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                docsWithData.push({
                    id: doc.id,
                    data,
                });
            });

            // Sort manually by updatedAt in descending order
            docsWithData.sort((a, b) => {
                const dateA =
                    a.data.updatedAt.toDate?.() || new Date(a.data.updatedAt);
                const dateB =
                    b.data.updatedAt.toDate?.() || new Date(b.data.updatedAt);
                return dateB.getTime() - dateA.getTime();
            });

            // Map to the same format
            docsWithData.forEach(({ id, data }) => {
                sessions.push({
                    id,
                    userId: data.userId,
                    title: data.title,
                    createdAt:
                        data.createdAt.toDate?.() || new Date(data.createdAt),
                    updatedAt:
                        data.updatedAt.toDate?.() || new Date(data.updatedAt),
                    firstUserMessage: data.firstUserMessage,
                    lastMessageContent: data.lastMessageContent,
                    lastMessageAt: data.lastMessageAt
                        ? data.lastMessageAt.toDate?.() ||
                          new Date(data.lastMessageAt)
                        : undefined,
                    messageCount: data.messageCount || 0,
                });
            });

            return sessions;
        }
    } catch (error) {
        console.error("Error getting chat sessions:", error);
        // Return an empty array instead of throwing
        return [];
    }
}

/**
 * Create a new chat session for a user
 * @param userId The ID of the user
 * @param title The title of the chat session
 * @param firstUserMessage Optional first message from the user
 * @returns The ID of the newly created chat session
 */
export async function createChatSession(
    userId: string,
    title: string,
    firstUserMessage?: string,
): Promise<string> {
    try {
        const chatSessionRef = collection(db, "chat_history");
        const now = new Date();

        const sessionData = {
            userId,
            title,
            createdAt: now,
            updatedAt: now,
            messageCount: 0,
        };

        // Add the first user message if provided
        if (firstUserMessage) {
            Object.assign(sessionData, { firstUserMessage });
        }

        const docRef = await addDoc(chatSessionRef, sessionData);
        return docRef.id;
    } catch (error) {
        console.error("Error creating chat session:", error);
        throw new Error("Failed to create chat session");
    }
}

/**
 * Update the title of a chat session
 * @param sessionId The ID of the chat session
 * @param newTitle The new title for the chat session
 */
export async function updateChatSessionTitle(
    sessionId: string,
    newTitle: string,
): Promise<void> {
    try {
        const sessionRef = doc(db, "chat_history", sessionId);

        await updateDoc(sessionRef, {
            title: newTitle,
            updatedAt: new Date(),
        });
    } catch (error) {
        console.error("Error updating chat session title:", error);
        throw new Error("Failed to update chat session title");
    }
}

/**
 * Delete a chat session and all associated messages
 * @param sessionId The ID of the chat session to delete
 * @param userId The ID of the user (for verification)
 */
export async function deleteChatSession(
    sessionId: string,
    userId: string,
): Promise<void> {
    try {
        // First, verify that the session belongs to the user
        const sessionRef = doc(db, "chat_history", sessionId);
        const sessionSnap = await getDoc(sessionRef);

        if (!sessionSnap.exists()) {
            throw new Error("Chat session not found");
        }

        const sessionData = sessionSnap.data();
        if (sessionData.userId !== userId) {
            throw new Error("Unauthorized access to chat session");
        }

        // Delete all messages in the session
        const messagesRef = collection(db, "chat_messages");
        const q = query(messagesRef, where("sessionId", "==", sessionId));
        const querySnapshot = await getDocs(q);

        const batch = writeBatch(db);

        querySnapshot.forEach((messageDoc) => {
            batch.delete(messageDoc.ref);
        });

        // Delete the session document
        batch.delete(sessionRef);

        // Commit the batch
        await batch.commit();
    } catch (error) {
        console.error("Error deleting chat session:", error);
        throw new Error("Failed to delete chat session");
    }
}

/**
 * Save a new message to a chat session
 * @param sessionId The ID of the chat session
 * @param content The content of the message
 * @param role The role of the message sender (user or assistant)
 * @returns The ID of the newly created message
 */
export async function saveChatMessage(
    sessionId: string,
    content: string,
    role: "user" | "assistant",
): Promise<string> {
    try {
        const messagesRef = collection(db, "chat_messages");
        const sessionRef = doc(db, "chat_history", sessionId);

        // Create the message
        const now = new Date();
        const messageData = {
            sessionId,
            content,
            role,
            createdAt: now,
        };

        // Update the session with the latest message info
        const sessionUpdate = {
            lastMessageContent: content,
            lastMessageAt: now,
            updatedAt: now,
            messageCount: increment(1),
        };

        // Start a batch write
        const batch = writeBatch(db);

        // Add the message document
        const newMessageRef = doc(messagesRef);
        batch.set(newMessageRef, messageData);

        // Update the session document
        batch.update(sessionRef, sessionUpdate);

        // Commit the batch
        await batch.commit();

        return newMessageRef.id;
    } catch (error) {
        console.error("Error saving chat message:", error);
        throw new Error("Failed to save chat message");
    }
}

/**
 * Get all messages for a chat session
 * @param sessionId The ID of the chat session
 * @param userId The ID of the user (for verification)
 * @returns An array of chat messages, sorted by creation time
 */
export async function getChatSessionMessages(
    sessionId: string,
    userId: string,
): Promise<ChatMessage[]> {
    try {
        // First, verify that the session belongs to the user
        const sessionRef = doc(db, "chat_history", sessionId);
        const sessionSnap = await getDoc(sessionRef);

        if (!sessionSnap.exists()) {
            console.warn("Chat session not found:", sessionId);
            return []; // Return empty array instead of throwing
        }

        const sessionData = sessionSnap.data();
        if (sessionData.userId !== userId) {
            console.warn("Unauthorized access to chat session:", sessionId);
            return []; // Return empty array instead of throwing for security issues
        }

        // Get the messages for the session
        try {
            const messagesRef = collection(db, "chat_messages");
            const q = query(
                messagesRef,
                where("sessionId", "==", sessionId),
                orderBy("createdAt", "asc"),
            );

            const querySnapshot = await getDocs(q);
            const messages: ChatMessage[] = [];

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                messages.push({
                    id: doc.id,
                    sessionId: data.sessionId,
                    content: data.content,
                    role: data.role,
                    createdAt: data.createdAt.toDate(),
                });
            });

            return messages;
        } catch (indexError) {
            // Handle the case where there's a missing index for the query
            console.warn(
                "Missing Firestore index for chat messages query. Falling back to unordered results:",
                indexError,
            );

            // Try a simpler query without orderBy
            const simpleQuery = query(
                collection(db, "chat_messages"),
                where("sessionId", "==", sessionId),
            );

            const querySnapshot = await getDocs(simpleQuery);
            const messages: ChatMessage[] = [];

            // Get all messages without ordering
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                messages.push({
                    id: doc.id,
                    sessionId: data.sessionId,
                    content: data.content,
                    role: data.role,
                    createdAt:
                        data.createdAt.toDate?.() || new Date(data.createdAt),
                });
            });

            // Sort manually by createdAt in ascending order
            messages.sort(
                (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
            );

            return messages;
        }
    } catch (error) {
        console.error("Error getting chat messages:", error);
        // Return empty array instead of throwing
        return [];
    }
}

/**
 * Batch save multiple chat messages at once
 * @param sessionId The ID of the chat session
 * @param messages Array of message objects with content and role
 * @returns Array of created message IDs
 */
export async function batchSaveChatMessages(
    sessionId: string,
    messages: {
        content: string;
        role: "user" | "assistant";
        createdAt?: Date;
    }[],
): Promise<string[]> {
    if (messages.length === 0) return [];

    try {
        const batch = writeBatch(db);
        const messagesRef = collection(db, "chat_messages");
        const sessionRef = doc(db, "chat_history", sessionId);
        const now = new Date();
        const messageIds: string[] = [];

        // Get the current session data to check for firstUserMessage
        const sessionSnap = await getDoc(sessionRef);
        const sessionData = sessionSnap.exists() ? sessionSnap.data() : null;

        // Create a base update object for the session
        const updateData: Record<string, any> = {
            updatedAt: now,
            messageCount: increment(messages.length),
        };

        // Add each message to the batch
        messages.forEach((message) => {
            const messageId = doc(messagesRef).id;
            const messageData = {
                sessionId,
                content: message.content,
                role: message.role,
                createdAt: message.createdAt || now,
            };

            batch.set(doc(messagesRef, messageId), messageData);
            messageIds.push(messageId);

            // Update the last message data in the session
            updateData.lastMessageContent = message.content;
            updateData.lastMessageAt = message.createdAt || now;

            // If this is a user message and there's no firstUserMessage yet, add it
            if (
                message.role === "user" &&
                (!sessionData || !sessionData.firstUserMessage)
            ) {
                updateData.firstUserMessage = message.content;
            }
        });

        // Update the session document
        batch.update(sessionRef, updateData);

        // Commit the batch
        await batch.commit();

        return messageIds;
    } catch (error) {
        console.error("Error batch saving messages:", error);
        throw new Error("Failed to batch save messages");
    }
}

/**
 * Tests connection to Firestore by attempting to read and write a test document
 * @returns {Promise<{success: boolean, message: string}>} Result of the connection test
 */
export async function testFirestoreConnection(): Promise<{
    success: boolean;
    message: string;
}> {
    try {
        // Check if we can read from a collection
        const testCollection = collection(db, "connectivity_logs");
        const q = query(testCollection, limit(1));
        await getDocs(q);

        // Write a test document
        const timestamp = Timestamp.now();
        await addDoc(testCollection, {
            timestamp,
            type: "diagnostic_test",
            message: "Connection test successful",
        });

        return {
            success: true,
            message:
                "Successfully connected to Firestore and performed read/write operations",
        };
    } catch (error) {
        console.error("Firestore connection test failed:", error);
        return {
            success: false,
            message: error instanceof Error ? error.message : String(error),
        };
    }
}
