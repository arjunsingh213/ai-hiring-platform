const axios = require('axios');

async function testUnstructuredAPI() {
    const apiKey = process.env.UNSTRUCTURED_API_KEY || 'HplXUl9bh61HEgjk5EE7kimFAg0oZP';

    console.log('Testing Unstructured API connectivity...');
    console.log('API Key:', apiKey.substring(0, 10) + '...');

    try {
        // Test 1: Basic connectivity
        console.log('\n1. Testing DNS resolution and connectivity...');
        const response = await axios.get('https://api.unstructured.io', {
            timeout: 10000,
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        });
        console.log('✅ DNS and connectivity OK');
    } catch (error) {
        if (error.code === 'ENOTFOUND') {
            console.error('❌ DNS resolution failed - Cannot find api.unstructured.io');
            console.log('\nPossible causes:');
            console.log('1. Firewall blocking external requests');
            console.log('2. VPN/Proxy interference');
            console.log('3. DNS server issues');
            console.log('4. Network restrictions');
            console.log('\nTry:');
            console.log('- Check if you can access https://api.unstructured.io in browser');
            console.log('- Disable VPN/Proxy temporarily');
            console.log('- Check firewall settings');
        } else {
            console.log('Connection response:', error.response?.status || error.message);
        }
    }

    // Test 2: Actual API call
    console.log('\n2. Testing API endpoint with sample data...');
    try {
        const FormData = require('form-data');
        const fs = require('fs');

        const formData = new FormData();
        // Create a minimal test PDF
        const testPDFContent = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/Resources <<\n/Font <<\n/F1 4 0 R\n>>\n>>\n/MediaBox [0 0 612 792]\n/Contents 5 0 R\n>>\nendobj\n4 0 obj\n<<\n/Type /Font\n/Subtype /Type1\n/BaseFont /Helvetica\n>>\nendobj\n5 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n/F1 12 Tf\n100 700 Td\n(Test Resume) Tj\nET\nendstream\nendobj\nxref\n0 6\n0000000000 65535 f\n0000000015 00000 n\n0000000068 00000 n\n0000000125 00000 n\n0000000264 00000 n\n0000000333 00000 n\ntrailer\n<<\n/Size 6\n/Root 1 0 R\n>>\nstartxref\n425\n%%EOF');

        formData.append('files', testPDFContent, {
            filename: 'test.pdf',
            contentType: 'application/pdf'
        });
        formData.append('strategy', 'auto');

        const response = await axios.post(
            'https://api.unstructured.io/general/v0/general',
            formData,
            {
                headers: {
                    ...formData.getHeaders(),
                    'Authorization': `Bearer ${apiKey}`,
                },
                timeout: 30000
            }
        );

        console.log('✅ API call successful!');
        console.log('Response status:', response.status);
        console.log('Elements returned:', response.data?.length || 0);

        if (response.data && response.data.length > 0) {
            console.log('Sample element:', response.data[0]);
        }
    } catch (error) {
        if (error.code === 'ENOTFOUND') {
            console.error('❌ DNS resolution still failing');
        } else if (error.response) {
            console.error('❌ API Error:', error.response.status);
            console.error('Response:', error.response.data);
        } else {
            console.error('❌ Error:', error.message);
        }
    }
}

// Run the test
testUnstructuredAPI().then(() => {
    console.log('\n=== Test Complete ===');
    process.exit(0);
}).catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});
