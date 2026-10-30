import React from "react";
import { useRouter } from 'next/router';
import Doctors from "./doctors";
import BookedSessions from "./booked-sessions";
import TopSection from "./top-section";
import CalenderDate from "./calender";
import News from "./News";
import DrugsInfo from "./Drugs";
import RightInventory from "./RightInventory";

const RightBar = () => {
  const router = useRouter();
  const currentPath = router.pathname.toLowerCase();

  const renderComponentBasedOnPath = () => {
    switch (currentPath) {
      case '/dashboard/phamarcy':
        return (
          <>
          <section className="space-y-1 my-4">
          <div className="flex items-center justify-between">
              <h1 className="uppercase text-xs font-semibold">Low quantity drugs</h1>
              <h1 className="text-sm">See All</h1>
            </div>
            <DrugsInfo displayNUmber={3}/>
          </section>
          <section className="space-y-1 my-4">
            <News />
          </section>
          </>
        );
      case '/dashboard/inventory':
        return <RightInventory />
      case '/dashboard/inventory/add-inventory':
        return <RightInventory />
      case '/dashboard/inventory/purchase-orders':
        return <RightInventory />
      case '/dashboard/inventory/add-purchase':
        return <RightInventory />
      case '/dashboard/inventory/requisitions':
        return <RightInventory />
      case '/dashboard/inventory/create-requisition':
        return <RightInventory />

      case '/dashboard/inventory/incoming-items':
        return <RightInventory />
      case '/dashboard/inventory/report':
        return <RightInventory />
      default:
        return (
          <>
          <section className="space-y-1 my-4">
            <div className="flex items-center justify-between">
              <h1 className="uppercase text-xs font-semibold">Doctors</h1>
              <h1 className="text-sm">See All</h1>
            </div>
            <Doctors />
          </section>
          <section className="my-3 space-y-1">
            <div className="flex items-center justify-between">
              <h1 className="uppercase text-xs font-semibold">
                Booked Sessions
              </h1>
              <h1 className="text-sm">See All</h1>
            </div>
            <BookedSessions />
          </section>
          </>
        );;
    }
  };

  return (
    <>
      <section className="h-[94vh] px-2 overflow-y-auto">
        <TopSection />
        {renderComponentBasedOnPath()}          
        <div className="">
          <CalenderDate />
        </div>
      </section>
    </>
  );
};

export default RightBar;
