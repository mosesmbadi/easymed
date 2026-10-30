import React, { useState } from 'react'
import { AccMenus } from "@/assets/menu";
import MenuChild from '../layout/sidebar/menu-children'
import AccMenuChild from './AccountMenu';

const AccountNav = () => {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div>
      <ul className="space-y-3 my-4 pr-1">
        {AccMenus.map((menu, index) => (
          <AccMenuChild key={index} {...{ index, menu, collapsed }} />
        ))}
      </ul>
    </div>
  )
}

export default AccountNav