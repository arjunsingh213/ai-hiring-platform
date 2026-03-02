require('dotenv').config({ path: './.env' });
const openRouterService = require('./services/ai/openRouterService');

async function testParse() {
    const resumeText = `
    JOHN DOE
    johndoe@example.com | 123-456-7890 | San Francisco, CA
    LinkedIn: linkedin.com/in/johndoe | GitHub: github.com/johndoe

    SUMMARY
    Experienced software engineer with 5 years of experience in full-stack development.

    SKILLS
    JavaScript, React, Node.js, MongoDB, Python, AWS

    EXPERIENCE
    Software Engineer - Tech Corp (2018 - 2023)
    - Developed scalable web applications using React and Node.js
    - Improved database query performance by 30%

    EDUCATION
    BS Computer Science - University of Technology (2014 - 2018)
    `;

    try {
        console.log('Testing resume parsing with Llama 3.1 405B...');
        const result = await openRouterService.parseResume(resumeText, false, { userId: 'test_user' });
        console.log('\n--- PARSED RESULT ---\n');
        console.log(JSON.stringify(result, null, 2));
    } catch (err) {
        console.error('Error during parsing:', err);
    }
}

testParse();