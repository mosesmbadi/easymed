import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import Link from "next/link";
import { BiArrowBack, BiHome } from "react-icons/bi";
import { MdContactSupport } from "react-icons/md";
import { useAuth } from '../hooks/use-auth';
import { getAllPatients } from "@/redux/features/patients";
import jwtDecode from "jwt-decode";

// Map roles to their default dashboard paths
const getRoleDashboard = (role) => {
  const dashboardMap = {
    'patient': '/patient-overview',
    'doctor': '/dashboard/doctor-desk',
    'nurse': '/dashboard/nursing-station',
    'senior_nurse': '/dashboard/nursing-station',
    'labtech': '/dashboard/laboratory',
    'pharmacist': '/dashboard/phamarcy',
    'receptionist': '/dashboard/reception',
    'sysadmin': '/dashboard/admin-interface',
  };
  return dashboardMap[role] || '/dashboard';
};

// Map permissions to user-friendly names
const getPermissionName = (permission) => {
  const permissionMap = {
    'CAN_ACCESS_DOCTOR_DASHBOARD': 'Doctor Dashboard',
    'CAN_ACCESS_GENERAL_DASHBOARD': 'General Dashboard',
    'CAN_ACCESS_ADMIN_DASHBOARD': 'Admin Dashboard',
    'CAN_ACCESS_RECEPTION_DASHBOARD': 'Reception Dashboard',
    'CAN_ACCESS_NURSING_DASHBOARD': 'Nursing Station',
    'CAN_ACCESS_LABORATORY_DASHBOARD': 'Laboratory Dashboard',
    'CAN_ACCESS_PATIENTS_DASHBOARD': 'Patient Portal',
    'CAN_ACCESS_AI_ASSISTANT_DASHBOARD': 'AI Assistant',
    'CAN_ACCESS_ANNOUNCEMENT_DASHBOARD': 'Announcements',
    'CAN_ACCESS_PHARMACY_DASHBOARD': 'Pharmacy Dashboard',
    'CAN_ACCESS_INVENTORY_DASHBOARD': 'Inventory Management',
    'CAN_ACCESS_BILLING_DASHBOARD': 'Billing Dashboard',
  };
  return permissionMap[permission] || permission;
};

const NotAuthorized = ({ isAuthenticated = false, requiredPermission = null, userRole = null }) => {
  const dispatch = useDispatch();
  const auth = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Set mounted to true after component mounts on client
    setMounted(true);

    if (auth?.token) {
      dispatch(getAllPatients(auth));
    }
  }, [auth, dispatch]);

  // Prevent hydration mismatch by not rendering until client-side
  if (!mounted) {
    return (
      <section className="p-12 flex items-center justify-center h-screen">
        <div className="p-8 space-y-6 rounded md:w-5/12 mx-auto text-center">
          <div className="animate-pulse">
            <div className="h-20 w-40 bg-gray-200 rounded mx-auto mb-4"></div>
            <div className="h-6 w-60 bg-gray-200 rounded mx-auto mb-2"></div>
            <div className="h-4 w-80 bg-gray-200 rounded mx-auto"></div>
          </div>
        </div>
      </section>
    );
  }

  // Scenario A: User is authenticated but lacks permission (403)
  if (isAuthenticated) {
    const dashboardUrl = getRoleDashboard(userRole);
    const permissionName = getPermissionName(requiredPermission);

    return (
      <section className="p-12 flex items-center justify-center h-screen">
        <div className="p-8 space-y-6 rounded md:w-5/12 mx-auto text-center">
          <h1 className="text-7xl font-bold text-warning">403</h1>
          <h2 className="text-2xl font-semibold">Access Denied</h2>
          <p className="text-gray-600">
            You don&apos;t have permission to access <span className="font-semibold">{permissionName}</span>.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-left">
            <p className="text-blue-800">
              <strong>Need access?</strong> Contact your system administrator to request the necessary permissions for your role.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Link href={dashboardUrl}>
              <button className="rounded text-white text-sm bg-primary px-6 py-3 flex items-center gap-2 hover:bg-opacity-90 transition">
                <BiHome className="text-lg" />
                Go to My Dashboard
              </button>
            </Link>

            <button
              onClick={() => window.history.back()}
              className="rounded text-primary border border-primary text-sm bg-white px-6 py-3 flex items-center gap-2 hover:bg-gray-50 transition"
            >
              <BiArrowBack />
              Go Back
            </button>
          </div>

          <div className="pt-2">
            <Link href="/dashboard/admin-interface">
              <span className="text-sm text-gray-500 hover:text-primary flex items-center justify-center gap-1 cursor-pointer">
                <MdContactSupport />
                Contact Support
              </span>
            </Link>
          </div>
        </div>
      </section>
    );
  }

  // Scenario B: User is not authenticated or token expired (401)
  return (
    <section className="p-12 flex items-center justify-center h-screen">
      <div className="p-8 space-y-6 rounded md:w-5/12 mx-auto text-center">
        <h1 className="text-7xl font-bold text-warning">401</h1>
        <h2 className="text-2xl font-semibold">Authentication Required</h2>
        <p className="text-gray-600">
          Your session has expired or you need to log in to access this page.
        </p>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm">
          <p className="text-yellow-800">
            Please log in to continue to <span className="font-semibold">{getPermissionName(requiredPermission)}</span>.
          </p>
        </div>

        <Link href="/auth/login">
          <button className="rounded text-white text-sm bg-primary px-8 py-3 mt-4 flex items-center justify-center gap-2 mx-auto hover:bg-opacity-90 transition">
            <BiArrowBack />
            Login to Continue
          </button>
        </Link>
      </div>
    </section>
  );
};

export default NotAuthorized;

