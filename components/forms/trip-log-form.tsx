"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, Palmtree, MapPin, Navigation, Car } from "lucide-react";
import { cn } from "@/lib/utils";

interface TripLogFormProps {
  vehicleId?: string;
  onSubmit?: (data: TripFormData) => Promise<void>;
  onCancel?: () => void;
}

interface TripFormData {
  vehicleId: string;
  tripDate: string;
  startOdometer: number;
  endOdometer: number;
  tripPurpose: "BUSINESS" | "PRIVATE";
  startLocation: string;
  endLocation: string;
  description?: string;
  projectCode?: string;
  clientName?: string;
}

interface VehicleOption {
  id: string;
  registration: string;
  make: string;
  model: string;
}

export function TripLogForm({ vehicleId, onSubmit, onCancel }: TripLogFormProps) {
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tripPurpose, setTripPurpose] = useState<"BUSINESS" | "PRIVATE">("BUSINESS");
  useEffect(() => {
    api.get("/vehicles").then(({ data }) => {
      const list = Array.isArray(data) ? data : [];
      setVehicles(
        list.map((v: { id: string; registrationNumber: string; make: string; model: string }) => ({
          id: v.id,
          registration: v.registrationNumber,
          make: v.make,
          model: v.model,
        }))
      );
    }).catch(console.error);
  }, []);

  const [formData, setFormData] = useState({
    vehicleId: vehicleId || "",
    tripDate: new Date().toISOString().split("T")[0],
    startOdometer: "",
    endOdometer: "",
    startLocation: "",
    endLocation: "",
    description: "",
    projectCode: "",
    clientName: "",
  });

  const distanceTraveled = formData.endOdometer && formData.startOdometer
    ? Number(formData.endOdometer) - Number(formData.startOdometer)
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSubmit) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        ...formData,
        vehicleId: formData.vehicleId,
        startOdometer: Number(formData.startOdometer),
        endOdometer: Number(formData.endOdometer),
        tripPurpose,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* SARS Trip Purpose Toggle - Most Important */}
      <Card className="border-2 border-primary/20 bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Car className="h-5 w-5 text-primary" />
            SARS Trip Classification
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Required for SARS logbook compliance
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setTripPurpose("BUSINESS")}
              className={cn(
                "flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all",
                "min-h-[120px] touch-manipulation",
                tripPurpose === "BUSINESS"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card hover:border-primary/50"
              )}
            >
              <Briefcase className={cn(
                "h-10 w-10 mb-2",
                tripPurpose === "BUSINESS" ? "text-primary" : "text-muted-foreground"
              )} />
              <span className="font-semibold text-lg">Business</span>
              <span className="text-xs text-muted-foreground mt-1">Tax Deductible</span>
            </button>
            <button
              type="button"
              onClick={() => setTripPurpose("PRIVATE")}
              className={cn(
                "flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all",
                "min-h-[120px] touch-manipulation",
                tripPurpose === "PRIVATE"
                  ? "border-amber-500 bg-amber-500/10 text-amber-500"
                  : "border-border bg-card hover:border-amber-500/50"
              )}
            >
              <Palmtree className={cn(
                "h-10 w-10 mb-2",
                tripPurpose === "PRIVATE" ? "text-amber-500" : "text-muted-foreground"
              )} />
              <span className="font-semibold text-lg">Private</span>
              <span className="text-xs text-muted-foreground mt-1">Personal Use</span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Vehicle Selection */}
      <div className="space-y-2">
        <Label htmlFor="vehicle" className="text-base font-medium">
          Vehicle
        </Label>
        <Select
          value={formData.vehicleId}
          onValueChange={(value) => setFormData({ ...formData, vehicleId: value })}
        >
          <SelectTrigger id="vehicle" className="h-14 text-base">
            <SelectValue placeholder="Select vehicle" />
          </SelectTrigger>
          <SelectContent>
            {vehicles.map((vehicle) => (
              <SelectItem key={vehicle.id} value={vehicle.id} className="py-3">
                <div className="flex flex-col">
                  <span className="font-medium">{vehicle.registration}</span>
                  <span className="text-sm text-muted-foreground">
                    {vehicle.make} {vehicle.model}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Trip Date */}
      <div className="space-y-2">
        <Label htmlFor="tripDate" className="text-base font-medium">
          Trip Date
        </Label>
        <Input
          id="tripDate"
          type="date"
          value={formData.tripDate}
          onChange={(e) => setFormData({ ...formData, tripDate: e.target.value })}
          className="h-14 text-base"
          required
        />
      </div>

      {/* Odometer Readings */}
      <Card className="bg-muted/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Navigation className="h-4 w-4" />
            Odometer Readings (km)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startOdometer" className="text-sm">
                Start (km)
              </Label>
              <Input
                id="startOdometer"
                type="number"
                inputMode="numeric"
                placeholder="e.g., 45000"
                value={formData.startOdometer}
                onChange={(e) => setFormData({ ...formData, startOdometer: e.target.value })}
                className="h-14 text-lg font-mono"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endOdometer" className="text-sm">
                End (km)
              </Label>
              <Input
                id="endOdometer"
                type="number"
                inputMode="numeric"
                placeholder="e.g., 45150"
                value={formData.endOdometer}
                onChange={(e) => setFormData({ ...formData, endOdometer: e.target.value })}
                className="h-14 text-lg font-mono"
                required
              />
            </div>
          </div>
          
          {/* Distance Summary */}
          {distanceTraveled > 0 && (
            <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
              <span className="text-sm font-medium">Distance Traveled</span>
              <span className="text-xl font-bold text-primary">
                {distanceTraveled.toLocaleString()} km
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Locations */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="startLocation" className="text-base font-medium flex items-center gap-2">
            <MapPin className="h-4 w-4 text-green-500" />
            Start Location
          </Label>
          <Input
            id="startLocation"
            type="text"
            placeholder="e.g., Office - Sandton"
            value={formData.startLocation}
            onChange={(e) => setFormData({ ...formData, startLocation: e.target.value })}
            className="h-14 text-base"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endLocation" className="text-base font-medium flex items-center gap-2">
            <MapPin className="h-4 w-4 text-red-500" />
            End Location
          </Label>
          <Input
            id="endLocation"
            type="text"
            placeholder="e.g., Client Site - Pretoria"
            value={formData.endLocation}
            onChange={(e) => setFormData({ ...formData, endLocation: e.target.value })}
            className="h-14 text-base"
            required
          />
        </div>
      </div>

      {/* Business Trip Details (only shown for business trips) */}
      {tripPurpose === "BUSINESS" && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Business Trip Details</CardTitle>
            <p className="text-sm text-muted-foreground">
              Optional but recommended for SARS documentation
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clientName" className="text-sm">
                Client / Company Name
              </Label>
              <Input
                id="clientName"
                type="text"
                placeholder="e.g., ABC Construction"
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="projectCode" className="text-sm">
                Project / Job Code
              </Label>
              <Input
                id="projectCode"
                type="text"
                placeholder="e.g., PRJ-2024-001"
                value={formData.projectCode}
                onChange={(e) => setFormData({ ...formData, projectCode: e.target.value })}
                className="h-12"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description" className="text-base font-medium">
          Trip Description
        </Label>
        <Textarea
          id="description"
          placeholder="Brief description of the trip purpose..."
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="min-h-[100px] text-base resize-none"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex-1 h-14 text-base"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={isSubmitting || !formData.vehicleId || !formData.startOdometer || !formData.endOdometer}
          className="flex-1 h-14 text-base font-semibold"
        >
          {isSubmitting ? "Saving..." : "Log Trip"}
        </Button>
      </div>
    </form>
  );
}
