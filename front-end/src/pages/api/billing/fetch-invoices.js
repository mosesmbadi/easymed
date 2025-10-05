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

            const query = req.query;
            const search_field = query.search_field;
            const search_value = query.search_value;
            const status = query.status; // expected values: 'pending' | 'paid' | undefined

            // Base URL with mandatory search (fallback to blank string so backend returns all)
            let url = `${API_URL.FETCH_INVOICES}?search=${encodeURIComponent(search_value || '')}`;

            // Add specific search field if provided
            if (search_field){
                url = `${API_URL.FETCH_INVOICES}?search_field=${encodeURIComponent(search_field)}&search=${encodeURIComponent(search_value || '')}`;
            }

            // Append status filter only when explicitly provided and not 'all'
            if (status && status !== 'all') {
                url += `&status=${encodeURIComponent(status)}`;
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
    else if (req.method === API_METHODS.POST) {
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

            console.log("BILLING_INVOICES_BODY ",body);
            
            await backendAxiosInstance.post(`${API_URL.BILLING_INVOICES}`,body, config)
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
    else if (req.method === API_METHODS.PUT) {
        try {
            // if (!req.headers?.authorization){
            //     res.status(401).send('Unauthorized');
            // }
            const config = {
                headers: {
                    'Authorization': req.headers.authorization,
                }
            };
            const body = req.body;

            console.log("PATIENT_EDIT_BODY ",body)
            console.log("PATIENT_EDIT_URL ",`${API_URL.EDIT_PATIENT}/${body.id}`)

            await backendAxiosInstance.post(`${API_URL.EDIT_PATIENT}/${body.id}`,body, config).then(response => {
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