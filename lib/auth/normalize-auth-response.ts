/** Spring Boot AuthResponse — flat JSON (no nested `user`). */
export interface SpringAuthPayload {
  accessToken: string
  refreshToken?: string
  userId: string
  email: string
  firstName: string
  lastName: string
  role: string
  organizationId: string
  organizationName: string
  organizationMode: string
}

export interface NormalizedAuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  organizationId: string
  organizationName: string
  organizationMode: string
}

export interface NormalizedAuthResponse {
  accessToken: string
  refreshToken?: string
  user: NormalizedAuthUser
}

function isFlatSpringAuth(data: Record<string, unknown>): data is Record<string, unknown> & SpringAuthPayload {
  return typeof data.accessToken === 'string' && data.user === undefined
}

export function normalizeAuthResponse(raw: unknown): NormalizedAuthResponse {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid auth response from server')
  }

  const data = raw as Record<string, unknown>

  if (data.user && typeof data.user === 'object') {
    const u = data.user as Record<string, unknown>
    return {
      accessToken: String(data.accessToken),
      refreshToken: data.refreshToken ? String(data.refreshToken) : undefined,
      user: {
        id: String(u.id ?? u.userId),
        email: String(u.email),
        firstName: String(u.firstName),
        lastName: String(u.lastName),
        role: String(u.role),
        organizationId: String(u.organizationId),
        organizationName: String(u.organizationName ?? ''),
        organizationMode: String(u.organizationMode),
      },
    }
  }

  if (!isFlatSpringAuth(data)) {
    throw new Error('Invalid auth response from server')
  }

  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    user: {
      id: String(data.userId),
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
      organizationId: String(data.organizationId),
      organizationName: data.organizationName,
      organizationMode: data.organizationMode,
    },
  }
}

export function persistAuthSession(auth: NormalizedAuthResponse): void {
  localStorage.setItem('jwt_token', auth.accessToken)
  localStorage.setItem('role', auth.user.role)
  localStorage.setItem('org_mode', auth.user.organizationMode)
  localStorage.setItem('user_profile', JSON.stringify(auth.user))
  if (auth.refreshToken) {
    localStorage.setItem('refresh_token', auth.refreshToken)
  }
  // Set client cookie so Next.js middleware can read role for route guards
  if (typeof document !== 'undefined') {
    const maxAge = 7 * 24 * 60 * 60
    const roleCookie = `auth_role=${auth.user.role};path=/;max-age=${maxAge};SameSite=Lax`
    const orgCookie = `auth_org_mode=${auth.user.organizationMode};path=/;max-age=${maxAge};SameSite=Lax`
    document.cookie = roleCookie
    document.cookie = orgCookie
  }
}

export function clearAuthCookies(): void {
  if (typeof document !== 'undefined') {
    document.cookie = 'auth_role=;path=/;max-age=0;SameSite=Lax'
    document.cookie = 'auth_org_mode=;path=/;max-age=0;SameSite=Lax'
  }
}
