'use client'

import React, { useState, useRef, useEffect } from 'react'
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Loader2, RotateCw } from 'lucide-react'

interface ImageCropModalProps {
  imageFile: File
  mode: 'receipt' | 'odometer'
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

  // Set default aspect ratio based on mode
  const defaultAspect = mode === 'receipt' ? undefined : 16 / 9
  const minCropWidth = mode === 'odometer' ? 300 : 50
  const minCropHeight = mode === 'odometer' ? 150 : 50

  useEffect(() => {
    if (!imageFile) return

    const reader = new FileReader()
    reader.onload = () => {
      setImgSrc(reader.result as string)
    }
    reader.readAsDataURL(imageFile)

    // Set initial crop
    setCrop({
      unit: '%',
      width: mode === 'receipt' ? 80 : 90,
      height: mode === 'receipt' ? 80 : 50,
      x: mode === 'receipt' ? 10 : 5,
      y: mode === 'receipt' ? 10 : 25,
    })
  }, [imageFile, mode])

  useEffect(() => {
    if (!completedCrop || !imgRef.current) return

    generatePreview()
  }, [completedCrop])

  const generatePreview = async () => {
    if (!completedCrop || !imgRef.current) return

    const image = imgRef.current
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) return

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

    canvas.toBlob(
      (blob) => {
        if (blob) {
          setPreviewUrl(URL.createObjectURL(blob))
        }
      },
      'image/jpeg',
      0.9
    )
  }

  const handleCropComplete = (crop: PixelCrop) => {
    setCompletedCrop(crop)
  }

  const handleConfirm = async () => {
    if (!completedCrop || !imgRef.current) return

    setIsProcessing(true)

    try {
      const image = imgRef.current
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        throw new Error('Failed to get canvas context')
      }

      const scaleX = image.naturalWidth / image.width
      const scaleY = image.naturalHeight / image.height

      let cropWidth = completedCrop.width * scaleX
      let cropHeight = completedCrop.height * scaleY

      // Resize if larger than 1920px on longest side
      const maxDimension = 1920
      if (cropWidth > maxDimension || cropHeight > maxDimension) {
        const ratio = Math.min(maxDimension / cropWidth, maxDimension / cropHeight)
        cropWidth *= ratio
        cropHeight *= ratio
      }

      canvas.width = cropWidth
      canvas.height = cropHeight

      // Handle rotation if needed (for EXIF)
      if (rotation !== 0) {
        ctx.translate(canvas.width / 2, canvas.height / 2)
        ctx.rotate((rotation * Math.PI) / 180)
        ctx.drawImage(
          image,
          completedCrop.x * scaleX,
          completedCrop.y * scaleY,
          completedCrop.width * scaleX,
          completedCrop.height * scaleY,
          -cropWidth / 2,
          -cropHeight / 2,
          cropWidth,
          cropHeight
        )
      } else {
        ctx.drawImage(
          image,
          completedCrop.x * scaleX,
          completedCrop.y * scaleY,
          completedCrop.width * scaleX,
          completedCrop.height * scaleY,
          0,
          0,
          cropWidth,
          cropHeight
        )
      }

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const croppedFile = new File(
              [blob],
              imageFile.name.replace(/\.[^.]+$/, '_cropped.jpg'),
              { type: 'image/jpeg' }
            )
            onConfirm(croppedFile, imageFile)
          } else {
            console.warn('Canvas toBlob failed, using original file')
            onConfirm(imageFile, imageFile)
          }
          setIsProcessing(false)
        },
        'image/jpeg',
        0.9
      )
    } catch (error) {
      console.error('Crop processing error:', error)
      // Fallback to original file
      onConfirm(imageFile, imageFile)
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
      <DialogContent className="max-w-4xl w-full h-[90vh] flex flex-col p-0 overflow-hidden">
        <div className="flex-1 flex flex-col bg-black">
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-gray-900 border-b border-gray-800">
            <h2 className="text-white text-lg font-semibold">
              {mode === 'receipt' ? 'Crop RECEIPT' : 'Crop ODOMETER'}
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
                  onChange={(c) => setCrop(c)}
                  onComplete={handleCropComplete}
                  aspect={defaultAspect}
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
                      transform: `rotate(${rotation}deg)`,
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
