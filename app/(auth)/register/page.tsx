"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Truck, Eye, EyeOff, AlertCircle, User, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { authService } from "@/components/auth/auth-service";
import { persistAuthSession } from "@/lib/auth/normalize-auth-response";

type AccountType = "individual" | "business";

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [accountType, setAccountType] = useState<AccountType>("individual");
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    organizationName: "",
    organizationType: "SOLE_PROPRIETOR",
    role: "ADMIN" as "ADMIN" | "MANAGER" | "DRIVER",
  });

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setError(null);

    if (step === 1) {
      setStep(2);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);
    try {
      const data = await authService.register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        organizationName:
          accountType === "business"
            ? formData.organizationName
            : `${formData.firstName} ${formData.lastName}`,
        organizationMode: accountType === "business" ? "FLEET" : "SOLO",
        role: accountType === "business" ? formData.role : undefined,
      });

      persistAuthSession(data);

      // Drivers and Managers skip vehicle onboarding and go directly to dashboard
      if (data.user.role === "DRIVER" || data.user.role === "MANAGER") {
        router.push("/dashboard");
      } else {
        router.push("/onboarding/add-vehicle");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-8">
        <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center" suppressHydrationWarning>
          <Truck className="h-7 w-7 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Vehicle Expense</h1>
          <p className="text-xs text-muted-foreground">SA Fleet Management</p>
        </div>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Create Account</CardTitle>
          <CardDescription>
            {step === 1
              ? "Choose your account type"
              : "Enter your details to get started"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {step === 1 ? (
              <>
                {/* Account Type Selection */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAccountType("individual")}
                    className={cn(
                      "flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all",
                      "min-h-35",
                      accountType === "individual"
                        ? "border-primary bg-primary/10"
                        : "border-border bg-card hover:border-primary/50",
                    )}
                  >
                    <span suppressHydrationWarning>
                      <User
                        className={cn(
                          "h-10 w-10 mb-3",
                          accountType === "individual"
                            ? "text-primary"
                            : "text-muted-foreground",
                        )}
                      />
                    </span>
                    <span className="font-semibold">Individual</span>
                    <span className="text-xs text-muted-foreground mt-1 text-center">
                      Freelancer / Doctor
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountType("business")}
                    className={cn(
                      "flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all",
                      "min-h-35",
                      accountType === "business"
                        ? "border-primary bg-primary/10"
                        : "border-border bg-card hover:border-primary/50",
                    )}
                  >
                    <span suppressHydrationWarning>
                      <Building2
                        className={cn(
                          "h-10 w-10 mb-3",
                          accountType === "business"
                            ? "text-primary"
                            : "text-muted-foreground",
                        )}
                      />
                    </span>
                    <span className="font-semibold">Business</span>
                    <span className="text-xs text-muted-foreground mt-1 text-center">
                      Fleet / Company
                    </span>
                  </button>
                </div>

                <p className="text-sm text-muted-foreground text-center">
                  {accountType === "individual"
                    ? "Perfect for managing personal vehicle expenses and SARS logbook"
                    : "Full fleet management with team members and multiple vehicles"}
                </p>

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold"
                >
                  Continue
                </Button>
              </>
            ) : (
              <>
                {/* User Details */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      placeholder="John"
                      value={formData.firstName}
                      onChange={(e) =>
                        setFormData({ ...formData, firstName: e.target.value })
                      }
                      className="h-12"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      placeholder="Smith"
                      value={formData.lastName}
                      onChange={(e) =>
                        setFormData({ ...formData, lastName: e.target.value })
                      }
                      className="h-12"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.co.za"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="h-12"
                    required
                  />
                </div>

                {accountType === "business" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="organizationName">Business Name</Label>
                      <Input
                        id="organizationName"
                        placeholder="e.g., ABC Transport"
                        value={formData.organizationName}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            organizationName: e.target.value,
                          })
                        }
                        className="h-12"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="organizationType">Business Type</Label>
                      <Select
                        value={formData.organizationType}
                        onValueChange={(value) =>
                          setFormData({ ...formData, organizationType: value })
                        }
                      >
                        <SelectTrigger id="organizationType" className="h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SOLE_PROPRIETOR">
                            Sole Proprietor
                          </SelectItem>
                          <SelectItem value="PTY_LTD">
                            (Pty) Ltd Company
                          </SelectItem>
                          <SelectItem value="CC">Close Corporation</SelectItem>
                          <SelectItem value="PARTNERSHIP">
                            Partnership
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="role">Your Role</Label>
                      <Select
                        value={formData.role}
                        onValueChange={(value: "ADMIN" | "MANAGER" | "DRIVER") =>
                          setFormData({ ...formData, role: value })
                        }
                      >
                        <SelectTrigger id="role" className="h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ADMIN">
                            Admin - Full access to all features
                          </SelectItem>
                          <SelectItem value="MANAGER">
                            Manager - Manage fleet and drivers
                          </SelectItem>
                          <SelectItem value="DRIVER">
                            Driver - Log trips and expenses only
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {formData.role === "DRIVER" 
                          ? "Drivers will be assigned to vehicles by an admin or manager"
                          : "Admins and managers can create and manage vehicles"}
                      </p>
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="At least 8 characters"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      className="h-12 pr-12"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        confirmPassword: e.target.value,
                      })
                    }
                    className="h-12"
                    required
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="flex-1 h-12"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 h-12 text-base font-semibold"
                    disabled={isLoading}
                  >
                    {isLoading ? "Creating..." : "Create Account"}
                  </Button>
                </div>
              </>
            )}
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">
              Already have an account?{" "}
            </span>
            <Link
              href="/login"
              className="text-primary hover:underline font-medium"
            >
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <p className="mt-8 text-xs text-muted-foreground text-center">
        By creating an account, you agree to our Terms of Service
      </p>
    </div>
  );
}
