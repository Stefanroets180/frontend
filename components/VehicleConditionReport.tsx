'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { CheckCircle2, AlertCircle, Camera, Plus, Car, Armchair, Cog, CircleDot, Lightbulb, Disc3, Droplets, FileText, ShieldCheck, MessageSquare, ImageOff, Trash2, Edit2, Lock, Unlock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { 
  createVehicleConditionReport, 
  getVehicleConditionReport, 
  addConditionSection,
  addSectionImage,
  addManagerNote,
  deleteConditionSection,
  updateConditionSection,
  lockConditionSection,
  unlockConditionSection
} from '@/lib/api/client'
import { ImageCropModal } from '@/components/ui/image-crop-modal'

const SECTION_TYPES = [
  { value: 'EXTERIOR_FRONT', label: 'Front', icon: Car },
  { value: 'EXTERIOR_FRONT_RIGHT', label: 'Front Right', icon: Car },
  { value: 'EXTERIOR_RIGHT', label: 'Right Side', icon: Car },
  { value: 'EXTERIOR_REAR_RIGHT', label: 'Rear Right', icon: Car },
  { value: 'EXTERIOR_REAR', label: 'Rear', icon: Car },
  { value: 'EXTERIOR_REAR_LEFT', label: 'Rear Left', icon: Car },
  { value: 'EXTERIOR_LEFT', label: 'Left Side', icon: Car },
  { value: 'EXTERIOR_FRONT_LEFT', label: 'Front Left', icon: Car },
  { value: 'INTERIOR', label: 'Interior', icon: Armchair },
  { value: 'ENGINE', label: 'Engine', icon: Cog },
  { value: 'TIRES', label: 'Tires & Rims', icon: CircleDot },
  { value: 'LIGHTS', label: 'Lights', icon: Lightbulb },
  { value: 'BRAKES', label: 'Brakes', icon: Disc3 },
  { value: 'FLUIDS', label: 'Fluids', icon: Droplets },
  { value: 'DOCUMENTATION', label: 'Documentation', icon: FileText },
]

const CONDITION_META: Record<string, {
  label: string
  dot: string
  chip: string
  ring: string
  swatch: string
  score: number
}> = {
  GOOD: {
    label: 'Good',
    dot: 'bg-green-500',
    chip: 'border-transparent bg-green-500/10 text-green-600',
    ring: 'ring-green-500 bg-green-500/5',
    swatch: 'bg-green-500',
    score: 100,
  },
  FAIR: {
    label: 'Fair',
    dot: 'bg-yellow-500',
    chip: 'border-transparent bg-yellow-500/10 text-yellow-600',
    ring: 'ring-yellow-500 bg-yellow-500/5',
    swatch: 'bg-yellow-500',
    score: 66,
  },
  POOR: {
    label: 'Poor',
    dot: 'bg-orange-500',
    chip: 'border-transparent bg-orange-500/10 text-orange-600',
    ring: 'ring-orange-500 bg-orange-500/5',
    swatch: 'bg-orange-500',
    score: 33,
  },
  DAMAGED: {
    label: 'Damaged',
    dot: 'bg-red-500',
    chip: 'border-transparent bg-red-500/10 text-red-600',
    ring: 'ring-red-500 bg-red-500/5',
    swatch: 'bg-red-500',
    score: 0,
  },
}

const CONDITION_ORDER = ['GOOD', 'FAIR', 'POOR', 'DAMAGED']

// Helper components
function ConditionChip({ condition }: { condition: string }) {
  const meta = CONDITION_META[condition]
  if (!meta) return null
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold', meta.chip)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
      {meta.label}
    </span>
  )
}

function OverviewHeader({ sections }: { sections: any[] }) {
  const completed = sections.length
  const total = SECTION_TYPES.length
  const pct = Math.round((completed / total) * 100)

  const counts = useMemo(() => {
    const base: Record<string, number> = { GOOD: 0, FAIR: 0, POOR: 0, DAMAGED: 0 }
    sections.forEach((s) => {
      if (base[s.condition] !== undefined) base[s.condition] += 1
    })
    return base
  }, [sections])

  const healthScore =
    completed === 0
      ? null
      : Math.round(
          sections.reduce((sum: number, s: any) => sum + (CONDITION_META[s.condition]?.score || 0), 0) /
            completed,
        )

  const health =
    healthScore === null
      ? { label: 'Not started', tone: 'text-muted-foreground', bar: 'bg-muted-foreground' }
      : healthScore >= 80
        ? { label: 'Roadworthy', tone: 'text-green-600', bar: 'bg-green-500' }
        : healthScore >= 50
          ? { label: 'Needs attention', tone: 'text-yellow-600', bar: 'bg-yellow-500' }
          : { label: 'Action required', tone: 'text-red-600', bar: 'bg-red-500' }

  return (
    <div className="rounded-xl border bg-card p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-full',
              healthScore === null
                ? 'bg-muted'
                : healthScore >= 80
                  ? 'bg-green-500/10'
                  : healthScore >= 50
                    ? 'bg-yellow-500/10'
                    : 'bg-red-500/10',
            )}
          >
            <ShieldCheck className={cn('h-6 w-6', health.tone)} />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Overall condition
            </p>
            <p className={cn('text-lg font-bold leading-tight', health.tone)}>
              {health.label}
            </p>
          </div>
        </div>

        <div className="w-full sm:w-56">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-medium text-muted-foreground">Inspection progress</span>
            <span className="font-semibold tabular-nums">
              {completed}/{total}
            </span>
          </div>
          <Progress value={pct} className="h-2" />
        </div>
      </div>

      {/* Condition tally */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {CONDITION_ORDER.map((c) => {
          const meta = CONDITION_META[c]
          return (
            <div
              key={c}
              className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2"
            >
              <span className={cn('h-2.5 w-2.5 rounded-full', meta.dot)} />
              <span className="text-sm font-semibold tabular-nums">{counts[c]}</span>
              <span className="text-xs text-muted-foreground">{meta.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SectionCard({ 
  section, 
  onImageUpload, 
  onDelete, 
  onEdit, 
  onLock, 
  onUnlock 
}: { 
  section: any; 
  onImageUpload: (sectionId: string, e: React.ChangeEvent<HTMLInputElement>) => void;
  onDelete: (sectionId: string) => void;
  onEdit: (section: any) => void;
  onLock: (sectionId: string) => void;
  onUnlock: (sectionId: string) => void;
}) {
  const cfg = SECTION_TYPES.find((t) => t.value === section.sectionType)
  const Icon = cfg?.icon ?? Car
  const meta = CONDITION_META[section.condition]
  const images = section.images ?? []
  const isLocked = section.locked ?? false

  return (
    <div className={cn('rounded-xl border bg-card p-4 ring-1 ring-inset', meta?.ring)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-background">
            <Icon className="h-5 w-5 text-foreground" />
          </div>
          <div>
            <p className="font-semibold leading-tight">{cfg?.label ?? section.sectionType}</p>
            <p className="text-xs text-muted-foreground">
              {images.length} photo{images.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ConditionChip condition={section.condition} />
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onEdit(section)}
              title="Edit section"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => isLocked ? onUnlock(section.id) : onLock(section.id)}
              title={isLocked ? "Unlock section" : "Lock section"}
            >
              {isLocked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => onDelete(section.id)}
              title="Delete section"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {section.notes && (
        <p className="mt-3 rounded-lg bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
          {section.notes}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {images.map((img: any) => (
          <img
            key={img.id}
            src={img.imageUrl || '/placeholder.svg'}
            alt={`${cfg?.label ?? section.sectionType} condition`}
            className="h-16 w-16 rounded-lg border object-cover"
            crossOrigin="anonymous"
          />
        ))}
        {!isLocked && (
          <label htmlFor={`image-upload-${section.id}`} className="flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border bg-muted/30 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary cursor-pointer">
            <Camera className="h-4 w-4" />
            <span className="text-[10px] font-medium">Add</span>
            <input
              id={`image-upload-${section.id}`}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onImageUpload(section.id, e)}
            />
          </label>
        )}
      </div>
    </div>
  )
}

function AddSectionPanel({
  usedTypes,
  onAdd,
  editingSection,
  onCancelEdit,
}: {
  usedTypes: string[]
  onAdd: (s: { sectionType: string; condition: string; notes: string }) => void
  editingSection: { id: string; sectionType: string; condition: string; notes: string } | null
  onCancelEdit: () => void
}) {
  const [sectionType, setSectionType] = useState('')
  const [condition, setCondition] = useState<string>('GOOD')
  const [notes, setNotes] = useState('')

  // Initialize with editing section data if provided
  useEffect(() => {
    if (editingSection) {
      setSectionType(editingSection.sectionType)
      setCondition(editingSection.condition)
      setNotes(editingSection.notes || '')
    } else {
      setSectionType('')
      setCondition('GOOD')
      setNotes('')
    }
  }, [editingSection])

  const available = editingSection 
    ? SECTION_TYPES.filter((t) => t.value === editingSection.sectionType)
    : SECTION_TYPES.filter((t) => !usedTypes.includes(t.value))

  const submit = () => {
    if (!sectionType) return
    onAdd({ sectionType, condition, notes })
    if (!editingSection) {
      setSectionType('')
      setCondition('GOOD')
      setNotes('')
    }
  }

  const cancel = () => {
    if (editingSection) {
      onCancelEdit()
    }
    setSectionType('')
    setCondition('GOOD')
    setNotes('')
  }

  if (!editingSection && available.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
        <CheckCircle2 className="h-5 w-5 text-green-500" />
        All inspection areas have been logged.
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-muted/30 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-semibold">
          {editingSection ? <Edit2 className="h-4 w-4 text-primary" /> : <Plus className="h-4 w-4 text-primary" />}
          {editingSection ? 'Edit inspection area' : 'Log an inspection area'}
        </h3>
        {editingSection && (
          <Button variant="ghost" size="sm" onClick={cancel}>
            Cancel
          </Button>
        )}
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        {editingSection ? 'Update the condition and notes for this area.' : 'Pick the area, then tap its condition.'}
      </p>

      {/* Area picker */}
      <p className="mb-2 text-xs font-medium text-muted-foreground">Area</p>
      <div role="radiogroup" aria-label="Select inspection area" className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {available.map((t) => {
          const Icon = t.icon
          const active = sectionType === t.value
          return (
            <button
              key={t.value}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={t.label}
              onClick={() => setSectionType(t.value)}
              disabled={!!editingSection}
              className={cn(
                'flex min-w-0 flex-col items-center gap-1.5 rounded-lg border p-3 text-center text-xs font-medium leading-tight transition-all',
                active
                  ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary'
                  : 'bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground',
                editingSection && 'opacity-50 cursor-not-allowed',
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="w-full break-words">{t.label}</span>
            </button>
          )
        })}
      </div>

      {/* Condition picker */}
      <p className="mb-2 text-xs font-medium text-muted-foreground">Condition</p>
      <div role="radiogroup" aria-label="Select condition" className="mb-4 grid grid-cols-4 gap-2">
        {CONDITION_ORDER.map((c) => {
          const meta = CONDITION_META[c]
          const active = condition === c
          return (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={meta.label}
              onClick={() => setCondition(c)}
              className={cn(
                'flex min-w-0 flex-col items-center gap-1.5 rounded-lg border p-2.5 text-center text-xs font-semibold leading-tight transition-all',
                active
                  ? 'ring-2 ring-offset-1'
                  : 'opacity-70 hover:opacity-100',
                active && meta.ring,
              )}
            >
              <span className={cn('h-4 w-4 shrink-0 rounded-full', meta.swatch)} />
              <span className="w-full break-words">{meta.label}</span>
            </button>
          )
        })}
      </div>

      {/* Notes */}
      <Label htmlFor="section-notes" className="mb-2 block text-xs font-medium text-muted-foreground">
        Notes (optional)
      </Label>
      <Textarea
        id="section-notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="e.g. Small scratch on rear bumper, otherwise clean."
        rows={2}
        className="mb-4 bg-background"
      />

      <Button onClick={submit} disabled={!sectionType} className="w-full">
        {editingSection ? (
          <>
            <Edit2 className="mr-1.5 h-4 w-4" />
            Update {SECTION_TYPES.find((t) => t.value === sectionType)?.label || 'area'}
          </>
        ) : (
          <>
            <Plus className="mr-1.5 h-4 w-4" />
            Add {sectionType ? SECTION_TYPES.find((t) => t.value === sectionType)?.label : 'area'}
          </>
        )}
      </Button>
    </div>
  )
}

interface VehicleConditionReportProps {
  assignmentId: string | null
  vehicleName?: string
  onComplete?: () => void
}

export function VehicleConditionReport({ assignmentId, vehicleName, onComplete }: VehicleConditionReportProps) {
  const [report, setReport] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
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
  const [toast, setToast] = useState<string | null>(null)
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null)

  const flash = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  useEffect(() => {
    if (assignmentId) {
      loadReport()
    }
  }, [assignmentId])

  const loadReport = async () => {
    if (!assignmentId) return
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
    if (!assignmentId) {
      setSubmitError('Cannot create condition report: Vehicle is not assigned to a driver')
      return
    }
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const response = await createVehicleConditionReport(assignmentId)
      setReport(response.data)
      flash('Report created')
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
      if (editingSectionId) {
        // Update existing section
        await updateConditionSection(editingSectionId, {
          condition: selectedCondition,
          notes: sectionNotes,
        })
        await loadReport()
        setEditingSectionId(null)
        flash('Section updated')
      } else {
        // Create new section
        await addConditionSection(report.id, {
          sectionType: selectedSectionType,
          condition: selectedCondition,
          notes: sectionNotes,
        })
        await loadReport()
        flash('Inspection area added')
      }
      
      setSelectedSectionType('')
      setSelectedCondition('GOOD')
      setSectionNotes('')
    } catch (error) {
      console.error('Failed to save section:', error)
      setSubmitError(error instanceof Error ? error.message : 'Failed to save section')
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
      
      flash('Image uploaded')
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
      
      flash('Note added')
    } catch (error) {
      console.error('Failed to add manager note:', error)
      setSubmitError(error instanceof Error ? error.message : 'Failed to add note')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm('Are you sure you want to delete this section?')) return

    try {
      await deleteConditionSection(sectionId)
      await loadReport()
      flash('Section deleted')
    } catch (error) {
      console.error('Failed to delete section:', error)
      setSubmitError('Failed to delete section')
    }
  }

  const handleEditSection = (section: any) => {
    setSelectedSectionType(section.sectionType)
    setSelectedCondition(section.condition)
    setSectionNotes(section.notes || '')
    setEditingSectionId(section.id)
  }

  const handleLockSection = async (sectionId: string) => {
    try {
      await lockConditionSection(sectionId)
      await loadReport()
      flash('Section locked')
    } catch (error) {
      console.error('Failed to lock section:', error)
      setSubmitError('Failed to lock section')
    }
  }

  const handleUnlockSection = async (sectionId: string) => {
    try {
      await unlockConditionSection(sectionId)
      await loadReport()
      flash('Section unlocked')
    } catch (error) {
      console.error('Failed to unlock section:', error)
      setSubmitError('Failed to unlock section')
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
      <div className="rounded-xl border bg-card p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <ShieldCheck className="h-7 w-7 text-primary" />
        </div>
        <h3 className="text-lg font-bold">Start a condition report</h3>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          {vehicleName
            ? `No report exists yet for ${vehicleName}. Create one to log the vehicle's condition area by area.`
            : 'No report exists yet. Create one to log the vehicle\'s condition area by area.'}
        </p>
        {toast && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 text-green-600 mt-4">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm font-medium">{toast}</span>
          </div>
        )}
        {submitError && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive mt-4">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm font-medium">{submitError}</span>
          </div>
        )}
        <Button onClick={createReport} disabled={isSubmitting} className="mt-5">
          <Plus className="mr-1.5 h-4 w-4" />
          {isSubmitting ? 'Creating...' : 'Create condition report'}
        </Button>
      </div>
    )
  }

  const sections = report.sections ?? []
  const usedTypes = sections.map((s: any) => s.sectionType)

  return (
    <>
      <div className="space-y-5">
        {toast && (
          <div className="flex items-center gap-2 rounded-lg bg-green-500/10 px-3 py-2 text-sm font-medium text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            {toast}
          </div>
        )}

        <OverviewHeader sections={sections} />

        {/* Sections */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Inspection areas
            </h3>
            <span className="text-xs text-muted-foreground">
              {sections.length} of {SECTION_TYPES.length} logged
            </span>
          </div>

          {sections.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-10 text-center">
              <ImageOff className="h-8 w-8 text-muted-foreground/60" />
              <p className="text-sm font-medium text-muted-foreground">No areas logged yet</p>
              <p className="text-xs text-muted-foreground">
                Use the panel below to log your first inspection area.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {sections.map((s: any) => (
                <SectionCard 
                  key={s.id} 
                  section={s} 
                  onImageUpload={handleImageSelect}
                  onDelete={handleDeleteSection}
                  onEdit={handleEditSection}
                  onLock={handleLockSection}
                  onUnlock={handleUnlockSection}
                />
              ))}
            </div>
          )}
        </section>

        <AddSectionPanel 
          usedTypes={usedTypes} 
          editingSection={editingSectionId ? sections.find((s: any) => s.id === editingSectionId) : null}
          onCancelEdit={() => setEditingSectionId(null)}
          onAdd={(s) => {
            setSelectedSectionType(s.sectionType)
            setSelectedCondition(s.condition as any)
            setSectionNotes(s.notes)
            handleAddSection()
          }} 
        />

        {/* Manager notes */}
        <section className="rounded-xl border bg-muted/30 p-4">
          <h3 className="mb-3 flex items-center gap-2 font-semibold">
            <MessageSquare className="h-4 w-4 text-primary" />
            Manager notes
          </h3>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Textarea
              value={managerNote}
              onChange={(e) => setManagerNote(e.target.value)}
              placeholder="Add a note about this vehicle…"
              rows={2}
              className="bg-background"
            />
            <Button
              onClick={handleAddManagerNote}
              disabled={!managerNote.trim() || isSubmitting}
              className="sm:self-end"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add
            </Button>
          </div>

          {report.managerNotes && report.managerNotes.length > 0 && (
            <ul className="mt-3 space-y-2">
              {report.managerNotes.map((n: any) => (
                <li key={n.id} className="rounded-lg border bg-background p-3">
                  <p className="text-sm">{n.note}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{n.createdByName}</span>
                    <span>•</span>
                    {new Date(n.createdAt).toLocaleDateString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {onComplete && (
          <Button
            onClick={onComplete}
            className="w-full h-12"
            variant="default"
          >
            Complete Report
          </Button>
        )}
      </div>

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
