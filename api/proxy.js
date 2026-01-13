const https = require('https');
const http = require('http');
const url = require('url');

export default async function handler(req, res) {
    const videoUrl = req.query.url;

    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (!videoUrl) {
        res.status(400).json({ error: 'Missing url parameter' });
        return;
    }

    try {
        await proxyVideo(videoUrl, req, res);
    } catch (error) {
        console.error('Proxy error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: error.message });
        }
    }
}

function proxyVideo(videoUrl, clientReq, clientRes) {
    return new Promise((resolve, reject) => {
        const parsedUrl = url.parse(videoUrl);
        const protocol = parsedUrl.protocol === 'https:' ? https : http;

        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': '*/*',
            'Accept-Encoding': 'identity', // Important for streaming ranges
            'Connection': 'keep-alive',
            'Referer': `${parsedUrl.protocol}//${parsedUrl.hostname}/`
        };

        if (clientReq.headers.range) {
            headers['Range'] = clientReq.headers.range;
        }

        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
            path: parsedUrl.path,
            method: clientReq.method || 'GET',
            headers: headers,
            timeout: 30000 // 30s timeout
        };

        const proxyReq = protocol.request(options, (proxyRes) => {
            // Handle redirects (Standard 301/302)
            if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
                let redirectUrl = proxyRes.headers.location;
                if (redirectUrl.startsWith('/')) {
                    redirectUrl = `${parsedUrl.protocol}//${parsedUrl.hostname}${redirectUrl}`;
                }
                proxyVideo(redirectUrl, clientReq, clientRes)
                    .then(resolve)
                    .catch(reject);
                return;
            }

            // Headers to forward
            const responseHeaders = {
                'Content-Type': proxyRes.headers['content-type'] || 'video/mp4',
                'Accept-Ranges': 'bytes',
                'Cache-Control': 'public, max-age=3600',
                'X-Proxy-By': 'Vayu Player'
            };

            if (proxyRes.headers['content-length']) responseHeaders['Content-Length'] = proxyRes.headers['content-length'];
            if (proxyRes.headers['content-range']) responseHeaders['Content-Range'] = proxyRes.headers['content-range'];

            clientRes.writeHead(proxyRes.statusCode, responseHeaders);
            
            // Pipe data
            proxyRes.pipe(clientRes);

            proxyRes.on('end', () => resolve());
            proxyRes.on('error', reject);
        });

        proxyReq.on('error', reject);
        proxyReq.on('timeout', () => {
            proxyReq.destroy();
            reject(new Error('Request timeout'));
        });

        // Handle client disconnect to stop stream
        clientRes.on('close', () => {
            proxyReq.destroy();
        });

        proxyReq.end();
    });
}
