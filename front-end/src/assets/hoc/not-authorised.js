import React, { useEffect } from "react";
import { useDispatch } from "react-redux";
import Link from "next/link";
import { BiArrowBack } from "react-icons/bi";
import { useAuth } from '../hooks/use-auth';
import { getAllPatients } from "@/redux/features/patients";
import jwtDecode from "jwt-decode";

const NotAuthorized = () => {
  const dispatch = useDispatch();
  const auth = useAuth();

  useEffect(() => {
    if (auth?.token) {
      dispatch(getAllPatients(auth)); 
    }
  }, [auth, dispatch]);

  // Function to check if token is expired
  const isTokenExpired = () => {
    if (!auth?.token) return true;
    
    try {
      const decoded = jwtDecode(auth.token);
      const currentTime = Date.now() / 1000; // Convert to seconds
      return decoded.exp < currentTime;
    } catch (error) {
      // If token can't be decoded, consider it invalid
      return true;
    }
  };

  // Check if user has invalid/expired token or lacks basic auth info
  const hasInvalidToken = !auth?.token || !auth?.role || !auth?.user_id || isTokenExpired();

  let backUrl = "/auth/login"; // Always redirect to login page
  let backText = "Login to Continue"; // Always show "Login to Continue"

  // No role-based navigation - always redirect to login
  // This ensures all users with restricted access go to login page

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

