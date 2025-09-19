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
    if (req.method === API_METHODS.GET) {
        try {
            if (!req.headers?.authorization){
                res.status(401).send('Unauthorized');
            }
            const config = {
                headers: {
                    'Authorization': req.headers.authorization,
                }
            };

            const query = req.query
            const search_field = query.search_field
            const search_value = query.search_value

            let url = `${API_URL.FETCH_INVENTORY}?department_name=${query.department_name}&item=${query.item}&search=${search_value}`;

            if (search_field){
                url = `${API_URL.FETCH_INVENTORY}?department_name=${query.department_name}&item=${query.item}&search_field=${search_field}&search=${search_value}`
            }
    
            await backendAxiosInstance.get(url, config).then(response => {
                res.status(200).json(response.data);

            }).catch(e => {
                    res.status(e.response?.status ?? 500).json(e.response?.data)
                }
            )

        } catch (e) {
            res.status(500).json(e.message);
        }
        
    }
    else {
        res.status(404).json({message: 'path not found!'});
    }
}