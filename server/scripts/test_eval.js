
const axios = require('axios');
const mongoose = require('mongoose');

async function testSubmit() {
    try {
        console.log('Testing openrouter evaluation...');
        
        // Let's create a mocked request to openRouterService directly instead of full endpoint to avoid DB deps
        const openRouterService = require('../services/ai/openRouterService');
        
        const qna = [
            { question: 'What is React?', answer: 'I don\'t know the answer to this question (Skipped).' },
            { question: 'Explain useState.', answer: '(Skipped)' },
            { question: 'How does Node.js work?', answer: 'I dont know' }
        ];
        
        const jobContext = {
            jobTitle: 'Software Engineer',
            jobDescription: 'Frontend React dev',
            requiredSkills: ['React', 'Node.js']
        };
        
        const evalResult = await openRouterService.evaluateAllAnswers(qna, jobContext);
        console.log('Result:', JSON.stringify(evalResult, null, 2));
    } catch (e) {
        console.error('Test failed:', e);
    }
}
testSubmit();
