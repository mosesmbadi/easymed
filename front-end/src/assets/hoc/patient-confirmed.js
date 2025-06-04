import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSelector, useDispatch } from 'react-redux'
import { useAuth } from '../hooks/use-auth';
import { getAllPatients } from '@/redux/features/patients';
import { getCurrentUser } from "@/redux/features/users";

const PatientConfirmedProtect = ({ children }) => {
  const dispatch = useDispatch()
  const auth = useAuth();
  const router = useRouter();  // Ensure useRouter is used within a component
  const { patients } = useSelector((store) => store.patient);
  const loggedInPatient = patients.find((patient) => patient.user === auth?.user_id)

  useEffect(() => {
      const fetchData = () => {
          try {
              if (auth.token) {
                  dispatch(getCurrentUser(auth));
                  dispatch(getAllPatients(auth));
              }
          } catch (error) {
              console.error("Error fetching data:", error);
              // Handle error (e.g., redirect to an error page)
          }
      };

      fetchData();
  }, [auth]);

  useEffect(() => {
      if (!loggedInPatient) {
        console.log("THIS HERE IS CALLED LOGGED IN PATIENT IS NOT FOUND")

          // Redirect to the profile page if the patient is not logged in
          router.push("/patient-overview/profile");
      }else{
        console.log("THIS HERE IS CALLED LOGGED IN PATIENT IS FOUND")
        router.push("/patient-overview");
      }
  }, [loggedInPatient]);

  return (
      <>{children}</>
  )
}

export default PatientConfirmedProtect;