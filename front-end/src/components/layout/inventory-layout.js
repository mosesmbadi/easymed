import React from "react";
import Sidebar from "./sidebar";
import Header from "./header";
import InventoryRightBar from "./rightbar/inventory-rightbar";


const InventoryLayout = ({ children }) => {
  return (
    <div className="md:flex gap-2 h-screen overflow-hidden sm:p-4 bg-background">
      <div className="w-52 bg-white shadow-xl border-primary rounded md:block hidden">
        <Sidebar />
      </div>

      <div className="flex-1 overflow-y-auto hideMiddleSectionScrollbar">
        {/* <Header /> */}
        <div className="">{children}</div>
      </div>
      <div className="w-72 md:block hidden">
        <InventoryRightBar />
      </div>
    </div>
  );
};

export default InventoryLayout;
