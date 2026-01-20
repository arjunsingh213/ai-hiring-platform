
const axios = require('axios');

const API_URL = 'http://localhost:5000/api';
const recruiterId = '696d1cfc7fd117d1e51bb808';

const testEndpoints = async () => {
    try {
        console.log('--- Testing Recruiter Endpoints ---');

        // 1. Test My Jobs
        console.log('\n1. GET /jobs/recruiter/:id');
        const jobsResponse = await axios.get(`${API_URL}/jobs/recruiter/${recruiterId}`);
        console.log('Success:', jobsResponse.data.success);
        console.log('Count:', jobsResponse.data.count);
        if (jobsResponse.data.data.length > 0) {
            console.log('First Job:', jobsResponse.data.data[0].title);
        }

        // 2. Test Analytics
        console.log('\n2. GET /jobs/recruiter/:id/analytics');
        const analyticsResponse = await axios.get(`${API_URL}/jobs/recruiter/${recruiterId}/analytics`);
        console.log('Success:', analyticsResponse.data.success);
        console.log('Total Jobs:', analyticsResponse.data.data?.overview?.totalJobs);

        // 3. Test All Applicants
        console.log('\n3. GET /jobs/recruiter/:id/all-applicants');
        const applicantsResponse = await axios.get(`${API_URL}/jobs/recruiter/${recruiterId}/all-applicants`);
        console.log('Success:', applicantsResponse.data.success);
        console.log('Count:', applicantsResponse.data.count);

    } catch (error) {
        console.error('Test Failed:', error.response?.data || error.message);
    }
};

testEndpoints();
