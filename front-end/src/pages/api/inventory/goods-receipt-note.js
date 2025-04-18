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
     if (req.method !== API_METHODS.GET) {
         return res.status(405).json({ message: "Method Not Allowed" });
     }
 
     if (!req.headers?.authorization) {
         return res.status(401).json({ message: "Unauthorized" });
     }
 
     try {
         // Extract supplier_id from query params
         const { purchase_order_id} = req.query;
 
         if (!purchase_order_id) {
             return res.status(400).json({ message: "purchase_order_id is required" });
         }
 
         const config = {
             headers: {
                 Authorization: req.headers.authorization,
             },
             responseType: "arraybuffer",
         };
 
         const url = `${API_URL.FETCH_GOODS_RECEIPT_NOTE}${purchase_order_id}`;
         console.log(`Requesting: ${url}`);
 
         const response = await backendAxiosInstance.get(url, config);
 
         res.setHeader("Content-Type", "application/pdf");
         res.send(response.data);
     } catch (error) {
         console.error("Error fetching invoice:", error);
         res.status(error.response?.status || 500).json({ message: error.message });
     }
 }