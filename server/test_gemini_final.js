const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const apiKey = process.env.GEMINI_API_KEY;

async function testModel(modelName) {
    const endpoint = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${apiKey}`;
    try {
        const response = await axios.post(endpoint, {
            contents: [{ parts: [{ text: 'Test' }] }]
        }, { timeout: 5000 });
        console.log(`MODEL_RESULT:${modelName}:OK`);
    } catch (error) {
        console.log(`MODEL_RESULT:${modelName}:FAIL:${error.response?.status}:${error.response?.data?.error?.status || 'UNKNOWN'}`);
    }
}

async function run() {
    console.log('--- START DIAGNOSTICS ---');
    await testModel('gemini-1.5-flash');
    await testModel('gemini-2.0-flash');
    await testModel('gemini-1.5-flash-8b');
    console.log('--- END DIAGNOSTICS ---');
}

run();
