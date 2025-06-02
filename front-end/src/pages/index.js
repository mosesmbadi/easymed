import React, { useEffect } from "react"
import { useRouter } from 'next/router';
import { useDispatch } from "react-redux";

import { getAllPatients } from '@/redux/features/patients';
import { useAuth } from "@/assets/hooks/use-auth";
import LandingPage from "@/components/landing-page";

export default function Home() {
  const router = useRouter();
  const auth = useAuth();
  const dispatch = useDispatch();

  useEffect(()=>{
    if(auth.token){
      auth.role === "patient" ? router.push('/patient-overview') : router.push('/dashboard');
      dispatch(getAllPatients(auth));
    }        
  }, [auth]);

  return (
    <>
      <LandingPage />
    </>
  );
}
