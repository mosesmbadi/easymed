import React from "react";
import Sidebar from "./sidebar";
import RightBar from "./rightbar";
import CustomizedHeader from "./customized-header";
import TopSection from "./rightbar/top-section";


const CustomizedLayout = ({ children }) => {
  return (
    <div className="md:flex md:h-screen h-auto overflow-hidden bg-background">
      <div className="w-56 bg-white shadow-xl rounded md:block hidden">
        <Sidebar />
      </div>

      <div className="flex-1 overflow-y-auto hideMiddleSectionScrollbar">
        <div className="w-full pr-8 h-[10vh]">
          <div className="flex justify-end">
            <TopSection />
          </div>  
        </div>    
        <div>{children}</div>
      </div>
    </div>
  );
};

export default CustomizedLayout;
