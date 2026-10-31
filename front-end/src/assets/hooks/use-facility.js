import { useSelector } from "react-redux";

// Pages that belong to a module a facility can have switched off. Mirrors
// company.facility on the backend, which refuses writes to them.
export const MODULE_ROUTES = {
  reception: ["/dashboard/reception", "/dashboard/reception-interface"],
  triage: ["/dashboard/nursing-station"],
  doctor: ["/dashboard/doctor-desk"],
  inpatient: ["/dashboard/admit"],
  radiology: ["/dashboard/radiology"],
};

export const moduleForPath = (pathname) =>
  Object.keys(MODULE_ROUTES).find((module) =>
    MODULE_ROUTES[module].some(
      (route) => pathname === route || pathname.startsWith(`${route}/`)
    )
  );

/**
 * The facility's type and which modules it has.
 *
 * While the backend is being asked, switchable modules read as off, so a lab
 * never sees the hospital menus flash up first. If it can't be reached they
 * read as on: a hospital whose request failed must not lose its Doctor Desk,
 * and the backend refuses writes to a module that really is off.
 */
export const useFacility = () => {
  const { facility, facilityStatus, facilityFailures } = useSelector((store) => store.company);
  const loaded = facilityStatus === "loaded" && Boolean(facility);
  const failed = facilityStatus === "failed";
  const disabled = facility?.disabled_modules ?? [];

  const isModuleEnabled = (module) => {
    if (!module) return true;
    if (loaded) return !disabled.includes(module);
    return failed;
  };

  return {
    loaded,
    failed,
    // Loaded, or given up on for now: either way the page can draw.
    settled: loaded || failed,
    status: facilityStatus,
    failures: facilityFailures,
    facilityType: facility?.facility_type,
    isStandaloneLab: facility?.facility_type === "standalone_lab",
    // No check-in desk: patients come to the lab, so the home page and
    // patient actions are the lab's.
    isLabFirst: loaded && disabled.includes("reception"),
    isModuleEnabled,
  };
};
