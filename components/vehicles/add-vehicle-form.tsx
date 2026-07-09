"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Car, AlertCircle } from "lucide-react"
import { apiFetch } from "@/lib/api/client"

// Simplified fuel type categories for vehicle creation
// Maps to specific fuel types in the backend
const VEHICLE_FUEL_CATEGORIES = [
  { value: "PETROL", label: "Petrol", defaultType: "PETROL_UNLEADED_95" },
  { value: "DIESEL", label: "Diesel", defaultType: "DIESEL_50PPM" },
  { value: "ELECTRIC", label: "Electric (Coming Soon)", defaultType: "ELECTRIC", disabled: true },
]

export function AddVehicleForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    nickname: "",
    registrationNumber: "",
    make: "",
    model: "",
    year: new Date().getFullYear().toString(),
    fuelCategory: "",
    color: "",
    vin: "",
    tankCapacityLiters: "",
    licenseExpiry: "",
    insurancePolicyNumber: "",
    trackerSerial: "",
    notes: "",
  })

  const set = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      // Map selected fuel category to default specific fuel type
      const selectedCategory = VEHICLE_FUEL_CATEGORIES.find(c => c.value === form.fuelCategory)
      const fuelType = selectedCategory?.defaultType || "PETROL_UNLEADED_95"

      const response = await apiFetch("/vehicles", {
        method: "POST",
        body: JSON.stringify({
          nickname: form.nickname || null,
          registrationNumber: form.registrationNumber,
          make: form.make,
          model: form.model,
          year: parseInt(form.year),
          fuelType: fuelType,
          color: form.color || null,
          vin: form.vin || null,
          tankCapacityLiters: form.tankCapacityLiters ? parseFloat(form.tankCapacityLiters) : null,
          licenseExpiry: form.licenseExpiry || null,
          insurancePolicyNumber: form.insurancePolicyNumber || null,
          trackerSerial: form.trackerSerial || null,
          notes: form.notes || null,
        }),
      })

      // Handle non-OK responses
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = "Failed to add vehicle"
        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.message || errorMessage
        } catch {
          // If JSON parsing fails, use the raw text or status
          errorMessage = errorText || `HTTP ${response.status}: ${response.statusText}`
        }
        throw new Error(errorMessage)
      }

      // Parse successful response
      const data = await response.json()

      // Must complete odometer check before accessing dashboard
      router.push(`/onboarding/odometer-check/${data.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <div className="flex items-center gap-3 mb-1">
          <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center" suppressHydrationWarning>
            <Car className="h-5 w-5 text-primary" />
          </div>
          <CardTitle className="text-xl">Add Your Vehicle</CardTitle>
        </div>
        <CardDescription>
          You need at least one vehicle to use Vehicle Expense Tracker. You can add optional details later by editing the vehicle at <span className="font-mono text-xs">/dashboard/vehicles</span>.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <span suppressHydrationWarning>
                <AlertCircle className="h-4 w-4" />
              </span>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Nickname */}
          <div className="space-y-2">
            <Label htmlFor="nickname">Nickname <span className="text-muted-foreground">(optional)</span></Label>
            <Input
              id="nickname"
              placeholder='e.g. "My Daily Driver"'
              value={form.nickname}
              onChange={e => set("nickname", e.target.value)}
              className="h-12"
            />
          </div>

          {/* Registration Number */}
          <div className="space-y-2">
            <Label htmlFor="registrationNumber">Registration Number <span className="text-destructive">*</span></Label>
            <Input
              id="registrationNumber"
              placeholder="e.g. CA 123-456"
              value={form.registrationNumber}
              onChange={e => set("registrationNumber", e.target.value.toUpperCase())}
              className="h-12 uppercase"
              required
            />
          </div>

          {/* Make & Model */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="make">Make <span className="text-destructive">*</span></Label>
              <Input
                id="make"
                placeholder="Toyota"
                value={form.make}
                onChange={e => set("make", e.target.value)}
                className="h-12"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">Model <span className="text-destructive">*</span></Label>
              <Input
                id="model"
                placeholder="Hilux"
                value={form.model}
                onChange={e => set("model", e.target.value)}
                className="h-12"
                required
              />
            </div>
          </div>

          {/* Year & Color */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="year">Year <span className="text-destructive">*</span></Label>
              <Input
                id="year"
                type="number"
                min={1980}
                max={2030}
                placeholder="2022"
                value={form.year}
                onChange={e => set("year", e.target.value)}
                className="h-12"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">Colour <span className="text-muted-foreground">(optional)</span></Label>
              <Input
                id="color"
                placeholder="White"
                value={form.color}
                onChange={e => set("color", e.target.value)}
                className="h-12"
              />
            </div>
          </div>

          {/* Fuel Type */}
          <div className="space-y-2">
            <Label htmlFor="fuelCategory">Fuel Type <span className="text-destructive">*</span></Label>
            <Select
              value={form.fuelCategory}
              onValueChange={v => set("fuelCategory", v)}
              name="fuelCategory"
              required
            >
              <SelectTrigger id="fuelCategory" className="h-12">
                <SelectValue placeholder="Select fuel type..." />
              </SelectTrigger>
              <SelectContent>
                {VEHICLE_FUEL_CATEGORIES.map(ft => (
                  <SelectItem
                    key={ft.value}
                    value={ft.value}
                    disabled={ft.disabled}
                    className={ft.disabled ? 'opacity-50 cursor-not-allowed' : ''}
                  >
                    {ft.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Optional Additional Fields */}
          <div className="space-y-4 pt-2 border-t border-border/50">
            <p className="text-xs font-medium text-muted-foreground">Additional Details (Optional)</p>

            {/* VIN */}
            <div className="space-y-2">
              <Label htmlFor="vin">VIN <span className="text-muted-foreground">(optional)</span></Label>
              <Input
                id="vin"
                placeholder="Vehicle Identification Number"
                value={form.vin}
                onChange={e => set("vin", e.target.value)}
                className="h-12"
              />
            </div>

            {/* Tank Capacity */}
            <div className="space-y-2">
              <Label htmlFor="tankCapacityLiters">Tank Capacity (Liters) <span className="text-muted-foreground">(optional)</span></Label>
              <Input
                id="tankCapacityLiters"
                type="number"
                step="0.1"
                placeholder="e.g., 80"
                value={form.tankCapacityLiters}
                onChange={e => set("tankCapacityLiters", e.target.value)}
                className="h-12"
              />
            </div>

            {/* License Expiry */}
            <div className="space-y-2">
              <Label htmlFor="licenseExpiry">License Expiry Date <span className="text-muted-foreground">(optional)</span></Label>
              <Input
                id="licenseExpiry"
                type="date"
                value={form.licenseExpiry}
                onChange={e => set("licenseExpiry", e.target.value)}
                className="h-12"
              />
              <p className="text-xs text-muted-foreground">
                Enter the expiry date of your vehicle's license disc. This helps you track when your license needs renewal.
              </p>
            </div>

            {/* Insurance Policy Number */}
            <div className="space-y-2">
              <Label htmlFor="insurancePolicyNumber">Insurance Policy Number <span className="text-muted-foreground">(optional)</span></Label>
              <Input
                id="insurancePolicyNumber"
                placeholder="Insurance policy reference"
                value={form.insurancePolicyNumber}
                onChange={e => set("insurancePolicyNumber", e.target.value)}
                className="h-12"
              />
            </div>

            {/* Tracker Serial */}
            <div className="space-y-2">
              <Label htmlFor="trackerSerial">Tracker Serial <span className="text-muted-foreground">(optional)</span></Label>
              <Input
                id="trackerSerial"
                placeholder="GPS tracker serial number"
                value={form.trackerSerial}
                onChange={e => set("trackerSerial", e.target.value)}
                className="h-12"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes <span className="text-muted-foreground">(optional)</span></Label>
              <Input
                id="notes"
                placeholder="Additional notes about the vehicle"
                value={form.notes}
                onChange={e => set("notes", e.target.value)}
                className="h-12"
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-12 text-base font-semibold"
            disabled={isLoading || !form.fuelCategory}
          >
            {isLoading ? "Adding Vehicle…" : "Add Vehicle & Continue →"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
