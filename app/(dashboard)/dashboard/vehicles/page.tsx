"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Car, AlertCircle, Lock, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api/client";
import type { Vehicle } from "@/lib/types/database";
import { EntryActions } from "@/components/entries";
import { cn } from "@/lib/utils";
import { DashboardCollapsiblePanel } from "@/components/dashboard/dashboard-collapsible-panel";

export default function VehiclesPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      setIsLoading(true);
      const data = await api.get("/vehicles");
      const responseData = (data as any).data || data;
      // Ensure vehicles is always an array
      if (Array.isArray(responseData)) {
        setVehicles(responseData);
      } else if (responseData && typeof responseData === "object") {
        // Handle paginated response or wrapped response
        const vehiclesArray =
          (responseData as any).content || (responseData as any).vehicles || [];
        setVehicles(vehiclesArray);
      } else {
        setVehicles([]);
      }
    } catch (err) {
      console.error("Failed to fetch vehicles:", err);
      setError("Failed to load vehicles. Please try again.");
      setVehicles([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    try {
      await api.delete(`/vehicles/${vehicleId}`);
      setVehicles(vehicles.filter((v) => v.id !== vehicleId));
    } catch (err) {
      console.error("Failed to delete vehicle:", err);
      throw err;
    }
  };

  const handleLockVehicle = async (vehicleId: string, reason?: string) => {
    try {
      await api.patch(
        `/vehicles/${vehicleId}/lock?reason=${encodeURIComponent(reason || "")}`,
        {},
      );
      setVehicles(
        vehicles.map((v) =>
          v.id === vehicleId
            ? {
                ...v,
                isLocked: true,
                lockedAt: new Date(),
                lockedReason: reason,
              }
            : v,
        ),
      );
    } catch (err) {
      console.error("Failed to lock vehicle:", err);
      throw err;
    }
  };

  const handleUnlockVehicle = async (vehicleId: string) => {
    try {
      await api.patch(`/vehicles/${vehicleId}/unlock`, {});
      setVehicles(
        vehicles.map((v) =>
          v.id === vehicleId
            ? {
                ...v,
                isLocked: false,
                lockedAt: undefined,
                lockedReason: undefined,
              }
            : v,
        ),
      );
    } catch (err) {
      console.error("Failed to unlock vehicle:", err);
      throw err;
    }
  };

  const confirmedVehiclesCount = vehicles.filter(
    (vehicle) => vehicle.isLocked,
  ).length;

  const vehiclesSummaryItems = vehicles.length
    ? [
        {
          label: `${vehicles.length} vehicle${vehicles.length === 1 ? "" : "s"}`,
          tone: "activity" as const,
        },
        {
          label: `${confirmedVehiclesCount} confirmed`,
          tone:
            confirmedVehiclesCount > 0
              ? ("success" as const)
              : ("neutral" as const),
        },
        {
          label:
            vehicles.length === 1
              ? vehicles[0].registrationNumber
              : `${vehicles[0].registrationNumber} +${vehicles.length - 1} more`,
        },
      ]
    : [{ label: "No vehicles yet" }];

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-2 text-sm text-muted-foreground">
            Loading vehicles...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
          <p className="mt-2 text-muted-foreground">{error}</p>
          <Button onClick={fetchVehicles} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-4 pb-24 md:pb-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">My Vehicles</h1>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/onboarding/add-vehicle">
            <Plus className="mr-2 h-4 w-4" />
            Add Vehicle
          </Link>
        </Button>
      </div>

      <DashboardCollapsiblePanel
        panelId="vehicles-list"
        title="Vehicle list"
        description="Review your saved vehicles and open one when you need to edit or confirm it."
        tone="success"
        openLabel="Hide vehicles"
        closedLabel="Show vehicles"
        summaryItems={vehiclesSummaryItems}
      >
        {vehicles.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Car className="h-16 w-16 text-muted-foreground" />
              <p className="mt-4 text-lg font-medium text-muted-foreground">
                No vehicles yet
              </p>
              <p className="text-sm text-muted-foreground">
                Add your first vehicle to start tracking expenses
              </p>
              <Button asChild className="mt-6">
                <Link href="/onboarding/add-vehicle">Add Vehicle</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {vehicles.map((vehicle) => (
              <Card
                key={vehicle.id}
                className={cn(
                  "relative",
                  vehicle.isLocked && "border-amber-500/50",
                )}
              >
                {/* Lock indicator */}
                {vehicle.isLocked && (
                  <div className="absolute top-3 right-3">
                    <Badge
                      variant="outline"
                      className="border-amber-500/30 bg-amber-500/10 text-amber-600"
                    >
                      <Lock className="mr-1 h-3 w-3" />
                      Confirmed
                    </Badge>
                  </div>
                )}

                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    {vehicle.nickname || `${vehicle.make} ${vehicle.model}`}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </p>
                    <p className="text-sm font-medium">
                      {vehicle.registrationNumber}
                    </p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {vehicle.fuelType ? vehicle.fuelType.toLowerCase().replace("_", " ") : "N/A"}
                    </p>
                  </div>

                  {/* Image count indicator */}
                  {(vehicle.imageCount ?? 0) > 0 && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <ImageIcon className="h-3 w-3" />
                      <span>
                        {vehicle.imageCount} image
                        {vehicle.imageCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="border-t border-border/50 pt-2">
                    <EntryActions
                      entryId={vehicle.id}
                      entryType="vehicle"
                      isLocked={vehicle.isLocked ?? false}
                      lockedAt={vehicle.lockedAt}
                      lockedByName={vehicle.lockedByName}
                      lockedReason={vehicle.lockedReason}
                      onEdit={() =>
                        router.push(`/dashboard/vehicles/${vehicle.id}/edit`)
                      }
                      onDelete={() => handleDeleteVehicle(vehicle.id)}
                      onLock={(reason) => handleLockVehicle(vehicle.id, reason)}
                      onUnlock={() => handleUnlockVehicle(vehicle.id)}
                      variant="icons"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DashboardCollapsiblePanel>
    </div>
  );
}
