import { API_URL, API_METHODS } from "@/assets/api-endpoints";
import { backendAxiosInstance } from "@/assets/backend-axios-instance";

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '1024mb', // Set desired value here
        },
    },
};

export default async function handler(req, res) {
    if (req.method === API_METHODS.GET) {
        try {
            if (!req.headers?.authorization) {
                return res.status(401).send('Unauthorized'); 
            }

            const axiosConfig = {
                headers: {
                    'Authorization': req.headers.authorization,
                },
            };

            console.log("WARDS_HEADERS", axiosConfig);

            const response = await backendAxiosInstance.get(API_URL.FETCH_WARDS, axiosConfig);
            return res.status(200).json(response.data);

        } catch (e) {
            const status = e.response?.status ?? 500;
            const data = e.response?.data ?? { message: e.message };
            return res.status(status).json(data);
        }
    } else {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }
}
