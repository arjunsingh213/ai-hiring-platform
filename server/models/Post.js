const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    content: {
        text: String,
        title: String,           // For achievements
        score: Number,           // Performance score
        skills: [String],        // Skill tags
        atpReference: {          // Reference to user's ATP for live sync
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        jobId: {                 // For job postings
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Job'
        },
        media: [{
            type: {
                type: String,
                enum: ['image', 'video', 'document']
            },
            fileId: String,
            fileName: String,
            url: String,
            thumbnail: String
        }]
    },

    postType: {
        type: String,
        enum: ['text', 'media', 'achievement', 'proof_of_work', 'atp', 'job_posting', 'company_update', 'job_update', 'open_to_work', 'challenge'],
        default: 'text'
    },

    // Engagement
    engagement: {
        likes: [{
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            likedAt: {
                type: Date,
                default: Date.now
            }
        }],
        dislikes: [{
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            dislikedAt: {
                type: Date,
                default: Date.now
            }
        }],
        comments: [{
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            text: String,
            createdAt: {
                type: Date,
                default: Date.now
            }
        }],
        shares: [{
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            sharedAt: {
                type: Date,
                default: Date.now
            }
        }],
        reposts: [{
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            repostedAt: {
                type: Date,
                default: Date.now
            }
        }]
    },

    // Visibility
    visibility: {
        type: String,
        enum: ['public', 'connections', 'private'],
        default: 'public'
    },

    // Tags and mentions
    tags: [String],
    mentions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],

    // Analytics
    views: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

postSchema.index({ userId: 1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ postType: 1 });

module.exports = mongoose.model('Post', postSchema);
