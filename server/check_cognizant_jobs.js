
const mongoose = require('mongoose');
const Job = require('./models/Job');
require('dotenv').config();

const checkCognizant = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const cognacId = '696b64181e21819ad3f83b41'; // Cognizant ID
        const jobs = await Job.find({ recruiterId: cognacId });
        console.log(`Jobs for Cognizant (${cognacId}):`, jobs.map(j => j.title));
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
};

checkCognizant();
