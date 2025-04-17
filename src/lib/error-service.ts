import {
    collection,
    query,
    orderBy,
    limit,
    onSnapshot,
    Timestamp,
    DocumentData,
    QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// Base interface for all error types
export interface BaseErrorData {
    id: string;
    additionalData: Record<string, any>;
    deviceInfo: string;
    errorMessage: string;
    errorType: string;
    stackTrace: string;
    status: string;
    timestamp: Timestamp;
}

// User Errors
export interface UserError extends BaseErrorData {
    userEmail: string;
    userId: string;
    userJoinDate: Timestamp;
    userLastSeen: Timestamp;
    userName: string;
    userPhone: string;
    userSurname: string;
}

// House User Errors
export interface HouseUserError extends BaseErrorData {
    houseAdminId: string;
    houseCreatedAt: Timestamp;
    houseId: string;
    houseName: string;
    userEmail: string;
    userId: string;
    userName: string;
    userPhone: string;
    userRole: string;
}

// General Errors
export interface GeneralError extends BaseErrorData {
    // General errors only have the base fields
}

// Authentication Errors
export interface AuthenticationError extends BaseErrorData {
    // Authentication errors only have the base fields
}

// Error category types
export type ErrorCategory =
    | "authentication_errors"
    | "general_errors"
    | "house_user_errors"
    | "user_errors";

// Convert Firestore document to appropriate error type
function convertDocToError(
    doc: QueryDocumentSnapshot<DocumentData>,
): BaseErrorData {
    const data = doc.data();

    return {
        id: doc.id,
        additionalData: data.additionalData || {},
        deviceInfo: data.deviceInfo || "N/A",
        errorMessage: data.errorMessage || "",
        errorType: data.errorType || "",
        stackTrace: data.stackTrace || "",
        status: data.status || "Unknown",
        timestamp: data.timestamp || Timestamp.now(),
        ...data,
    } as BaseErrorData;
}

export const ErrorService = {
    /**
     * Subscribe to real-time updates of a specific error category
     * @param category Error category name
     * @param callback Function to call when data updates
     * @returns Unsubscribe function
     */
    subscribeToErrors(
        category: ErrorCategory,
        callback: (errors: BaseErrorData[]) => void,
    ) {
        console.log(`Setting up subscription to ${category}`);

        // Path to the errors collection for this category
        const errorsCollectionRef = collection(db, "logs", category, "errors");

        // Query for the latest 25 errors, ordered by timestamp descending
        const q = query(
            errorsCollectionRef,
            orderBy("timestamp", "desc"),
            limit(25),
        );

        // Create subscription
        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const errors = snapshot.docs.map(convertDocToError);
                callback(errors);
            },
            (error) => {
                console.error(`Error subscribing to ${category}:`, error);
                callback([]);
            },
        );

        return unsubscribe;
    },
};
