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

            // Check if it's the custom action get_settings
            const url = req.url.includes('get_settings')
                ? `${API_URL.LAB_SETTINGS}get_settings/`
                : `${API_URL.LAB_SETTINGS}`;

            await backendAxiosInstance.get(url, config)
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
    else if (req.method === API_METHODS.PUT) {
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
            const body = req.body;
            // For singleton settings, we usually target ID 1
            await backendAxiosInstance.put(`${API_URL.LAB_SETTINGS}1/`, body, config)
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
    else {
        res.status(404).json({ message: 'path not found!' });
    }
}
