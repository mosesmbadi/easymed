import { API_URL, API_METHODS } from "@/assets/api-endpoints";
import { backendAxiosInstance } from "@/assets/backend-axios-instance";

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '1024mb' // Set desired value here
        }
    }
};

export default async function handler(req, res) {
    console.log("Received Headers:", req.headers);

    if (req.method === API_METHODS.POST) {
        try {
            const token = req.headers.authorization;
            if (!token) {
                return res.status(401).json({ detail: "Authentication credentials were not provided." });
            }

            const config = {
                headers: {
                    Authorization: token, // Correctly forward the Authorization header
                }
            };

            // Forward the request body along with the correct headers
            await backendAxiosInstance.post(`${API_URL.CREATE_GROUP}`, req.body, config)
                .then(response => res.status(200).json(response.data))
                .catch(e => res.status(e.response?.status ?? 500).json(e.response?.data));

        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    } else {
        res.status(404).json({ message: 'path not found!' });
    }
}

