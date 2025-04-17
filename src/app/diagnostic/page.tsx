"use client";

import { useEffect, useState } from "react";
import { testFirestoreConnection } from "@/lib/firebase-utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/registry/new-york-v4/ui/tabs";
import { getAuth } from "firebase/auth";
import { getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/registry/new-york-v4/ui/card";

export default function DiagnosticPage() {
    const [connectionStatus, setConnectionStatus] = useState<
        "loading" | "success" | "error"
    >("loading");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [firebaseConfig, setFirebaseConfig] = useState<any>(null);
    const [authStatus, setAuthStatus] = useState<{
        isLoggedIn: boolean;
        user: string | null;
    }>({
        isLoggedIn: false,
        user: null,
    });

    useEffect(() => {
        // Get Firebase configuration
        try {
            const app = getApp();
            setFirebaseConfig({
                apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
                authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
                messagingSenderId:
                    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
                appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
                measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
                emulator:
                    process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true",
            });

            // Check auth status
            const auth = getAuth(app);
            const user = auth.currentUser;
            if (user) {
                setAuthStatus({
                    isLoggedIn: true,
                    user: user.email,
                });
            }
        } catch (error) {
            console.error("Error getting Firebase config:", error);
            setErrorMessage(
                `Error getting Firebase config: ${error instanceof Error ? error.message : String(error)}`,
            );
        }

        // Test connection initially
        runConnectionTest();
    }, []);

    const runConnectionTest = async () => {
        setConnectionStatus("loading");
        setErrorMessage(null);

        try {
            console.log("Testing Firestore connection...");
            const result = await testFirestoreConnection();
            console.log("Firestore connection test result:", result);

            if (result.success) {
                setConnectionStatus("success");
            } else {
                setConnectionStatus("error");
                setErrorMessage(result.message || "Unknown error");
            }
        } catch (error) {
            console.error("Error testing connection:", error);
            setConnectionStatus("error");
            setErrorMessage(
                `Error: ${error instanceof Error ? error.message : String(error)}`,
            );
        }
    };

    return (
        <div className="container mx-auto py-8">
            <h1 className="text-2xl font-bold mb-6">Firebase Diagnostics</h1>

            <Tabs defaultValue="connection">
                <TabsList>
                    <TabsTrigger value="connection">
                        Connection Test
                    </TabsTrigger>
                    <TabsTrigger value="config">Firebase Config</TabsTrigger>
                    <TabsTrigger value="auth">Authentication</TabsTrigger>
                </TabsList>

                <TabsContent value="connection">
                    <Card className="mb-6">
                        <CardHeader>
                            <CardTitle>Firestore Connection Status</CardTitle>
                            <CardDescription>
                                Tests connection to Firestore and attempts to
                                read data
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="mb-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <div
                                        className={`w-4 h-4 rounded-full ${
                                            connectionStatus === "loading"
                                                ? "bg-yellow-400"
                                                : connectionStatus === "success"
                                                  ? "bg-green-500"
                                                  : "bg-red-500"
                                        }`}
                                    />
                                    <span>
                                        {connectionStatus === "loading"
                                            ? "Testing connection..."
                                            : connectionStatus === "success"
                                              ? "Connected successfully"
                                              : "Connection failed"}
                                    </span>
                                </div>

                                {errorMessage && (
                                    <div className="p-4 bg-red-50 text-red-800 rounded-md mt-2 overflow-auto max-h-64">
                                        <p className="font-semibold">Error:</p>
                                        <pre className="whitespace-pre-wrap text-sm">
                                            {errorMessage}
                                        </pre>
                                    </div>
                                )}
                            </div>

                            <Button onClick={runConnectionTest}>
                                Test Connection Again
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="config">
                    <Card>
                        <CardHeader>
                            <CardTitle>Firebase Configuration</CardTitle>
                            <CardDescription>
                                Current Firebase configuration from environment
                                variables
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {firebaseConfig ? (
                                <pre className="bg-slate-100 p-4 rounded-md overflow-auto max-h-96 text-sm">
                                    {JSON.stringify(firebaseConfig, null, 2)}
                                </pre>
                            ) : (
                                <p>Unable to load Firebase configuration</p>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="auth">
                    <Card>
                        <CardHeader>
                            <CardTitle>Authentication Status</CardTitle>
                            <CardDescription>
                                Current user authentication information
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                    <div
                                        className={`w-4 h-4 rounded-full ${authStatus.isLoggedIn ? "bg-green-500" : "bg-red-500"}`}
                                    />
                                    <span>
                                        {authStatus.isLoggedIn
                                            ? "Logged in"
                                            : "Not logged in"}
                                    </span>
                                </div>

                                {authStatus.isLoggedIn && authStatus.user && (
                                    <p>
                                        <span className="font-medium">
                                            User:
                                        </span>{" "}
                                        {authStatus.user}
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <div className="mt-6">
                <h2 className="text-xl font-medium mb-4">
                    Troubleshooting Steps
                </h2>
                <ul className="list-disc pl-6 space-y-2">
                    <li>Check Firebase credentials in .env file</li>
                    <li>
                        Verify Firestore rules allow the current user to
                        read/write
                    </li>
                    <li>Check for network connectivity issues</li>
                    <li>
                        Ensure the collection 'connectivity_logs' exists in
                        Firestore
                    </li>
                    <li>If using emulator, ensure it's running properly</li>
                </ul>
            </div>
        </div>
    );
}
