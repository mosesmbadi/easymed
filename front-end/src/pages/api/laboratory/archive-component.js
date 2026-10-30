import { API_URL, API_METHODS } from "@/assets/api-endpoints";
import { backendAxiosInstance } from "@/assets/backend-axios-instance";

export default async function handler(req, res) {
    if (req.method === API_METHODS.GET) {
        try {
            if (!req.headers?.authorization) {
                res.status(401).send('Unauthorized');
                return;
            }
            const config = {
                headers: {
                    'Authorization': req.headers.authorization,
                }
            };

            await backendAxiosInstance.get(`${API_URL.ARCHIVE_COMPONENT}`, config)
                .then(response => {
                    res.status(200).json(response.data);
                })
                .catch(e => {
                    res.status(e.response?.status ?? 500).json(e.response?.data);
                });

        } catch (e) {
            res.status(500).json(e.message);
        }
    }
    else if (req.method === API_METHODS.POST) {
        try {
            if (!req.headers?.authorization) {
                res.status(401).send('Unauthorized');
                return;
            }
            const config = {
                headers: {
                    'Authorization': req.headers.authorization,
                }
            };
            const body = req.body;

            await backendAxiosInstance.post(`${API_URL.ARCHIVE_COMPONENT}`, body, config)
                .then(response => {
                    res.status(200).json(response.data);
                })
                .catch(e => {
                    res.status(e.response?.status ?? 500).json(e.response?.data);
                });

        } catch (e) {
            res.status(500).json(e.message);
        }
    }
    else if (req.method === API_METHODS.PATCH) {
        try {
            if (!req.headers?.authorization) {
                res.status(401).send('Unauthorized');
                return;
            }
            const config = {
                headers: {
                    'Authorization': req.headers.authorization,
                }
            };
            const body = req.body;
            const query = req.query;
            const archiveId = req.url.split('archive-component/')[1]?.replace('/', '') || query.id;

            await backendAxiosInstance.patch(`${API_URL.ARCHIVE_COMPONENT}${archiveId}/`, body, config)
                .then(response => {
                    res.status(200).json(response.data);
                })
                .catch(e => {
                    res.status(e.response?.status ?? 500).json(e.response?.data);
                });

        } catch (e) {
            res.status(500).json(e.message);
        }
    }
    else if (req.method === API_METHODS.DELETE) {
        try {
            if (!req.headers?.authorization) {
                res.status(401).send('Unauthorized');
                return;
            }
            const config = {
                headers: {
                    'Authorization': req.headers.authorization,
                }
            };
            const query = req.query;
            const archiveId = req.url.split('archive-component/')[1]?.replace('/', '') || query.id;

            await backendAxiosInstance.delete(`${API_URL.ARCHIVE_COMPONENT}${archiveId}/`, config)
                .then(response => {
                    res.status(200).json(response.data);
                })
                .catch(e => {
                    res.status(e.response?.status ?? 500).json(e.response?.data);
                });

        } catch (e) {
            res.status(500).json(e.message);
        }
    }
    else {
        res.status(404).json({ message: 'path not found!' });
    }
}
