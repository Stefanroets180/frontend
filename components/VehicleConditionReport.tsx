'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, AlertCircle, Camera, Plus } from 'lucide-react'
import { 
  createVehicleConditionReport, 
  getVehicleConditionReport, 
  addConditionSection,
  addSectionImage,
  addManagerNote
} from '@/lib/api/client'
import { ImageCropModal } from '@/components/ui/image-crop-modal'

const SECTION_TYPES = [
  { value: 'EXTERIOR', label: 'Exterior' },
  { value: 'INTERIOR', label: 'Interior' },
  { value: 'ENGINE', label: 'Engine' },
  { value: 'TIRES', label: 'Tires' },
  { value: 'LIGHTS', label: 'Lights' },
  { value: 'BRAKES', label: 'Brakes' },
  { value: 'FLUIDS', label: 'Fluids' },
  { value: 'DOCUMENTATION', label: 'Documentation' },
]

const CONDITION_OPTIONS = [
  { value: 'GOOD', label: 'Good', color: 'bg-green-500/10 text-green-600' },
  { value: 'FAIR', label: 'Fair', color: 'bg-yellow-500/10 text-yellow-600' },
  { value: 'POOR', label: 'Poor', color: 'bg-orange-500/10 text-orange-600' },
  { value: 'DAMAGED', label: 'Damaged', color: 'bg-red-500/10 text-red-600' },
]

interface VehicleConditionReportProps {
  assignmentId: string
  vehicleName?: string
  onComplete?: () => void
}

export function VehicleConditionReport({ assignmentId, vehicleName, onComplete }: VehicleConditionReportProps) {
  const [report, setReport] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  
  // Section form state
  const [selectedSectionType, setSelectedSectionType] = useState('')
  const [selectedCondition, setSelectedCondition] = useState<'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED'>('GOOD')
  const [sectionNotes, setSectionNotes] = useState('')
  
  // Image upload state
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [showCropModal, setShowCropModal] = useState(false)
  const [targetSectionId, setTargetSectionId] = useState('')
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  
  // Manager note state
  const [managerNote, setManagerNote] = useState('')

  useEffect(() => {
    loadReport()
  }, [assignmentId])

  const loadReport = async () => {
    setIsLoading(true)
    try {
      const response = await getVehicleConditionReport(assignmentId)
      setReport(response.data)
    } catch (error) {
      console.error('Failed to load condition report:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const createReport = async () => {
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const response = await createVehicleConditionReport(assignmentId)
      setReport(response.data)
      setSubmitSuccess(true)
      setTimeout(() => setSubmitSuccess(false), 3000)
    } catch (error) {
      console.error('Failed to create report:', error)
      setSubmitError(error instanceof Error ? error.message : 'Failed to create report')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddSection = async () => {
    if (!selectedSectionType || !report) return

    setIsSubmitting(true)
    setSubmitError(null)
    try {
      await addConditionSection(report.id, {
        sectionType: selectedSectionType,
        condition: selectedCondition,
        notes: sectionNotes,
      })
      
      await loadReport()
      
      setSelectedSectionType('')
      setSelectedCondition('GOOD')
      setSectionNotes('')
      
      setSubmitSuccess(true)
      setTimeout(() => setSubmitSuccess(false), 3000)
    } catch (error) {
      console.error('Failed to add section:', error)
      setSubmitError(error instanceof Error ? error.message : 'Failed to add section')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleImageSelect = (sectionId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file)
      setTargetSectionId(sectionId)
      setShowCropModal(true)
    }
  }

  const handleCropConfirm = async (croppedFile: File) => {
    setIsUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('file', croppedFile)
      
      await addSectionImage(targetSectionId, formData)
      
      await loadReport()
      
      setShowCropModal(false)
      setSelectedImage(null)
      setTargetSectionId('')
      
      setSubmitSuccess(true)
      setTimeout(() => setSubmitSuccess(false), 3000)
    } catch (error) {
      console.error('Failed to upload image:', error)
      setSubmitError('Failed to upload image')
    } finally {
      setIsUploadingImage(false)
    }
  }

  const handleAddManagerNote = async () => {
    if (!managerNote.trim() || !report) return

    setIsSubmitting(true)
    setSubmitError(null)
    try {
      await addManagerNote(report.id, { note: managerNote })
      
      await loadReport()
      
      setManagerNote('')
      
      setSubmitSuccess(true)
      setTimeout(() => setSubmitSuccess(false), 3000)
    } catch (error) {
      console.error('Failed to add manager note:', error)
      setSubmitError(error instanceof Error ? error.message : 'Failed to add note')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Loading condition report...</div>
        </CardContent>
      </Card>
    )
  }

  if (!report) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Vehicle Condition Report</CardTitle>
          <CardDescription>
            {vehicleName ? `Document the condition of ${vehicleName}` : 'Document the vehicle condition'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              No condition report exists for this vehicle assignment. Create one to document the vehicle's condition.
            </p>
            
            {submitSuccess && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-sm font-medium">Report created successfully!</span>
              </div>
            )}

            {submitError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <span className="text-sm font-medium">{submitError}</span>
              </div>
            )}

            <Button
              onClick={createReport}
              disabled={isSubmitting}
              className="w-full h-12"
            >
              {isSubmitting ? 'Creating...' : 'Create Condition Report'}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Vehicle Condition Report</CardTitle>
          <CardDescription>
            {vehicleName ? `Document the condition of ${vehicleName}` : 'Document the vehicle condition'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {submitSuccess && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-medium">Saved successfully!</span>
            </div>
          )}

          {submitError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm font-medium">{submitError}</span>
            </div>
          )}

          <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
            <h3 className="font-semibold">Add Condition Section</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Section Type</Label>
                <select
                  value={selectedSectionType}
                  onChange={(e) => setSelectedSectionType(e.target.value)}
                  className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select section</option>
                  {SECTION_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Condition</Label>
                <select
                  value={selectedCondition}
                  onChange={(e) => setSelectedCondition(e.target.value as any)}
                  className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {CONDITION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                value={sectionNotes}
                onChange={(e) => setSectionNotes(e.target.value)}
                placeholder="Add any observations about this section..."
                rows={3}
              />
            </div>

            <Button
              onClick={handleAddSection}
              disabled={!selectedSectionType || isSubmitting}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Section
            </Button>
          </div>

          {report.sections && report.sections.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold">Condition Sections</h3>
              {report.sections.map((section: any) => (
                <div key={section.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {SECTION_TYPES.find(t => t.value === section.sectionType)?.label || section.sectionType}
                    </span>
                    <Badge className={CONDITION_OPTIONS.find(c => c.value === section.condition)?.color}>
                      {CONDITION_OPTIONS.find(c => c.value === section.condition)?.label}
                    </Badge>
                  </div>

                  {section.notes && (
                    <p className="text-sm text-muted-foreground">{section.notes}</p>
                  )}

                  <div className="space-y-2">
                    <Label>Section Images</Label>
                    <div className="flex flex-wrap gap-2">
                      {section.images && section.images.map((image: any) => (
                        <div key={image.id} className="relative w-24 h-24">
                          <img
                            src={image.imageUrl}
                            alt="Section image"
                            className="w-full h-full object-cover rounded border"
                          />
                        </div>
                      ))}
                      <label className="w-24 h-24 border-2 border-dashed border-border rounded-lg flex items-center justify-center cursor-pointer bg-muted/30 hover:bg-muted/50">
                        <Camera className="h-6 w-6 text-muted-foreground" />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleImageSelect(section.id, e)}
                          disabled={isUploadingImage}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
            <h3 className="font-semibold">Manager Notes</h3>
            
            <div className="space-y-2">
              <Textarea
                value={managerNote}
                onChange={(e) => setManagerNote(e.target.value)}
                placeholder="Add a manager note about this vehicle..."
                rows={3}
              />
              <Button
                onClick={handleAddManagerNote}
                disabled={!managerNote.trim() || isSubmitting}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Note
              </Button>
            </div>

            {report.managerNotes && report.managerNotes.length > 0 && (
              <div className="space-y-2 mt-4">
                {report.managerNotes.map((note: any) => (
                  <div key={note.id} className="p-3 bg-background rounded border">
                    <p className="text-sm">{note.note}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {note.createdByName} • {new Date(note.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {onComplete && (
            <Button
              onClick={onComplete}
              className="w-full h-12"
              variant="default"
            >
              Complete Report
            </Button>
          )}
        </CardContent>
      </Card>

      {selectedImage && (
        <ImageCropModal
          imageFile={selectedImage}
          mode="receipt"
          onConfirm={handleCropConfirm}
          onCancel={() => {
            setShowCropModal(false)
            setSelectedImage(null)
            setTargetSectionId('')
          }}
          isOpen={showCropModal}
        />
      )}
    </>
  )
}
