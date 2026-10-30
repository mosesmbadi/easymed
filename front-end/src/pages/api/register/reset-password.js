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
    if (req.method === API_METHODS.POST) {
        try {
            const body = req.body;

            const response = await backendAxiosInstance.post(`${API_URL.PASSWORD_RESET}`, body);

            res.status(200).json(response.data);
        } catch (error) {
            console.error("Reset Password Error:", error.response?.data || error.message);
            res.status(error.response?.status ?? 500).json({
                message: error.response?.data?.message || "Failed to reset password"
            });
        }
    } else {
        res.status(405).json({ message: "Method Not Allowed" });
    }
}