import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useSelector } from 'react-redux';
import { addPermission } from '@/redux/service/auth';
import { fetchGroupPermissions } from '@/redux/service/auth';
import { useAuth } from '@/assets/hooks/use-auth';

const GroupPermissionItem = ({ group }) => {
  const auth = useAuth()
  const allPermissions = useSelector((store) => store.auth.allPermissions);
  const userCurrentPermissions = useSelector((store) => store.auth.userPermissions);
  const [availableUserPermissions, setAvailableUserPermissions] = useState();

  const getUserAvailablePermissions = async (id, auth) => {
    await fetchGroupPermissions(id, auth).then((res) => setAvailableUserPermissions(res.permissions))
  }

  // currently removes and adds permissions from frontend and need logic to add to backend.
  const handleAddPermission = async () => {
    console.log("Available Permissions Before API Call:", availableUserPermissions); // Log before sending request

    if (!availableUserPermissions || availableUserPermissions.length === 0) {
      console.error("No permissions selected");
      return;
    }

    const payload = {
      permissions: availableUserPermissions
        .map(perm => {
          console.log("Mapping Permission ID:", perm.id); // Log each mapped permission ID
          return perm.id;
        })
        .filter(id => id !== null && id !== undefined) // Remove null/undefined values
    };

    console.log("Final Payload Sent to API:", JSON.stringify(payload, null, 2)); // Debugging

    if (payload.permissions.length === 0) {
      console.error("No valid permission IDs found");
      return;
    }

    try {
      await addPermission(group.id, payload, auth);
      toast.success("Permissions updated successfully!");
    } catch (error) {
      console.error("Error adding permissions:", error);
    }
};

  const handleChanged = (perm) => {
    console.log("Clicked Permission:", perm); // Log the clicked permission

    const index = availableUserPermissions?.findIndex(p => p.id === perm.id);

    if (index !== -1) {
      // If permission is already present, remove it
      const updatedPermissions = [...availableUserPermissions];
      updatedPermissions.splice(index, 1);
      setAvailableUserPermissions(updatedPermissions);
    } else {
      // If permission is not present, add it
      setAvailableUserPermissions(prevPermissions => [...(prevPermissions || []), perm]);
    }

    console.log("Updated availableUserPermissions:", availableUserPermissions); // Log updated permissions
};

  useEffect(() => {
    if (auth) {
      getUserAvailablePermissions(group.id, auth);
    }
  }, [group]);

  const allPermissionsAvailable = allPermissions.map((perm) => (
    <li className='flex justify-between w-full px-4' key={`permissions_Keys_${perm.id}`}>
      <span>{perm.name}</span>
      <input
        type='checkbox'
        onChange={() => {
          handleChanged(perm);  
          handleAddPermission(); 
        }}
        checked={availableUserPermissions?.some(permission => permission.name === perm.name)}
      />
    </li>

  )
  )

  return (
    <div className='border border-gray my-2 p-2'>
      <label className='font-bold'>{group.name}</label>
      <div>
        <ul className='grid grid-cols-2'>
          {allPermissionsAvailable}
        </ul>
      </div>
    </div>
  )
}

export default GroupPermissionItem