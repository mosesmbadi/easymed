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

            const { process_id, search_value, ...rest } = req.query;
            if (process_id) {
                // One visit.
                await backendAxiosInstance.get(`${API_URL.PATIENT_ATTENDANCE_PROCESS}${process_id}/`, config)
                    .then(response => res.status(200).json(response.data))
                    .catch(e => res.status(e.response?.status ?? 500).json(e.response?.data));
                return;
            }

            // A queue: pass its filters and page through (track, track__in,
            // queue, page, page_size, search_field...). `search_value` is the
            // backend's `search`.
            const params = new URLSearchParams();
            Object.entries(rest).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== "" && value !== "null") {
                    params.append(key, value);
                }
            });
            if (search_value && search_value !== "null") params.append("search", search_value);
            if (!params.get("search")) params.delete("search_field");
            const qs = params.toString();
            const url = `${API_URL.PATIENT_ATTENDANCE_PROCESS}${qs ? `?${qs}` : ""}`;

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

            await backendAxiosInstance.post(`${API_URL.PATIENT_ATTENDANCE_PROCESS}`,body, config)
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
            const query = req.query;

            await backendAxiosInstance.put(`${API_URL.PATIENT_ATTENDANCE_PROCESS}${query.process_id}/`,body, config)
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
    else if (req.method === API_METHODS.PATCH) {
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
            const query = req.query;

            await backendAxiosInstance.patch(`${API_URL.PATIENT_ATTENDANCE_PROCESS}${query.process_id}/`,body, config)
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
    else {
        res.status(404).json({message: 'path not found!'});
    }
}