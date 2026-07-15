"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Truck, AlertCircle, CheckCircle, Loader2 } from "lucide-react";

export const dynamic = 'force-dynamic';

export default function ConfirmEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    
    if (!token) {
      setStatus("error");
      setMessage("Invalid verification link. Please request a new confirmation email.");
      return;
    }

    const verifyEmail = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/verify-email?token=${token}`,
          {
            method: "POST",
          }
        );

        if (response.ok) {
          setStatus("success");
          setMessage("Your email has been verified successfully!");
          
          // Redirect to dashboard after 3 seconds
          setTimeout(() => {
            router.push("/dashboard");
          }, 3000);
        } else {
          setStatus("error");
          setMessage("Invalid or expired verification link. Please request a new confirmation email.");
        }
      } catch (error) {
        setStatus("error");
        setMessage("An error occurred while verifying your email. Please try again.");
      }
    };

    verifyEmail();
  }, [token, router]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-8">
        <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
          <Truck className="h-7 w-7 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Vehicle Expense</h1>
          <p className="text-xs text-muted-foreground">SA Fleet Management</p>
        </div>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Email Verification</CardTitle>
        </CardHeader>
        <CardContent>
          {status === "loading" && (
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-muted-foreground">Verifying your email...</p>
            </div>
          )}

          {status === "success" && (
            <div className="space-y-4 text-center">
              <div className="bg-green-100 rounded-full p-4 w-16 h-16 mx-auto flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">{message}</p>
                <p className="text-sm text-muted-foreground">
                  Redirecting to dashboard...
                </p>
              </div>
              <Button
                onClick={() => router.push("/dashboard")}
                className="w-full"
              >
                Go to Dashboard Now
              </Button>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-4 text-center">
              <div className="bg-red-100 rounded-full p-4 w-16 h-16 mx-auto flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <Alert variant="destructive">
                <AlertDescription>{message}</AlertDescription>
              </Alert>
              <Button
                onClick={() => router.push("/register")}
                variant="outline"
                className="w-full"
              >
                Back to Registration
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
