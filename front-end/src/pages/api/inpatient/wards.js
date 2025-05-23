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
                if (!req.headers?.authorization){
                    res.status(401).send('Unauthorized');
                }
                const config = {
                    headers: {
                        'Authorization': req.headers.authorization,
                    }
                };
                const body = req.body;
    
                await backendAxiosInstance.post(`${API_URL.ADD_WARD}`, body, config)
                    .then(response => {
                        res.status(200).json(response.data);
                    })
                    .catch(e => {
                            res.status(e.response?.status ?? 500).json(e.response?.data)
                        }
                    )
    
            } catch (e) {
                res.status(500).json(e.message);
            }
        }
}