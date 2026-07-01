'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { Camera, AlertCircle, CheckCircle2, CalendarIcon, Receipt } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import { ExpenseCategory, FuelType, formatZAR } from '@/lib/types/database'
import {
  processReceiptImage,
  validateImageFile,
  formatFileSize
} from '@/lib/utils/image-converter'

const simpleExpenseSchema = z.object({
  vehicleId: z.string().min(1, 'Select a vehicle'),
  date: z.date({ required_error: 'Select a date' }),
  amount: z.coerce.number().positive('Enter amount'),
  supplierName: z.string().optional(),
  description: z.string().optional(),
})

type SimpleExpenseInput = z.infer<typeof simpleExpenseSchema>

interface Vehicle {
  id: string
  registrationNumber: string
  make: string
  model: string
  fuelType: FuelType
  currentOdometer: number
}

interface SimpleExpenseFormProps {
  vehicles: Vehicle[]
  category: ExpenseCategory
  categoryLabel: string
  categoryIcon?: React.ReactNode
  onSubmit: (data: SimpleExpenseInput, receiptImage: File) => Promise<void>
  showVehicle?: boolean
}

const categoryDescriptions: Record<string, string> = {
  INSURANCE_PREMIUM: 'Vehicle insurance premium payment',
  VEHICLE_TRACKING: 'Vehicle tracking subscription payment',
  ETOLL_SANRAL: 'E-toll account payment',
  LICENSE_RENEWAL: 'Vehicle license disc renewal',
  ROADWORTHY: 'Roadworthy certificate testing',
  OTHER_FIXED: 'Other fixed vehicle expense',
  PERSONAL_LICENSE: 'Personal driver license renewal',
}

const categoryPlaceholders: Record<string, { supplier: string; description: string }> = {
  INSURANCE_PREMIUM: { supplier: 'e.g., OUTsurance, Discovery', description: 'e.g., Monthly premium, Annual renewal' },
  VEHICLE_TRACKING: { supplier: 'e.g., Tracker, Cartrack', description: 'e.g., Monthly subscription' },
  ETOLL_SANRAL: { supplier: 'SANRAL', description: 'e.g., Monthly e-toll payment' },
  LICENSE_RENEWAL: { supplier: 'e.g., Post Office, Online', description: 'e.g., Vehicle license renewal' },
  ROADWORTHY: { supplier: 'e.g., Testing Station Name', description: 'e.g., Roadworthy certificate test' },
  OTHER_FIXED: { supplier: 'e.g., Service Provider', description: 'e.g., Parking, Tolls, Other' },
  PERSONAL_LICENSE: { supplier: 'e.g., DLTC', description: 'e.g., Driver license renewal' },
}

export function SimpleExpenseForm({
  vehicles,
  category,
  categoryLabel,
  categoryIcon,
  onSubmit,
  showVehicle = true,
}: SimpleExpenseFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [receiptImage, setReceiptImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [isCompressing, setIsCompressing] = useState(false)
  const [compressionInfo, setCompressionInfo] = useState<{
    originalSize: number
    compressedSize: number
  } | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SimpleExpenseInput>({
    resolver: zodResolver(simpleExpenseSchema),
    defaultValues: {
      vehicleId: vehicles[0]?.id || '',
      date: new Date(),
      supplierName: '',
      description: '',
    },
  })

  const selectedVehicleId = watch('vehicleId')
  const date = watch('date')
  const amount = watch('amount')
  const placeholders = categoryPlaceholders[category] || { supplier: 'Supplier name', description: 'Description' }

  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImageError(null)
    setCompressionInfo(null)

    const validation = validateImageFile(file)
    if (!validation.valid) {
      setImageError(validation.error || 'Invalid file')
      return
    }

    setIsCompressing(true)

    try {
      const result = await processReceiptImage(file)
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
      console.error('Image compression error:', error)
      setImageError(`Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`)
    } finally {
      setIsCompressing(false)
    }
  }

  const clearImage = () => {
    setReceiptImage(null)
    setPreviewUrl(null)
    setCompressionInfo(null)
  }

  const handleFormSubmit = async (data: SimpleExpenseInput) => {
    if (!receiptImage) {
      alert('Please capture a receipt image before saving')
      return
    }
    setIsSubmitting(true)
    try {
      await onSubmit(data, receiptImage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Expense Details Card */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            {categoryIcon || <Receipt className="h-5 w-5 text-chart-1" />}
            {categoryLabel}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Vehicle (if applicable) */}
          {showVehicle && (
            <div className="space-y-2">
              <Label htmlFor="vehicleId">Vehicle <span className="text-destructive">*</span></Label>
              <Select value={selectedVehicleId} onValueChange={(v) => setValue('vehicleId', v)} name="vehicleId">
                <SelectTrigger id="vehicleId" className="h-12">
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.registrationNumber} - {v.make} {v.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.vehicleId && <p className="text-sm text-destructive">{errors.vehicleId.message}</p>}
            </div>
          )}

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date">Date <span className="text-destructive">*</span></Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant="outline"
                  className={cn(
                    "w-full h-12 justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setValue('date', d)}
                />
              </PopoverContent>
            </Popover>
            {errors.date && <p className="text-sm text-destructive">{errors.date.message}</p>}
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (R) <span className="text-destructive">*</span></Label>
            <Input
              id="amount"
              {...register('amount')}
              type="number"
              step="0.01"
              placeholder="0.00"
              className="h-12 text-lg font-semibold"
            />
            {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
          </div>

          {/* Total Display */}
          {amount > 0 && (
            <div className="rounded-lg bg-muted p-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="text-2xl font-bold">{formatZAR(amount)}</span>
              </div>
            </div>
          )}

          {/* Supplier Name */}
          <div className="space-y-2">
            <Label htmlFor="supplierName">Supplier / Provider</Label>
            <Input
              id="supplierName"
              {...register('supplierName')}
              placeholder={placeholders.supplier}
              className="h-12"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder={placeholders.description}
              className="min-h-20"
            />
          </div>
        </CardContent>
      </Card>

      {/* Receipt Image Card */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Camera className="h-5 w-5 text-chart-4" />
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
                  onClick={clearImage}
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
              ${imageError ? 'border-destructive bg-destructive/5' : 'border-chart-4 hover:border-chart-4/80 hover:bg-chart-4/5'}
            `}>
              {isCompressing ? (
                <>
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-chart-4 mb-2" />
                  <span className="text-sm text-muted-foreground">Compressing image...</span>
                </>
              ) : (
                <>
                  <Camera className="h-10 w-10 text-chart-4 mb-2" />
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

      {/* Submit Button */}
      <Button
        type="submit"
        size="lg"
        className="w-full h-14 text-lg"
        disabled={isSubmitting || !receiptImage}
      >
        {isSubmitting ? 'Saving...' : `Save ${categoryLabel}`}
      </Button>
    </form>
  )
}
