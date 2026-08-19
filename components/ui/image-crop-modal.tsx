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
  const [crop, setCrop] = useState<any>({
    unit: '%',
    width: 95,
    height: 95,
    x: 2.5,
    y: 2.5,
  })
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
    const scaleX = image.naturalWidth / image.width
    const scaleY = image.naturalHeight / image.height

    canvas.width = crop.width
    canvas.height = crop.height

    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width,
      crop.height
    )

    return canvas
  }

  const handleConfirm = async () => {
    if (!crop || !imgRef.current) {
      console.error('Crop modal - Missing crop or imgRef')
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
          <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
            {imgSrc && (
              <div className="relative">
                <ReactCrop
                  crop={crop}
                  onChange={(c) => setCrop(c)}
                  keepSelection
                  minWidth={100}
                  minHeight={100}
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

          {/* Actions */}
          <div className="bg-gray-900 border-t border-gray-800 p-4">
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                onClick={handleConfirm}
                disabled={!crop || isProcessing}
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
