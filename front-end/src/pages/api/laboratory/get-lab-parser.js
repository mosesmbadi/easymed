import { API_URL, API_METHODS } from "@/assets/api-endpoints";
import net from 'net';
import JsonSocket from "json-socket";

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '1024mb'
        }
    }
}

export default async function handler(req, res) {
    const payload = req.body;

    if (req.method !== API_METHODS.POST) {
        return res.status(405).json({ 
            status: 'error',
            message: 'Method not allowed' 
        });
    }

    try {
        const host = '192.168.100.56';
        const port = 9091;
        const socket = new JsonSocket(new net.Socket());
        
        //  promise that rejects after 10 seconds
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
                socket.end();
                reject({
                    status: 'error',
                    message: 'Connection timeout - Equipment not responding after 10 seconds'
                });
            }, 10000);
        });

        //  promise for the socket connection and message sending
        const connectionPromise = new Promise((resolve, reject) => {
            socket.on('error', (error) => {
                socket.end();
                reject({
                    status: 'error',
                    message: `Equipment connection error: ${error.message}`
                });
            });

            socket.connect(port, host);
            socket.on('connect', () => {
                console.log('Connected to parser');
                socket.sendMessage(payload);
                console.log('Payload sent');
                socket.end();
                resolve({ 
                    status: 'success',
                    message: 'Successfully sent to equipment'
                });
            });
        });

        // Race between the connection and timeout
        const result = await Promise.race([connectionPromise, timeoutPromise]);
        return res.status(result.status === 'success' ? 200 : 500).json(result);

    } catch (error) {
        console.error('Equipment communication error:', error);
        return res.status(500).json({
            status: 'error',
            message: error.message || 'Failed to communicate with equipment'
        });
    }
}