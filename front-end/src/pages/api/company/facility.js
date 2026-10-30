import { API_URL, API_METHODS } from "@/assets/api-endpoints";
import { backendAxiosInstance } from "@/assets/backend-axios-instance";

export default async function handler(req, res) {
    if (req.method !== API_METHODS.GET) {
        return res.status(404).json({ message: 'path not found!' });
    }
    if (!req.headers?.authorization) {
        return res.status(401).send('Unauthorized');
    }
    const config = {
        headers: {
            'Authorization': req.headers.authorization,
        }
    };
    try {
        const response = await backendAxiosInstance.get(`${API_URL.FETCH_FACILITY}`, config);
        res.status(200).json(response.data);
    } catch (e) {
        res.status(e.response?.status ?? 500).json(e.response?.data ?? e.message);
    }
}
