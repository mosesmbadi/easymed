import { API_URL, API_METHODS } from "@/assets/api-endpoints";
import { backendAxiosInstance } from "@/assets/backend-axios-instance";

export default async function handler(req, res) {
    if (req.method !== API_METHODS.POST) {
        return res.status(405).json({ message: 'Method not allowed' });
    }
    try {
        const { refresh } = req.body;
        if (!refresh) {
            return res.status(400).json({ message: 'Refresh token is required' });
        }
        await backendAxiosInstance
            .post(API_URL.REFRESH_TOKEN, { refresh })
            .then(response => {
                res.status(200).json(response.data);
            })
            .catch(e => {
                res.status(e.response?.status ?? 500).json(e.response?.data);
            });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
}
