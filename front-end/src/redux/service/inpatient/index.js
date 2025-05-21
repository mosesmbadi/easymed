import axios from "axios";
import { APP_API_URL } from "@/assets/api-endpoints";
import UseAxios from "@/assets/hooks/use-axios";

export const createWard = async (payload, auth) => {
    const axiosInstance = UseAxios(auth);
    try {
      const res = await axiosInstance.post(`${APP_API_URL.ADD_WARD}`, payload, {
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      });
      return res.data;
    } catch (err) {
      throw err.response?.data || err.message;
    }
  };
  
