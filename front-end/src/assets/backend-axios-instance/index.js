import axios from "axios";

const baseURL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://api:8080";

export const backendAxiosInstance = axios.create({
    baseURL: baseURL,
});

backendAxiosInstance.interceptors.request.use(async (request) => {
    console.log("REQUEST ",request);
    return request;
});
