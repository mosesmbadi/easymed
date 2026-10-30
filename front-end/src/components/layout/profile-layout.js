import React from "react";
import { RiAccountPinBoxLine } from "react-icons/ri";
import { GoNote } from "react-icons/go";
import { IoIosCloudOutline } from "react-icons/io";
import { CiSquareQuestion } from "react-icons/ci";
import { CiMedicalCase } from "react-icons/ci";
import Link from "next/link";

const menus = [
  {
    id: 1,
    icon: <IoIosCloudOutline />,
    label: "Overview",
    link: '/patient-overview',
  },
  {
    id: 2,
    icon: <GoNote />,
    label: "Bookings",
    link: '/patient-overview/bookings',
  },
  {
    id: 3,
    icon: <CiMedicalCase />,
    label: "Prescriptions",
    link: '/patient-overview/prescriptions',
  },
  {
    id: 4,
    icon: <CiSquareQuestion />,
    label: "Lab Requests",
    link: '/patient-overview/lab-requests',
  },
  {
    id: 5,
    icon: <RiAccountPinBoxLine />,
    label: "Profile",
    link: '/patient-overview/profile',
  },
];

const ProfileLayout = ({ children }) => {
  return (
    <div className="md:flex md:h-screen h-auto overflow-hidden bg-background">
      <div className="w-48 bg-white border border-gray shadow-xl md:block hidden px-4">
        <section className="h-[10vh] flex items-center justify-center border-b border-gray">
          <img src="/images/easymed-logo.png" alt="EaSyMed" className="h-[8vh]" />
        </section>
        <section className="py-8 space-y-8">
          {menus.map((menu,index) => (
            <Link key={index} href={menu.link} title={menu.label} className="flex items-center gap-2">
              <span className="text-2xl">{menu.icon}</span>
              <span className="text-md">{menu.label}</span>
            </Link>
          ))}
        </section>
      </div>

      <div className="flex-1 overflow-y-auto hideMiddleSectionScrollbar">
        <div>{children}</div>
      </div>
    </div>
  );
};

export default ProfileLayout;
