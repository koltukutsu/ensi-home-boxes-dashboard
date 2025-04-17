"use client";

import { useState, useEffect } from "react";
import { Button } from "@/registry/new-york-v4/ui/button";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/registry/new-york-v4/ui/card";
import { testFirestoreConnection } from "@/lib/firebase-utils";
import {
    Alert,
    AlertDescription,
    AlertTitle,
} from "@/registry/new-york-v4/ui/alert";
import {
    AlertCircle,
    CheckCircle2,
    ServerCrash,
    RefreshCw,
} from "lucide-react";

export default function DiagnosticPage() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{
        success: boolean;
        message: string;
    } | null>(null);
    const [envVars, setEnvVars] = useState<Record<string, string>>({});

    useEffect(() => {
        // Collect environment variables (only public ones)
        const publicEnvVars: Record<string, string> = {};
        for (const key in process.env) {
            if (key.startsWith("NEXT_PUBLIC_")) {
                // Mask API keys for security
                if (
                    key.includes("KEY") ||
                    key.includes("SECRET") ||
                    key.includes("ID")
                ) {
                    const value = process.env[key] || "";
                    publicEnvVars[key] =
                        `${value.substring(0, 4)}...${value.substring(value.length - 4)}`;
                } else {
                    publicEnvVars[key] = process.env[key] || "";
                }
            }
        }
        setEnvVars(publicEnvVars);
    }, []);

    const runTest = async () => {
        setLoading(true);
        try {
            const connectionResult = await testFirestoreConnection();
            setResult(connectionResult);
        } catch (error) {
            setResult({
                success: false,
                message: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">
                Firestore Diagnostic Tool
            </h1>

            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 mb-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Firebase Configuration</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <p>
                                <strong>Project ID:</strong>{" "}
                                {envVars.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
                                    "Not set"}
                            </p>
                            <p>
                                <strong>Auth Domain:</strong>{" "}
                                {envVars.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
                                    "Not set"}
                            </p>
                            <p>
                                <strong>API Key:</strong>{" "}
                                {envVars.NEXT_PUBLIC_FIREBASE_API_KEY ||
                                    "Not set"}
                            </p>
                            <p>
                                <strong>Using Emulator:</strong>{" "}
                                {envVars.NEXT_PUBLIC_FIREBASE_USE_EMULATOR ||
                                    "false"}
                            </p>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <p className="text-xs text-muted-foreground">
                            These values are loaded from your environment
                            variables
                        </p>
                    </CardFooter>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Connection Test</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <p>
                                This will test connectivity to your Firestore
                                database and check if the "connectivity_logs"
                                collection exists and can be accessed.
                            </p>

                            {result && (
                                <Alert
                                    variant={
                                        result.success
                                            ? "default"
                                            : "destructive"
                                    }
                                    className="mt-4"
                                >
                                    {result.success ? (
                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    ) : (
                                        <AlertCircle className="h-4 w-4" />
                                    )}
                                    <AlertTitle>
                                        {result.success ? "Success" : "Error"}
                                    </AlertTitle>
                                    <AlertDescription>
                                        {result.message}
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                        <Button
                            variant="default"
                            onClick={runTest}
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                    Testing...
                                </>
                            ) : (
                                <>
                                    <ServerCrash className="mr-2 h-4 w-4" />
                                    Run Connection Test
                                </>
                            )}
                        </Button>
                    </CardFooter>
                </Card>
            </div>

            <h2 className="text-2xl font-bold mb-4">
                Common Connection Issues
            </h2>

            <div className="space-y-4">
                <div className="p-4 border rounded-md">
                    <h3 className="font-bold">404 Not Found Error</h3>
                    <p>This typically means one of these issues:</p>
                    <ul className="list-disc pl-5 mt-2">
                        <li>
                            Firebase project ID is incorrect in your .env file
                            (current:{" "}
                            {envVars.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
                                "Not set"}
                            )
                        </li>
                        <li>
                            The "connectivity_logs" collection doesn't exist in
                            your Firestore database
                        </li>
                        <li>
                            Your API key doesn't have permissions to access
                            Firestore
                        </li>
                    </ul>
                </div>

                <div className="p-4 border rounded-md">
                    <h3 className="font-bold">Permission Denied Error</h3>
                    <p>This typically means:</p>
                    <ul className="list-disc pl-5 mt-2">
                        <li>
                            Firebase security rules are blocking access to the
                            collection
                        </li>
                        <li>The user isn't properly authenticated</li>
                        <li>
                            The authenticated user doesn't have read permissions
                            for the collection
                        </li>
                    </ul>
                </div>

                <div className="p-4 border rounded-md">
                    <h3 className="font-bold">No Data Found</h3>
                    <p>Make sure your data is structured correctly.</p>
                    <p className="mt-2">
                        <strong>Expected Structure:</strong>
                    </p>
                    <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded mt-2 overflow-auto text-xs">
                        {`
connectivity_logs (collection)
└── document_1 
    ├── created_at: timestamp
    └── logs (subcollection)
        └── log_document_1
            ├── timestamp: string
            ├── devices_devices: array
            ├── devices_total_devices: number
            └── ... other HomeAssistantSnapshot fields
            `}
                    </pre>
                </div>
            </div>
        </div>
    );
}
