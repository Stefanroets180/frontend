'use client'

import React, { useState, useRef, useEffect } from 'react'
import ReactCrop, { Crop, PixelCrop, cropToCanvas, cropToImg } from 'react-image-crop'
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

  // No aspect ratio locking - fully freeform cropping
  const minCropWidth = 100
  const minCropHeight = 100

  useEffect(() => {
    if (!imageFile) return

    const reader = new FileReader()
    reader.onload = () => {
      setImgSrc(reader.result as string)
    }
    reader.readAsDataURL(imageFile)

    // Set initial crop - larger area for more flexibility
    setCrop({
      unit: '%',
      width: 95,
      height: 95,
      x: 2.5,
      y: 2.5,
    })
  }, [imageFile])

  useEffect(() => {
    if (!completedCrop || !imgRef.current) return

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

      // Use the built-in cropToImg helper from react-image-crop v11
      const croppedImgSrc = await cropToImg(imgRef.current, completedCrop)
      console.log('Crop modal - Cropped image data URL length:', croppedImgSrc?.length)

      if (!croppedImgSrc) {
        throw new Error('cropToImg returned empty result')
      }

      // Convert the data URL back to a File
      const response = await fetch(croppedImgSrc)
      const blob = await response.blob()
      console.log('Crop modal - Blob size:', blob?.size, 'type:', blob?.type)

      if (!blob || blob.size === 0) {
        throw new Error('Blob is empty or invalid')
      }

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
