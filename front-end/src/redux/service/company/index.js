import api from "@/utils/api";
import { API_URL } from "@/assets/api-endpoints"; // ✅ use backend URLs

export const fetchCompanyDetails = () => {
  return new Promise((resolve, reject) => {
    api.get(API_URL.FETCH_COMPANY_INFO) // now becomes "/company/company/"
      .then((res) => resolve(res.data))
      .catch((err) => reject(err.response?.data || err.message));
  });
};

export const updateCompanyInformation = (payload) => {
  return new Promise((resolve, reject) => {
    api.put(API_URL.FETCH_COMPANY_INFO, payload)
      .then((res) => resolve(res.data))
      .catch((err) => reject(err.response?.data || err.message));
  });
};