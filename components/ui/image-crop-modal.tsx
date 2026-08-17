'use client'

import React, { useState, useRef, useEffect } from 'react'
import ReactCrop, { Crop, PixelCrop, cropToCanvas, cropToImg, centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Loader2, RotateCw } from 'lucide-react'

interface ImageCropModalProps {
  imageFile: File
  mode: 'receipt' | 'odometer' | 'logo' | 'profile'
  onConfirm: (croppedFile: File, originalFile: File) => void
  onCancel: () => void
  isOpen: boolean
}

export function ImageCropModal({
  imageFile,
  mode,
  onConfirm,
  onCancel,
  isOpen,
}: ImageCropModalProps) {
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const [imgSrc, setImgSrc] = useState<string>('')
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [rotation, setRotation] = useState(0)
  const imgRef = useRef<HTMLImageElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)

  // No aspect ratio locking - fully freeform cropping
  const minCropWidth = 100
  const minCropHeight = 100

  useEffect(() => {
    if (!imageFile) return

    const loadImage = async () => {
      const resizedFile = await resizeImageIfNeeded(imageFile)
      const reader = new FileReader()
      reader.onload = () => {
        setImgSrc(reader.result as string)
      }
      reader.readAsDataURL(resizedFile)
    }

    loadImage()

    // Set initial crop - larger area for more flexibility
    setCrop({
      unit: '%',
      width: 95,
      height: 95,
      x: 2.5,
      y: 2.5,
    })
  }, [imageFile])

  // Resize large images for better mobile performance
  const resizeImageIfNeeded = async (file: File): Promise<File> => {
    const isMobile = window.innerWidth < 768
    const MAX_SIZE = isMobile ? 1920 : 4096 // Lower max size for mobile

    if (file.size < 2 * 1024 * 1024) return file // Skip if under 2MB

    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let { width, height } = img

        // Scale down if too large
        if (width > MAX_SIZE || height > MAX_SIZE) {
          const ratio = Math.min(MAX_SIZE / width, MAX_SIZE / height)
          width *= ratio
          height *= ratio
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0, width, height)

        canvas.toBlob((blob) => {
          if (blob) {
            const resizedFile = new File([blob], file.name, { type: file.type })
            console.log('Image resized from', file.size, 'to', resizedFile.size)
            resolve(resizedFile)
          } else {
            resolve(file)
          }
        }, file.type, 0.9)
      }
      img.onerror = () => resolve(file)
      img.src = URL.createObjectURL(file)
    })
  }

  useEffect(() => {
    // Disable auto-preview on mobile for performance
    // Only generate preview on desktop
    if (!completedCrop || !imgRef.current) return
    if (window.innerWidth < 768) return // Mobile breakpoint

    generatePreview()
  }, [completedCrop])

  const generatePreview = async () => {
    if (!completedCrop || !imgRef.current) return

    try {
      const previewSrc = await cropToImg(imgRef.current, completedCrop)
      setPreviewUrl(previewSrc)
    } catch (error) {
      console.error('Preview generation error:', error)
    }
  }

  const handleCropComplete = (crop: PixelCrop) => {
    setCompletedCrop(crop)
  }

  const handleConfirm = async () => {
    if (!completedCrop || !imgRef.current) {
      console.error('Crop modal - Missing completedCrop or imgRef')
      return
    }

    setIsProcessing(true)

    try {
      console.log('Crop modal - Starting crop process, imageFile:', imageFile?.name, imageFile?.size, imageFile?.type)
      console.log('Crop modal - Crop dimensions:', completedCrop)

      // Use canvas-based cropping for better performance
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        throw new Error('Failed to get canvas context')
      }

      const image = imgRef.current
      const scaleX = image.naturalWidth / image.width
      const scaleY = image.naturalHeight / image.height

      canvas.width = completedCrop.width
      canvas.height = completedCrop.height

      ctx.drawImage(
        image,
        completedCrop.x * scaleX,
        completedCrop.y * scaleY,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY,
        0,
        0,
        completedCrop.width,
        completedCrop.height
      )

      // Convert canvas to blob
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.9)
      })

      if (!blob || blob.size === 0) {
        throw new Error('Canvas to blob failed or returned empty blob')
      }

      console.log('Crop modal - Blob size:', blob.size, 'type:', blob.type)

      const croppedFile = new File(
        [blob],
        imageFile.name.replace(/\.[^.]+$/, '_cropped.jpg'),
        { type: 'image/jpeg' }
      )

      console.log('Crop modal - Confirming with cropped file:', croppedFile.name, croppedFile.size, croppedFile.type)
      onConfirm(croppedFile, imageFile)
      setIsProcessing(false)
    } catch (error) {
      console.error('Crop processing error:', error)
      console.error('Crop modal - Error details:', error instanceof Error ? error.message : String(error))
      console.error('Crop modal - Error stack:', error instanceof Error ? error.stack : 'No stack')

      // Fallback to original file
      console.log('Crop modal - Error, using original file:', imageFile)
      try {
        onConfirm(imageFile, imageFile)
      } catch (fallbackError) {
        console.error('Crop modal - Fallback also failed:', fallbackError)
      }
      setIsProcessing(false)
    }
  }

  const handleUseOriginal = () => {
    onConfirm(imageFile, imageFile)
  }

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent 
        className="max-w-4xl w-full h-[90vh] flex flex-col p-0 overflow-hidden"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">
          {mode === 'receipt' ? 'Crop Receipt Image' : mode === 'odometer' ? 'Crop Odometer Image' : mode === 'logo' ? 'Crop Logo Image' : 'Crop Profile Image'}
        </DialogTitle>
        <div className="flex-1 flex flex-col bg-black">
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-gray-900 border-b border-gray-800">
            <h2 className="text-white text-lg font-semibold">
              {mode === 'receipt' ? 'Crop RECEIPT' : mode === 'odometer' ? 'Crop ODOMETER' : mode === 'logo' ? 'Crop LOGO' : 'Crop PROFILE'}
            </h2>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRotate}
                className="bg-gray-800 text-white border-gray-700 hover:bg-gray-700"
              >
                <RotateCw className="h-4 w-4 mr-2" />
                Rotate
              </Button>
            </div>
          </div>

          {/* Image Area */}
          <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
            {imgSrc && (
              <div className="relative">
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  onComplete={handleCropComplete}
                  keepSelection
                  minWidth={minCropWidth}
                  minHeight={minCropHeight}
                  className="max-w-full max-h-[60vh]"
                >
                  <img
                    ref={imgRef}
                    src={imgSrc}
                    alt="Crop target"
                    style={{
                      maxHeight: '60vh',
                      maxWidth: '100%',
                    }}
                  />
                </ReactCrop>
              </div>
            )}
          </div>

          {/* Preview and Actions */}
          <div className="bg-gray-900 border-t border-gray-800 p-4">
            <div className="flex items-center gap-4">
              {/* Preview */}
              {previewUrl && (
                <div className="flex-shrink-0">
                  <p className="text-gray-400 text-xs mb-1">Preview</p>
                  <img
                    src={previewUrl}
                    alt="Crop preview"
                    className="w-24 h-24 object-cover rounded border border-gray-700"
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex-1 flex flex-col gap-2">
                <Button
                  type="button"
                  onClick={handleConfirm}
                  disabled={!completedCrop || isProcessing}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Use This Crop'
                  )}
                </Button>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleUseOriginal}
                    className="flex-1 h-10 bg-gray-800 text-white border-gray-700 hover:bg-gray-700"
                  >
                    Use Original
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    className="flex-1 h-10 bg-gray-800 text-white border-gray-700 hover:bg-gray-700"
                  >
                    Retake
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
