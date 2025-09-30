import axios from "axios";

const baseURL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"; 

export const backendAxiosInstance = axios.create({
    baseURL: baseURL,
});

backendAxiosInstance.interceptors.request.use(async (request) => {
    return request;
});
