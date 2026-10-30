import { API_URL, API_METHODS } from "@/assets/api-endpoints";
import { backendAxiosInstance } from "@/assets/backend-axios-instance";

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '1024mb'
        }
    }
}

/**
 * Receiving a delivery: supplier invoice, goods received note and every line,
 * in one request so the backend can write them in one transaction.
 */
export default async function handler(req, res) {
    if (req.method !== API_METHODS.POST) {
        res.status(404).json({ message: 'path not found!' });
        return;
    }

    if (!req.headers?.authorization) {
        res.status(401).send('Unauthorized');
        return;
    }

    try {
        const config = {
            headers: {
                'Authorization': req.headers.authorization,
            }
        };

        await backendAxiosInstance.post(`${API_URL.GOODS_RECEIPTS}`, req.body, config)
            .then(response => {
                res.status(201).json(response.data);
            })
            .catch(e => {
                res.status(e.response?.status ?? 500).json(e.response?.data)
            })

    } catch (e) {
        res.status(500).json(e.message);
    }
}
