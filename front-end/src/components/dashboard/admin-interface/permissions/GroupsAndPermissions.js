import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import { getAllGroups, getAllPermissions } from '@/redux/features/auth'
import { useAuth } from '@/assets/hooks/use-auth'

import GroupPermissionItem from './GroupPermissionItem'

const GroupsAndPermissions = () => {
  const dispatch = useDispatch();
  const auth = useAuth();
  const allGroups = useSelector((store=> store.auth.groups))

  console.log("ALL GROUPS AVAILABLE DATA IS", allGroups)


  useEffect(()=> {
    if(auth){
      dispatch(getAllGroups(auth));
      dispatch(getAllPermissions(auth));
    }
  }, [auth])

  const groupsWithTheirPermissions = allGroups.map((group)=> <GroupPermissionItem group={group} key={`all_the_groups_${group.id}`}/> )

  return (
    <div>
      {groupsWithTheirPermissions}
    </div>
  )
}

export default GroupsAndPermissions