import { API_URL, API_METHODS } from "@/assets/api-endpoints";
import { backendAxiosInstance } from "@/assets/backend-axios-instance";

export default async function handler(req, res) {
    if (req.method !== API_METHODS.GET) {
        res.status(404).json({ message: 'path not found!' });
        return;
    }

    if (!req.headers?.authorization) {
        res.status(401).send('Unauthorized');
        return;
    }

    try {
        const config = {
            headers: { 'Authorization': req.headers.authorization },
            params: req.query,
        };

        await backendAxiosInstance.get(`${API_URL.GROSS_MARGIN}`, config)
            .then(response => {
                res.status(200).json(response.data);
            })
            .catch(e => {
                res.status(e.response?.status ?? 500).json(e.response?.data);
            });
    } catch (e) {
        res.status(500).json(e.message);
    }
}
