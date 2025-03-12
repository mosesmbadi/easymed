import { useState, createContext, useEffect } from "react";
import { APP_API_URL } from "@/assets/api-endpoints";
import { useRouter } from "next/router";
import axios from "axios";
import jwtDecode from "jwt-decode";
import { useDispatch } from "react-redux";
import { getAllUserPermissions } from "@/redux/features/auth";
import { toast } from "react-toastify";

export const authContext = createContext();

export const AuthProvider = ({ children }) => {
  const dispatch = useDispatch();
  const router = useRouter();

  const [user, setUser] = useState(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      return token ? { ...jwtDecode(token), token } : null;
    }
    return null;
  });

  const [message, setMessage] = useState("");

  // Login User
  const loginUser = async (email, password) => {
    try {
      const response = await axios.post(APP_API_URL.LOGIN, {
        email: email,
        password: password
      });

      console.log("RESPOSNSE AFTER LOGIN", response);

      if (response.status === 200) {
        const decodedUser = jwtDecode(response.data.access);
        setUser({ ...decodedUser, token: response.data.access });

        localStorage.setItem("token", JSON.stringify(response.data.access));
        localStorage.setItem("refresh", JSON.stringify(response.data.refresh));

        console.log("I AM DECODED ", decodedUser);

        if (decodedUser?.role === "patient") {
          router.push(`/patient-overview`);
        } else {
          dispatch(getAllUserPermissions(decodedUser?.user_id));
          router.push("/dashboard");
        }
      }
    } catch (error) {
      console.log("Login Error:", error);
      toast.error(
        error?.response?.data?.non_field_errors?.[0] || "Login failed"
      );
    }
  };

  // Logout User
  const logoutUser = () => {
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("refresh");
    router.push("/auth/login");
  };

  useEffect(() => {
    const handleStorageChange = () => {
      const storedToken = localStorage.getItem("token");
      if (storedToken) {
        const decodedUser = jwtDecode(storedToken);
        setUser({ ...decodedUser, token: storedToken });
        dispatch(getAllUserPermissions(decodedUser.user_id));
      } else {
        setUser(null);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [dispatch]);

  return (
    <authContext.Provider value={{ loginUser, logoutUser, user, message }}>
      {children}
    </authContext.Provider>
  );
};
