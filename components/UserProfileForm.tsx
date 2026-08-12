'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { ImageCropModal } from '@/components/ui/image-crop-modal'
import { Camera, CheckCircle2, AlertCircle } from 'lucide-react'
import { createUserProfile, updateUserProfile } from '@/lib/api/client'
import { useAuth } from '@/lib/contexts/auth-context'

const userProfileSchema = z.object({
  idNumber: z.string().min(1, 'ID Number is required'),
  homePhone: z.string().optional(),
  workPhone: z.string().optional(),
  mobilePhone: z.string().min(1, 'Mobile phone is required'),
  driversLicenseNumber: z.string().min(1, 'Driver license number is required'),
  driversLicenseExpiry: z.string().min(1, 'License expiry date is required'),
})

type UserProfileInput = z.infer<typeof userProfileSchema>

interface UserProfileFormProps {
  existingProfile?: {
    idNumber?: string
    homePhone?: string
    workPhone?: string
    mobilePhone?: string
    driversLicenseNumber?: string
    driversLicenseExpiry?: string
    driversLicenseFrontUrl?: string
    driversLicenseBackUrl?: string
  }
  onSuccess?: () => void
}

export function UserProfileForm({ existingProfile, onSuccess }: UserProfileFormProps) {
  const { user, refreshUser } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  
  // Driver license upload state
  const [selectedLicenseFront, setSelectedLicenseFront] = useState<File | null>(null)
  const [selectedLicenseBack, setSelectedLicenseBack] = useState<File | null>(null)
  const [showCropModal, setShowCropModal] = useState(false)
  const [cropTarget, setCropTarget] = useState<'front' | 'back'>('front')
  const [isUploadingLicense, setIsUploadingLicense] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<UserProfileInput>({
    resolver: zodResolver(userProfileSchema),
    defaultValues: existingProfile || {
      idNumber: '',
      homePhone: '',
      workPhone: '',
      mobilePhone: '',
      driversLicenseNumber: '',
      driversLicenseExpiry: '',
    },
  })

  const handleLicenseFrontSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      setSelectedLicenseFront(file)
      setCropTarget('front')
      setShowCropModal(true)
    }
  }

  const handleLicenseBackSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      setSelectedLicenseBack(file)
      setCropTarget('back')
      setShowCropModal(true)
    }
  }

  const handleCropConfirm = async (croppedFile: File) => {
    setIsUploadingLicense(true)
    try {
      const formData = new FormData()
      formData.append('file', croppedFile)
      formData.append('type', cropTarget === 'front' ? 'license_front' : 'license_back')
      
      // This would need to be implemented in the backend
      // For now, we'll just store the file reference
      if (cropTarget === 'front') {
        setSelectedLicenseFront(croppedFile)
      } else {
        setSelectedLicenseBack(croppedFile)
      }
      
      setShowCropModal(false)
    } catch (error) {
      console.error('Failed to upload license image:', error)
      setSubmitError('Failed to upload license image')
    } finally {
      setIsUploadingLicense(false)
    }
  }

  const onSubmit = async (data: UserProfileInput) => {
    setIsSubmitting(true)
    setSubmitError(null)
    setSubmitSuccess(false)

    try {
      if (existingProfile) {
        await updateUserProfile(data)
      } else {
        await createUserProfile(data)
      }
      
      setSubmitSuccess(true)
      reset()
      onSuccess?.()
      
      setTimeout(() => setSubmitSuccess(false), 3000)
    } catch (error) {
      console.error('Failed to save user profile:', error)
      setSubmitError(error instanceof Error ? error.message : 'Failed to save profile')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>User Credentials</CardTitle>
          <CardDescription>
            Complete your profile information for fleet management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Success Message */}
            {submitSuccess && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-sm font-medium">Profile saved successfully!</span>
              </div>
            )}

            {/* Error Message */}
            {submitError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <span className="text-sm font-medium">{submitError}</span>
              </div>
            )}

            {/* ID Number */}
            <div className="space-y-2">
              <Label htmlFor="idNumber">ID Number</Label>
              <Input
                {...register('idNumber')}
                id="idNumber"
                placeholder="Enter your South African ID number"
                className="h-12"
                autoComplete="off"
              />
              {errors.idNumber && (
                <p className="text-sm text-destructive">{errors.idNumber.message}</p>
              )}
            </div>

            {/* Phone Numbers */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="homePhone">Home Phone</Label>
                <Input
                  {...register('homePhone')}
                  id="homePhone"
                  placeholder="012 345 6789"
                  className="h-12"
                  autoComplete="tel home"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="workPhone">Work Phone</Label>
                <Input
                  {...register('workPhone')}
                  id="workPhone"
                  placeholder="012 345 6789"
                  className="h-12"
                  autoComplete="tel work"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mobilePhone">Mobile Phone *</Label>
                <Input
                  {...register('mobilePhone')}
                  id="mobilePhone"
                  placeholder="082 123 4567"
                  className="h-12"
                  autoComplete="tel mobile"
                />
                {errors.mobilePhone && (
                  <p className="text-sm text-destructive">{errors.mobilePhone.message}</p>
                )}
              </div>
            </div>

            {/* Driver License Number */}
            <div className="space-y-2">
              <Label htmlFor="driversLicenseNumber">Driver License Number *</Label>
              <Input
                {...register('driversLicenseNumber')}
                id="driversLicenseNumber"
                placeholder="Enter your driver license number"
                className="h-12"
                autoComplete="off"
              />
              {errors.driversLicenseNumber && (
                <p className="text-sm text-destructive">{errors.driversLicenseNumber.message}</p>
              )}
            </div>

            {/* Driver License Expiry */}
            <div className="space-y-2">
              <Label htmlFor="driversLicenseExpiry">License Expiry Date *</Label>
              <Input
                {...register('driversLicenseExpiry')}
                id="driversLicenseExpiry"
                type="date"
                className="h-12"
                autoComplete="off"
              />
              {errors.driversLicenseExpiry && (
                <p className="text-sm text-destructive">{errors.driversLicenseExpiry.message}</p>
              )}
            </div>

            {/* Driver License Images */}
            <div className="space-y-4">
              <Label>Driver License Photos</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Front of License */}
                <div className="space-y-2">
                  <Label htmlFor="licenseFront">Front of License</Label>
                  <div className="relative">
                    <div className="h-32 border-2 border-dashed border-border rounded-lg flex items-center justify-center bg-muted/30">
                      {existingProfile?.driversLicenseFrontUrl || selectedLicenseFront ? (
                        <img 
                          src={selectedLicenseFront ? URL.createObjectURL(selectedLicenseFront) : existingProfile?.driversLicenseFrontUrl}
                          alt="License Front"
                          className="h-full w-full object-cover rounded-lg"
                        />
                      ) : (
                        <div className="text-center">
                          <Camera className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">Upload front</p>
                        </div>
                      )}
                    </div>
                    <label htmlFor="licenseFront" className="absolute inset-0 cursor-pointer">
                      <input
                        id="licenseFront"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLicenseFrontSelect}
                        disabled={isUploadingLicense}
                      />
                    </label>
                  </div>
                </div>

                {/* Back of License */}
                <div className="space-y-2">
                  <Label htmlFor="licenseBack">Back of License</Label>
                  <div className="relative">
                    <div className="h-32 border-2 border-dashed border-border rounded-lg flex items-center justify-center bg-muted/30">
                      {existingProfile?.driversLicenseBackUrl || selectedLicenseBack ? (
                        <img 
                          src={selectedLicenseBack ? URL.createObjectURL(selectedLicenseBack) : existingProfile?.driversLicenseBackUrl}
                          alt="License Back"
                          className="h-full w-full object-cover rounded-lg"
                        />
                      ) : (
                        <div className="text-center">
                          <Camera className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">Upload back</p>
                        </div>
                      )}
                    </div>
                    <label htmlFor="licenseBack" className="absolute inset-0 cursor-pointer">
                      <input
                        id="licenseBack"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLicenseBackSelect}
                        disabled={isUploadingLicense}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-12"
              disabled={isSubmitting || isUploadingLicense}
            >
              {isSubmitting ? 'Saving...' : 'Save Profile'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Image Crop Modal */}
      {(selectedLicenseFront || selectedLicenseBack) && (
        <ImageCropModal
          imageFile={cropTarget === 'front' ? selectedLicenseFront! : selectedLicenseBack!}
          mode="receipt"
          onConfirm={handleCropConfirm}
          onCancel={() => {
            setShowCropModal(false)
            setCropTarget('front')
            setSelectedLicenseFront(null)
            setSelectedLicenseBack(null)
          }}
          isOpen={showCropModal}
        />
      )}
    </>
  )
}
