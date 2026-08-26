"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, Save, Loader2, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { api } from "@/lib/api/client";
import { Vehicle, FuelType } from "@/lib/types/database";

export default function EditVehiclePage() {
  const router = useRouter();
  const params = useParams();
  const vehicleId = params.id as string;
  const searchParams = useSearchParams();
  const fromOdometerDrift = searchParams.get('from') === 'odometer-drift';
  
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [showDriftWarning, setShowDriftWarning] = useState(fromOdometerDrift);
  
  const [formData, setFormData] = useState({
    make: "",
    model: "",
    year: "",
    registrationNumber: "",
    vin: "",
    nickname: "",
    color: "",
    fuelType: "" as FuelType | "",
    tankCapacityLiters: "",
    currentOdometer: "",
    licenseExpiry: "",
    insurancePolicyNumber: "",
    trackerSerial: "",
    notes: "",
    minorServiceIntervalKm: "",
    majorServiceIntervalKm: "",
    brakeOverhaulIntervalKm: "",
    minorServiceIntervalMonths: "",
    majorServiceIntervalMonths: "",
    brakeOverhaulIntervalMonths: "",
  });

  useEffect(() => {
    const fetchVehicle = async () => {
      try {
        const { data } = await api.get(`/vehicles/${vehicleId}`);
        
        if (data.isLocked) {
          alert("This vehicle is locked and cannot be edited.");
          router.push("/dashboard/vehicles");
          return;
        }
        
        setVehicle(data);
        
        // Map specific fuel type to simple category for display
        const fuelTypeToCategory: Record<string, string> = {
          "DIESEL_10PPM": "DIESEL",
          "DIESEL_50PPM": "DIESEL",
          "DIESEL_500PPM": "DIESEL",
          "PETROL_UNLEADED_93": "PETROL",
          "PETROL_UNLEADED_95": "PETROL",
        };
        const fuelCategory = fuelTypeToCategory[data.fuelType || ""] || data.fuelType || "";
        
        setFormData({
          make: data.make || "",
          model: data.model || "",
          year: data.year?.toString() || "",
          registrationNumber: data.registrationNumber || "",
          vin: data.vin || "",
          nickname: data.nickname || "",
          color: data.color || "",
          fuelType: fuelCategory,
          tankCapacityLiters: data.tankCapacityLiters?.toString() || "",
          currentOdometer: data.currentOdometer?.toString() || "",
          licenseExpiry: data.licenseExpiry ? format(new Date(data.licenseExpiry), "yyyy-MM-dd") : "",
          insurancePolicyNumber: data.insurancePolicyNumber || "",
          trackerSerial: data.trackerSerial || "",
          notes: data.notes || "",
          minorServiceIntervalKm: data.minorServiceIntervalKm?.toString() || "",
          majorServiceIntervalKm: data.majorServiceIntervalKm?.toString() || "",
          brakeOverhaulIntervalKm: data.brakeOverhaulIntervalKm?.toString() || "",
          minorServiceIntervalMonths: data.minorServiceIntervalMonths?.toString() || "",
          majorServiceIntervalMonths: data.majorServiceIntervalMonths?.toString() || "",
          brakeOverhaulIntervalMonths: data.brakeOverhaulIntervalMonths?.toString() || "",
        });
      } catch (error) {
        console.error("Error fetching vehicle:", error);
        router.push("/dashboard/vehicles");
      } finally {
        setLoading(false);
      }
    };

    fetchVehicle();
  }, [vehicleId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Map simple fuel category to default specific fuel type
      const fuelTypeMap: Record<string, string> = {
        "DIESEL": "DIESEL_50PPM",
        "PETROL": "PETROL_UNLEADED_95",
      };
      const mappedFuelType = fuelTypeMap[formData.fuelType] || formData.fuelType;

      const updateData = {
        make: formData.make,
        model: formData.model,
        year: parseInt(formData.year),
        registrationNumber: formData.registrationNumber,
        vin: formData.vin || null,
        nickname: formData.nickname || null,
        color: formData.color || null,
        fuelType: mappedFuelType,
        tankCapacityLiters: formData.tankCapacityLiters ? parseFloat(formData.tankCapacityLiters) : null,
        currentOdometer: parseInt(formData.currentOdometer),
        licenseExpiry: formData.licenseExpiry || null,
        insurancePolicyNumber: formData.insurancePolicyNumber || null,
        trackerSerial: formData.trackerSerial || null,
        notes: formData.notes || null,
        minorServiceIntervalKm: formData.minorServiceIntervalKm ? parseInt(formData.minorServiceIntervalKm) : null,
        majorServiceIntervalKm: formData.majorServiceIntervalKm ? parseInt(formData.majorServiceIntervalKm) : null,
        brakeOverhaulIntervalKm: formData.brakeOverhaulIntervalKm ? parseInt(formData.brakeOverhaulIntervalKm) : null,
        minorServiceIntervalMonths: formData.minorServiceIntervalMonths ? parseInt(formData.minorServiceIntervalMonths) : null,
        majorServiceIntervalMonths: formData.majorServiceIntervalMonths ? parseInt(formData.majorServiceIntervalMonths) : null,
        brakeOverhaulIntervalMonths: formData.brakeOverhaulIntervalMonths ? parseInt(formData.brakeOverhaulIntervalMonths) : null,
      };

      await api.put(`/vehicles/${vehicleId}`, updateData);
      router.push("/dashboard/vehicles");
    } catch (error) {
      console.error("Error updating vehicle:", error);
      alert("Failed to update vehicle. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRecalculateOdometer = async () => {
    if (!confirm("This will recalculate the vehicle's stored odometer baseline to match the highest odometer reading from all expenses. Continue?")) {
      return;
    }

    setRecalculating(true);
    try {
      const { data } = await api.post(`/vehicles/${vehicleId}/recalculate-odometer`, {});
      setVehicle(data);
      setFormData(prev => ({
        ...prev,
        currentOdometer: data.currentOdometer?.toString() || ""
      }));
      setShowDriftWarning(false);
      alert("Odometer recalculated successfully!");
    } catch (error) {
      console.error("Error recalculating odometer:", error);
      alert("Failed to recalculate odometer. Please try again.");
    } finally {
      setRecalculating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>Vehicle not found</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Edit Vehicle</h1>
      </div>

      {showDriftWarning && (
        <div className="mb-6 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4 animate-pulse">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-1">Odometer Drift Detected</h3>
              <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">
                This vehicle's stored odometer differs from the calculated value based on expenses. Click the <strong>Recalculate Odometer</strong> button below to sync the stored value with the highest odometer reading from all expenses.
              </p>
              <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300">
                <span className="font-medium">Look for the</span>
                <RefreshCw className="h-4 w-4" />
                <span className="font-medium">button in the Current Odometer field</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Vehicle Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="make">Make *</Label>
                <Input
                  id="make"
                  value={formData.make}
                  onChange={(e) => handleInputChange("make", e.target.value)}
                  required
                  placeholder="e.g., Toyota"
                />
              </div>
              
              <div>
                <Label htmlFor="model">Model *</Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) => handleInputChange("model", e.target.value)}
                  required
                  placeholder="e.g., Hilux"
                />
              </div>
              
              <div>
                <Label htmlFor="year">Year *</Label>
                <Input
                  id="year"
                  type="text"
                  inputMode="numeric"
                  pattern="\d{4}"
                  value={formData.year}
                  onChange={(e) => handleInputChange("year", e.target.value.replace(/\D/g, '').slice(0, 4))}
                  required
                  placeholder="e.g., 2023"
                />
              </div>
              
              <div>
                <Label htmlFor="registrationNumber">Registration Number *</Label>
                <Input
                  id="registrationNumber"
                  value={formData.registrationNumber}
                  onChange={(e) => handleInputChange("registrationNumber", e.target.value)}
                  required
                  placeholder="e.g., ABC123GP"
                />
              </div>
              
              <div>
                <Label htmlFor="vin">VIN</Label>
                <Input
                  id="vin"
                  value={formData.vin}
                  onChange={(e) => handleInputChange("vin", e.target.value)}
                  placeholder="Vehicle Identification Number"
                />
              </div>
              
              <div>
                <Label htmlFor="nickname">Nickname</Label>
                <Input
                  id="nickname"
                  value={formData.nickname}
                  onChange={(e) => handleInputChange("nickname", e.target.value)}
                  placeholder="e.g., Company Truck 1"
                />
              </div>
              
              <div>
                <Label htmlFor="color">Color</Label>
                <Input
                  id="color"
                  value={formData.color}
                  onChange={(e) => handleInputChange("color", e.target.value)}
                  placeholder="e.g., White"
                />
              </div>
              
              <div>
                <Label htmlFor="fuelType">Fuel Type *</Label>
                <Select
                  value={formData.fuelType}
                  onValueChange={(value) => handleInputChange("fuelType", value)}
                  name="fuelType"
                >
                  <SelectTrigger id="fuelType">
                    <SelectValue placeholder="Select fuel type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DIESEL">Diesel</SelectItem>
                    <SelectItem value="PETROL">Petrol</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="tankCapacityLiters">Tank Capacity (Liters)</Label>
                <Input
                  id="tankCapacityLiters"
                  type="number"
                  step="0.1"
                  value={formData.tankCapacityLiters}
                  onChange={(e) => handleInputChange("tankCapacityLiters", e.target.value)}
                  placeholder="e.g., 80"
                />
              </div>
              
              <div>
                <Label htmlFor="currentOdometer">Current Odometer (km) *</Label>
                <div className="flex gap-2">
                  <Input
                    id="currentOdometer"
                    type="number"
                    value={formData.currentOdometer}
                    onChange={(e) => handleInputChange("currentOdometer", e.target.value)}
                    required
                    placeholder="e.g., 50000"
                    className={showDriftWarning ? "border-amber-500 ring-2 ring-amber-500/20" : ""}
                  />
                  <Button
                    type="button"
                    variant={showDriftWarning ? "default" : "outline"}
                    size={showDriftWarning ? "default" : "icon"}
                    className={showDriftWarning ? "bg-amber-600 hover:bg-amber-700 text-white animate-pulse" : ""}
                    onClick={handleRecalculateOdometer}
                    disabled={recalculating}
                    title="Recalculate odometer from expenses"
                  >
                    {showDriftWarning ? (
                      <>
                        <RefreshCw className={`h-4 w-4 mr-2 ${recalculating ? 'animate-spin' : ''}`} />
                        {recalculating ? 'Recalculating...' : 'Recalculate Odometer'}
                      </>
                    ) : recalculating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className={`text-xs mt-1 ${showDriftWarning ? "text-amber-700 dark:text-amber-300 font-medium" : "text-muted-foreground"}`}>
                  {showDriftWarning ? "⚠️ Click to fix odometer drift" : "Click refresh to sync with highest odometer from expenses"}
                </p>
              </div>
              
              <div>
                <Label htmlFor="licenseExpiry">License Expiry</Label>
                <Input
                  id="licenseExpiry"
                  type="text"
                  inputMode="numeric"
                  pattern="\d{4}-\d{2}-\d{2}"
                  placeholder="YYYY-MM-DD"
                  value={formData.licenseExpiry}
                  onChange={(e) => {
                    let value = e.target.value;
                    // Remove non-digits and dashes
                    value = value.replace(/[^\d-]/g, '');
                    
                    // Auto-format as YYYY-MM-DD
                    const digits = value.replace(/\D/g, '');
                    if (digits.length > 0) {
                      let formatted = digits.slice(0, 4);
                      if (digits.length > 4) {
                        formatted += '-' + digits.slice(4, 6);
                      }
                      if (digits.length > 6) {
                        formatted += '-' + digits.slice(6, 8);
                      }
                      value = formatted;
                    }
                    
                    // Validate year is 4 digits and within range
                    if (value && value.length >= 4) {
                      const year = parseInt(value.slice(0, 4));
                      if (year < 1900 || year > 2099) {
                        return; // Reject invalid years
                      }
                    }
                    
                    handleInputChange("licenseExpiry", value);
                  }}
                  maxLength={10}
                />
              </div>
              
              <div>
                <Label htmlFor="insurancePolicyNumber">Insurance Policy Number</Label>
                <Input
                  id="insurancePolicyNumber"
                  value={formData.insurancePolicyNumber}
                  onChange={(e) => handleInputChange("insurancePolicyNumber", e.target.value)}
                  placeholder="Insurance policy reference"
                />
              </div>
              
              <div>
                <Label htmlFor="trackerSerial">Tracker Serial</Label>
                <Input
                  id="trackerSerial"
                  value={formData.trackerSerial}
                  onChange={(e) => handleInputChange("trackerSerial", e.target.value)}
                  placeholder="GPS tracker serial number"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                placeholder="Additional notes about the vehicle"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Service Intervals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="minorServiceIntervalKm">Minor Service (km)</Label>
                <Input
                  id="minorServiceIntervalKm"
                  type="number"
                  value={formData.minorServiceIntervalKm}
                  onChange={(e) => handleInputChange("minorServiceIntervalKm", e.target.value)}
                  placeholder="e.g., 15000"
                />
              </div>
              <div>
                <Label htmlFor="majorServiceIntervalKm">Major Service (km)</Label>
                <Input
                  id="majorServiceIntervalKm"
                  type="number"
                  value={formData.majorServiceIntervalKm}
                  onChange={(e) => handleInputChange("majorServiceIntervalKm", e.target.value)}
                  placeholder="e.g., 30000"
                />
              </div>
              <div>
                <Label htmlFor="brakeOverhaulIntervalKm">Brake Overhaul (km)</Label>
                <Input
                  id="brakeOverhaulIntervalKm"
                  type="number"
                  value={formData.brakeOverhaulIntervalKm}
                  onChange={(e) => handleInputChange("brakeOverhaulIntervalKm", e.target.value)}
                  placeholder="e.g., 60000"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="minorServiceIntervalMonths">Minor (months)</Label>
                <Input
                  id="minorServiceIntervalMonths"
                  type="number"
                  value={formData.minorServiceIntervalMonths}
                  onChange={(e) => handleInputChange("minorServiceIntervalMonths", e.target.value)}
                  placeholder="e.g., 12"
                />
              </div>
              <div>
                <Label htmlFor="majorServiceIntervalMonths">Major (months)</Label>
                <Input
                  id="majorServiceIntervalMonths"
                  type="number"
                  value={formData.majorServiceIntervalMonths}
                  onChange={(e) => handleInputChange("majorServiceIntervalMonths", e.target.value)}
                  placeholder="e.g., 24"
                />
              </div>
              <div>
                <Label htmlFor="brakeOverhaulIntervalMonths">Brake (months)</Label>
                <Input
                  id="brakeOverhaulIntervalMonths"
                  type="number"
                  value={formData.brakeOverhaulIntervalMonths}
                  onChange={(e) => handleInputChange("brakeOverhaulIntervalMonths", e.target.value)}
                  placeholder="e.g., 36"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Set custom service intervals for this vehicle. Used to calculate service due alerts.
            </p>
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : <><Save className="mr-2 h-4 w-4" />Save Changes</>}
          </Button>
        </div>
      </form>
    </div>
  );
}
