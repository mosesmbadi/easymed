import { useSelector } from "react-redux";

// Pages that belong to a module a facility type can switch off. Mirrors
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
 * The tenant's facility type and which modules it has.
 *
 * Until the backend answers, `loaded` is false and every switchable module
 * reads as off: a lab should not see the hospital menus flash up first.
 */
export const useFacility = () => {
  const facility = useSelector((store) => store.company.facility);
  const disabled = facility?.disabled_modules ?? [];
  const loaded = Boolean(facility);

  return {
    loaded,
    facilityType: facility?.facility_type,
    isStandaloneLab: facility?.facility_type === "standalone_lab",
    isModuleEnabled: (module) => !module || (loaded && !disabled.includes(module)),
  };
};
