const axios = require('axios');
require('dotenv').config();

const apiKey = process.env.GEMINI_API_KEY;

async function listModels() {
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const response = await axios.get(url);

        console.log('Available Models:');
        response.data.models.forEach(m => {
            console.log(`- ${m.name} (${m.displayName})`);
            console.log(`  Limits: RPM=${m.baseModelId || '?'}, Methods=${m.supportedGenerationMethods?.join(',')}`);
        });
    } catch (error) {
        console.error('Failed to list models:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data));
        } else {
            console.error('Error:', error.message);
        }
    }
}

listModels();
