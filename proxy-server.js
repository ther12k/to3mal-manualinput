/**
 * Simple CORS Proxy Server for TO3MAL API
 * Run with: node proxy-server.js
 * Or add to package.json scripts: "proxy": "node proxy-server.js"
 */

const http = require('http');

const TARGET_HOST = '183.91.69.74';
const TARGET_PORT = 80;
const PORT = 8080;

// CORS headers
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
};

const server = http.createServer((req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  // Health check endpoint
  if (req.url === '/health') {
    res.writeHead(200, { ...CORS_HEADERS, 'Content-Type': 'text/plain' });
    res.end('healthy\n');
    return;
  }

  // Proxy /api requests
  if (req.url.startsWith('/api/')) {
    // Remove /api prefix for the target
    const targetPath = req.url.replace('/api/', '/AGTOSNUS_Prod/api/');

    const options = {
      hostname: TARGET_HOST,
      port: TARGET_PORT,
      path: targetPath,
      method: req.method,
      headers: {
        ...req.headers,
        host: TARGET_HOST,
      },
    };

    const proxyReq = http.request(options, (proxyRes) => {
      // Add CORS headers to response
      const headers = { ...proxyRes.headers, ...CORS_HEADERS };
      res.writeHead(proxyRes.statusCode, headers);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      console.error('Proxy error:', err.message);
      res.writeHead(500, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Proxy error', message: err.message }));
    });

    // Pipe request body
    req.pipe(proxyReq);
    return;
  }

  // 404 for other paths
  res.writeHead(404, { ...CORS_HEADERS, 'Content-Type': 'text/plain' });
  res.end('Not found\n');
});

server.listen(PORT, () => {
  console.log(`CORS Proxy Server running at http://localhost:${PORT}/`);
  console.log(`Proxying /api/* to http://${TARGET_HOST}/AGTOSNUS_Prod/api/*`);
  console.log('');
  console.log('Health check: curl http://localhost:8080/health');
  console.log('');
  console.log('Press Ctrl+C to stop');
});
