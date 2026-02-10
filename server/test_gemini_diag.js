const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error('GEMINI_API_KEY is missing from .env');
    console.log('Available env vars:', Object.keys(process.env).filter(k => k.includes('KEY')));
    process.exit(1);
}

const modelsToTest = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash'];

async function testModel(modelName) {
    console.log(`Testing model: ${modelName}...`);
    const endpoint = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${apiKey}`;
    try {
        const response = await axios.post(endpoint, {
            contents: [{ parts: [{ text: 'Hello, this is a test.' }] }]
        }, { timeout: 10000 });
        console.log(`✅ ${modelName} works!`);
        return true;
    } catch (error) {
        console.error(`❌ ${modelName} failed: ${error.response?.status} ${error.response?.statusText || ''}`);
        if (error.response?.data) {
            console.error('   Error data:', JSON.stringify(error.response.data));
        }
        return false;
    }
}

async function run() {
    for (const model of modelsToTest) {
        await testModel(model);
    }
}

run();
