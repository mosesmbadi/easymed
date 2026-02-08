import { useSelector } from 'react-redux';

/**
 * Custom hook to check if user has a specific permission
 * @param {string} permission - The permission to check
 * @returns {boolean} - True if user has the permission, false otherwise
 */
export const usePermission = (permission) => {
  const { userPermissions } = useSelector((store) => store.auth);
  const permissions = Array.isArray(userPermissions) ? userPermissions : [];
  return permissions.includes(permission);
};

/**
 * Custom hook to check if user has any of the specified permissions
 * @param {Array<string>} permissionArray - Array of permissions to check
 * @returns {boolean} - True if user has at least one permission, false otherwise
 */
export const useAnyPermission = (permissionArray) => {
  const { userPermissions } = useSelector((store) => store.auth);
  const permissions = Array.isArray(userPermissions) ? userPermissions : [];
  return permissionArray.some(permission => permissions.includes(permission));
};

/**
 * Custom hook to check if user has all of the specified permissions
 * @param {Array<string>} permissionArray - Array of permissions to check
 * @returns {boolean} - True if user has all permissions, false otherwise
 */
export const useAllPermissions = (permissionArray) => {
  const { userPermissions } = useSelector((store) => store.auth);
  const permissions = Array.isArray(userPermissions) ? userPermissions : [];
  return permissionArray.every(permission => permissions.includes(permission));
};

/**
 * Custom hook to get all user permissions
 * @returns {Array<string>} - Array of user's permissions
 */
export const useUserPermissions = () => {
  const { userPermissions } = useSelector((store) => store.auth);
  return Array.isArray(userPermissions) ? userPermissions : [];
};
