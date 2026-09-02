'use client'

import { AuthProvider, useAuth } from '@/lib/contexts/auth-context'
import { BottomNav } from '@/components/navigation/bottom-nav'
import { DashboardHeader } from '@/components/navigation/dashboard-header'
import { SidebarNav } from '@/components/navigation/sidebar-nav'
import { PasswordChangeWarningDialog } from '@/components/auth/password-change-warning-dialog'
import { useEffect, useState } from 'react'

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { user, isFleetMode } = useAuth()
  const [showPasswordWarning, setShowPasswordWarning] = useState(false)

  useEffect(() => {
    // Show password change warning only for fleet mode users with temporary passwords
    if (user && isFleetMode && !user.passwordChanged) {
      // Only show if user was invited by admin with temporary password
      setShowPasswordWarning(true)
    }
  }, [user, isFleetMode])

  // Workaround to prevent redirect from settings page to /dashboard for ASSISTANT users
  useEffect(() => {
    const checkAndFixRedirect = () => {
      if (window.location.pathname === '/dashboard' && user?.assistantRole) {
        // If we're on /dashboard but should be on settings, redirect back
        // This is a workaround for Next.js internal routing issue
        const wasOnSettings = sessionStorage.getItem('wasOnSettings') === 'true'
        if (wasOnSettings) {
          window.history.pushState({}, '', '/dashboard/settings')
        }
      }
    }
    
    // Check immediately
    checkAndFixRedirect()
    
    // Check periodically (every 100ms) to catch redirects
    const interval = setInterval(checkAndFixRedirect, 100)
    
    return () => clearInterval(interval)
  }, [user?.assistantRole])

  // Track when user navigates to settings page
  useEffect(() => {
    const handleRouteChange = () => {
      if (window.location.pathname === '/dashboard/settings') {
        sessionStorage.setItem('wasOnSettings', 'true')
      } else if (window.location.pathname === '/dashboard') {
        sessionStorage.removeItem('wasOnSettings')
      }
    }
    
    window.addEventListener('popstate', handleRouteChange)
    handleRouteChange() // Check on mount
    
    return () => window.removeEventListener('popstate', handleRouteChange)
  }, [])

  return (
    <>
      <div className="flex min-h-screen flex-col bg-background">
        <DashboardHeader />
        <div className="flex flex-1">
          <SidebarNav />
          <main className="flex-1 pb-20 md:pb-0 md:pl-0 overflow-x-hidden w-full max-w-full">
            {children}
          </main>
        </div>
        <BottomNav />
      </div>
      <PasswordChangeWarningDialog 
        isOpen={showPasswordWarning} 
        onClose={() => setShowPasswordWarning(false)} 
      />
    </>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <DashboardContent>{children}</DashboardContent>
    </AuthProvider>
  )
}
