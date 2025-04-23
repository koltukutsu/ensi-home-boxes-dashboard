"use client";
import React, { useState, useEffect } from "react";
import { useToast } from "@/registry/new-york-v4/ui/use-toast";
import { Button } from "@/registry/new-york-v4/ui/button";
import { auth, db } from "../../lib/firebase";
import { 
    onAuthStateChanged, 
    GoogleAuthProvider, 
    signInWithPopup 
} from "firebase/auth";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";

export default function LoginPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);

    useEffect(() => {
        // Check if user is already logged in
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                // Check if user is allowed
                const isAllowed = await checkIfUserIsAllowed(user.email);
                if (isAllowed) {
                    router.push("/dashboard");
                } else {
                    // Sign out if not allowed
                    auth.signOut();
                    toast({
                        title: "Access Denied",
                        description: "Your email is not authorized to access this application.",
                        variant: "destructive",
                    });
                }
            }
        });

        // Check for mock user session
        const hasMockUser = sessionStorage.getItem("mockUser") === "true";
        if (hasMockUser) {
            router.push("/dashboard");
        }

        return () => unsubscribe();
    }, [router, toast]);

    const checkIfUserIsAllowed = async (email: string | null) => {
        if (!email) return false;
        
        try {
            // Check the "watchdash_users/allowed/users" list in Firestore
            const allowedDocRef = doc(db, "watchdash_users", "allowed");
            const allowedDoc = await getDoc(allowedDocRef);
            
            if (allowedDoc.exists()) {
                const data = allowedDoc.data();
                const allowedUsers = data.users || [];
                return allowedUsers.includes(email);
            }
            return false;
        } catch (error) {
            console.error("Error checking allowed users:", error);
            return false;
        }
    };

    const handleGoogleSignIn = async () => {
        setIsGoogleLoading(true);
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            
            // Check if user is allowed
            const isAllowed = await checkIfUserIsAllowed(user.email);
            
            if (isAllowed) {
                toast({
                    title: "Logged in successfully",
                    description: "Welcome to WatchDash!",
                });
                router.push("/dashboard");
            } else {
                // Sign out if not allowed
                await auth.signOut();
                toast({
                    title: "Access Denied",
                    description: "Your email is not authorized to access this application.",
                    variant: "destructive",
                });
            }
        } catch (error: any) {
            toast({
                title: "Google Sign-In failed",
                description: error.message || "An error occurred during sign in",
                variant: "destructive",
            });
        } finally {
            setIsGoogleLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <div className="w-full max-w-md space-y-8 p-8 bg-card shadow-lg rounded-xl">
                <div className="space-y-2 text-center">
                    <h1 className="text-2xl font-bold">Log In to WatchDash</h1>
                    <p className="text-sm text-muted-foreground">
                        Sign in with your Google account to access the dashboard
                    </p>
                </div>
                
                <div className="pt-6">
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={handleGoogleSignIn}
                        disabled={isGoogleLoading}
                    >
                        {isGoogleLoading ? "Signing in..." : (
                            <>
                                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                                    <path
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                        fill="#4285F4"
                                    />
                                    <path
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                        fill="#34A853"
                                    />
                                    <path
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                        fill="#FBBC05"
                                    />
                                    <path
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                        fill="#EA4335"
                                    />
                                </svg>
                                Sign in with Google
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
