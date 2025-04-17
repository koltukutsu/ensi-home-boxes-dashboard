"use client";
import React, { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Input } from "@/registry/new-york-v4/ui/input";
import { Button } from "@/registry/new-york-v4/ui/button";
import { useToast } from "@/registry/new-york-v4/ui/use-toast";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/registry/new-york-v4/ui/form";
import { auth } from "../../lib/firebase";
import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";

const formSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1, { message: "Password is required" }),
});

export default function LoginPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Check if user is already logged in
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                router.push("/dashboard");
            }
        });

        // Check for mock user session
        const hasMockUser = sessionStorage.getItem("mockUser") === "true";
        if (hasMockUser) {
            router.push("/dashboard");
        }

        return () => unsubscribe();
    }, [router]);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true);
        const { email, password } = values;

        try {
            // Mock login for demo purposes
            if (email === "admin@admin.com" && password === "admin") {
                // Add a slight delay to simulate authentication
                await new Promise((resolve) => setTimeout(resolve, 500));

                // Store mock user session
                sessionStorage.setItem("mockUser", "true");

                toast({
                    title: "Logged in successfully",
                    description: "Welcome to WatchDash!",
                });

                router.push("/dashboard");
                return;
            }

            // Real Firebase authentication
            await signInWithEmailAndPassword(auth, email, password);
            toast({
                title: "Logged in successfully",
                description: "Welcome to WatchDash!",
            });
            router.push("/dashboard");
        } catch (error: any) {
            toast({
                title: "Login failed",
                description: error.message || "Please check your credentials",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <div className="w-full max-w-md space-y-8 p-8 bg-card shadow-lg rounded-xl">
                <div className="space-y-2 text-center">
                    <h1 className="text-2xl font-bold">Log In to WatchDash</h1>
                    <p className="text-sm text-muted-foreground">
                        Enter your credentials to access your dashboard
                    </p>
                </div>
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-6 pt-4"
                    >
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="admin@admin.com"
                                            {...field}
                                            disabled={isLoading}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Password</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="password"
                                            placeholder="••••••••"
                                            {...field}
                                            disabled={isLoading}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button
                            className="w-full"
                            type="submit"
                            disabled={isLoading}
                        >
                            {isLoading ? "Logging in..." : "Log In"}
                        </Button>
                        <p className="text-xs text-center text-muted-foreground pt-2">
                            For demo: use email "admin@admin.com" with password
                            "admin"
                        </p>
                    </form>
                </Form>
            </div>
        </div>
    );
}
