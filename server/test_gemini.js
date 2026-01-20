const axios = require('axios');
require('dotenv').config();

const apiKey = process.env.GEMINI_API_KEY;
const models = ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-1.5-flash'];

async function testModels() {
    for (const model of models) {
        console.log(`\n--- Testing Model: ${model} ---`);
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            const response = await axios.post(url, {
                contents: [{ parts: [{ text: "hi" }] }]
            }, { timeout: 10000 });

            console.log(`SUCCESS: ${model}`);
            console.log('Response Status:', response.status);
            console.log('Usage metadata:', response.data.usageMetadata);
        } catch (error) {
            console.error(`FAILED: ${model}`);
            if (error.response) {
                console.error('Status:', error.response.status);
                console.error('Data:', JSON.stringify(error.response.data));
                console.error('Headers Limit:', error.response.headers['x-goog-ratelimit-limit']);
                console.error('Headers Remaining:', error.response.headers['x-goog-ratelimit-remaining']);
            } else {
                console.error('Error:', error.message);
            }
        }
    }
}

testModels();
