import React, { useEffect } from "react";
import { useDispatch } from "react-redux";
import Link from "next/link";
import { BiArrowBack } from "react-icons/bi";
import { useAuth } from '../hooks/use-auth';
import { getAllPatients } from "@/redux/features/patients";

const NotAuthorized = () => {
  const dispatch = useDispatch();
  const auth = useAuth();

  useEffect(() => {
    if (auth?.token) {
      dispatch(getAllPatients(auth)); 
    }
  }, [auth, dispatch]);

  let backUrl = "";
  let backText = "";

  switch (auth?.role) {

    case "sysadmin":
      backUrl = "/dashboard"
      backText = "Back to Dashboard"
      break;
    case "receptionist":
      backUrl = "/dashboard"
      backText = "Back to Dashboard"
      break;
    case "labtech":
      backUrl = "/dashboard/laboratory"
      backText = "Back to Lab Page"
      break;
    case "nurse":
      backUrl = "/dashboard/nursing-interface"
      backText = "Back to Nursing Interface"
      break;
    case "senior_nurse":
      backUrl = "/dashboard/nursing-interface"
      backText = "Back to Nursing Interface"
      break;
    case "doctor":
      backUrl = "/dashboard/doctor-interface"
      backText = "Back to Doctors Page"
      break;
    case "pharmacist":
        backUrl = "/dashboard/phamarcy"
        backText = "Back to Pharmacy Page"
        break;
    case "patient":
      backUrl = "/patient-overview"
      backText = "Back to Patient Overview"
      break;
    default:
      backUrl = "/dashboard"
      backText = "Back to Dashboard"
  }

  return (
    <section className="p-12 flex items-center justify-center h-screen">
      <div className="p-8 space-y-4 rounded md:w-5/12 mx-auto text-center">
        <h1 className="text-7xl font-bold">403</h1>
        <p className="font-semibold">Restricted Access</p>
        <p>You lack permission to access this page.</p>

        <Link href={backUrl}>
          <div className="flex items-center justify-center">
            <button className="rounded text-white text-sm bg-primary px-4 py-2 my-2 flex items-center gap-4">
              <BiArrowBack />
              {backText}        
            </button>
          </div>
        </Link>

      </div>
    </section>
  );
};

export default NotAuthorized;

