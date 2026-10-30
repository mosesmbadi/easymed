import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSelector, useDispatch } from 'react-redux'
import { useAuth } from '../hooks/use-auth';
import { getAllPatients } from '@/redux/features/patients';
import { getCurrentUser } from "@/redux/features/users";

const PatientConfirmedProtect = ({ children }) => {
  const dispatch = useDispatch()
  const auth = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const { patients } = useSelector((store) => store.patient);
  const loggedInPatient = patients.find((patient) => patient.user === auth?.user_id);
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (auth) {
          await Promise.all([
            dispatch(getCurrentUser(auth)),
            dispatch(getAllPatients(auth))
          ]);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [auth, dispatch]);

  useEffect(() => {
    if (!isLoading && !loggedInPatient) {
      console.log("Patient not found");
      // Instead of redirecting, we'll let the components handle their empty states
    }
  }, [isLoading, loggedInPatient]);

  return (
    <>{children}</>
  )
}

export default PatientConfirmedProtect;