import axios from "axios";

export const backendAxiosInstance = axios.create({
    baseURL: "http://192.168.100.163:8000/"

});

backendAxiosInstance.interceptors.request.use(async (request) => {
    console.log("REQUEST ",request);
    return request;
});
