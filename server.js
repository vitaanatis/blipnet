// server.js
// This is the main application file for your BlipNet proxy.

const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000; // Render will provide the PORT environment variable

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true })); // For parsing form data

// --- Helper Function: Advanced URL Rewriting ---
// This function now correctly resolves relative URLs against the original page's base URL
// and then wraps them with the proxy's URL.
function rewriteUrls(htmlContent, proxyBaseUrl, originalTargetUrl) {
    // Create a URL object for the original target to resolve relative paths
    const baseUrl = new URL(originalTargetUrl);

    // Regex to find href and src attributes
    // This regex is still basic and might not catch all dynamic URL constructions in JS.
    // It targets common HTML attributes.
    return htmlContent.replace(/(href|src|action)="([^"]*)"/g, (match, attr, url) => {
        // If the URL is already absolute or a data URI, don't rewrite
        if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
            return match;
        }

        try {
            // Resolve the relative URL against the original target's base URL
            const resolvedUrl = new URL(url, baseUrl).href;

            // Construct the full proxy URL for the asset
            // We use encodeURIComponent for the target URL to handle special characters
            return `${attr}="${proxyBaseUrl}/proxy?url=${encodeURIComponent(resolvedUrl)}"`;
        } catch (e) {
            console.warn(`BlipNet: Could not resolve URL "${url}" relative to "${originalTargetUrl}". Error: ${e.message}`);
            // If resolution fails, return the original match to avoid breaking the page
            return match;
        }
    });
}

// --- Main Proxy Route ---
app.get('/proxy', async (req, res) => {
    const targetUrl = req.query.url;

    if (!targetUrl) {
        // If no URL is provided, display an error message with the input form
        return res.status(400).send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>BlipNet Proxy - Error</title>
                <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
                <script src="https://cdn.tailwindcss.com"></script>
                <style>
                    body {
                        font-family: 'Inter', sans-serif;
                        background: linear-gradient(135deg, #1a202c 0%, #2d3748 100%); /* Darker, techier gradient */
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        margin: 0;
                        padding: 1rem;
                        box-sizing: border-box;
                        color: #e2e8f0; /* Light text for dark background */
                    }
                    .container {
                        background-color: #2a3342; /* Darker container */
                        padding: 3rem 2.5rem;
                        border-radius: 0.75rem; /* Slightly less rounded for techier feel */
                        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
                        text-align: center;
                        max-width: 90%;
                        width: 550px;
                        border: 1px solid #4a5568; /* Subtle border */
                        animation: fadeIn 0.8s ease-out;
                        position: relative; /* For potential future elements */
                        overflow: hidden; /* Ensure shadows/glows are contained */
                    }
                    .container::before { /* Pseudo-element for techy border glow */
                        content: '';
                        position: absolute;
                        top: -2px; left: -2px; right: -2px; bottom: -2px;
                        background: linear-gradient(45deg, #00f260, #0575e6, #6a11cb); /* Vibrant gradient */
                        z-index: -1;
                        border-radius: 0.85rem; /* Slightly larger than container for glow */
                        filter: blur(8px);
                        opacity: 0.6;
                        animation: pulseGlow 4s infinite alternate;
                    }
                    @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(-20px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    @keyframes pulseGlow {
                        0% { opacity: 0.6; transform: scale(1); }
                        50% { opacity: 0.8; transform: scale(1.01); }
                        100% { opacity: 0.6; transform: scale(1); }
                    }
                    .input-field {
                        flex-grow: 1;
                        padding: 0.85rem 1.25rem;
                        background-color: #1a202c; /* Darker input background */
                        border: 1px solid #4a5568;
                        border-radius: 0.5rem; /* Less rounded for techier look */
                        margin-right: 0.75rem;
                        box-sizing: border-box;
                        transition: all 0.3s ease;
                        color: #e2e8f0; /* Light text color */
                    }
                    .input-field::placeholder {
                        color: #a0aec0; /* Lighter placeholder */
                    }
                    .input-field:focus {
                        outline: none;
                        border-color: #00f260; /* Green glow on focus */
                        box-shadow: 0 0 0 3px rgba(0, 242, 96, 0.3); /* Green glow */
                    }
                    .submit-button {
                        padding: 0.85rem 2rem;
                        background: linear-gradient(90deg, #00f260 0%, #0575e6 100%); /* Gradient button */
                        color: white;
                        border: none;
                        border-radius: 0.5rem; /* Less rounded button */
                        cursor: pointer;
                        transition: all 0.3s ease;
                        white-space: nowrap;
                        font-weight: 700; /* Bolder text */
                        box-shadow: 0 4px 15px rgba(0, 242, 96, 0.4); /* Greenish shadow */
                        font-family: 'Orbitron', sans-serif; /* Techy font */
                    }
                    .submit-button:hover {
                        background: linear-gradient(90deg, #0575e6 0%, #00f260 100%); /* Reverse gradient on hover */
                        transform: translateY(-2px) scale(1.02); /* Slight lift and scale */
                        box-shadow: 0 6px 20px rgba(0, 242, 96, 0.6);
                    }
                    .submit-button:active {
                        transform: translateY(0) scale(1);
                        box-shadow: 0 4px 15px rgba(0, 242, 96, 0.4);
                    }
                    .disclaimer {
                        margin-top: 2rem;
                        font-size: 0.875rem;
                        color: #fc8181; /* Lighter red for dark background */
                        line-height: 1.5;
                    }
                    .error-message {
                        color: #fc8181; /* Red for errors */
                        font-weight: 700;
                        margin-bottom: 1rem;
                        font-family: 'Orbitron', sans-serif;
                    }
                    .back-button {
                        padding: 0.75rem 1.5rem;
                        background: linear-gradient(90deg, #0575e6 0%, #6a11cb 100%); /* Blue-purple gradient */
                        color: white;
                        text-decoration: none;
                        border-radius: 0.5rem;
                        transition: all 0.3s ease;
                        font-weight: 700;
                        box-shadow: 0 4px 15px rgba(5, 117, 230, 0.4);
                        display: inline-block;
                        margin-top: 1.5rem;
                        font-family: 'Orbitron', sans-serif;
                    }
                    .back-button:hover {
                        background: linear-gradient(90deg, #6a11cb 0%, #0575e6 100%);
                        transform: translateY(-2px) scale(1.02);
                        box-shadow: 0 6px 20px rgba(5, 117, 230, 0.6);
                    }
                    .back-button:active {
                        transform: translateY(0) scale(1);
                        box-shadow: 0 4px 15px rgba(5, 117, 230, 0.4);
                    }
                    .title-text {
                        font-family: 'Orbitron', sans-serif; /* Apply techy font to title */
                        color: #00f260; /* Greenish glow color */
                        text-shadow: 0 0 10px rgba(0, 242, 96, 0.6), 0 0 20px rgba(0, 242, 96, 0.4); /* Text glow */
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
                    <h1 class="text-4xl font-bold mb-4 title-text">BlipNet Proxy</h1>
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
            // Pass the original target URL to the rewriteUrls function
            htmlContent = rewriteUrls(htmlContent, req.protocol + '://' + req.get('host'), targetUrl);
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
                <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
                <script src="https://cdn.tailwindcss.com"></script>
                <style>
                    body {
                        font-family: 'Inter', sans-serif;
                        background: linear-gradient(135deg, #1a202c 0%, #2d3748 100%);
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        margin: 0;
                        padding: 1rem;
                        box-sizing: border-box;
                        color: #e2e8f0;
                    }
                    .container {
                        background-color: #2a3342;
                        padding: 3rem 2.5rem;
                        border-radius: 0.75rem;
                        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
                        text-align: center;
                        max-width: 90%;
                        width: 550px;
                        border: 1px solid #4a5568;
                        animation: fadeIn 0.8s ease-out;
                        position: relative;
                        overflow: hidden;
                    }
                    .container::before {
                        content: '';
                        position: absolute;
                        top: -2px; left: -2px; right: -2px; bottom: -2px;
                        background: linear-gradient(45deg, #dc2626, #ef4444, #f87171); /* Red gradient for error */
                        z-index: -1;
                        border-radius: 0.85rem;
                        filter: blur(8px);
                        opacity: 0.6;
                        animation: pulseGlow 4s infinite alternate;
                    }
                    @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(-20px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    @keyframes pulseGlow {
                        0% { opacity: 0.6; transform: scale(1); }
                        50% { opacity: 0.8; transform: scale(1.01); }
                        100% { opacity: 0.6; transform: scale(1); }
                    }
                    .error-message {
                        color: #fc8181;
                        font-weight: 700;
                        margin-bottom: 1rem;
                        font-family: 'Orbitron', sans-serif;
                    }
                    .back-button {
                        padding: 0.75rem 1.5rem;
                        background: linear-gradient(90deg, #0575e6 0%, #6a11cb 100%);
                        color: white;
                        text-decoration: none;
                        border-radius: 0.5rem;
                        transition: all 0.3s ease;
                        font-weight: 700;
                        box-shadow: 0 4px 15px rgba(5, 117, 230, 0.4);
                        display: inline-block;
                        margin-top: 1.5rem;
                        font-family: 'Orbitron', sans-serif;
                    }
                    .back-button:hover {
                        background: linear-gradient(90deg, #6a11cb 0%, #0575e6 100%);
                        transform: translateY(-2px) scale(1.02);
                        box-shadow: 0 6px 20px rgba(5, 117, 230, 0.6);
                    }
                    .back-button:active {
                        transform: translateY(0) scale(1);
                        box-shadow: 0 4px 15px rgba(5, 117, 230, 0.4);
                    }
                    .title-text {
                        font-family: 'Orbitron', sans-serif;
                        color: #00f260;
                        text-shadow: 0 0 10px rgba(0, 242, 96, 0.6), 0 0 20px rgba(0, 242, 96, 0.4);
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1 class="text-4xl font-bold mb-4 title-text">BlipNet Proxy Error</h1>
                    <p class="error-message text-xl">Could not proxy the requested URL: <strong>${targetUrl}</strong></p>
                    <p class="text-gray-400 mb-6">Error details: ${error.message}</p>
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
