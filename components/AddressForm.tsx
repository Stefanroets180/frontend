'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { createUserAddress, updateUserAddress } from '@/lib/api/client'

const addressSchema = z.object({
  addressLine1: z.string().min(1, 'Address line 1 is required'),
  addressLine2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  province: z.string().min(1, 'Province is required'),
  postalCode: z.string().min(1, 'Postal code is required'),
  country: z.string().min(1, 'Country is required'),
})

type AddressInput = z.infer<typeof addressSchema>

interface AddressFormProps {
  existingAddress?: {
    id?: string
    addressLine1?: string
    addressLine2?: string
    city?: string
    province?: string
    postalCode?: string
    country?: string
  }
  onSuccess?: () => void
}

const SOUTH_AFRICAN_PROVINCES = [
  'Eastern Cape',
  'Free State',
  'Gauteng',
  'KwaZulu-Natal',
  'Limpopo',
  'Mpumalanga',
  'Northern Cape',
  'North West',
  'Western Cape',
]

export function AddressForm({ existingAddress, onSuccess }: AddressFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AddressInput>({
    resolver: zodResolver(addressSchema),
    defaultValues: existingAddress || {
      addressLine1: '',
      addressLine2: '',
      city: '',
      province: '',
      postalCode: '',
      country: 'South Africa',
    },
  })

  const onSubmit = async (data: AddressInput) => {
    setIsSubmitting(true)
    setSubmitError(null)
    setSubmitSuccess(false)

    try {
      if (existingAddress && existingAddress.id) {
        await updateUserAddress(existingAddress.id, data)
      } else {
        await createUserAddress(data)
      }
      
      setSubmitSuccess(true)
      reset()
      onSuccess?.()
      
      setTimeout(() => setSubmitSuccess(false), 3000)
    } catch (error) {
      console.error('Failed to save address:', error)
      setSubmitError(error instanceof Error ? error.message : 'Failed to save address')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Postal Address</CardTitle>
        <CardDescription>
          Add your residential or postal address for fleet records
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Success Message */}
          {submitSuccess && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-medium">Address saved successfully!</span>
            </div>
          )}

          {/* Error Message */}
          {submitError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm font-medium">{submitError}</span>
            </div>
          )}

          {/* Address Line 1 */}
          <div className="space-y-2">
            <Label htmlFor="addressLine1">Street Address *</Label>
            <Input
              {...register('addressLine1')}
              id="addressLine1"
              placeholder="123 Main Street"
              className="h-12"
            />
            {errors.addressLine1 && (
              <p className="text-sm text-destructive">{errors.addressLine1.message}</p>
            )}
          </div>

          {/* Address Line 2 */}
          <div className="space-y-2">
            <Label htmlFor="addressLine2">Apartment / Suite (Optional)</Label>
            <Input
              {...register('addressLine2')}
              id="addressLine2"
              placeholder="Apt 4B"
              className="h-12"
            />
          </div>

          {/* City */}
          <div className="space-y-2">
            <Label htmlFor="city">City / Town *</Label>
            <Input
              {...register('city')}
              id="city"
              placeholder="Johannesburg"
              className="h-12"
            />
            {errors.city && (
              <p className="text-sm text-destructive">{errors.city.message}</p>
            )}
          </div>

          {/* Province */}
          <div className="space-y-2">
            <Label htmlFor="province">Province *</Label>
            <select
              {...register('province')}
              id="province"
              className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Select province</option>
              {SOUTH_AFRICAN_PROVINCES.map((province) => (
                <option key={province} value={province}>
                  {province}
                </option>
              ))}
            </select>
            {errors.province && (
              <p className="text-sm text-destructive">{errors.province.message}</p>
            )}
          </div>

          {/* Postal Code */}
          <div className="space-y-2">
            <Label htmlFor="postalCode">Postal Code *</Label>
            <Input
              {...register('postalCode')}
              id="postalCode"
              placeholder="2000"
              className="h-12"
            />
            {errors.postalCode && (
              <p className="text-sm text-destructive">{errors.postalCode.message}</p>
            )}
          </div>

          {/* Country */}
          <div className="space-y-2">
            <Label htmlFor="country">Country *</Label>
            <Input
              {...register('country')}
              id="country"
              placeholder="South Africa"
              className="h-12"
            />
            {errors.country && (
              <p className="text-sm text-destructive">{errors.country.message}</p>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full h-12"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save Address'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
