export default async function handler(req, res) {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
  let url = `${backendUrl}/inventory/supplier-payment-receipts/`;

  // Forward query params for filtering
  const queryParams = new URLSearchParams();
  Object.keys(req.query).forEach((key) => {
    queryParams.append(key, req.query[key]);
  });
  if (queryParams.toString()) {
    url += `?${queryParams.toString()}`;
  }

  try {
    const response = await fetch(url, {
      method: req.method,
      headers: {
        Authorization: req.headers.authorization || '',
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(response.status).json(data);
  } catch (error) {
    console.error('Error in supplier-payment-receipts proxy:', error);
    return res.status(500).json({
      detail: 'An error occurred while processing your request',
      error: error.message,
    });
  }
}
