import { API_METHODS } from "@/assets/api-endpoints";
import { backendAxiosInstance } from "@/assets/backend-axios-instance";

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '1024mb'
        }
    }
}

export default async function handler(req, res) {
    if (req.method === API_METHODS.GET) {
        try {
            const config = {
                headers: {
                    'Authorization': req.headers.authorization,
                }
            };

            const query = req.query;

            await backendAxiosInstance.get(`/billing/payment-receipts/`, { ...config, params: query })
                .then(response => {
                    res.status(200).json(response.data);
                })
                .catch(e => {
                    res.status(e.response?.status ?? 500).json(e.response?.data)
                });

        } catch (e) {
            res.status(500).json(e.message);
        }
    } else {
        res.status(404).json({ message: 'path not found!' });
    }
}
