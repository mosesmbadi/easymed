import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import Link from 'next/link'
import { Grid } from '@mui/material'
import ProfileEdit from './ProfileEdit'
import { useAuth } from '@/assets/hooks/use-auth'
import { getUserById } from '@/redux/service/user'
import { getCurrentUser } from '@/redux/features/users'
import { VscAccount } from 'react-icons/vsc'

const AccountProfile = () => {
  const auth = useAuth();
  const dispatch = useDispatch();
  const currentUser = useSelector((store)=> store.user.userProfile)

  console.log(currentUser);
  console.log(auth)

  useEffect(()=>{
    if (auth){
      dispatch(getCurrentUser(auth));
    }
  }, [auth]);

  return (
    <div className='flex flex-col justify-between w-full px-4'>
      <div className='w-full border border-gray py-4 my-2 rounded shadow-lg'>
      <Grid className='justify-center flex px-8' container>
        <Grid className='' xs={6}>
          <div className='flex items-center gap-4'>
              <VscAccount
                className="h-28 w-28 rounded-full cursor-pointer"
              />
            <div className='flex flex-col text-center gap-2'>
              <p className='text-xl font-semibold'>{`${currentUser.first_name} ${currentUser.last_name}`}</p>
              <p className='text-sm'>{`${currentUser.role}`}</p>
              <p className='text-sm'>{`${currentUser.profession}`}</p>
            </div>
          </div>
        </Grid>
        <Grid className='text-center items-center justify-end flex' xs={6}>
          <div className='flex flex-col gap-4'>
            <div className='bg-primary rounded text-white px-4'>Active</div>
            <ProfileEdit/>
          </div>
        </Grid>
      </Grid>
      </div>
      <div className='w-full border border-gray py-4 my-2 rounded shadow-lg'>
        <h5 className='mb-4 pl-4 font-bold'>Personal Information</h5>
        <Grid className='justify-center flex px-8' container spacing={2}>
          <Grid className='my-4' xs={4}>
            <label>First Name</label>
            <p className='text-sm text-primary my-2'>{`${currentUser.first_name}`}</p>
          </Grid>
          <Grid className='my-4' xs={4}>
            <label>Last Name</label>
            <p className='text-sm text-primary my-2'>{`${currentUser.last_name}`}</p>          
          </Grid>
          <Grid className='my-4' xs={4}>
            <label>Email Address</label>
            <p className='text-sm text-primary my-2'>{`${currentUser.email}`}</p>
          </Grid>
          <Grid className='my-4' xs={4}>
            <label>Phone Number</label>
            <p className='text-sm text-primary my-2'>{`${currentUser.phone}`}</p>          
          </Grid>
          <Grid className='my-4' xs={4}>
            <label>Role</label>
            <p className='text-sm text-primary my-2'>{`${currentUser.role}`}</p>          
          </Grid>
          <Grid className='my-4' xs={4}>
            <label>Proffession</label>
            <p className='text-sm text-primary my-2'>{`${currentUser.profession}`}</p>          
          </Grid>
        </Grid>        
      </div>
    </div>
  )
}

export default AccountProfile;