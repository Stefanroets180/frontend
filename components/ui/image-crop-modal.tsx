'use client'

import React, { useState, useRef, useEffect } from 'react'
import ReactCrop from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'

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
  const [crop, setCrop] = useState<any>(null)

  // Update crop when mode changes
  useEffect(() => {
    if (mode === 'odometer') {
      setCrop({
        unit: '%',
        width: 100,
        height: 100,
        x: 0,
        y: 0,
      }) // Full image selection for odometer
    } else {
      setCrop({
        unit: '%',
        width: 95,
        height: 95,
        x: 2.5,
        y: 2.5,
      })
    }
  }, [mode])

  // Always use percentCrop for state to ensure consistency
  const handleCropChange = (_crop: any, percentCrop: any) => {
    setCrop(percentCrop)
  }
  const [imgSrc, setImgSrc] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!imageFile) return

    const reader = new FileReader()
    reader.onload = () => {
      setImgSrc(reader.result as string)
    }
    reader.readAsDataURL(imageFile)
  }, [imageFile])

  const getCroppedImg = (image: HTMLImageElement, crop: any) => {
    const canvas = document.createElement('canvas')
    
    console.log('getCroppedImg - naturalWidth:', image.naturalWidth, 'naturalHeight:', image.naturalHeight)
    console.log('getCroppedImg - displayedWidth:', image.width, 'displayedHeight:', image.height)
    console.log('getCroppedImg - crop:', crop)

    // Always convert to percentage first, then to natural dimensions
    // This ensures consistency regardless of displayed size
    let cropX, cropY, cropWidth, cropHeight
    
    if (crop.unit === '%') {
      // Already in percentage, convert directly to natural dimensions
      cropX = (crop.x / 100) * image.naturalWidth
      cropY = (crop.y / 100) * image.naturalHeight
      cropWidth = (crop.width / 100) * image.naturalWidth
      cropHeight = (crop.height / 100) * image.naturalHeight
    } else {
      // Convert pixels to percentage based on displayed size, then to natural dimensions
      const percentX = (crop.x / image.width) * 100
      const percentY = (crop.y / image.height) * 100
      const percentWidth = (crop.width / image.width) * 100
      const percentHeight = (crop.height / image.height) * 100
      
      cropX = (percentX / 100) * image.naturalWidth
      cropY = (percentY / 100) * image.naturalHeight
      cropWidth = (percentWidth / 100) * image.naturalWidth
      cropHeight = (percentHeight / 100) * image.naturalHeight
    }

    console.log('getCroppedImg - final crop dimensions:', { cropX, cropY, cropWidth, cropHeight })

    // Use natural dimensions for canvas to maintain original resolution
    canvas.width = cropWidth
    canvas.height = cropHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    ctx.drawImage(
      image,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      cropWidth,
      cropHeight
    )

    return canvas
  }

  const handleConfirm = async () => {
    if (!imgRef.current) {
      console.error('Crop modal - Missing imgRef')
      return
    }

    setIsProcessing(true)

    try {
      console.log('Crop modal - Starting crop process, imageFile:', imageFile?.name, imageFile?.size, imageFile?.type)
      console.log('Crop modal - Crop dimensions:', crop)

      // Get cropped canvas
      const canvas = getCroppedImg(imgRef.current, crop)
      if (!canvas) {
        throw new Error('Failed to get cropped canvas')
      }

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

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent
        className="max-w-4xl w-full h-[90vh] flex flex-col p-0 overflow-hidden"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">
          {mode === 'receipt' ? 'Crop Receipt Image' : mode === 'odometer' ? 'Crop Odometer Image' : mode === 'logo' ? 'Crop Logo Image' : 'Crop Profile Image'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Adjust the crop area to select the portion of the image to use
        </DialogDescription>
        <div className="flex-1 flex flex-col bg-black">
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-gray-900 border-b border-gray-800">
            <h2 className="text-white text-lg font-semibold">
              {mode === 'receipt' ? 'Crop RECEIPT' : mode === 'odometer' ? 'Crop ODOMETER' : mode === 'logo' ? 'Crop LOGO' : 'Crop PROFILE'}
            </h2>
          </div>

          {/* Image Area */}
          <div className="flex-1 flex items-center justify-center p-4 overflow-auto bg-gray-950">
            {imgSrc && (
              <div className="relative">
                <ReactCrop
                  crop={crop}
                  onChange={handleCropChange}
                  keepSelection={mode !== 'odometer'}
                  minWidth={mode === 'odometer' ? 50 : 100}
                  minHeight={mode === 'odometer' ? 50 : 100}
                  className="max-w-full"
                >
                  <img
                    ref={imgRef}
                    src={imgSrc}
                    alt="Crop target"
                    style={{
                      maxHeight: '80vh',
                      maxWidth: '100%',
                    }}
                  />
                </ReactCrop>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="bg-gray-900 border-t border-gray-800 p-4">
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                onClick={handleConfirm}
                disabled={isProcessing}
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
      </DialogContent>
    </Dialog>
  )
}
