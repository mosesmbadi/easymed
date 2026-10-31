import { API_URL, API_METHODS } from "@/assets/api-endpoints";
import { backendAxiosInstance } from "@/assets/backend-axios-instance";

export default async function handler(req, res) {
    if (req.method !== API_METHODS.GET) {
        res.status(404).json({ message: 'path not found!' });
        return;
    }
    const config = { headers: { 'Authorization': req.headers.authorization } };
    await backendAxiosInstance.get(API_URL.PATIENT_VISIT_TRACK_COUNTS, config)
        .then(response => res.status(200).json(response.data))
        .catch(e => res.status(e.response?.status ?? 500).json(e.response?.data));
}
