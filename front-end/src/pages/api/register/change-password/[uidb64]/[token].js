import { API_URL,API_METHODS } from "@/assets/api-endpoints";
import { backendAxiosInstance } from "@/assets/backend-axios-instance";

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '1024mb' // Set desired value here
        }
    }
}
export default async function handler(req, res) {
    const { uidb64, token } = req.query;  // Get dynamic params

    if (req.method === API_METHODS.POST) {
        try {
            const response = await backendAxiosInstance.post(
                `${API_URL.CHANGE_PASSWORD}${uidb64}/${token}/`,
                req.body
            );

            res.status(200).json(response.data);
        } catch (e) {
            res.status(e.response?.status ?? 500).json(e.response?.data || { message: "Error processing request" });
        }
    } else {
        res.status(404).json({ message: "Path not found!" });
    }
}


