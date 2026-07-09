'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { Fuel, Camera, MapPin, CalendarIcon } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FuelType, FUEL_TYPE_LABELS, formatZAR } from '@/lib/types/database'
import { saveFuelLogOdometer } from '@/lib/hooks/use-tyre-rotation-warnings'
import { api } from '@/lib/api/client'
import { ReceiptSupportProps } from './form-types'
import { EntryImageManager } from '@/components/entries/entry-image-manager'
import { API_URL } from '@/lib/api/client'

const fuelLogSchema = z.object({
  vehicleId: z.string().optional(),
  fuelType: z.nativeEnum(FuelType),
  date: z.date({ required_error: 'Select a date' }),
  liters: z.coerce.number().positive('Enter liters'),
  pricePerLiter: z.coerce.number().positive('Enter price'),
  odometerReading: z.coerce.number().int().min(0, 'Enter odometer'),
  fullTank: z.boolean().default(true),
  stationName: z.string().optional(),
  stationLocation: z.string().optional(),
})

type FuelLogInput = z.infer<typeof fuelLogSchema>

interface GpsPosition {
  latitude: number
  longitude: number
  accuracy: number
}

interface Vehicle {
  id: string
  registrationNumber: string
  make: string
  model: string
  fuelType: FuelType
  currentOdometer: number
}

interface FuelLogFormProps extends ReceiptSupportProps {
  vehicles: Vehicle[]
  onSubmit: (data: FuelLogInput, receiptImage?: File, gpsPosition?: GpsPosition) => Promise<void>
  initialData?: Partial<FuelLogInput>
}

// Helper function to get available fuel types based on vehicle fuel type
function getAvailableFuelTypes(vehicleFuelType: FuelType | undefined): FuelType[] {
  // If no fuel type provided, return all fuel types
  if (!vehicleFuelType) {
    return Object.values(FuelType)
  }

  // Determine fuel category based on vehicle's fuel type
  const fuelTypeStr = vehicleFuelType.toString()

  if (fuelTypeStr.startsWith('PETROL')) {
    return [FuelType.PETROL_UNLEADED_93, FuelType.PETROL_UNLEADED_95]
  }

  if (fuelTypeStr.startsWith('DIESEL')) {
    return [FuelType.DIESEL_10PPM, FuelType.DIESEL_50PPM, FuelType.DIESEL_500PPM]
  }

  // Default to all fuel types if can't determine
  return Object.values(FuelType)
}

export function FuelLogForm({ vehicles, onSubmit, initialData, mode = 'create', existingImages = [], entryId, onImageUpload, onImageDelete, onImageReupload, onImageLock }: FuelLogFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [receiptImage, setReceiptImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [lastOdometerReadings, setLastOdometerReadings] = useState<Record<string, number>>({})
  const [gpsPosition, setGpsPosition] = useState<GpsPosition | null>(null)
  const [isCapturingGps, setIsCapturingGps] = useState(false)

  // Set preview from existing images when in edit mode
  useEffect(() => {
    console.log('FuelLogForm - useEffect triggered:', { mode, existingImagesLength: existingImages.length });
    if (mode === 'edit' && existingImages.length > 0) {
      const firstImage = existingImages[0]
      console.log('FuelLogForm - Setting previewUrl from:', firstImage);
      setPreviewUrl(firstImage.imageUrl)
    }
  }, [mode, existingImages])

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FuelLogInput>({
    resolver: zodResolver(fuelLogSchema),
    defaultValues: initialData || {
      fullTank: true,
      vehicleId: vehicles[0]?.id || '',
      fuelType: vehicles[0]?.fuelType || FuelType.PETROL_UNLEADED_95,
      date: new Date(),
      odometerReading: vehicles[0]?.currentOdometer || 0,
    },
  })

  const selectedVehicleId = watch('vehicleId')
  const liters = watch('liters')
  const pricePerLiter = watch('pricePerLiter')

  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId)
  const availableFuelTypes = selectedVehicle
    ? getAvailableFuelTypes(selectedVehicle.fuelType)
    : Object.values(FuelType)
  const totalAmount = liters && pricePerLiter ? liters * pricePerLiter : 0

  // Fetch last odometer reading for each vehicle on mount (only for create mode)
  useEffect(() => {
    if (mode === 'edit') return; // Don't fetch last odometer in edit mode
    
    const fetchLastOdometerReadings = async () => {
      const readings: Record<string, number> = {}
      for (const vehicle of vehicles) {
        try {
          // Fetch all expenses for this vehicle, then filter to fuel logs client-side
          const response = await api.get(`/expenses?vehicleId=${vehicle.id}`)
          const expenses = (response.data || []).filter((e: any) => e.category === 'FUEL_LOG')
          if (expenses.length > 0) {
            // Find the expense with the highest odometer reading
            const lastExpense = expenses.reduce((prev: any, current: any) => {
              return (current.odometerReading || 0) > (prev.odometerReading || 0) ? current : prev
            })
            readings[vehicle.id] = lastExpense.odometerReading || vehicle.currentOdometer || 0
          } else {
            readings[vehicle.id] = vehicle.currentOdometer || 0
          }
        } catch (error) {
          console.error(`Failed to fetch last odometer for vehicle ${vehicle.id}:`, error)
          readings[vehicle.id] = vehicle.currentOdometer || 0
        }
      }
      setLastOdometerReadings(readings)
    }

    if (vehicles.length > 0) {
      fetchLastOdometerReadings()
    }
  }, [vehicles, mode])

  // Update odometer when vehicle changes to use vehicle's current odometer (only in create mode)
  useEffect(() => {
    if (mode === 'edit') return; // Don't change odometer in edit mode
    
    if (selectedVehicleId) {
      const vehicle = vehicles.find(v => v.id === selectedVehicleId)
      if (vehicle) {
        setValue('odometerReading', vehicle.currentOdometer || 0)
      }
    }
  }, [selectedVehicleId, vehicles, setValue, mode])

  // Update fuel type when vehicle changes
  const handleVehicleChange = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId)
    if (vehicle) {
      setValue('vehicleId', vehicleId)
      // Get available fuel types for this vehicle and set to first one
      const available = getAvailableFuelTypes(vehicle.fuelType)
      setValue('fuelType', available[0] || vehicle.fuelType)
      // Only set odometer to vehicle's current odometer in create mode
      if (mode === 'create') {
        setValue('odometerReading', vehicle.currentOdometer || 0)
      }
    }
  }

  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setReceiptImage(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const captureGps = async () => {
    if (!navigator.geolocation) {
      return
    }
    setIsCapturingGps(true)
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        })
      })
      setGpsPosition({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy
      })
    } catch (error) {
      console.error('GPS capture failed:', error)
    } finally {
      setIsCapturingGps(false)
    }
  }

  const clearGps = () => {
    setGpsPosition(null)
  }

  const handleFormSubmit = async (data: FuelLogInput) => {
    setIsSubmitting(true)
    try {
      await onSubmit(
        data,
        mode === 'create' ? receiptImage || undefined : undefined,
        gpsPosition || undefined
      )
      
      // Save fuel log odometer to trigger tyre rotation check
      // This will update any active tyre rotation tracking for this vehicle
      if (data.vehicleId) {
        saveFuelLogOdometer(data.vehicleId, data.odometerReading, data.date)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Vehicle Selection */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Fuel className="h-5 w-5 text-chart-1" />
            Fuel Purchase
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Vehicle */}
          {mode === 'create' ? (
            <div className="space-y-2">
              <Label htmlFor="vehicleId">Vehicle</Label>
              <Select
                value={selectedVehicleId}
                onValueChange={handleVehicleChange}
              >
                <SelectTrigger id="vehicleId" className="h-12 touch-target">
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.registrationNumber} - {vehicle.make} {vehicle.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.vehicleId && (
                <p className="text-sm text-destructive">{errors.vehicleId.message}</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Vehicle</Label>
              <div className="h-12 px-3 flex items-center rounded-md border border-input bg-muted text-sm">
                {(() => {
                  const vehicle = initialData?.vehicleId ? vehicles.find(v => v.id === initialData.vehicleId) : null;
                  return vehicle ? `${vehicle.registrationNumber} - ${vehicle.make} ${vehicle.model}` : 'Unknown';
                })()}
              </div>
            </div>
          )}

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant="outline"
                  className={cn(
                    'w-full h-12 touch-target justify-start text-left font-normal',
                    !watch('date') && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {watch('date') ? format(watch('date'), 'PPP') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={watch('date')}
                  onSelect={(date) => setValue('date', date || new Date())}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {errors.date && (
              <p className="text-sm text-destructive">{errors.date.message}</p>
            )}
          </div>

          {/* Fuel Type */}
          <div className="space-y-2">
            <Label htmlFor="fuelType">Fuel Type</Label>
            <Select
              value={watch('fuelType')}
              onValueChange={(value) => setValue('fuelType', value as FuelType)}
            >
              <SelectTrigger id="fuelType" className="h-12 touch-target">
                <SelectValue placeholder="Select fuel type" />
              </SelectTrigger>
              <SelectContent>
                {availableFuelTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {FUEL_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Liters and Price - Side by side */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="liters">Liters</Label>
              <Input
                id="liters"
                {...register('liters')}
                type="number"
                inputMode="decimal"
                step="0.001"
                placeholder="45.5"
                className="h-12 touch-target text-lg"
              />
              {errors.liters && (
                <p className="text-sm text-destructive">{errors.liters.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="pricePerLiter">Price/L (R)</Label>
              <Input
                id="pricePerLiter"
                {...register('pricePerLiter')}
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="24.99"
                className="h-12 touch-target text-lg"
              />
              {errors.pricePerLiter && (
                <p className="text-sm text-destructive">{errors.pricePerLiter.message}</p>
              )}
            </div>
          </div>

          {/* Total Amount Display */}
          {totalAmount > 0 && (
            <div className="rounded-lg bg-muted p-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Amount</span>
                <span className="text-2xl font-bold">{formatZAR(totalAmount)}</span>
              </div>
            </div>
          )}

          {/* Odometer */}
          <div className="space-y-2">
            <Label htmlFor="odometerReading">Odometer (km)</Label>
            <Input
              id="odometerReading"
              {...register('odometerReading', { valueAsNumber: true })}
              type="number"
              inputMode="numeric"
              value={watch('odometerReading') || ''}
              onChange={(e) => setValue('odometerReading', parseInt(e.target.value) || 0)}
              className="h-12 touch-target text-lg"
            />
            {errors.odometerReading && (
              <p className="text-sm text-destructive">{errors.odometerReading.message}</p>
            )}
            {selectedVehicle && (
              <p className="text-xs text-muted-foreground">
                Current: {selectedVehicle.currentOdometer.toLocaleString()} km
              </p>
            )}
          </div>

          {/* Full Tank Toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <Label htmlFor="fullTank" className="text-base">Full Tank</Label>
              <p className="text-sm text-muted-foreground">
                Enable for accurate efficiency calculation
              </p>
            </div>
            <Switch
              id="fullTank"
              checked={watch('fullTank')}
              onCheckedChange={(checked) => setValue('fullTank', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Station Details */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-5 w-5 text-muted-foreground" />
            Station Details (Optional)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="stationName">Station Name</Label>
            <Input
              id="stationName"
              {...register('stationName')}
              placeholder="e.g., Shell, Engen, Sasol"
              className="h-12 touch-target"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stationLocation">Location</Label>
            <Input
              id="stationLocation"
              {...register('stationLocation')}
              placeholder="e.g., N1 Highway, Johannesburg"
              className="h-12 touch-target"
            />
          </div>

          {/* GPS Capture - Optional */}
          <div className="space-y-2">
            <Label>GPS Coordinates (Optional)</Label>
            {gpsPosition ? (
              <div className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-green-600 font-medium">GPS Captured</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearGps}
                    className="h-8 text-muted-foreground"
                  >
                    Clear
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Lat: {gpsPosition.latitude.toFixed(6)}</p>
                  <p>Lng: {gpsPosition.longitude.toFixed(6)}</p>
                  <p>Accuracy: ±{Math.round(gpsPosition.accuracy)}m</p>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={captureGps}
                disabled={isCapturingGps}
                className="w-full h-12 touch-target"
              >
                <MapPin className="h-4 w-4 mr-2" />
                {isCapturingGps ? 'Capturing GPS...' : 'Capture GPS Location'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Receipt Image Card */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Camera className="h-5 w-5 text-muted-foreground" />
            Receipt Image (Optional)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {previewUrl ? (
            <div className="relative">
              <img
                src={previewUrl}
                alt="Receipt preview"
                className="w-full max-h-48 object-contain rounded-lg bg-muted"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => {
                  setReceiptImage(null)
                  setPreviewUrl(null)
                }}
              >
                Remove
              </Button>
            </div>
          ) : (
            <label htmlFor="receiptImage" className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-muted-foreground transition-colors">
              <Camera className="h-8 w-8 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground">Tap to capture or upload</span>
              <input
                id="receiptImage"
                name="receiptImage"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageCapture}
                className="hidden"
              />
            </label>
          )}
        </CardContent>
      </Card>

      {/* Submit Button */}
      <Button
        type="submit"
        size="lg"
        className="w-full h-14 text-lg touch-target-lg"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Saving...' : 'Save Fuel Log'}
      </Button>

      {/* Receipt Images Manager for Edit Mode */}
      {mode === 'edit' && entryId && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Camera className="h-5 w-5 text-chart-1" />
              Receipt Images
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Attach or manage receipt images for this expense.
            </p>
          </CardHeader>
          <CardContent>
            {onImageUpload && onImageDelete && onImageReupload && onImageLock ? (
              <EntryImageManager
                entryId={entryId}
                entryType="EXPENSE"
                images={existingImages}
                onUpload={onImageUpload}
                onDelete={onImageDelete}
                onReupload={onImageReupload}
                onLock={onImageLock}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Image management not available</p>
            )}
          </CardContent>
        </Card>
      )}
    </form>
  )
}
