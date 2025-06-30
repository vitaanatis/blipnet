// server.js
// This is the main application file for your BlipNet proxy.

const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000; // Render will provide the PORT environment variable

// Serve static files from the 'public' directory
// This means that if you have an index.html in 'public', it will be served automatically on '/'
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true })); // For parsing form data

// --- Helper Function: Basic URL Rewriting ---
// This function attempts to rewrite URLs within HTML content.
// It's a very basic implementation and might not cover all cases (e.g., JavaScript-generated URLs).
// For a robust proxy, a dedicated proxy library would be needed.
function rewriteUrls(htmlContent, proxyBaseUrl) {
    // Regex to find href and src attributes that start with '/', './', '../', or are just a path
    // This is a simplified approach. A more robust solution would involve parsing the HTML.
    return htmlContent.replace(/(href|src)="([^"]*)"/g, (match, attr, url) => {
        // If the URL is already absolute or data URI, don't rewrite
        if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
            return match;
        }

        // Construct the full proxy URL for the asset
        // We assume relative URLs are relative to the original requested domain.
        // This is a significant simplification and might break for complex sites.
        // For a true proxy, you'd need to know the base URL of the fetched page.
        // For this basic proxy, we'll just prepend the proxy path, assuming the target site
        // will resolve relative paths correctly or that the user inputs full URLs.
        // A better approach for relative URLs would be to prepend the *original* domain.
        // However, for a simple unblocker, this might be sufficient for many cases.
        return `${attr}="${proxyBaseUrl}/proxy?url=${encodeURIComponent(url)}"`;
    });
}

// --- Main Proxy Route ---
app.get('/proxy', async (req, res) => {
    const targetUrl = req.query.url;

    if (!targetUrl) {
        // If no URL is provided, display an error message with the input form
        // This HTML remains embedded for simplicity of error handling within the proxy logic.
        return res.status(400).send(`
            <div style="font-family: 'Inter', sans-serif; text-align: center; margin-top: 50px; background-color: #f7fafc; padding: 20px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <h1 style="color: #4a5568;">BlipNet Proxy</h1>
                <p style="color: #718096;">Please provide a URL to proxy.</p>
                <form action="/proxy" method="GET" style="margin-top: 20px;">
                    <input type="text" name="url" placeholder="Enter URL (e.g., https://example.com)"
                           style="width: 80%; max-width: 500px; padding: 10px; border: 1px solid #cbd5e0; border-radius: 5px; margin-right: 10px;">
                    <button type="submit"
                            style="padding: 10px 20px; background-color: #4299e1; color: white; border: none; border-radius: 5px; cursor: pointer; transition: background-color 0.3s ease;">
                        Go
                    </button>
                </form>
                <p style="color: #e53e3e; margin-top: 20px;">
                    <strong>Disclaimer:</strong> This is a basic proxy. It may not work for all websites, especially those with complex JavaScript or dynamic content. It does not provide anonymity or security features beyond basic content fetching. Use at your own risk.
                </p>
            </div>
        `);
    }

    try {
        // Fetch the content from the target URL
        const response = await axios.get(targetUrl, {
            responseType: 'arraybuffer', // Get raw buffer to handle various content types
            headers: {
                // Pass through some common headers to mimic a browser, but avoid sensitive ones
                'User-Agent': req.headers['user-agent'] || 'BlipNet-Proxy',
                'Accept': req.headers['accept'] || '*/*',
                'Accept-Encoding': 'gzip, deflate, br', // Let axios handle decompression
                'Connection': 'keep-alive'
            },
            validateStatus: status => true // Do not throw on HTTP errors (e.g., 404, 500)
        });

        // Set appropriate headers from the target response
        for (const header in response.headers) {
            // Avoid setting headers that might cause issues (e.g., 'content-encoding' if axios decompressed)
            if (header !== 'content-encoding' && header !== 'transfer-encoding' && header !== 'connection') {
                res.setHeader(header, response.headers[header]);
            }
        }

        // If it's HTML, attempt to rewrite URLs
        const contentType = response.headers['content-type'] || '';
        if (contentType.includes('text/html')) {
            let htmlContent = response.data.toString('utf8');
            htmlContent = rewriteUrls(htmlContent, req.protocol + '://' + req.get('host')); // Pass the full proxy base URL
            res.send(htmlContent);
        } else {
            // For other content types (images, CSS, JS), just send the raw data
            res.send(response.data);
        }

    } catch (error) {
        console.error(`Proxy error for ${targetUrl}:`, error.message);
        res.status(500).send(`
            <div style="font-family: 'Inter', sans-serif; text-align: center; margin-top: 50px; background-color: #f7fafc; padding: 20px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <h1 style="color: #e53e3e;">BlipNet Proxy Error</h1>
                <p style="color: #718096;">Could not proxy the requested URL: <strong>${targetUrl}</strong></p>
                <p style="color: #718096;">Error details: ${error.message}</p>
                <p style="margin-top: 20px;">
                    <a href="/" style="padding: 10px 20px; background-color: #4299e1; color: white; text-decoration: none; border-radius: 5px; transition: background-color 0.3s ease;">
                        Go Back
                    </a>
                </p>
            </div>
        `);
    }
});

// --- Start the Server ---
app.listen(PORT, () => {
    console.log(`BlipNet proxy server listening on port ${PORT}`);
});
