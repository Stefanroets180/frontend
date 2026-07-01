"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import type { Vehicle, Trip } from "@/lib/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  FileText,
  Download,
  Calendar,
  Briefcase,
  Palmtree,
  TrendingUp,
  Car,
  Filter,
  Lock,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { EntryActions } from "@/components/entries";
import { VehicleExportDialog } from "@/components/dashboard/vehicle-export-dialog";
import { TripExportDialog } from "@/components/dashboard/trip-export-dialog";
import { DashboardCollapsiblePanel } from "@/components/dashboard/dashboard-collapsible-panel";

// Helper to format vehicle label same as dashboard
function vehicleLabel(v: Vehicle): string {
  return v.nickname
    ? `${v.nickname} (${v.registrationNumber})`
    : `${v.year} ${v.make} ${v.model} — ${v.registrationNumber}`;
}

type TripRow = Trip & {
  vehicle: { registration: string; make: string; model: string };
};

const emptySummary = {
  totalKm: 0,
  businessKm: 0,
  privateKm: 0,
  businessPercentage: 0,
  totalTrips: 0,
  businessTrips: 0,
  privateTrips: 0,
};

export default function LogbookPage() {
  const router = useRouter();
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedVehicle, setSelectedVehicle] = useState<string>("");
  const [filterPurpose, setFilterPurpose] = useState<
    "all" | "BUSINESS" | "PRIVATE"
  >("all");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [trips, setTrips] = useState<TripRow[]>([]);
  const [summary, setSummary] = useState(emptySummary);

  const loadTrips = async () => {
    try {
      const vehicleParam = selectedVehicle
        ? `?vehicleId=${selectedVehicle}`
        : "";

      // Fetch trips - this is required
      const tripsRes = await api.get(`/trips${vehicleParam}`);
      const tripData = Array.isArray(tripsRes.data) ? tripsRes.data : [];
      setTrips(
        tripData.map((t: Record<string, unknown>) => ({
          id: String(t.id),
          organizationId: "",
          vehicleId: String(t.vehicleId),
          userId: "",
          tripDate: new Date(String(t.tripDate)),
          startTime: t.startTime ? String(t.startTime).slice(0, 5) : undefined,
          endTime: t.endTime ? String(t.endTime).slice(0, 5) : undefined,
          startLocation: String(t.startLocation),
          endLocation: String(t.endLocation),
          startOdometer: Number(t.startOdometer),
          endOdometer: Number(t.endOdometer),
          distanceKm: Number(
            t.distanceKm ?? Number(t.endOdometer) - Number(t.startOdometer),
          ),
          purpose: t.purpose as Trip["purpose"],
          routeDescription: t.routeDescription
            ? String(t.routeDescription)
            : undefined,
          customerClientName: t.customerClientName
            ? String(t.customerClientName)
            : undefined,
          reasonForTrip: t.reasonForTrip ? String(t.reasonForTrip) : undefined,
          tollCostsZar: Number(t.tollCostsZar ?? 0),
          parkingCostsZar: Number(t.parkingCostsZar ?? 0),
          isLocked: Boolean(t.isLocked ?? false),
          lockedAt: t.lockedAt ? new Date(String(t.lockedAt)) : undefined,
          lockedReason: t.lockedReason ? String(t.lockedReason) : undefined,
          lockedByName: t.lockedByName ? String(t.lockedByName) : undefined,
          createdAt: new Date(String(t.createdAt ?? t.tripDate)),
          updatedAt: new Date(String(t.updatedAt ?? t.tripDate)),
          vehicle: {
            registration: String(t.vehicleRegistration ?? ""),
            make: String(t.vehicleMake ?? ""),
            model: String(t.vehicleModel ?? ""),
          },
        })),
      );

      // Fetch summary - this is optional and may not exist in backend yet
      try {
        const summaryRes = await api.getOptional(
          `/trips/summary${vehicleParam}`,
        );
        const s = (summaryRes.data ?? {}) as Record<string, number>;
        setSummary({
          totalKm: Number(s.totalKm ?? 0),
          businessKm: Number(s.businessKm ?? 0),
          privateKm: Number(s.privateKm ?? 0),
          businessPercentage: Number(s.businessPercentage ?? 0),
          totalTrips: Number(s.totalTrips ?? 0),
          businessTrips: Number(s.businessTrips ?? 0),
          privateTrips: Number(s.privateTrips ?? 0),
        });
      } catch (summaryErr) {
        // Summary endpoint doesn't exist yet - calculate from trips data
        const businessTrips = tripData.filter(
          (t: Record<string, unknown>) => t.purpose === "BUSINESS",
        );
        const privateTrips = tripData.filter(
          (t: Record<string, unknown>) => t.purpose === "PRIVATE",
        );
        const totalKm = tripData.reduce(
          (sum: number, t: Record<string, unknown>) =>
            sum + Number(t.distanceKm ?? 0),
          0,
        );
        const businessKm = businessTrips.reduce(
          (sum: number, t: Record<string, unknown>) =>
            sum + Number(t.distanceKm ?? 0),
          0,
        );
        const privateKm = privateTrips.reduce(
          (sum: number, t: Record<string, unknown>) =>
            sum + Number(t.distanceKm ?? 0),
          0,
        );

        setSummary({
          totalKm,
          businessKm,
          privateKm,
          businessPercentage:
            totalKm > 0 ? Math.round((businessKm / totalKm) * 100) : 0,
          totalTrips: tripData.length,
          businessTrips: businessTrips.length,
          privateTrips: privateTrips.length,
        });
      }
    } catch (err) {
      console.error("Logbook - Failed to fetch trips:", err);
      setTrips([]);
      setSummary(emptySummary);
    }
  };

  useEffect(() => {
    api
      .get("/vehicles")
      .then(({ data }) => {
        if (Array.isArray(data)) {
          setVehicles(data);
          // Auto-select the first vehicle if none is selected
          if (data.length > 0 && !selectedVehicle) {
            setSelectedVehicle(data[0].id);
          }
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    loadTrips();
  }, [selectedVehicle]);

  const filteredTrips = trips.filter((trip) => {
    if (filterPurpose !== "all" && trip.purpose !== filterPurpose) return false;
    return true;
  });

  const selectedVehicleOption = vehicles.find(
    (vehicle) => vehicle.id === selectedVehicle,
  );

  const logbookSummaryItems = [
    {
      label: `${filteredTrips.length} trip${filteredTrips.length === 1 ? "" : "s"}`,
      tone: "activity" as const,
    },
    {
      label: `${summary.businessPercentage}% business use`,
      tone: "info" as const,
    },
    {
      label: `Business ${summary.businessKm.toLocaleString()} km`,
      tone: "success" as const,
    },
    {
      label: `Private ${summary.privateKm.toLocaleString()} km`,
      tone: "warning" as const,
    },
    {
      label: selectedVehicleOption
        ? vehicleLabel(selectedVehicleOption)
        : "No vehicle selected",
    },
    ...(filterPurpose !== "all"
      ? [
          {
            label:
              filterPurpose === "BUSINESS" ? "Business only" : "Private only",
            tone:
              filterPurpose === "BUSINESS"
                ? ("success" as const)
                : ("warning" as const),
          },
        ]
      : []),
    ...(selectedMonth !== "all"
      ? [
          {
            label: `Month ${selectedMonth}`,
          },
        ]
      : []),
  ];

  const handleDeleteTrip = async (tripId: string) => {
    try {
      await api.delete(`/trips/${tripId}`);
      await loadTrips();
    } catch (err) {
      console.error("Failed to delete trip:", err);
    }
  };

  const handleLockTrip = async (tripId: string, reason?: string) => {
    try {
      await api.post(
        `/trips/${tripId}/lock?reason=${encodeURIComponent(reason || "Manual lock")}`,
        {},
      );
      await loadTrips();
    } catch (err) {
      console.error("Failed to lock trip:", err);
    }
  };

  const handleUnlockTrip = async (tripId: string) => {
    try {
      await api.post(`/trips/${tripId}/unlock`, {});
      await loadTrips();
    } catch (err) {
      console.error("Failed to unlock trip:", err);
    }
  };

  return (
    <div className="container mx-auto min-h-screen bg-background p-4 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="py-4">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold">SARS Logbook</h1>
              <p className="text-sm text-muted-foreground">
                Tax Year 2024/2025
              </p>
            </div>
            <TripExportDialog
              vehicleId={selectedVehicle || vehicles[0]?.id || ""}
              vehicleLabel={
                selectedVehicle
                  ? (vehicles.find((v) => v.id === selectedVehicle)?.nickname ??
                    vehicles.find((v) => v.id === selectedVehicle)
                      ?.registrationNumber ??
                    "Vehicle")
                  : (vehicles[0]?.nickname ??
                    vehicles[0]?.registrationNumber ??
                    "Vehicle")
              }
              disabled={vehicles.length === 0}
              triggerClassName="w-full gap-2 sm:w-auto"
            />
          </div>
        </div>
      </div>

      <div className="py-4 space-y-6">
        <DashboardCollapsiblePanel
          panelId="logbook-summary"
          title="Logbook summary and filters"
          description="Review tax-year totals and narrow the trip list for the selected vehicle."
          tone="activity"
          openLabel="Hide summary"
          closedLabel="Show summary"
          summaryItems={logbookSummaryItems}
          contentClassName="space-y-6"
        >
          {/* Tax Year Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="border-primary/20 bg-primary/10">
              <CardContent className="p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium text-primary">
                    Business KM
                  </span>
                </div>
                <div className="text-2xl font-bold">
                  {summary.businessKm.toLocaleString()}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {summary.businessTrips} trips
                </div>
              </CardContent>
            </Card>
            <Card className="border-amber-500/20 bg-amber-500/10">
              <CardContent className="p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Palmtree className="h-4 w-4 text-amber-500" />
                  <span className="text-xs font-medium text-amber-500">
                    Private KM
                  </span>
                </div>
                <div className="text-2xl font-bold">
                  {summary.privateKm.toLocaleString()}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {summary.privateTrips} trips
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Business Percentage Card */}
          <Card>
            <CardContent className="p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <span className="font-medium">Business Use Ratio</span>
                </div>
                <span className="text-2xl font-bold text-primary">
                  {summary.businessPercentage}%
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${summary.businessPercentage}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                <span>Business: {summary.businessKm} km</span>
                <span>Private: {summary.privateKm} km</span>
              </div>
            </CardContent>
          </Card>

          {/* SARS Compliance Notice */}
          <Card className="border-dashed bg-muted/50">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <FileText className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    SARS Logbook Requirements
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Record all trips with date, start/end odometer, purpose
                    (business/private), and destination. Keep for 5 years for
                    tax audit purposes.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Filters */}
          <div className="flex flex-col gap-2 md:flex-row">
            <Select
              value={filterPurpose}
              onValueChange={(v) => setFilterPurpose(v as typeof filterPurpose)}
            >
              <SelectTrigger className="h-10 w-full md:w-[160px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="All trips" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Trips</SelectItem>
                <SelectItem value="BUSINESS">Business Only</SelectItem>
                <SelectItem value="PRIVATE">Private Only</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
              <SelectTrigger className="h-10 w-full md:w-[240px]">
                <Car className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Select vehicle" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicleLabel(vehicle)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="h-10 w-full flex-1">
                <Calendar className="mr-2 h-4 w-4" />
                <SelectValue placeholder="All months" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                <SelectItem value="01">January 2024</SelectItem>
                <SelectItem value="02">February 2024</SelectItem>
                <SelectItem value="03">March 2024</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </DashboardCollapsiblePanel>

        {/* Add Trip Button */}
        <div className="pt-2">
          <Link href="/dashboard/logbook/new" className="block w-full">
            <Button size="lg" className="w-full gap-2">
              <Plus className="h-5 w-5" />
              Add New Trip
            </Button>
          </Link>
        </div>

        {/* Trip List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Trip History</h2>
            <span className="text-sm text-muted-foreground">
              {filteredTrips.length} trips
            </span>
          </div>

          {filteredTrips.map((trip) => (
            <Card
              key={trip.id}
              className={cn(
                "overflow-hidden relative",
                trip.purpose === "BUSINESS"
                  ? "border-l-4 border-l-primary"
                  : "border-l-4 border-l-amber-500",
                trip.isLocked && "border-amber-500/50",
              )}
            >
              {/* Lock indicator */}
              {trip.isLocked && (
                <div className="absolute top-3 right-3 z-10">
                  <Badge
                    variant="outline"
                    className="bg-amber-500/10 text-amber-600 border-amber-500/30"
                  >
                    <Lock className="h-3 w-3 mr-1" />
                    Confirmed
                  </Badge>
                </div>
              )}

              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        trip.purpose === "BUSINESS" ? "default" : "secondary"
                      }
                      className={cn(
                        "text-xs",
                        trip.purpose === "PRIVATE" &&
                          "bg-amber-500/20 text-amber-500 hover:bg-amber-500/30",
                      )}
                    >
                      {trip.purpose === "BUSINESS" ? (
                        <Briefcase className="h-3 w-3 mr-1" />
                      ) : (
                        <Palmtree className="h-3 w-3 mr-1" />
                      )}
                      {trip.purpose}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {new Date(trip.tripDate).toLocaleDateString("en-ZA", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <span className="text-lg font-bold">
                    {trip.distanceKm} km
                  </span>
                  {trip.isLocked && (
                    <Badge
                      variant="secondary"
                      className="bg-amber-500/10 text-amber-600 border-amber-500/20"
                    >
                      <Lock className="h-3 w-3 mr-1" />
                      Confirmed
                    </Badge>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 shrink-0" />
                    <span className="text-sm">{trip.startLocation}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0" />
                    <span className="text-sm">{trip.endLocation}</span>
                  </div>
                </div>

                {trip.customerClientName && (
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <span className="text-xs text-muted-foreground">
                      Client:{" "}
                    </span>
                    <span className="text-xs font-medium">
                      {trip.customerClientName}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Car className="h-3 w-3" />
                      <span>{trip.vehicle.registration}</span>
                    </div>
                    <span>
                      {trip.startOdometer.toLocaleString()} -{" "}
                      {trip.endOdometer.toLocaleString()} km
                    </span>
                  </div>

                  {/* Action buttons */}
                  <EntryActions
                    entryId={trip.id}
                    entryType="trip"
                    isLocked={trip.isLocked ?? false}
                    lockedAt={trip.lockedAt}
                    lockedByName={trip.lockedByName}
                    lockedReason={trip.lockedReason}
                    onEdit={() =>
                      router.push(`/dashboard/trips/${trip.id}/edit`)
                    }
                    onDelete={() => handleDeleteTrip(trip.id)}
                    onLock={(reason) => handleLockTrip(trip.id, reason)}
                    onUnlock={() => handleUnlockTrip(trip.id)}
                    variant="icons"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
