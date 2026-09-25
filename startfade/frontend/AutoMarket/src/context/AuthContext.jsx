import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react'

import { useUser, useAuth as useClerkAuth } from '@clerk/clerk-react'
import { apiFetch } from '../services/api'

// ==========================================
// CONTEXT
// ==========================================
//
// Ky context i mundëson çdo komponenti të dijë:
//   - a je i kyçur (isSignedIn, nga Clerk)
//   - kush je në DB-në tonë (dbUser)
// ==========================================

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const { isLoaded, isSignedIn, getToken } = useClerkAuth()
  const { user: clerkUser } = useUser()

  const [dbUser, setDbUser] = useState(null)
  const [loadingDbUser, setLoadingDbUser] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadDbUser() {
      if (!isLoaded) {
        return
      }

      if (!isSignedIn) {
        if (isMounted) {
          setDbUser(null)
          setLoadingDbUser(false)
        }
        return
      }

      try {
        setLoadingDbUser(true)
        setError('')

        // Sigurohu që ApplicationUser ekziston
        // (idempotent: nëse ekziston, s'bën gjë)
        const token = await getToken()
        await apiFetch('/Users/sync', {
          method: 'POST',
          token,
          body: JSON.stringify({
            name: clerkUser?.firstName || '',
            surname: clerkUser?.lastName || '',
            userName: clerkUser?.username || '',
            email: clerkUser?.primaryEmailAddress?.emailAddress || '',
          }),
        })

        // Merr profilin
        const profile = await apiFetch('/Users/profile')

        if (isMounted) {
          setDbUser(profile)
        }
      } catch (err) {
        console.error('LOAD CURRENT USER ERROR:', err)

        if (isMounted) {
          setError(
            err.message || 'Nuk u morën të dhënat e user-it.'
          )
        }
      } finally {
        if (isMounted) {
          setLoadingDbUser(false)
        }
      }
    }

    loadDbUser()

    return () => {
      isMounted = false
    }
  }, [clerkUser, getToken, isLoaded, isSignedIn])

  const refreshDbUser = async () => {
    if (!isSignedIn) {
      setDbUser(null)
      return null
    }

    const profile = await apiFetch('/Users/profile')
    setDbUser(profile)
    return profile
  }

  const value = {
    isLoaded,
    isSignedIn,
    clerkUser,
    dbUser,
    loadingDbUser,
    error,
    refreshDbUser,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// ==========================================
// HOOK
// ==========================================

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error(
      'useAuth duhet përdorur brenda <AuthProvider>.'
    )
  }

  return context
}