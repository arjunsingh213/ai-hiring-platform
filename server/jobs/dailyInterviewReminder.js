/**
 * Daily Interview Reminder Job
 * Sends reminders to users who haven't completed platform interview
 * - In-app notifications: Daily
 * - Email reminders: Every 2 days
 */

const User = require('../models/User');
const Notification = require('../models/Notification');
const emailService = require('../services/emailService');

/**
 * Send in-app notification reminder
 */
async function sendInAppReminder(user) {
    try {
        // Check if already reminded today
        const today = new Date().toDateString();
        const lastReminder = user.platformInterview?.lastReminderAt;
        if (lastReminder && new Date(lastReminder).toDateString() === today) {
            return false; // Already reminded today
        }

        // Create notification
        await Notification.create({
            userId: user._id,
            type: 'interview_reminder',
            title: '🎯 Complete Your Platform Interview!',
            message: 'You need to pass the platform interview before you can apply for jobs. Complete it now to unlock job opportunities!',
            link: '/onboarding/jobseeker?step=interview',
            priority: 'high',
            metadata: {
                interviewStatus: user.platformInterview?.status,
                attempts: user.platformInterview?.attempts || 0
            }
        });

        // Update last reminder time
        await User.findByIdAndUpdate(user._id, {
            $set: { 'platformInterview.lastReminderAt': new Date() },
            $inc: { 'platformInterview.reminderCount': 1 }
        });

        return true;
    } catch (error) {
        console.error(`Failed to send in-app reminder to ${user._id}:`, error);
        return false;
    }
}

/**
 * Send email reminder (every 2 days)
 */
async function sendEmailReminder(user) {
    try {
        const lastEmailReminder = user.platformInterview?.lastEmailReminderAt;
        if (lastEmailReminder) {
            const daysSinceLastEmail = (Date.now() - new Date(lastEmailReminder).getTime()) / (1000 * 60 * 60 * 24);
            if (daysSinceLastEmail < 2) {
                return false; // Not yet 2 days since last email
            }
        }

        // Use the email service to send
        if (user.email) {
            const status = user.platformInterview?.status;

            if (status === 'failed') {
                await emailService.sendRetryReminderEmail(user);
            } else {
                await emailService.sendInterviewReminderEmail(user);
            }

            // Update last email reminder time
            await User.findByIdAndUpdate(user._id, {
                $set: { 'platformInterview.lastEmailReminderAt': new Date() }
            });

            return true;
        }

        return false;
    } catch (error) {
        console.error(`Failed to send email reminder to ${user._id}:`, error);
        return false;
    }
}

/**
 * Run the daily reminder job
 * Call this function from a cron scheduler or manually
 */
async function runDailyReminderJob() {
    console.log('🔔 Running daily interview reminder job...');

    try {
        // Find all jobseekers who haven't passed platform interview
        const usersToRemind = await User.find({
            role: 'jobseeker',
            'platformInterview.status': { $in: ['pending', 'skipped', 'failed'] },
            // Only remind users who created account more than 1 day ago
            createdAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }).select('_id email platformInterview');

        console.log(`Found ${usersToRemind.length} users to remind`);

        let inAppSent = 0;
        let emailsSent = 0;

        for (const user of usersToRemind) {
            // Send in-app notification (daily)
            if (await sendInAppReminder(user)) {
                inAppSent++;
            }

            // Send email reminder (every 2 days)
            if (user.email && await sendEmailReminder(user)) {
                emailsSent++;
            }
        }

        console.log(`✅ Daily reminder job complete: ${inAppSent} in-app, ${emailsSent} emails sent`);

        return {
            success: true,
            usersFound: usersToRemind.length,
            inAppNotifications: inAppSent,
            emailsSent: emailsSent
        };
    } catch (error) {
        console.error('❌ Daily reminder job failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Create specific reminder for failed candidates
 * These users need skill improvement reminders
 */
async function sendFailedCandidateReminder(user) {
    try {
        await Notification.create({
            userId: user._id,
            type: 'skill_improvement',
            title: '📚 Ready to Retry Your Interview?',
            message: `You can retry the platform interview after ${new Date(user.platformInterview.retryAfter).toLocaleDateString()}. Use this time to brush up on your skills!`,
            link: '/onboarding/jobseeker?step=interview',
            priority: 'medium',
            metadata: {
                previousScore: user.platformInterview?.score,
                retryAfter: user.platformInterview?.retryAfter
            }
        });
        return true;
    } catch (error) {
        console.error(`Failed to send skill improvement reminder to ${user._id}:`, error);
        return false;
    }
}

module.exports = {
    runDailyReminderJob,
    sendInAppReminder,
    sendEmailReminder,
    sendFailedCandidateReminder
};
