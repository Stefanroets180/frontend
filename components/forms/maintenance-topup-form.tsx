'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { Droplets, Camera, AlertCircle, CheckCircle2, Package, CalendarIcon } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  MaintenanceItemType, 
  MAINTENANCE_ITEM_LABELS, 
  FuelType,
  formatZAR 
} from '@/lib/types/database'
import { 
  processReceiptImage, 
  validateImageFile, 
  formatFileSize 
} from '@/lib/utils/image-converter'
import { ReceiptSupportProps } from './form-types'
import { EntryImageManager } from '@/components/entries/entry-image-manager'
import { API_URL } from '@/lib/api/client'
import { useEffect } from 'react'

const maintenanceTopupSchema = z.object({
  vehicleId: z.string().optional(),
  itemType: z.nativeEnum(MaintenanceItemType),
  date: z.date({ required_error: 'Select a date' }),
  priceZar: z.coerce.number().positive('Enter price'),
  itemBrand: z.string().optional(),
  itemQuantity: z.coerce.number().int().min(1).default(1),
  shopName: z.string().optional(),
  notes: z.string().optional(),
})

type MaintenanceTopupInput = z.infer<typeof maintenanceTopupSchema>

interface Vehicle {
  id: string
  registrationNumber: string
  make: string
  model: string
  fuelType: FuelType
  currentOdometer: number
}

interface MaintenanceTopupFormProps extends ReceiptSupportProps {
  vehicles: Vehicle[]
  onSubmit: (data: MaintenanceTopupInput, receiptImage: File | null) => Promise<void>
  initialData?: Partial<MaintenanceTopupInput>
}

export function MaintenanceTopupForm({ vehicles, onSubmit, initialData, mode = 'create', existingImages = [], entryId, onImageUpload, onImageDelete, onImageReupload, onImageLock }: MaintenanceTopupFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [receiptImage, setReceiptImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [isCompressing, setIsCompressing] = useState(false)
  const [compressionInfo, setCompressionInfo] = useState<{
    originalSize: number
    compressedSize: number
  } | null>(null)

  // Set preview from existing images when in edit mode
  useEffect(() => {
    console.log('MaintenanceTopupForm - useEffect triggered:', { mode, existingImagesLength: existingImages.length });
    if (mode === 'edit' && existingImages.length > 0) {
      const firstImage = existingImages[0]
      console.log('MaintenanceTopupForm - Setting previewUrl from:', firstImage);
      setPreviewUrl(firstImage.imageUrl)
    }
  }, [mode, existingImages])

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<MaintenanceTopupInput>({
    resolver: zodResolver(maintenanceTopupSchema),
    defaultValues: initialData || {
      vehicleId: vehicles[0]?.id || '',
      itemType: MaintenanceItemType.ENGINE_OIL,
      date: new Date(),
      itemQuantity: 1,
    },
  })

  const selectedVehicleId = watch('vehicleId')
  const priceZar = watch('priceZar')

  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImageError(null)
    setCompressionInfo(null)

    // Validate file
    const validation = validateImageFile(file)
    if (!validation.valid) {
      setImageError(validation.error || 'Invalid file')
      return
    }

    setIsCompressing(true)

    try {
      // Process and compress to AVIF
      const result = await processReceiptImage(file)
      
      // Create a new File from the blob
      const compressedFile = new File(
        [result.blob], 
        file.name.replace(/\.[^.]+$/, '.avif'),
        { type: result.format }
      )

      setReceiptImage(compressedFile)
      setPreviewUrl(URL.createObjectURL(result.blob))
      setCompressionInfo({
        originalSize: result.originalSize,
        compressedSize: result.convertedSize,
      })
    } catch (error) {
      setImageError('Failed to process image. Please try again.')
      console.error('Image compression error:', error)
    } finally {
      setIsCompressing(false)
    }
  }

  const handleFormSubmit = async (data: MaintenanceTopupInput) => {
    if (mode === 'create' && !receiptImage) {
      setImageError('Receipt image is required')
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(data, mode === 'create' ? receiptImage : null)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Top-up Details */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Droplets className="h-5 w-5 text-chart-2" />
            Maintenance Top-up (DIY)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Vehicle */}
          {mode === 'create' ? (
            <div className="space-y-2">
              <Label htmlFor="vehicleId">Vehicle</Label>
              <Select
                value={selectedVehicleId}
                onValueChange={(value) => setValue('vehicleId', value)}
                name="vehicleId"
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
              <p className="text-sm font-medium">Vehicle</p>
              <div className="h-12 px-3 flex items-center rounded-md border border-input bg-muted text-sm">
                {(() => {
                  const vehicle = initialData?.vehicleId ? vehicles.find(v => v.id === initialData.vehicleId) : null;
                  return vehicle ? `${vehicle.registrationNumber} - ${vehicle.make} ${vehicle.model}` : 'Unknown';
                })()}
              </div>
            </div>
          )}

          {/* Item Type - Large touch targets */}
          <div className="space-y-2">
            <Label htmlFor="itemType">Item Type</Label>
            <Select
              value={watch('itemType')}
              onValueChange={(value) => setValue('itemType', value as MaintenanceItemType)}
              name="itemType"
            >
              <SelectTrigger id="itemType" className="h-12 touch-target">
                <SelectValue placeholder="Select item type" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(MaintenanceItemType).map((type) => (
                  <SelectItem key={type} value={type} className="py-3">
                    {MAINTENANCE_ITEM_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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

          {/* Price */}
          <div className="space-y-2">
            <Label htmlFor="priceZar">Price (R)</Label>
            <Input
              id="priceZar"
              {...register('priceZar')}
              type="number"
              inputMode="decimal"
              step="0.01"
              placeholder="150.00"
              className="h-12 touch-target text-lg font-semibold"
            />
            {errors.priceZar && (
              <p className="text-sm text-destructive">{errors.priceZar.message}</p>
            )}
          </div>

          {/* Total Display */}
          {priceZar > 0 && (
            <div className="rounded-lg bg-muted p-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Amount</span>
                <span className="text-2xl font-bold">{formatZAR(priceZar)}</span>
              </div>
            </div>
          )}

          {/* Optional Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="itemBrand">Brand (Optional)</Label>
              <Input
                id="itemBrand"
                {...register('itemBrand')}
                placeholder="e.g., Castrol"
                className="h-12 touch-target"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="itemQuantity">Qty</Label>
              <Input
                id="itemQuantity"
                {...register('itemQuantity')}
                type="number"
                inputMode="numeric"
                min="1"
                className="h-12 touch-target"
              />
            </div>
          </div>

          {/* Shop Name */}
          <div className="space-y-2">
            <Label htmlFor="shopName">Shop Name (Optional)</Label>
            <Input
              id="shopName"
              {...register('shopName')}
              placeholder="e.g., AutoZone, Midas"
              className="h-12 touch-target"
            />
          </div>
        </CardContent>
      </Card>

      {mode === 'create' && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Camera className="h-5 w-5 text-chart-2" />
              Capture Receipt
              <span className="text-destructive text-sm font-normal">(Required)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {previewUrl ? (
              <div className="space-y-3">
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
                      setCompressionInfo(null)
                    }}
                  >
                    Remove
                  </Button>
                </div>
                {compressionInfo && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>
                      Compressed: {formatFileSize(compressionInfo.originalSize)} → {formatFileSize(compressionInfo.compressedSize)}
                      ({Math.round((1 - compressionInfo.compressedSize / compressionInfo.originalSize) * 100)}% saved)
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <label htmlFor="receiptImage" className={`
                flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-lg cursor-pointer transition-colors
                ${imageError ? 'border-destructive bg-destructive/5' : 'border-chart-2 hover:border-chart-2/80 hover:bg-chart-2/5'}
              `}>
                {isCompressing ? (
                  <>
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-chart-2 mb-2" />
                    <span className="text-sm text-muted-foreground">Compressing image...</span>
                  </>
                ) : (
                  <>
                    <Camera className="h-10 w-10 text-chart-2 mb-2" />
                    <span className="text-sm font-medium text-foreground">Tap to capture receipt</span>
                    <span className="text-xs text-muted-foreground mt-1">Photo will be compressed automatically</span>
                  </>
                )}
                <input
                  id="receiptImage"
                  name="receiptImage"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageCapture}
                  className="hidden"
                  disabled={isCompressing}
                />
              </label>
            )}
            {imageError && (
              <div className="flex items-center gap-2 mt-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>{imageError}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        size="lg"
        className="w-full h-14 text-lg touch-target-lg"
        disabled={isSubmitting || (mode === 'create' && !receiptImage)}
      >
        {isSubmitting ? 'Saving...' : 'Save Maintenance Top-up'}
      </Button>

      {/* Receipt Images Manager for Edit Mode */}
      {mode === 'edit' && entryId && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Camera className="h-5 w-5 text-chart-2" />
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
