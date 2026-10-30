import React, { useContext } from 'react'
import { CiBellOn } from "react-icons/ci";
import { TbLogout2 } from 'react-icons/tb';

import { useSelector } from 'react-redux';

import { authContext } from "@/components/use-context";
import { useAuth } from '@/assets/hooks/use-auth';

const OverviewNav = () => {
    const { logoutUser } = useContext(authContext);
    const auth = useAuth();
    const { patients } = useSelector((store) => store.patient);
    const loggedInPatient = patients.find((patient)=> patient.user === auth?.user_id)

    const welcomingText = loggedInPatient ? `${loggedInPatient.first_name} ${loggedInPatient.second_name}` : "Update Your Profile First"

  return (
    <div className='w-full h-[10vh] py-2 px-2 flex items-center justify-between'>
        <div className='flex items-center gap-2'>
            <p className='font-bold text-xl text-primary'> {`Welcome ${loggedInPatient ? 'Back' : ""} ,`} </p>
            <p className='font-semibold'> {welcomingText} </p>
        </div>
        <div className='flex items-center gap-4 hidden sm:flex'>
            <div>
                <input className='border border-gray focus:outline-none focus:border-gray py-2 px-2 rounded-lg' placeholder='search ...'/>
            </div>
            <CiBellOn className='text-3xl cursor-pointer'/>
            <div className="flex items-center gap-4">
            <button
              onClick={logoutUser}
              className="bg-primary text-sm text-white shadow-xl px-8 py-2 rounded-xl flex items-center gap-3"
            >
              <TbLogout2 />
              Logout
            </button>
          </div>
        </div>
    </div>
  )
}

export default OverviewNav