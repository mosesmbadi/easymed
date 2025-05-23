import axios from "axios";
import { APP_API_URL } from "@/assets/api-endpoints";
import UseAxios from "@/assets/hooks/use-axios";

export const createWard = (payload, auth) =>{
  const axiosInstance = UseAxios(auth);
  return new Promise((resolve,reject) =>{
      axiosInstance.post(`${APP_API_URL.ADD_WARD}`, payload)
          .then((res) =>{
              resolve(res.data)
          })
          .catch((err) =>{
              reject(err.message)
          })
  })
}
