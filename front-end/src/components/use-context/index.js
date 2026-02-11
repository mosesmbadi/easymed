import { useState, createContext, useEffect } from "react";
import { APP_API_URL } from "@/assets/api-endpoints";
import { useRouter } from "next/router";
import axios from "axios";
import jwtDecode from "jwt-decode";
import SimpleCrypto from "simple-crypto-js";
import { useDispatch } from "react-redux";
import { getAllUserPermissions } from "@/redux/features/auth";
import { toast } from "react-toastify";

export const authContext = createContext();

const secretKey = new SimpleCrypto("c2FubGFta2VueWFAZ21haWwuY29t");

export const AuthProvider = ({ children }) => {
  const dispatch = useDispatch();
  const router = useRouter();
  const parseStoredToken = (key) => {
    if (typeof window === "undefined") return null;
    const item = localStorage.getItem(key);
    if (!item) return null;
    try {
      return JSON.parse(item);
    } catch (error) {
      return item;
    }
  };

  const [user, setUser] = useState(() => {
    const token = parseStoredToken("token");
    if (token) {
      try {
        const decodedToken = jwtDecode(token);
        return { ...decodedToken, token };
      } catch (error) {
        console.error("Error decoding token:", error);
        return null;
      }
    }
    return null;
  });

  const [message, setMessage] = useState("");

  // login User
  const loginUser = async (email, password) => {
    try {
      const response = await axios.post(APP_API_URL.LOGIN, {
        email: email,
        password: password,
      });
      console.log("RESPOSNSE AFTER LOGIN", response)
      if (response.status === 200) {
        const decodedUser = jwtDecode(response.data.access);
        setUser({ ...decodedUser, token: response.data.access });
        try {
          localStorage.setItem("token", JSON.stringify(response.data.access));
          localStorage.setItem(
            "refresh",
            JSON.stringify(response.data.refresh)
          );
          console.log("I AM DECODED ", decodedUser);
          if (decodedUser?.role === "patient") {
            router.push(`/patient-overview`);
          } else {
            dispatch(getAllUserPermissions(decodedUser?.user_id));
            router.push("/dashboard");
          }
        } catch (error) {
          throw error;
        }
      }
    } catch (error) {
      toast.error(error.response.data.non_field_errors[0]);
    }
  };

  // Function to check if token is valid and not expired
  const isTokenValid = (token) => {
    if (!token) return false;

    try {
      const decoded = jwtDecode(token);
      const currentTime = Date.now() / 1000; // Convert to seconds
      return decoded.exp > currentTime; // Token is valid if not expired
    } catch (error) {
      console.error("Token decode error:", error);
      return false; // If token can't be decoded, it's invalid
    }
  };

  // logout User
  const logoutUser = () => {
    // setAuthToken(null);
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("refresh");
    router.push("/auth/login");
  };

  let contextData = {
    loginUser: loginUser,
    message: message,
    logoutUser: logoutUser,
    user: user,
    isTokenValid: isTokenValid,
  };

  // decode the token and set the user when a component mounts
  useEffect(() => {
    const storedToken = parseStoredToken("token");

    if (storedToken && isTokenValid(storedToken)) {
      // Token exists and is valid
      try {
        const decodedToken = jwtDecode(storedToken);
        setUser({ ...decodedToken, token: storedToken });

        // Only fetch permissions for non-patient users
        if (decodedToken.role !== 'patient') {
          const fetchPermissions = async () => {
            try {
              await dispatch(getAllUserPermissions(decodedToken.user_id));
            } catch (error) {
              console.error("Error fetching permissions:", error);
              // If permissions fetch fails, logout user
              logoutUser();
            }
          };
          fetchPermissions();
        }
      } catch (error) {
        console.error("Error decoding token:", error);
        // If token decode fails, clear it
        logoutUser();
      }
    } else if (storedToken) {
      // Token exists but is invalid/expired
      console.log("Token is expired or invalid, logging out");
      logoutUser();
    }
    // If no token exists, do nothing (user stays null)
  }, []);

  return (
    <authContext.Provider value={contextData}>{children}</authContext.Provider>
  );
};
