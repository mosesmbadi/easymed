import React from "react";
import Sidebar from "./sidebar";
import RightBar from "./rightbar";

const DashboardLayout = ({ children }) => {
  return (
    <div className="md:flex md:h-screen h-auto overflow-hidden bg-background">
      <div className="w-56 bg-white shadow-xl border-primary md:block hidden">
        <Sidebar />
      </div>

      <div className="flex-1 overflow-y-auto hideMiddleSectionScrollbar">
        <div className="">{children}</div>
      </div>
      <div className="w-72 md:block hidden">
        <RightBar />
      </div>
    </div>
  );
};

export default DashboardLayout;
