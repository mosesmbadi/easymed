import { API_URL, API_METHODS } from "@/assets/api-endpoints";
import { backendAxiosInstance } from "@/assets/backend-axios-instance";

export default async function handler(req, res) {
    if (req.method === API_METHODS.GET) {
        try {
            if (!req.headers?.authorization) {
                res.status(401).send('Unauthorized');
                return;
            }
            
            const config = {
                headers: {
                    'Authorization': req.headers.authorization,
                }
            };

            await backendAxiosInstance.get('/lab/reagent-consumption/recent_usage/', config)
                .then(response => {
                    res.status(200).json(response.data);
                })
                .catch(e => {
                    res.status(e.response?.status ?? 500).json(e.response?.data)
                });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}
