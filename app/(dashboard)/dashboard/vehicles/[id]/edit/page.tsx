"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
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
  
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
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
                  type="number"
                  value={formData.year}
                  onChange={(e) => handleInputChange("year", e.target.value)}
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
                <Input
                  id="currentOdometer"
                  type="number"
                  value={formData.currentOdometer}
                  onChange={(e) => handleInputChange("currentOdometer", e.target.value)}
                  required
                  placeholder="e.g., 50000"
                />
              </div>
              
              <div>
                <Label htmlFor="licenseExpiry">License Expiry</Label>
                <Input
                  id="licenseExpiry"
                  type="date"
                  value={formData.licenseExpiry}
                  onChange={(e) => handleInputChange("licenseExpiry", e.target.value)}
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
