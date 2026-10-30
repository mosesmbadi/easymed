import { API_URL, API_METHODS } from "@/assets/api-endpoints";
import { backendAxiosInstance } from "@/assets/backend-axios-instance";

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '1024mb' // Set desired value here
        }
    }
}

export default async function handler(req, res) {
    if (req.method === API_METHODS.PUT) {
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
            
            const { id } = req.query; // Get the panel ID from the URL
            const body = req.body;
            
            console.log("PUT request for panel ID:", id, "with body:", body);
            
            await backendAxiosInstance.put(`${API_URL.FETCH_LAB_TEST_REQUEST_PANELS}${id}/`, body, config)
                .then(response => {
                    res.status(200).json(response.data);
                })
                .catch(e => {
                    console.error("Backend PUT error:", e.response?.data || e.message);
                    res.status(e.response?.status ?? 500).json(e.response?.data || { error: e.message });
                });

        } catch (e) {
            console.error("PUT handler error:", e.message);
            res.status(500).json({ error: e.message });
        }
    } else {
        res.status(405).json({ message: 'Method not allowed' });
    }
}