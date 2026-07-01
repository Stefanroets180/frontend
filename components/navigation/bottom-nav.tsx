'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Receipt,
  Car,
  BookOpen,
  Settings,
  Plus,
  Building2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/contexts/auth-context'
import { UserRole } from '@/lib/types/database'

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

function getNavItems(role: UserRole): NavItem[] {
  const isDriver = role === UserRole.DRIVER

  const items: NavItem[] = [
    { href: '/dashboard', label: 'Home', icon: Home },
    { href: '/dashboard/expenses', label: isDriver ? 'My Expenses' : 'Expenses', icon: Receipt },
    { href: '/dashboard/vehicles', label: isDriver ? 'My Vehicle' : 'Vehicles', icon: Car },
    { href: '/dashboard/logbook', label: isDriver ? 'My Logbook' : 'Logbook', icon: BookOpen },
    { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  ]

  if (!isDriver) {
    items.splice(4, 0, { href: '/dashboard/organization', label: 'Org', icon: Building2 })
  }

  return items
}

export function BottomNav() {
  const pathname = usePathname()
  const { user } = useAuth()
  const role = user?.role ?? UserRole.DRIVER
  const navItems = getNavItems(role)

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card safe-bottom md:hidden">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/dashboard' && pathname.startsWith(item.href))
          const Icon = item.icon
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center py-2 px-3 touch-target transition-colors',
                isActive 
                  ? 'text-primary' 
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className={cn('h-6 w-6', isActive && 'stroke-[2.5]')} />
              <span className="text-xs mt-1 font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

