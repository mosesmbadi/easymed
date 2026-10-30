import { API_URL, API_METHODS } from "@/assets/api-endpoints";
import { backendAxiosInstance } from "@/assets/backend-axios-instance";

export default async function handler(req, res) {
    if (!req.headers?.authorization) {
        return res.status(401).send('Unauthorized');
    }

    const authConfig = {
        headers: { 'Authorization': req.headers.authorization }
    };

    const { id } = req.query;

    if (req.method === API_METHODS.DELETE) {
        try {
            await backendAxiosInstance.delete(`${API_URL.ITEM_UNITS}${id}/`, authConfig);
            res.status(204).end();
        } catch (e) {
            res.status(e.response?.status ?? 500).json(e.response?.data);
        }
    }
    else if (req.method === API_METHODS.PATCH) {
        try {
            const response = await backendAxiosInstance.patch(
                `${API_URL.ITEM_UNITS}${id}/`,
                req.body,
                authConfig
            );
            res.status(200).json(response.data);
        } catch (e) {
            res.status(e.response?.status ?? 500).json(e.response?.data);
        }
    }
    else {
        res.status(405).json({ message: 'Method not allowed' });
    }
}
