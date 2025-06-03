import axios from "axios";

export const backendAxiosInstance = axios.create({
    baseURL: "http://api:8080/",

});

backendAxiosInstance.interceptors.request.use(async (request) => {
    console.log("REQUEST ",request);
    return request;
});
