import React from 'react'
import { useSelector } from 'react-redux'
import NotAuthorized from './not-authorised'
import { useAuth } from '../hooks/use-auth'
import { useContext } from 'react'
import { authContext } from '@/components/use-context'

const ProtectedRoute = ({ permission, children }) => {
    const { userPermissions } = useSelector((store) => store.auth);
    const auth = useAuth();
    const { isTokenValid } = useContext(authContext);

    // Check if user is authenticated and has valid token
    const isAuthenticated = auth?.token && auth?.user_id && isTokenValid(auth.token);
    
    if (!isAuthenticated) {
        // User is not authenticated or token is invalid/expired
        return <NotAuthorized isAuthenticated={false} requiredPermission={permission} />
    }

    // Ensure userPermissions is an array before using array methods
    const permissions = Array.isArray(userPermissions) ? userPermissions : [];

    // Check if current user has permission to access the route in question
    const isAuthorized = permissions.find((perm) => perm === permission)

    if (!isAuthorized) {
        // User is authenticated but lacks required permission
        return <NotAuthorized isAuthenticated={true} requiredPermission={permission} userRole={auth?.role} />
    }

    return (
        <>{children}</>
    )
}

export default ProtectedRoute