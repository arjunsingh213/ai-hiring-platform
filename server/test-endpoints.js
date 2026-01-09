const axios = require('axios');
const FormData = require('form-data');

async function testDifferentEndpoints() {
    const apiKey = process.env.UNSTRUCTURED_API_KEY || 'HplXUl9bh61HEgjk5EE7kimFAg0oZP';

    // Create a minimal test PDF
    const testPDFContent = Buffer.from('%PDF-1.4\n1 0 obj\n<</Type /Catalog /Pages 2 0 R>>\nendobj\n2 0 obj\n<</Type /Pages /Kids [3 0 R] /Count 1>>\nendobj\n3 0 obj\n<</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 5 0 R>>\nendobj\n5 0 obj\n<</Length 44>>\nstream\nBT\n/F1 12 Tf\n100 700 Td\n(Test Resume) Tj\nET\nendstream\nendobj\nxref\n0 6\ntrailer\n<</Size 6 /Root 1 0 R>>\nstartxref\n425\n%%EOF');

    const endpoints = [
        'https://api.unstructured.io/general/v0/general',
        'https://api.unstructuredapp.io/general/v0/general',
        'https://api.unstructured.io/v1/partition',
        'https://api.unstructured.io/partition',
        'https://unstructured-api.unstructured.io/general/v0/general',
    ];

    console.log('Testing different Unstructured API endpoints...\n');

    for (const endpoint of endpoints) {
        console.log(`Testing: ${endpoint}`);

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
                    },
                    timeout: 10000
                }
            );

            console.log(`✅ SUCCESS! Status: ${response.status}`);
            console.log(`   Elements: ${response.data?.length || 0}`);
            if (response.data && response.data[0]) {
                console.log(`   Sample: ${response.data[0].text?.substring(0, 50)}`);
            }
            console.log(`\n🎯 WORKING ENDPOINT: ${endpoint}\n`);
            return endpoint;

        } catch (error) {
            if (error.code === 'ENOTFOUND') {
                console.log(`   ❌ DNS resolution failed`);
            } else if (error.response) {
                console.log(`   ⚠️  Response: ${error.response.status} - ${error.response.statusText}`);
                if (error.response.data) {
                    console.log(`   Data: ${JSON.stringify(error.response.data).substring(0, 100)}`);
                }
            } else {
                console.log(`   ⚠️  Error: ${error.message}`);
            }
        }
        console.log('');
    }

    console.log('❌ No working endpoint found');
    console.log('\nThis indicates a network connectivity issue.');
    console.log('Possible solutions:');
    console.log('1. Check firewall settings');
    console.log('2. Disable VPN/Proxy');
    console.log('3. Try from a different network');
    console.log('4. Deploy to Vercel (will work in production)');

    return null;
}

// Run the test
testDifferentEndpoints().then((workingEndpoint) => {
    if (workingEndpoint) {
        console.log('\n✅ Use this endpoint in your code!');
    }
    process.exit(0);
}).catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});
