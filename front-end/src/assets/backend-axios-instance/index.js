import axios from "axios";

export const backendAxiosInstance = axios.create({
    baseURL: "http://35.180.52.36:8080/",
});

backendAxiosInstance.interceptors.request.use(async (request) => {
    console.log("REQUEST ",request);
    return request;
});
