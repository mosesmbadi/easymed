import { API_URL, API_METHODS } from "@/assets/api-endpoints";
import { backendAxiosInstance } from "@/assets/backend-axios-instance";

// POST ?id=<panel> {reason, action, note}: send a result back for a rerun or a recollection.
export default async function handler(req, res) {
    if (req.method !== API_METHODS.POST) {
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
        const response = await backendAxiosInstance.post(
            `${API_URL.FETCH_LAB_TEST_REQUEST_PANELS}${req.query.id}/reject/`, req.body, config);
        res.status(201).json(response.data);
    } catch (e) {
        res.status(e.response?.status ?? 500).json(e.response?.data ?? e.message);
    }
}
