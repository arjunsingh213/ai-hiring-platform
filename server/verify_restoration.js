const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const apiKey = process.env.GEMINI_API_KEY;

async function testModel(modelName) {
    console.log(`Verifying model: ${modelName}...`);
    const endpoint = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${apiKey}`;
    try {
        const response = await axios.post(endpoint, {
            contents: [{ parts: [{ text: 'Respond with "OK" if alive.' }] }]
        }, { timeout: 10000 });
        const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
        console.log(`RESULT:${modelName}:${text.trim()}`);
        return true;
    } catch (error) {
        console.error(`RESULT:${modelName}:FAILED:${error.response?.status}`);
        return false;
    }
}

testModel('gemini-2.5-flash');
