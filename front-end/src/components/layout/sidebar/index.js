import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { menus } from "@/assets/menu";
import MenuChild from "./menu-children";
import { IoMdSettings } from "react-icons/io";
import Link from "next/link";
import SupportModal from "./SupportModal";
import VersionModal from "./VersionModal";

import { useAuth } from "@/assets/hooks/use-auth";
import { getCompanyDetails } from "@/redux/features/company";
import { useUserPermissions } from "@/assets/hooks/use-permission";

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const dispatch = useDispatch();
  const auth = useAuth();
  const companyDetails = useSelector((store) => store.company.companyDetails);
  const userPermissions = useUserPermissions();

  useEffect(() => {
    if (auth.token) {
      dispatch(getCompanyDetails(auth));
    }
  }, [auth]);

  // Filter menus based on user permissions
  const filterMenusByPermission = (menuItems) => {
    return menuItems.filter(menu => {
      // If no permission required, show the menu
      if (!menu.requiredPermission) {
        return true;
      }

      // Check if user has the required permission
      const hasPermission = userPermissions.includes(menu.requiredPermission);
      
      // If menu has children, filter them too
      if (menu.children) {
        menu.children = menu.children.filter(child => {
          if (!child.requiredPermission) return true;
          return userPermissions.includes(child.requiredPermission);
        });
        
        // Only show parent menu if it has permission OR has visible children
        return hasPermission || menu.children.length > 0;
      }
      
      return hasPermission;
    });
  };

  const filteredMenus = filterMenusByPermission(menus);

  return (
    <>
      <section className="">
        <header className="h-[15vh] shadow flex items-center justify-center font-bold">
          <img src={companyDetails.logo} alt="logo" className="h-36" />
        </header>
        <section className="pl-2 h-[84vh] flex flex-col justify-between">
          <div className="overflow-x-auto">
            <ul className="space-y-3 my-4 pr-1">
              {filteredMenus.map((menu, index) => (
                <MenuChild key={index} {...{ index, menu, collapsed }} />
              ))}
            </ul>
            <div className="space-y-2 mt-4 pl-4 text-xs">
              {userPermissions.includes("CAN_ACCESS_ADMIN_DASHBOARD") && (
                <Link
                  href="/dashboard/admin-interface"
                  className="flex items-center gap-2"
                >
                  <IoMdSettings className="" />
                  <p>Settings</p>
                </Link>
              )}
              <SupportModal />
              <VersionModal />
            </div>
          </div>
        </section>
      </section>
    </>
  );
};

export default Sidebar;
