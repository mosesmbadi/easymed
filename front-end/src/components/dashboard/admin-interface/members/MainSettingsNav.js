import React from 'react'
import Link from 'next/link'

const MainSettingsNav = ( { setSelectedRoute, selectedRoute } ) => {
  return (
    <ul className='flex flex-row gap-4 items-center'>
        <li
            className={`cursor-pointer ${selectedRoute === 'members' ? "font-semibold text-xl text-warning ": ""}`}
            onClick={()=>setSelectedRoute("members")}
        >
            Users And Rights
        </li>
        <li
          className={`cursor-pointer ${selectedRoute === 'company' ? "font-semibold text-xl text-warning ": ""}`}
          onClick={()=>setSelectedRoute("company")}
        >
          Company
        </li>
        <li
          className={`cursor-pointer ${selectedRoute === 'announcements' ? "font-semibold text-xl text-warning ": ""}`}
          onClick={()=>setSelectedRoute("announcements")}
        >
            Announcements
        </li>
        <li>
          <Link href="/dashboard/admin-interface/docs" className='cursor-pointer hover:text-warning'>
            Docs
          </Link>
        </li>
    </ul>
  )
}

export default MainSettingsNav;