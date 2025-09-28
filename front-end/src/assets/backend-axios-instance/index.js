import axios from "axios";

const baseURL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8080";

export const backendAxiosInstance = axios.create({
    baseURL: baseURL,
});

backendAxiosInstance.interceptors.request.use(async (request) => {
    return request;
});
