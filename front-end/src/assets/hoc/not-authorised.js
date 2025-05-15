import React, { useEffect } from "react";
import { useRouter } from 'next/router';
import { useDispatch } from "react-redux";
import Link from "next/link";
import { BiArrowBack } from "react-icons/bi";
import { useAuth } from '../hooks/use-auth';
import { getAllPatients } from "@/redux/features/patients";

const NotAuthorized = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const auth = useAuth();

  useEffect(() => {
    if (auth?.token) {
      dispatch(getAllPatients(auth.token)); 
    }
  }, [auth?.token, dispatch]);

  const backUrl = auth?.role === "patient" ? "/patient-overview" : "/dashboard";
  const backText = auth?.role === "patient" ? "Back to Patient Overview" : "Back to Dashboard";

  const backHref = auth?.role === "patient" ? "/patient-overview" : "/dashboard";
  const backLabel = auth?.role === "patient" ? "Back to Patient Overview" : "Back to Dashboard";

  return (
    <section className="p-12 flex items-center justify-center h-screen">
      <div className="p-8 space-y-4 rounded md:w-5/12 mx-auto text-center">
        <h1 className="text-7xl font-bold">403</h1>
        <p className="font-semibold">Restricted Access</p>
        <p>You lack permission to access this page.</p>
        <Link href={backUrl} passHref legacyBehavior>
          <a className="inline-flex items-center gap-4 rounded text-white text-sm bg-primary px-4 py-2 my-2">
            <BiArrowBack />
            {backText}
          </a>
        </Link>

      </div>
    </section>
  );
};

export default NotAuthorized;

