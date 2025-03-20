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

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const dispatch = useDispatch();
  const auth = useAuth();
  const companyDetails = useSelector((store) => store.company.companyDetails);

  useEffect(() => {
    if (auth.token) {
      dispatch(getCompanyDetails(auth));
    }
  }, [auth]);

  return (
    <>
      <section className="">
        <header className="h-[15vh] shadow flex items-center justify-center font-bold">
          <img src={companyDetails.logo} alt="logo" className="h-36" />
        </header>
        <section className="pl-2 h-[84vh] flex flex-col justify-between">
          <div className="overflow-x-auto">
            <ul className="space-y-3 my-4 pr-1">
              {menus.map((menu, index) => (
                <MenuChild key={index} {...{ index, menu, collapsed }} />
              ))}
            </ul>
            <div className="space-y-2 mt-4 pl-4 text-xs">
              <Link
                href="/dashboard/admin-interface"
                className="flex items-center gap-2"
              >
                <IoMdSettings className="" />
                <p>Settings</p>
              </Link>
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
