const geminiRouter = require('./services/ai/geminiRouter');
require('dotenv').config();

async function testBurst() {
    console.log('🚀 Starting Robust Burst Test: Firing 3 simultaneous requests...');
    const startTime = Date.now();

    // Using substantial prompts to avoid 400 errors related to content length or quality
    const tasks = [
        geminiRouter.callGemini('validate_answer', 'The candidate answered that they have 5 years of experience in React and Node.js. Please validate if this is a relevant answer.'),
        geminiRouter.callGemini('validate_answer', 'The candidate mentioned they worked on a large-scale e-commerce project using microservices architecture.'),
        geminiRouter.callGemini('adaptive_followup', 'Generate a follow-up question for a software engineer candidate who just discussed their experience with Docker and Kubernetes.')
    ];

    try {
        const results = await Promise.all(tasks);
        const duration = (Date.now() - startTime) / 1000;

        console.log('\n✅ Burst Test Completed!');
        console.log(`Total Duration: ${duration.toFixed(2)} seconds`);

        results.forEach((res, i) => {
            console.log(`Result ${i + 1}: ${res ? 'SUCCESS (Truncated: ' + res.substring(0, 30) + '...)' : 'FAILED'}`);
        });

        if (duration < 3) {
            console.error('❌ FAIL: Requests were not staggered enough.');
        } else {
            console.log('✨ SUCCESS: Requests were correctly staggered and processed.');
        }
    } catch (error) {
        console.error('❌ Burst Test Failed:', error.message);
        if (error.response) {
            console.error('Error Details:', JSON.stringify(error.response.data));
        }
    }
}

testBurst();
