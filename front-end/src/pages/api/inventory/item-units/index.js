import { API_URL, API_METHODS } from "@/assets/api-endpoints";
import { backendAxiosInstance } from "@/assets/backend-axios-instance";

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '1024mb'
        }
    }
}

export default async function handler(req, res) {
    if (!req.headers?.authorization) {
        return res.status(401).send('Unauthorized');
    }

    const authConfig = {
        headers: { 'Authorization': req.headers.authorization }
    };

    if (req.method === API_METHODS.GET) {
        try {
            const params = {};
            if (req.query.item) params.item = req.query.item;

            const response = await backendAxiosInstance.get(
                `${API_URL.ITEM_UNITS}`,
                { ...authConfig, params }
            );
            res.status(200).json(response.data);
        } catch (e) {
            res.status(e.response?.status ?? 500).json(e.response?.data);
        }
    }
    else if (req.method === API_METHODS.POST) {
        try {
            const response = await backendAxiosInstance.post(
                `${API_URL.ITEM_UNITS}`,
                req.body,
                authConfig
            );
            res.status(201).json(response.data);
        } catch (e) {
            res.status(e.response?.status ?? 500).json(e.response?.data);
        }
    }
    else {
        res.status(404).json({ message: 'path not found!' });
    }
}
