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
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>BlipNet Proxy - Error</title>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
                <script src="https://cdn.tailwindcss.com"></script>
                <style>
                    body {
                        font-family: 'Inter', sans-serif;
                        background: linear-gradient(135deg, #f0f4f8 0%, #d9e2ec 100%);
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        margin: 0;
                        padding: 1rem;
                        box-sizing: border-box;
                    }
                    .container {
                        background-color: #ffffff;
                        padding: 3rem 2.5rem;
                        border-radius: 1.5rem;
                        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
                        text-align: center;
                        max-width: 90%;
                        width: 550px;
                        border: 1px solid #e2e8f0;
                        animation: fadeIn 0.8s ease-out;
                    }
                    @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(-20px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    .input-field {
                        flex-grow: 1;
                        padding: 0.85rem 1.25rem;
                        border: 1px solid #cbd5e0;
                        border-radius: 0.75rem;
                        margin-right: 0.75rem;
                        box-sizing: border-box;
                        transition: all 0.3s ease;
                    }
                    .input-field:focus {
                        outline: none;
                        border-color: #63b3ed;
                        box-shadow: 0 0 0 3px rgba(99, 179, 237, 0.5);
                    }
                    .submit-button {
                        padding: 0.85rem 2rem;
                        background-color: #38a169;
                        color: white;
                        border: none;
                        border-radius: 0.75rem;
                        cursor: pointer;
                        transition: background-color 0.3s ease, transform 0.1s ease;
                        white-space: nowrap;
                        font-weight: 600;
                        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                    }
                    .submit-button:hover {
                        background-color: #2f855a;
                        transform: translateY(-2px);
                    }
                    .submit-button:active {
                        transform: translateY(0);
                        box-shadow: none;
                    }
                    .disclaimer {
                        margin-top: 2rem;
                        font-size: 0.875rem;
                        color: #ef4444;
                        line-height: 1.5;
                    }
                    .error-message {
                        color: #ef4444; /* Red for errors */
                        font-weight: 600;
                        margin-bottom: 1rem;
                    }
                    .back-button {
                        padding: 0.75rem 1.5rem;
                        background-color: #4299e1; /* Blue for back button */
                        color: white;
                        text-decoration: none;
                        border-radius: 0.75rem;
                        transition: background-color 0.3s ease, transform 0.1s ease;
                        font-weight: 600;
                        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                        display: inline-block; /* To allow padding and margin */
                        margin-top: 1.5rem;
                    }
                    .back-button:hover {
                        background-color: #3182ce;
                        transform: translateY(-2px);
                    }
                    .back-button:active {
                        transform: translateY(0);
                        box-shadow: none;
                    }
                    @media (max-width: 640px) {
                        .input-group {
                            flex-direction: column;
                            align-items: stretch;
                        }
                        .input-field {
                            width: 100%;
                            margin-right: 0;
                            margin-bottom: 0.75rem;
                        }
                        .submit-button {
                            width: 100%;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1 class="text-4xl font-bold text-gray-800 mb-4">BlipNet Proxy</h1>
                    <p class="error-message text-xl">Please provide a URL to proxy.</p>
                    <form action="/proxy" method="GET" class="flex flex-col sm:flex-row items-center justify-center input-group">
                        <input type="text" name="url" placeholder="Enter URL (e.g., https://example.com)"
                               class="input-field">
                        <button type="submit" class="submit-button">
                            Go!
                        </button>
                    </form>
                    <p class="disclaimer">
                        <strong>Disclaimer:</strong> This is a basic proxy. It may not work for all websites, especially those with complex JavaScript or dynamic content. It does not provide anonymity or security features beyond basic content fetching. Use at your own risk.
                    </p>
                </div>
            </body>
            </html>
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
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>BlipNet Proxy - Error</title>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
                <script src="https://cdn.tailwindcss.com"></script>
                <style>
                    body {
                        font-family: 'Inter', sans-serif;
                        background: linear-gradient(135deg, #f0f4f8 0%, #d9e2ec 100%);
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        margin: 0;
                        padding: 1rem;
                        box-sizing: border-box;
                    }
                    .container {
                        background-color: #ffffff;
                        padding: 3rem 2.5rem;
                        border-radius: 1.5rem;
                        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
                        text-align: center;
                        max-width: 90%;
                        width: 550px;
                        border: 1px solid #e2e8f0;
                        animation: fadeIn 0.8s ease-out;
                    }
                    @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(-20px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    .error-message {
                        color: #ef4444; /* Red for errors */
                        font-weight: 600;
                        margin-bottom: 1rem;
                    }
                    .back-button {
                        padding: 0.75rem 1.5rem;
                        background-color: #4299e1; /* Blue for back button */
                        color: white;
                        text-decoration: none;
                        border-radius: 0.75rem;
                        transition: background-color 0.3s ease, transform 0.1s ease;
                        font-weight: 600;
                        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                        display: inline-block; /* To allow padding and margin */
                        margin-top: 1.5rem;
                    }
                    .back-button:hover {
                        background-color: #3182ce;
                        transform: translateY(-2px);
                    }
                    .back-button:active {
                        transform: translateY(0);
                        box-shadow: none;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1 class="text-4xl font-bold text-gray-800 mb-4">BlipNet Proxy Error</h1>
                    <p class="error-message text-xl">Could not proxy the requested URL: <strong>${targetUrl}</strong></p>
                    <p class="text-gray-600 mb-6">Error details: ${error.message}</p>
                    <a href="/" class="back-button">Go Back to Home</a>
                </div>
            </body>
            </html>
        `);
    }
});

// --- Start the Server ---
app.listen(PORT, () => {
    console.log(`BlipNet proxy server listening on port ${PORT}`);
});
