const express = require('express');
const axios = require('axios');
const zlib = require('zlib');

const app = express();
const port = 3000;

// Helper function to compress HTML
const compressContent = async (content) => {
    return new Promise((resolve, reject) => {
        zlib.gzip(content, (err, result) => {
            if (err) reject(err);
            resolve(result);
        });
    });
};

// Helper function for filtering
const applyFilter = (html, filterRegex) => {
    const matches = [];
    const regex = new RegExp(filterRegex, 'gi');
    let match;
    while ((match = regex.exec(html)) !== null) {
        matches.push(match[0]);
    }
    return matches;
};

app.get('/html-scrapper', async (req, res) => {
    try {
        const { url, from, compress, filter } = req.query;

        if (!url) {
            return res.status(400).json({ error: "URL parameter is required." });
        }

        // Fetch the HTML content
        const response = await axios.get(url);
        let htmlContent = response.data;

        // Apply filter if provided
        if (filter) {
            htmlContent = applyFilter(htmlContent, filter);
            htmlContent = Array.isArray(htmlContent) ? htmlContent.join('\n') : htmlContent;
        }

        // Prepare response based on the 'from' parameter
        let responseBody;
        switch (from) {
            case 'json':
                responseBody = {
                    size: Buffer.byteLength(htmlContent, 'utf-8'),
                    html: htmlContent,
                };
                if (compress === 'true') {
                    responseBody.html = (await compressContent(htmlContent)).toString('base64');
                }
                break;
            case 'text':
                responseBody = compress === 'true' 
                    ? (await compressContent(htmlContent)).toString('base64') 
                    : htmlContent;
                break;
            default:
                return res.status(400).json({ error: "'from' parameter must be either 'text' or 'json'." });
        }

        // Return the response
        res.type(from === 'json' ? 'application/json' : 'text/plain').send(responseBody);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch the HTML content." });
    }
});

app.listen(port, () => {
    console.log(`HTML Scrapper running on http://localhost:${port}`);
});
