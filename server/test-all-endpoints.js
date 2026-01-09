const axios = require('axios');
const FormData = require('form-data');

async function testAllPossibleEndpoints() {
    const apiKey = 'HplXUl9bh61HEgjk5EE7kimFAg0oZP';

    // Create a minimal test PDF
    const testPDF = Buffer.from('%PDF-1.4\n1 0 obj\n<</Type /Catalog /Pages 2 0 R>>\nendobj\nxref\n0 2\ntrailer\n<</Size 2 /Root 1 0 R>>\nstartxref\n100\n%%EOF');

    const endpoints = [
        { url: 'https://api.unstructuredapp.io/general/v0/general', auth: 'unstructured-api-key' },
        { url: 'https://api.unstructuredapp.io/partition', auth: 'unstructured-api-key' },
        { url: 'https://api.unstructuredapp.io/api/v1/partition', auth: 'unstructured-api-key' },
        { url: 'https://platform.unstructuredapp.io/api/v1/partition', auth: 'unstructured-api-key' },
        { url: 'https://api.unstructured.cloud/general/v0/general', auth: 'unstructured-api-key' },
        { url: 'https://api.unstructured.io/general/v0/general', auth: 'Bearer' },
        { url: 'https://api.unstructured.io/general/v0/general', auth: 'unstructured-api-key' },
    ];

    console.log('Testing all possible Unstructured endpoints...\n');

    for (const endpoint of endpoints) {
        console.log(`Testing: ${endpoint.url}`);
        console.log(`Auth type: ${endpoint.auth}`);

        try {
            const formData = new FormData();
            formData.append('files', testPDF, {
                filename: 'test.pdf',
                contentType: 'application/pdf'
            });
            formData.append('strategy', 'auto');

            const headers = { ...formData.getHeaders() };
            if (endpoint.auth === 'Bearer') {
                headers['Authorization'] = `Bearer ${apiKey}`;
            } else {
                headers['unstructured-api-key'] = apiKey;
            }

            const response = await axios.post(endpoint.url, formData, {
                headers,
                timeout: 15000
            });

            console.log(`✅✅✅ SUCCESS! ✅✅✅`);
            console.log(`Status: ${response.status}`);
            console.log(`Data type: ${typeof response.data}`);
            console.log(`Length: ${Array.isArray(response.data) ? response.data.length : 'N/A'}`);
            console.log(`\n🎯 WORKING ENDPOINT: ${endpoint.url}`);
            console.log(`🎯 AUTH METHOD: ${endpoint.auth}\n`);
            return endpoint;

        } catch (error) {
            if (error.code === 'ENOTFOUND') {
                console.log(`  ❌ DNS failed`);
            } else if (error.response) {
                console.log(`  Status: ${error.response.status} - ${error.response.statusText}`);
            } else {
                console.log(`  Error: ${error.message}`);
            }
        }
        console.log('');
    }

    console.log('❌ No working endpoint found with this API key');
    console.log('\nPossible issues:');
    console.log('1. API key might be invalid or expired');
    console.log('2. API key might be for self-hosted, not cloud');
    console.log('3. Need to sign up for Unstructured Cloud API');

    return null;
}

testAllPossibleEndpoints().then(() => {
    process.exit(0);
});
