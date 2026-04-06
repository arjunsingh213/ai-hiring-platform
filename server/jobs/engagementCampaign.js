const cron = require('node-cron');
const User = require('../models/User');
const Interview = require('../models/Interview');
const EmailLog = require('../models/EmailLog');
const emailService = require('../services/emailService');

const COOLDOWN_HOURS = 48; // Minimum hours between engagement emails
const INACTIVE_DAYS = 7;   // Days to consider a user inactive

/**
 * Run the Engagement Campaign
 * Evaluates all users and sends the single most relevant email if they pass the cooldown check.
 */
async function runEngagementCampaign() {
    console.log('[EngagementCampaign] Starting automated engagement evaluation...');
    
    try {
        const users = await User.find({ role: 'jobseeker' }).select('_id email profile isOnboardingComplete createdAt lastActive');
        const now = new Date();
        const todayIsEven = now.getDate() % 2 === 0;
        
        let sentCount = {
            half_baked_interview: 0,
            incomplete_profile: 0,
            inactive_user: 0
        };
        
        const MAX_DAILY_EMAILS = 80; // Leaves buffer for welcome emails and other transactional emails
        let totalEmailsSentToday = 0;

        for (const user of users) {
             if (totalEmailsSentToday >= MAX_DAILY_EMAILS) {
                 console.log(`[EngagementCampaign] Reached maximum daily limit of ${MAX_DAILY_EMAILS} engagement emails. Stopping.`);
                 break;
             }

             if (!user.email) continue;

             // Logic to split users into two cohorts (Even hex ending vs Odd hex ending)
             const userIdHex = user._id.toString();
             // Get the last hex character and check if its integer value is even
             const userIsEven = parseInt(userIdHex.slice(-1), 16) % 2 === 0;
             
             // If today is even, we only process even users. If today is odd, we only process odd users.
             if (todayIsEven !== userIsEven) {
                 continue; // Skip the user to respect the cohort division
             }

             // Check global cooldown (Double check just to be safe, though our cohorts naturally space it to 2 days)
             const recentEmail = await EmailLog.findOne({ userId: user._id })
                .sort({ sentAt: -1 });
             
             if (recentEmail) {
                 const hoursSinceLastEmail = (now - new Date(recentEmail.sentAt)) / (1000 * 60 * 60);
                 if (hoursSinceLastEmail < COOLDOWN_HOURS) {
                     continue; // Skip user: within cooldown period
                 }
             }

             // Priority 1: Half-Baked Interviews (stuck in 'in_progress' for over 1 day)
             const stuckInterview = await Interview.findOne({
                 userId: user._id,
                 status: 'in_progress',
                 updatedAt: { $lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
             }).populate('jobId', 'title');

             if (stuckInterview) {
                 // Check if we ALREADY sent a half-baked reminder for THIS specific interview
                 const alreadyReminded = await EmailLog.findOne({
                     userId: user._id,
                     emailType: 'half_baked_interview',
                     'metadata.interviewId': stuckInterview._id.toString()
                 });

                 if (!alreadyReminded) {
                     const roleName = stuckInterview.jobId ? stuckInterview.jobId.title : 'the platform assessment';
                     await emailService.sendHalfBakedInterviewEmail(user, roleName);
                     
                     await EmailLog.create({
                         userId: user._id,
                         emailType: 'half_baked_interview',
                         subject: `Incomplete Interview for ${roleName} ⚠️`,
                         metadata: { interviewId: stuckInterview._id.toString() }
                     });
                     
                     sentCount.half_baked_interview++;
                     totalEmailsSentToday++;
                     continue; // Move to next user
                 }
             }

             // Priority 2: Incomplete Profile
             if (!user.isOnboardingComplete) {
                 const hoursSinceSignup = (now - new Date(user.createdAt)) / (1000 * 60 * 60);
                 if (hoursSinceSignup > 48) {
                     await emailService.sendIncompleteProfileEmail(user);
                     
                     await EmailLog.create({
                         userId: user._id,
                         emailType: 'incomplete_profile',
                         subject: 'Complete your profile to stand out! 🌟'
                     });
                     
                     sentCount.incomplete_profile++;
                     totalEmailsSentToday++;
                     continue; // Move to next user
                 }
             }

             // Priority 3: Inactive User
             const daysInactive = (now - new Date(user.lastActive || user.createdAt)) / (1000 * 60 * 60 * 24);
             if (daysInactive > INACTIVE_DAYS) {
                 await emailService.sendInactiveUserEmail(user);
                 
                 await EmailLog.create({
                     userId: user._id,
                     emailType: 'inactive_user',
                     subject: 'We miss you at Froscel 🚀'
                 });
                 
                 sentCount.inactive_user++;
                 totalEmailsSentToday++;
                 continue; // Move to next user
             }
        }

        console.log(`[EngagementCampaign] Completed. Sent: Half-Baked(${sentCount.half_baked_interview}), Incomplete Profile(${sentCount.incomplete_profile}), Inactive(${sentCount.inactive_user}).`);
        
    } catch (error) {
        console.error('[EngagementCampaign] Error:', error);
    }
}

/**
 * Schedule the cron job - runs daily at 10 AM server time
 */
function scheduleEngagementCampaign() {
    cron.schedule('0 10 * * *', async () => {
        console.log('[EngagementCampaign] Cron triggered at', new Date().toISOString());
        await runEngagementCampaign();
    }, {
        timezone: 'Asia/Kolkata'
    });
    console.log('[EngagementCampaign] Cron job scheduled - daily at 10:00 AM IST');
}

module.exports = {
    runEngagementCampaign,
    scheduleEngagementCampaign
};
