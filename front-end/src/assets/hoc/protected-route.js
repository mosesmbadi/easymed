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
    if (!auth?.token || !auth?.user_id || !isTokenValid(auth.token)) {
        return <NotAuthorized />
    }

    // Ensure userPermissions is an array before using array methods
    const permissions = Array.isArray(userPermissions) ? userPermissions : [];

    // Check if current user has permission to access the route in question
    const isAuthorized = permissions.find((perm) => perm === permission)

    if (!isAuthorized) {
        return <NotAuthorized />
    }

    return (
        <>{children}</>
    )
}

export default ProtectedRoute