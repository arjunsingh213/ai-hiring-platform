const axios = require('axios');
const FormData = require('form-data');

async function testPlatformEndpoint() {
    const apiKey = process.env.UNSTRUCTURED_API_KEY || 'HplXUl9bh61HEgjk5EE7kimFAg0oZP';

    // Create a minimal test PDF
    const testPDFContent = Buffer.from('%PDF-1.4\n1 0 obj\n<</Type /Catalog /Pages 2 0 R>>\nendobj\n2 0 obj\n<</Type /Pages /Kids [3 0 R] /Count 1>>\nendobj\n3 0 obj\n<</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792]>>\nendobj\ntrailer\n<</Size 4 /Root 1 0 R>>\nstartxref\n200\n%%EOF');

    const endpoints = [
        'https://platform.unstructuredapp.io/api/v1/partition',
        'https://platform.unstructuredapp.io/api/v1/general',
        'https://platform.unstructuredapp.io/general/v0/general',
    ];

    console.log('Testing platform.unstructuredapp.io endpoints...\n');

    for (const endpoint of endpoints) {
        console.log(`\nTesting: ${endpoint}`);

        try {
            const formData = new FormData();
            formData.append('files', testPDFContent, {
                filename: 'test.pdf',
                contentType: 'application/pdf'
            });
            formData.append('strategy', 'auto');

            const response = await axios.post(
                endpoint,
                formData,
                {
                    headers: {
                        ...formData.getHeaders(),
                        'Authorization': `Bearer ${apiKey}`,
                        'unstructured-api-key': apiKey,
                    },
                    timeout: 15000
                }
            );

            console.log(`✅✅✅ SUCCESS! ✅✅✅`);
            console.log(`Status: ${response.status}`);
            console.log(`Elements: ${response.data?.length || 'N/A'}`);
            console.log(`Response type: ${typeof response.data}`);

            if (Array.isArray(response.data)) {
                console.log(`Array length: ${response.data.length}`);
                if (response.data[0]) {
                    console.log(`First element:`, JSON.stringify(response.data[0], null, 2));
                }
            } else {
                console.log(`Response:`, JSON.stringify(response.data, null, 2).substring(0, 500));
            }

            console.log(`\n🎯🎯🎯 WORKING ENDPOINT FOUND: ${endpoint} 🎯🎯🎯\n`);
            return endpoint;

        } catch (error) {
            if (error.code === 'ENOTFOUND') {
                console.log(`❌ DNS resolution failed (network block)`);
            } else if (error.code === 'ETIMEDOUT') {
                console.log(`❌ Connection timeout`);
            } else if (error.response) {
                console.log(`Status: ${error.response.status} - ${error.response.statusText}`);
                console.log(`Data:`, JSON.stringify(error.response.data, null, 2).substring(0, 300));
            } else {
                console.log(`Error: ${error.message}`);
            }
        }
    }

    console.log('\n❌ No working endpoint found');
    return null;
}

// Run the test
testPlatformEndpoint().then((workingEndpoint) => {
    if (workingEndpoint) {
        console.log('\n✅ UPDATE YOUR CODE TO USE THIS ENDPOINT! ✅');
    }
    process.exit(0);
}).catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});
