import React, { useState } from 'react'

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
    </ul>
  )
}

export default MainSettingsNav;