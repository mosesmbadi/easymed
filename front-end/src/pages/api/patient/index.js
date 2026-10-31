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
            // if (!req.headers?.authorization){
            //     res.status(401).send('Unauthorized');
            // }
            const config = {
                headers: {
                    'Authorization': req.headers.authorization,
                }
            };
            // Filters, search and page pass through (`search_value` is the
            // backend's `search`; `page` returns {count, results}).
            const { search_value, ...rest } = req.query;
            const params = new URLSearchParams();
            Object.entries(rest).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== "" && value !== "null") {
                    params.append(key, value);
                }
            });
            if (search_value && search_value !== "null" && search_value !== "undefined") {
                params.append("search", search_value);
            }
            if (!params.get("search")) params.delete("search_field");
            const qs = params.toString();
            const url = `${API_URL.FETCH_PATIENT}${qs ? `?${qs}` : ""}`;

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
            // if (!req.headers?.authorization){
            //     res.status(401).send('Unauthorized');
            // }
            const config = {
                headers: {
                    'Authorization': req.headers.authorization,
                }
            };
            const body = req.body;

            await backendAxiosInstance.post(`${API_URL.CREATE_PATIENT}`,body,config)
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