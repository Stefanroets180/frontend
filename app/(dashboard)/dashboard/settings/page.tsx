"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaxReadinessAudit } from "@/components/dashboard/tax-readiness-audit";
import { VehicleExportDialog } from "@/components/dashboard/vehicle-export-dialog";
import {
  AppUsageGuideDialog,
  getGuideSeenStorageKey,
} from "@/components/navigation/app-usage-guide-dialog";
import { DashboardCollapsiblePanel } from "@/components/dashboard/dashboard-collapsible-panel";
import {
  User,
  Building2,
  Bell,
  Moon,
  Sun,
  LogOut,
  FileText,
  ChevronRight,
  Camera,
  Settings as SettingsIcon,
  Shield,
  Database,
  CheckCircle2,
  XCircle,
  Loader2,
  RotateCcw,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/contexts/auth-context";
import { useUserPreferences } from "@/lib/hooks/use-user-preferences";
import { api } from "@/lib/api/client";
import { getSATaxYear } from "@/lib/types/database";
import { toast } from "sonner";

interface VehicleOption {
  id: string;
  nickname: string | null;
  registrationNumber: string;
  make: string;
  model: string;
}

function SettingsContent() {
  const { user, logout, refreshUser, isLoading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const {
    preferences,
    loaded: prefsLoaded,
    setNotifications,
    setRegional,
  } = useUserPreferences();

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [exportVehicleId, setExportVehicleId] = useState<string>("");
  const [dbStatus, setDbStatus] = useState<"loading" | "up" | "down">(
    "loading",
  );

  const isDark = resolvedTheme === "dark";
  const isFleet = user?.organizationMode === "FLEET";
  const isAdminOrManager = user?.role === "ADMIN" || user?.role === "MANAGER";
  const isDriver = user?.role === "DRIVER";
  const shouldHideTaxFeatures = isFleet && isDriver;
  const requestedTab = searchParams.get("tab");
  const defaultTab =
    !shouldHideTaxFeatures && requestedTab === "tax-readiness"
      ? "tax-readiness"
      : "general";
  const taxYear = getSATaxYear();
  const displayName = user
    ? `${user.firstName} ${user.lastName ?? ""}`.trim()
    : "—";

  const generalSettingsSummaryItems = [
    {
      label: displayName,
      tone: "activity" as const,
    },
    {
      label: user?.role ?? "No role",
      tone: "info" as const,
    },
    {
      label: isFleet ? "Fleet account" : "Individual account",
    },
    {
      label:
        vehicles.length > 0
          ? `${vehicles.length} vehicle${vehicles.length === 1 ? "" : "s"} ready for export`
          : "No vehicles to export",
      tone: vehicles.length > 0 ? ("success" as const) : ("neutral" as const),
    },
  ];

  const taxReadinessSummaryItems = [
    {
      label: `Tax year ${taxYear} / ${taxYear + 1}`,
      tone: "warning" as const,
    },
    {
      label:
        vehicles.length > 0
          ? `${vehicles.length} vehicle${vehicles.length === 1 ? "" : "s"}`
          : "No vehicles yet",
    },
    {
      label: "Opening and closing odometer review",
      tone: "info" as const,
    },
  ];

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    refreshUser().catch(() => {});
  }, [refreshUser]);

  useEffect(() => {
    api
      .get("/health")
      .then(() => setDbStatus("up"))
      .catch(() => setDbStatus("down"));
  }, []);

  useEffect(() => {
    api
      .get("/vehicles")
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : [];
        setVehicles(
          list.map((v: Record<string, unknown>) => ({
            id: String(v.id),
            nickname: v.nickname as string | null,
            registrationNumber: String(v.registrationNumber ?? ""),
            make: String(v.make ?? ""),
            model: String(v.model ?? ""),
          })),
        );
        if (list.length > 0) {
          setExportVehicleId(String(list[0].id));
        }
      })
      .catch(() => setVehicles([]));
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch {
      setIsLoggingOut(false);
    }
  };

  const handleThemeToggle = (checked: boolean) => {
    setTheme(checked ? "dark" : "light");
    toast.success(checked ? "Dark mode enabled" : "Light mode enabled");
  };

  const exportVehicleLabel = () => {
    const v = vehicles.find((x) => x.id === exportVehicleId);
    if (!v) return "Vehicle";
    return v.nickname ?? `${v.make} ${v.model}`;
  };

  const handleResetGuidePopup = () => {
    if (!user?.organizationMode) {
      toast.error("Could not reset guide pop-up");
      return;
    }

    try {
      const key = getGuideSeenStorageKey({
        organizationMode: user.organizationMode,
        role: user.role,
        userEmail: user.email,
      });
      localStorage.removeItem(key);
      toast.success("Guide pop-up reset. It will open again on Home.");
    } catch {
      toast.error("Could not reset guide pop-up");
    }
  };

  if (authLoading || !mounted) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-full space-y-6 p-4 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage your account and preferences
          </p>
        </div>
      </div>

      {!shouldHideTaxFeatures && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 sm:px-4 sm:py-3 w-full max-w-full overflow-hidden">
          <p className="text-xs sm:text-sm font-medium">
            Important for SARS tax completion
          </p>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Go to{" "}
            <Link href="/dashboard/settings?tab=tax-readiness" className="font-medium text-foreground hover:underline">
              Tax Readiness
            </Link>{" "}
            and make sure your{" "}
            <span className="font-medium text-foreground">
              OPENING Reading
            </span>{" "}
            has both the correct odometer image and the actual odometer
            reading. Once you are sure it is correct, lock it so it moves
            from pending to a confirmed opening record. Then, at the end
            of the tax year, add the{" "}
            <span className="font-medium text-foreground">
              CLOSING Reading
            </span>{" "}
            odometer reading and image to complete your SARS tax records.
          </p>
        </div>
      )}

      <DashboardCollapsiblePanel
        panelId="settings-general"
        title="General settings"
        description="Manage your account, preferences, exports and support options."
        tone="info"
        openLabel="Hide settings"
        closedLabel="Show settings"
        summaryItems={generalSettingsSummaryItems}
        contentClassName="space-y-6"
      >
        {/* Profile — live from backend via useAuth */}
        <Link href="/dashboard/profile">
          <Card className="cursor-pointer transition-colors hover:border-primary/50 w-full max-w-full overflow-hidden">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-3 sm:gap-4 w-full min-w-0">
                <div className="flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-primary/20 text-lg sm:text-xl font-bold text-primary shrink-0">
                  {user?.firstName?.[0] ?? <User className="h-6 w-6 sm:h-8 sm:w-8" />}
                </div>
                <div className="min-w-0 flex-1 overflow-hidden">
                  <h2 className="truncate text-base sm:text-lg font-semibold">
                    {displayName}
                  </h2>
                  <p className="truncate text-xs sm:text-sm text-muted-foreground">
                    {user?.email ?? ""}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {user?.role ?? "—"}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs shrink-0",
                        isFleet
                          ? "border-primary/50 text-primary"
                          : "border-accent/50 text-accent",
                      )}
                    >
                      {isFleet ? "Fleet Account" : "Individual Account"}
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 sm:h-9 gap-2 px-2 sm:px-3 text-xs font-medium shrink-0"
                >
                  <Lock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  <span className="hidden sm:inline">Change Password</span>
                  <span className="sm:hidden">Password</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* System status — PostgreSQL via Spring Boot health */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <Database className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <StatusRow
              label="API Server"
              ok={dbStatus === "up"}
              loading={dbStatus === "loading"}
              detail="Spring Boot on port 8080"
            />
            <StatusRow
              label="Database (PostgreSQL)"
              ok={dbStatus === "up"}
              loading={dbStatus === "loading"}
              detail={
                dbStatus === "up"
                  ? "Connected via backend"
                  : "Cannot reach API — start backend & PostgreSQL"
              }
            />
          </CardContent>
        </Card>

        {/* Account type */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
              Account Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1">
                <p className="font-medium text-sm sm:text-base">
				  {isFleet ? "Fleet Management" : "Individual"}
                </p>
                <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">
                  {isFleet
                    ? "Full fleet dashboard with team and vehicle management"
                    : "Personal vehicle expense tracking"}
                </p>
              </div>
              <Badge
                className={cn(
                  "shrink-0 text-xs",
                  isFleet
                    ? "border-primary/30 bg-primary/20 text-primary"
                    : "border-accent/30 bg-accent/20 text-accent",
                )}
                variant="outline"
              >
                {isFleet ? "FLEET" : "INDIVIDUAL"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {isFleet && isAdminOrManager && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-5 w-5" />
                Organisation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">
                    {user?.organizationName ?? "—"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Fleet account
                  </p>
                </div>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  <Link href="/dashboard/organization">Manage</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-5 w-5 text-muted-foreground" />
              Help Guide
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-medium">Open the guide again</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Read the full step-by-step guide again whenever you need
                a refresher.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <AppUsageGuideDialog
                organizationMode={user?.organizationMode}
                role={user?.role}
                organizationName={user?.organizationName}
                userEmail={user?.email}
                triggerLabel="Show guide again"
                triggerVariant="outline"
                triggerSize="sm"
                triggerClassName="w-full gap-2 sm:w-auto"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full gap-2 sm:w-auto"
                onClick={handleResetGuidePopup}
              >
                <RotateCcw className="h-4 w-4" />
                Reset guide pop-up
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Resetting the pop-up means the guide will open
              automatically again next time you land on Home.
            </p>
          </CardContent>
        </Card>

        {/* Appearance — wired to next-themes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Appearance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {isDark ? (
                  <Moon className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <Sun className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <Label htmlFor="dark-mode" className="font-medium">
                    Dark Mode
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {theme === "system"
                      ? "Following system preference"
                      : isDark
                        ? "High contrast for outdoor visibility"
                        : "Light theme"}
                  </p>
                </div>
              </div>
              <Switch
                id="dark-mode"
                checked={isDark}
                onCheckedChange={handleThemeToggle}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notifications — persisted locally */}
        {!shouldHideTaxFeatures && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {prefsLoaded && (
                <>
                  <NotificationToggle
                    id="service-reminders"
                    label="Service Reminders"
                    description="Get notified before service is due"
                    checked={preferences.notifications.serviceReminders}
                    onCheckedChange={(v) => {
                      setNotifications({ serviceReminders: v });
                      toast.success("Preference saved");
                    }}
                  />
                  <Separator />
                  <NotificationToggle
                    id="fuel-efficiency"
                    label="Fuel Efficiency Alerts"
                    description="Alert when km/L drops significantly"
                    checked={preferences.notifications.fuelEfficiency}
                    onCheckedChange={(v) => {
                      setNotifications({ fuelEfficiency: v });
                      toast.success("Preference saved");
                    }}
                  />
                  <Separator />
                  <NotificationToggle
                    id="tax-deadlines"
                    label="SARS Tax Deadlines"
                    description="Reminders for tax submission dates"
                    checked={preferences.notifications.taxDeadlines}
                    onCheckedChange={(v) => {
                      setNotifications({ taxDeadlines: v });
                      toast.success("Preference saved");
                    }}
                  />
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Regional — persisted locally */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Regional</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {prefsLoaded && (
              <>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select
                    value={preferences.regional.currency}
                    onValueChange={(v) => {
                      setRegional({ currency: v as "ZAR" });
                      toast.success("Currency preference saved");
                    }}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ZAR">
                        ZAR (R) — South African Rand
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Distance Unit</Label>
                  <Select
                    value={preferences.regional.distanceUnit}
                    onValueChange={(v) => {
                      setRegional({ distanceUnit: v as "km" });
                      toast.success("Distance unit saved");
                    }}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="km">
                        Kilometers (km)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Fuel Efficiency Display</Label>
                  <Select
                    value={preferences.regional.fuelEfficiencyDisplay}
                    onValueChange={(v) => {
                      setRegional({
                        fuelEfficiencyDisplay: v as "km_l" | "l_100km",
                      });
                      toast.success("Display preference saved");
                    }}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="km_l">km/L</SelectItem>
                      <SelectItem value="l_100km">L/100 km</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Tax & export */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-5 w-5" />
              Tax & Compliance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SettingsRow
              icon={<FileText className="h-4 w-4" />}
              label="Current Tax Year"
              value={`${taxYear} / ${taxYear + 1}`}
            />

            {vehicles.length > 0 ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Export vehicle data</Label>
                  <Select
                    value={exportVehicleId}
                    onValueChange={setExportVehicleId}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select vehicle" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.nickname ??
                            `${v.make} ${v.model} — ${v.registrationNumber}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {exportVehicleId && (
                  <VehicleExportDialog
                    vehicleId={exportVehicleId}
                    vehicleLabel={exportVehicleLabel()}
                    triggerLabel="Export all data"
                    triggerClassName="w-full gap-2"
                  />
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Add a vehicle on the dashboard to export SARS logbook
                and expenses.
              </p>
            )}

            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard/logbook">View SARS Logbook</Link>
            </Button>
          </CardContent>
        </Card>

        <Button
          variant="destructive"
          className="h-12 sm:h-14 w-full text-sm sm:text-base"
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          <LogOut className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
          {isLoggingOut ? "Signing out…" : "Sign Out"}
        </Button>

        <div className="py-4 text-center text-xs text-muted-foreground">
          <p>Vehicle Expense Tracker v1.0.0</p>
          <p>Designed for South African Tax Compliance</p>
        </div>
      </DashboardCollapsiblePanel>

      {!shouldHideTaxFeatures && (
        <DashboardCollapsiblePanel
          panelId="settings-tax-readiness"
          title="Tax Readiness"
          description="Review and confirm your opening and closing odometer records for SARS."
          tone="warning"
          openLabel="Hide readiness"
          closedLabel="Show readiness"
          summaryItems={taxReadinessSummaryItems}
        >
          <TaxReadinessAudit />
        </DashboardCollapsiblePanel>
      )}
    </div>
  );
}

function NotificationToggle({
  id,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <Label htmlFor={id} className="font-medium">
          {label}
        </Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function StatusRow({
  label,
  ok,
  loading,
  detail,
}: {
  label: string;
  ok: boolean;
  loading: boolean;
  detail: string;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : ok ? (
        <CheckCircle2 className="h-5 w-5 text-green-600" />
      ) : (
        <XCircle className="h-5 w-5 text-destructive" />
      )}
    </div>
  );
}

function SettingsRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-sm">{label}</span>
      </div>
      <span className="text-sm text-muted-foreground">{value}</span>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div>Loading settings...</div>}>
      <SettingsContent />
    </Suspense>
  );
}
