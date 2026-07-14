'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api/client'
import { ArrowLeft, Building2, Users, User, Mail, Shield, Plus, Crown, UserPlus, Car, Trash2, Edit, MoreVertical, Clock, Check, X } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth, useRequireRole } from '@/lib/contexts/auth-context'
import { OrganizationMode, UserRole, VehicleStatus } from '@/lib/types/database'
import { cn } from '@/lib/utils'

interface TeamMember {
  id: string
  firstName: string
  lastName: string
  email: string
  role: UserRole
  isActive: boolean
}

interface Vehicle {
  id: string
  nickname: string | null
  registrationNumber: string
  make: string
  model: string
  year: number
  assignedDriverId: string | null
  assignedDriverName: string | null
  status?: VehicleStatus
}

export default function OrganizationPage() {
  useRequireRole(UserRole.ADMIN, UserRole.MANAGER)
  const { user, isFleetMode, isSoloMode } = useAuth()
  const currentUserRole = user?.role ?? UserRole.DRIVER
  const isManager = currentUserRole === UserRole.MANAGER
  const isAdmin = currentUserRole === UserRole.ADMIN
  
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [invitePassword, setInvitePassword] = useState('')
  const [inviteRole, setInviteRole] = useState<UserRole>(UserRole.DRIVER)
  const [isInviting, setIsInviting] = useState(false)
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [inviteError, setInviteError] = useState('')
  
  // User editing state
  const [editingUser, setEditingUser] = useState<TeamMember | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editFirstName, setEditFirstName] = useState('')
  const [editLastName, setEditLastName] = useState('')
  const [editRole, setEditRole] = useState<UserRole>(UserRole.DRIVER)
  const [isUpdatingUser, setIsUpdatingUser] = useState(false)
  
  // Vehicle assignment state
  const [assigningVehicle, setAssigningVehicle] = useState<Vehicle | null>(null)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [selectedDriverId, setSelectedDriverId] = useState('')
  const [isAssigning, setIsAssigning] = useState(false)

  useEffect(() => {
    api
      .get('/organization/users')
      .then(({ data }) => {
        if (Array.isArray(data)) {
          setTeamMembers(
            data.map((m: Record<string, unknown>) => ({
              id: String(m.id),
              firstName: String(m.firstName),
              lastName: String(m.lastName),
              email: String(m.email),
              role: String(m.role) as UserRole,
              isActive: Boolean(m.isActive),
            }))
          )
        }
      })
      .catch(console.error)
  }, [])
  
  useEffect(() => {
    api
      .get('/vehicles')
      .then(({ data }) => {
        if (Array.isArray(data)) {
          setVehicles(
            data.map((v: Record<string, unknown>) => ({
              id: String(v.id),
              nickname: v.nickname as string | null,
              registrationNumber: String(v.registrationNumber),
              make: String(v.make),
              model: String(v.model),
              year: Number(v.year),
              assignedDriverId: v.assignedDriverId ? String(v.assignedDriverId) : null,
              assignedDriverName: v.assignedDriverName ? String(v.assignedDriverName) : null,
              status: v.status as VehicleStatus | undefined,
            }))
          )
        }
      })
      .catch(console.error)
  }, [])

  const handleInviteUser = async () => {
    if (!inviteEmail || !invitePassword) return

    // Check if email already exists in team members
    const emailExists = teamMembers.some(
      (member) => member.email.toLowerCase() === inviteEmail.toLowerCase()
    )

    if (emailExists) {
      setInviteError('This email is already registered in your organization')
      return
    }

    setIsInviting(true)
    setInviteError('')
    try {
      const { data } = await api.post('/organization/users', {
        email: inviteEmail,
        password: invitePassword,
        firstName: inviteEmail.split('@')[0],
        lastName: 'User',
        role: inviteRole,
      })

      setTeamMembers((prev) => [
        ...prev,
        {
          id: String(data.id),
          firstName: String(data.firstName),
          lastName: String(data.lastName),
          email: String(data.email),
          role: String(data.role) as UserRole,
          isActive: true,
        },
      ])

      setInviteEmail('')
      setInvitePassword('')
      setInviteDialogOpen(false)
    } catch (error) {
      console.error('Failed to invite user:', error)
      setInviteError('Failed to invite user. Please try again.')
    } finally {
      setIsInviting(false)
    }
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'default'
      case 'MANAGER':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  }
  
  const handleEditUser = (member: TeamMember) => {
    setEditingUser(member)
    setEditFirstName(member.firstName)
    setEditLastName(member.lastName)
    setEditRole(member.role)
    setEditDialogOpen(true)
  }
  
  const handleUpdateUser = async () => {
    if (!editingUser) return
    
    setIsUpdatingUser(true)
    try {
      await api.put(`/organization/users/${editingUser.id}`, {
        firstName: editFirstName,
        lastName: editLastName,
        role: editRole,
      })
      
      setTeamMembers((prev) =>
        prev.map((m) =>
          m.id === editingUser.id
            ? { ...m, firstName: editFirstName, lastName: editLastName, role: editRole }
            : m
        )
      )
      
      setEditDialogOpen(false)
      setEditingUser(null)
    } catch (error) {
      console.error('Failed to update user:', error)
    } finally {
      setIsUpdatingUser(false)
    }
  }
  
  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this user from the organization?')) return
    
    try {
      await api.delete(`/organization/users/${userId}`)
      setTeamMembers((prev) => prev.filter((m) => m.id !== userId))
    } catch (error) {
      console.error('Failed to delete user:', error)
    }
  }
  
  const handleAssignVehicle = (vehicle: Vehicle) => {
    setAssigningVehicle(vehicle)
    setSelectedDriverId(vehicle.assignedDriverId || 'unassigned')
    setAssignDialogOpen(true)
  }
  
  const handleUpdateVehicleAssignment = async () => {
    if (!assigningVehicle) return
    
    setIsAssigning(true)
    try {
      const driverIdParam = selectedDriverId === 'unassigned' ? null : selectedDriverId
      const url = driverIdParam 
        ? `/vehicles/${assigningVehicle.id}/assign-driver?driverId=${driverIdParam}`
        : `/vehicles/${assigningVehicle.id}/unassign-driver`
      
      await api.post(url, {})
      
      setVehicles((prev) =>
        prev.map((v) => {
          if (v.id === assigningVehicle.id) {
            const driver = teamMembers.find((m) => m.id === selectedDriverId)
            return {
              ...v,
              assignedDriverId: selectedDriverId === 'unassigned' ? null : selectedDriverId,
              assignedDriverName: driver ? `${driver.firstName} ${driver.lastName}` : null,
            }
          }
          return v
        })
      )
      
      setAssignDialogOpen(false)
      setAssigningVehicle(null)
    } catch (error) {
      console.error('Failed to assign vehicle:', error)
    } finally {
      setIsAssigning(false)
    }
  }
  
  const handleDeleteVehicle = async (vehicleId: string) => {
    if (!confirm('Are you sure you want to delete this vehicle?')) return

    try {
      await api.delete(`/vehicles/${vehicleId}`)
      setVehicles((prev) => prev.filter((v) => v.id !== vehicleId))
    } catch (error) {
      console.error('Failed to delete vehicle:', error)
    }
  }

  const handleApproveVehicleCreation = async (vehicleId: string) => {
    try {
      await api.post(`/vehicles/${vehicleId}/approve-creation`, {})
      setVehicles((prev) =>
        prev.map((v) =>
          v.id === vehicleId ? { ...v, status: VehicleStatus.ACTIVE } : v
        )
      )
    } catch (error) {
      console.error('Failed to approve vehicle creation:', error)
    }
  }

  const handleRejectVehicleCreation = async (vehicleId: string) => {
    if (!confirm('Are you sure you want to reject this vehicle creation?')) return

    try {
      await api.post(`/vehicles/${vehicleId}/reject-creation`, {})
      setVehicles((prev) => prev.filter((v) => v.id !== vehicleId))
    } catch (error) {
      console.error('Failed to reject vehicle creation:', error)
    }
  }

  const handleApproveVehicleDeletion = async (vehicleId: string) => {
    if (!confirm('Are you sure you want to approve this vehicle deletion?')) return

    try {
      await api.post(`/vehicles/${vehicleId}/approve-deletion`, {})
      setVehicles((prev) => prev.filter((v) => v.id !== vehicleId))
    } catch (error) {
      console.error('Failed to approve vehicle deletion:', error)
    }
  }

  const handleRejectVehicleDeletion = async (vehicleId: string) => {
    try {
      await api.post(`/vehicles/${vehicleId}/reject-deletion`, {})
      setVehicles((prev) =>
        prev.map((v) =>
          v.id === vehicleId ? { ...v, status: VehicleStatus.ACTIVE } : v
        )
      )
    } catch (error) {
      console.error('Failed to reject vehicle deletion:', error)
    }
  }
  
  const canEditUser = (member: TeamMember) => {
    // Managers cannot edit admins
    if (isManager && member.role === UserRole.ADMIN) return false
    // Users cannot edit themselves
    if (member.id === user?.id) return false
    return true
  }
  
  const canDeleteUser = (member: TeamMember) => {
    // Managers cannot delete admins
    if (isManager && member.role === UserRole.ADMIN) return false
    // Users cannot delete themselves
    if (member.id === user?.id) return false
    return true
  }
  
  const canDeleteVehicle = () => {
    // Only admins can delete vehicles
    return isAdmin
  }

  const getPendingVehicles = () => {
    return vehicles.filter(
      (v) =>
        v.status === VehicleStatus.PENDING_CREATION ||
        v.status === VehicleStatus.PENDING_DELETION
    )
  }

  return (
    <div className="container mx-auto space-y-6 p-4">
      {/* Header */}
      <div className="sticky top-14 z-30 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="flex items-center gap-3 py-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/settings">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="font-semibold">Organization</h1>
            <p className="text-xs text-muted-foreground">Manage your organization settings</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {/* Organization Details Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Organization Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Org Name and Icon */}
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-xl bg-primary/20 flex items-center justify-center">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="font-semibold text-lg">
                  {user?.organizationName || 'My Organization'}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={isSoloMode ? 'outline' : 'default'}>
                    {isSoloMode ? 'Individual' : 'Fleet'}
                  </Badge>
                </div>
              </div>
            </div>

            <Separator />

            {/* Plan Type Info */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                    <Crown className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">Plan Type</p>
                    <p className="text-sm text-muted-foreground">
                      {isSoloMode ? 'Individual / Freelancer' : 'Fleet / Business'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                    <Users className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">Team Members</p>
                    <p className="text-sm text-muted-foreground">
                      {isSoloMode ? '1 user' : `${teamMembers.length} members`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Team Members Card - Only shown for Fleet mode */}
        {isFleetMode && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Team Members
                  </CardTitle>
                  <CardDescription>
                    Manage your organization&apos;s users
                  </CardDescription>
                </div>
                <Dialog open={inviteDialogOpen} onOpenChange={(open) => {
                  setInviteDialogOpen(open)
                  if (!open) setInviteError('')
                }}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-1">
                      <UserPlus className="h-4 w-4" />
                      Invite
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Invite Team Member</DialogTitle>
                      <DialogDescription>
                        Send an invitation to join your organization
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      {inviteError && (
                        <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                          {inviteError}
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label htmlFor="invite-email">Email Address</Label>
                        <Input
                          id="invite-email"
                          type="email"
                          placeholder="colleague@example.co.za"
                          value={inviteEmail}
                          onChange={(e) => {
                            setInviteEmail(e.target.value)
                            setInviteError('')
                          }}
                          className="h-12"
                          autoComplete="email"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="invite-password">Temporary Password</Label>
                        <Input
                          id="invite-password"
                          type="password"
                          placeholder="Enter a temporary password"
                          value={invitePassword}
                          onChange={(e) => {
                            setInvitePassword(e.target.value)
                            setInviteError('')
                          }}
                          className="h-12"
                          autoComplete="new-password"
                        />
                        <p className="text-xs text-muted-foreground">
                          Share this password with the invited user. They can change it after logging in.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="invite-role">Role</Label>
                        <Select
                          value={inviteRole}
                          onValueChange={(value) => setInviteRole(value as UserRole)}
                        >
                          <SelectTrigger id="invite-role" className="h-12">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={UserRole.ADMIN}>
                              <div className="flex items-center gap-2">
                                <Shield className="h-4 w-4" />
                                <span>Admin - Full access</span>
                              </div>
                            </SelectItem>
                            <SelectItem value={UserRole.MANAGER}>
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                <span>Manager - View all, manage subset</span>
                              </div>
                            </SelectItem>
                            <SelectItem value={UserRole.DRIVER}>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                <span>Driver - Assigned vehicles only</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        onClick={handleInviteUser}
                        disabled={!inviteEmail || !invitePassword || isInviting}
                        className="w-full h-12"
                      >
                        {isInviting ? 'Sending Invitation...' : 'Send Invitation'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {teamMembers.map((member) => (
                  <div
                    key={member.id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border',
                      !member.isActive && 'opacity-60'
                    )}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className={cn(
                        'text-sm font-medium',
                        member.role === 'ADMIN' && 'bg-primary/20 text-primary',
                        member.role === 'MANAGER' && 'bg-secondary text-secondary-foreground',
                        member.role === 'DRIVER' && 'bg-muted text-muted-foreground'
                      )}>
                        {getInitials(member.firstName, member.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">
                          {member.firstName} {member.lastName}
                        </p>
                        {!member.isActive && (
                          <Badge variant="outline" className="text-xs">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {member.email}
                      </p>
                    </div>
                    <Badge variant={getRoleBadgeVariant(member.role)}>
                      {member.role}
                    </Badge>
                    {(canEditUser(member) || canDeleteUser(member)) && (
                      <div className="flex items-center gap-1">
                        {canEditUser(member) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEditUser(member)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {canDeleteUser(member) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteUser(member.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pending Vehicles Approval Card - Only shown for Admins in Fleet mode */}
        {isFleetMode && isAdmin && getPendingVehicles().length > 0 && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-amber-700">
                    <Clock className="h-5 w-5" />
                    Pending Vehicle Approvals
                  </CardTitle>
                  <CardDescription>
                    Review and approve vehicle changes requested by managers
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {getPendingVehicles().map((vehicle) => (
                  <div
                    key={vehicle.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-amber-500/30 bg-background"
                  >
                    <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <Car className="h-5 w-5 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {vehicle.nickname || `${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {vehicle.registrationNumber}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        vehicle.status === VehicleStatus.PENDING_CREATION
                          ? "border-amber-500/30 bg-amber-500/10 text-amber-600"
                          : "border-red-500/30 bg-red-500/10 text-red-600"
                      )}
                    >
                      <Clock className="mr-1 h-3 w-3" />
                      {vehicle.status === VehicleStatus.PENDING_CREATION
                        ? "Pending Creation"
                        : "Pending Deletion"}
                    </Badge>
                    <div className="flex items-center gap-1">
                      {vehicle.status === VehicleStatus.PENDING_CREATION ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-500/10"
                            onClick={() => handleApproveVehicleCreation(vehicle.id)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-500/10"
                            onClick={() => handleRejectVehicleCreation(vehicle.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-500/10"
                            onClick={() => handleApproveVehicleDeletion(vehicle.id)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-500/10"
                            onClick={() => handleRejectVehicleDeletion(vehicle.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Vehicles Card - Only shown for Fleet mode */}
        {isFleetMode && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Car className="h-5 w-5 text-primary" />
                    Vehicles
                  </CardTitle>
                  <CardDescription>
                    Manage your organization&apos;s vehicles
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {vehicles.map((vehicle) => (
                  <div
                    key={vehicle.id}
                    className="flex items-center gap-3 p-3 rounded-lg border"
                  >
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                      <Car className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {vehicle.nickname || `${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {vehicle.registrationNumber}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {vehicle.assignedDriverName && (
                        <Badge variant="outline" className="text-xs">
                          {vehicle.assignedDriverName}
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleAssignVehicle(vehicle)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {canDeleteVehicle() && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteVehicle(vehicle.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {vehicles.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No vehicles yet. Add your first vehicle to get started.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Solo Mode Info */}
        {isSoloMode && (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <User className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="font-medium mb-1">Individual Account</h3>
              <p className="text-sm text-muted-foreground mb-4">
                You&apos;re using a solo account for personal vehicle management.
              </p>
              <Button variant="outline" size="sm">
                Upgrade to Fleet Plan
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Team Member</DialogTitle>
            <DialogDescription>
              Update team member details and role
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-first-name">First Name</Label>
              <Input
                id="edit-first-name"
                value={editFirstName}
                onChange={(e) => setEditFirstName(e.target.value)}
                className="h-12"
                autoComplete="given-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-last-name">Last Name</Label>
              <Input
                id="edit-last-name"
                value={editLastName}
                onChange={(e) => setEditLastName(e.target.value)}
                className="h-12"
                autoComplete="family-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">Role</Label>
              <Select
                value={editRole}
                onValueChange={(value) => setEditRole(value as UserRole)}
                disabled={isManager && editingUser?.role === UserRole.ADMIN}
              >
                <SelectTrigger id="edit-role" className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UserRole.ADMIN} disabled={isManager}>
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      <span>Admin - Full access</span>
                    </div>
                  </SelectItem>
                  <SelectItem value={UserRole.MANAGER}>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>Manager - View all, manage subset</span>
                    </div>
                  </SelectItem>
                  <SelectItem value={UserRole.DRIVER}>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>Driver - Assigned vehicles only</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {isManager && editingUser?.role === UserRole.ADMIN && (
                <p className="text-xs text-muted-foreground">
                  Managers cannot change admin roles
                </p>
              )}
            </div>
            <Button
              onClick={handleUpdateUser}
              disabled={!editFirstName || !editLastName || isUpdatingUser}
              className="w-full h-12"
            >
              {isUpdatingUser ? 'Updating...' : 'Update Member'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Assign Vehicle Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Vehicle</DialogTitle>
            <DialogDescription>
              Assign a driver to {assigningVehicle?.nickname || `${assigningVehicle?.year} ${assigningVehicle?.make} ${assigningVehicle?.model}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="assign-driver">Driver</Label>
              <Select
                value={selectedDriverId}
                onValueChange={setSelectedDriverId}
              >
                <SelectTrigger id="assign-driver" className="h-12">
                  <SelectValue placeholder="Select a driver" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">
                    <span>Unassigned</span>
                  </SelectItem>
                  {teamMembers
                    .filter((m) => {
                      // Admins can assign to both MANAGER and DRIVER
                      // Managers can only assign to DRIVER
                      if (isAdmin) {
                        return m.role === UserRole.DRIVER || m.role === UserRole.MANAGER
                      } else {
                        return m.role === UserRole.DRIVER
                      }
                    })
                    .map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.firstName} {member.lastName} ({member.role})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleUpdateVehicleAssignment}
              disabled={isAssigning}
              className="w-full h-12"
            >
              {isAssigning ? 'Assigning...' : 'Assign Vehicle'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
