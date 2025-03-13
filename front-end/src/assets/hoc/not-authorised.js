import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useDispatch } from "react-redux";
import { BiArrowBack } from "react-icons/bi";
import { useAuth } from "../hooks/use-auth";

const NotAuthorized = () => {
  const router = useRouter();
  const auth = useAuth();
  const dispatch = useDispatch();
  const [isTokenValid, setIsTokenValid] = useState(false);

  useEffect(() => {
    const checkToken = () => {
      const token = localStorage.getItem("token");

      if (!token) {
        setIsTokenValid(false);
        return;
      }

      try {
        const parsedToken = token.startsWith('"') ? JSON.parse(token) : token;

        // Validate token against auth context
        if (auth?.user?.token === parsedToken) {
          setIsTokenValid(true);
        } else {
          // Remove invalid token and refresh token
          setIsTokenValid(false);
          localStorage.removeItem("token");
          localStorage.removeItem("refresh");
        }
      } catch {
        // Cleanup in case of a malformed token
        setIsTokenValid(false);
        localStorage.removeItem("token");
        localStorage.removeItem("refresh");
      }
    };

    checkToken();
  }, [auth?.user?.token]);

  const handleButtonClick = () => {
    if (isTokenValid && auth?.user?.token) {
      // Redirect to the correct dashboard based on role
      router.push(
        auth.user.role === "patient" ? "/patient-overview" : "/dashboard"
      );
    } else {
      // Redirect to login if token is invalid
      localStorage.removeItem("token");
      localStorage.removeItem("refresh");
      router.push("/auth/login");
    }
  };

  return (
    <section className="p-12 flex items-center justify-center h-screen">
      <div className="p-8 space-y-4 rounded md:w-5/12 mx-auto text-center">
        <h1 className="text-7xl font-bold">403</h1>
        <p className="font-semibold">Restricted Access</p>
        <p>You lack permission to access this page</p>
        <div className="flex items-center justify-center">
          <button
            className="rounded text-white text-sm bg-primary px-4 py-2 my-2 flex items-center gap-4"
            onClick={handleButtonClick}
          >
            <BiArrowBack />
            {isTokenValid && auth?.user?.token
              ? `Back to ${
                  auth.user.role === "patient"
                    ? "Patient Overview"
                    : "Dashboard"
                }`
              : "Go to Login"}
          </button>
        </div>
      </div>
    </section>
  );
};

export default NotAuthorized;
