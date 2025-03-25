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
    const { group_id } = req.query;  // Get dynamic params

    if (req.method === API_METHODS.PUT) {
        try {
            const token = req.headers.authorization;
            if (!token) {
                return res.status(401).json({ detail: "Authentication credentials were not provided." });
            }

            const config = {
                headers: {
                    Authorization: token, 
                    "Content-Type": "application/json" 
                }
            };

            const response = await backendAxiosInstance.put(
                `${API_URL.ADD_PERMISSION}/${group_id}/`,
                JSON.stringify(req.body), 
                config 
            );

            res.status(200).json(response.data);
        } catch (e) {
            res.status(e.response?.status ?? 500).json(e.response?.data || { message: "Error processing request" });
        }
    } else {
        res.status(404).json({ message: "Path not found!" });
    }
}
