import React, { useEffect } from "react";
import { useRouter } from "next/router";
import { useDispatch } from "react-redux";
import Sidebar from "./sidebar";
import RightBar from "./rightbar";
import { useAuth } from "@/assets/hooks/use-auth";
import { getFacility } from "@/redux/features/company";
import { moduleForPath, useFacility } from "@/assets/hooks/use-facility";

// Shown instead of a page whose module this facility does not have -- someone
// following an old bookmark into Doctor Desk at a standalone lab, say. The
// backend refuses the writes either way; this just says why up front.
const ModuleUnavailable = () => (
  <section className="flex items-center justify-center h-[80vh] px-4">
    <div className="bg-white rounded shadow p-8 max-w-md text-center space-y-2">
      <h2 className="text-xl font-semibold">Not available</h2>
      <p className="text-sm">
        This part of EaSyMed is not included for your facility. Walk-in tests
        are taken from Laboratory &gt; New Walk-in.
      </p>
    </div>
  </section>
);

const DashboardLayout = ({ children }) => {
  const dispatch = useDispatch();
  const auth = useAuth();
  const router = useRouter();
  const { loaded, status, failures, isModuleEnabled } = useFacility();

  useEffect(() => {
    if (auth.token && status === "idle") {
      dispatch(getFacility(auth));
    }
  }, [auth, status]);

  // A failed load shows every module meanwhile; keep asking, backing off, so
  // a lab's menus settle once the backend answers.
  useEffect(() => {
    if (!auth.token || status !== "failed" || failures > 5) return undefined;
    const timer = setTimeout(
      () => dispatch(getFacility(auth)),
      Math.min(5000 * 2 ** (failures - 1), 60000)
    );
    return () => clearTimeout(timer);
  }, [auth, status, failures]);

  const pageModule = moduleForPath(router.pathname);
  // Only block once the facility is known, so a hospital's pages don't blank
  // out for the moment it takes to load.
  const blocked = loaded && !isModuleEnabled(pageModule);

  return (
    <div className="md:flex md:h-screen h-auto overflow-hidden bg-background">
      <div className="w-56 bg-white shadow-xl border-primary md:block hidden">
        <Sidebar />
      </div>

      <div className="flex-1 overflow-y-auto hideMiddleSectionScrollbar">
        <div className="">{blocked ? <ModuleUnavailable /> : children}</div>
      </div>
      <div className="w-72 md:block hidden">
        <RightBar />
      </div>
    </div>
  );
};

export default DashboardLayout;
