import { API_URL, API_METHODS } from "@/assets/api-endpoints";
import { backendAxiosInstance } from "@/assets/backend-axios-instance";

export const config = {
    api: {
        bodyParser: {
            sizeLimit: "1024mb",
        },
    },
};

export default async function handler(req, res) {
    if (req.method === API_METHODS.GET) {
        try {
            if (!req.headers?.authorization) {
                res.status(401).send("Unauthorized");
            }
            const config = {
                headers: {
                    Authorization: req.headers.authorization,
                },
            };

            await backendAxiosInstance
                .get(`${API_URL.LAB_TEST_INTERPRETATIONS}`, config)
                .then((response) => {
                    res.status(200).json(response.data);
                })
                .catch((e) => {
                    res.status(e.response?.status ?? 500).json(e.response?.data);
                });
        } catch (e) {
            res.status(500).json(e.message);
        }
    } else if (req.method === API_METHODS.POST) {
        try {
            if (!req.headers?.authorization) {
                res.status(401).send("Unauthorized");
            }
            const config = {
                headers: {
                    Authorization: req.headers.authorization,
                },
            };
            const body = req.body;

            await backendAxiosInstance
                .post(`${API_URL.LAB_TEST_INTERPRETATIONS}`, body, config)
                .then((response) => {
                    res.status(200).json(response.data);
                })
                .catch((e) => {
                    res.status(e.response?.status ?? 500).json(e.response?.data);
                });
        } catch (e) {
            res.status(500).json(e.message);
        }
    } else if (req.method === API_METHODS.PATCH || req.method === API_METHODS.PUT) {
        try {
            if (!req.headers?.authorization) {
                res.status(401).send("Unauthorized");
            }
            const config = {
                headers: {
                    Authorization: req.headers.authorization,
                },
            };
            const body = req.body;
            const query = req.query;

            // Ensure that interpretation_id or id is passed as query
            const id = query.id || query.lab_test_interpretation_id || body.id;

            await backendAxiosInstance
                .patch(`${API_URL.LAB_TEST_INTERPRETATIONS}${id}/`, body, config)
                .then((response) => {
                    res.status(200).json(response.data);
                })
                .catch((e) => {
                    res.status(e.response?.status ?? 500).json(e.response?.data);
                });
        } catch (e) {
            res.status(500).json(e.message);
        }
    } else if (req.method === API_METHODS.DELETE) {
        try {
            if (!req.headers?.authorization) {
                res.status(401).send("Unauthorized");
            }
            const config = {
                headers: {
                    Authorization: req.headers.authorization,
                },
            };
            const query = req.query;
            const id = query.id || query.lab_test_interpretation_id;

            await backendAxiosInstance
                .delete(`${API_URL.LAB_TEST_INTERPRETATIONS}${id}/`, config)
                .then((response) => {
                    res.status(200).json(response.data);
                })
                .catch((e) => {
                    res.status(e.response?.status ?? 500).json(e.response?.data);
                });
        } catch (e) {
            res.status(500).json(e.message);
        }
    } else {
        res.status(404).json({ message: "path not found!" });
    }
}
