import { API_URL, API_METHODS } from "@/assets/api-endpoints";
import { backendAxiosInstance } from "@/assets/backend-axios-instance";

export default async function handler(req, res) {
    const { method, body, query } = req;
    const token = req.headers?.authorization;

    if (!token) {
        return res.status(401).send('Unauthorized');
    }

    const config = {
        headers: {
            'Authorization': token,
        }
    };

    if (method === API_METHODS.GET) {
        try {
            const response = await backendAxiosInstance.get(`${API_URL.DRUG_CATEGORIES}`, config);
            res.status(200).json(response.data);
        } catch (e) {
            res.status(e.response?.status ?? 500).json(e.response?.data);
        }
    } else if (method === API_METHODS.POST) {
        try {
            const response = await backendAxiosInstance.post(`${API_URL.DRUG_CATEGORIES}`, body, config);
            res.status(201).json(response.data);
        } catch (e) {
            res.status(e.response?.status ?? 500).json(e.response?.data);
        }
    } else if (method === API_METHODS.PATCH) {
        const { id } = query;
        try {
            const response = await backendAxiosInstance.patch(`${API_URL.DRUG_CATEGORIES}${id}/`, body, config);
            res.status(200).json(response.data);
        } catch (e) {
            res.status(e.response?.status ?? 500).json(e.response?.data);
        }
    } else if (method === API_METHODS.DELETE) {
        const { id } = query;
        try {
            const response = await backendAxiosInstance.delete(`${API_URL.DRUG_CATEGORIES}${id}/`, config);
            res.status(204).json(response.data);
        } catch (e) {
            res.status(e.response?.status ?? 500).json(e.response?.data);
        }
    } else {
        res.status(404).json({ message: 'path not found!' });
    }
}
