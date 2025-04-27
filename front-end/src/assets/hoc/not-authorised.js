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
    if (!auth?.token) {
      router.push('/auth/login');
      return;
    }

    dispatch(getAllPatients(auth));
  }, [auth?.token, dispatch, router]);

  const backHref = auth?.role === "patient" ? "/patient-overview" : "/dashboard";
  const backLabel = auth?.role === "patient" ? "Back to Patient Overview" : "Back to Dashboard";


  const backHref = auth?.role === "patient" ? "/patient-overview" : "/dashboard";
  const backLabel = auth?.role === "patient" ? "Back to Patient Overview" : "Back to Dashboard";

  return (
    <section className="p-12 flex items-center justify-center h-screen">
      <div className="p-8 space-y-4 rounded md:w-5/12 mx-auto text-center">
        <h1 className="text-7xl font-bold">403</h1>
        <p className="font-semibold">Restricted Access</p>
        <p>You lack permission to access this page</p>

        <div className="mt-6 flex justify-center">
          <Link href={backHref}>
            <a className="flex items-center gap-2 bg-primary text-white text-xs px-5 py-3 rounded">
              <BiArrowBack />
              {backLabel}
            </a>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default NotAuthorized;

