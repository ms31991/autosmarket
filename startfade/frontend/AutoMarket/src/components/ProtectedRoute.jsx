import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function ProtectedRoute({ children, requiredRole }) {
  const { isLoaded, isSignedIn, dbUser, loadingDbUser } = useAuth()
  const location = useLocation()

  if (!isLoaded) {
    return null
  }

  if (!isSignedIn) {
    const next = `${location.pathname}${location.search || ''}`
    const redirect = next.startsWith('/') ? `?redirect=${encodeURIComponent(next)}` : ''
    return <Navigate to={`/login${redirect}`} replace />
  }

  if (requiredRole && loadingDbUser) {
    return null
  }

  if (requiredRole) {
    const roleName = dbUser?.roleName || dbUser?.RoleName
    if (roleName !== requiredRole) {
      return <Navigate to="/" replace />
    }
  }

  return children
}

export default ProtectedRoute
