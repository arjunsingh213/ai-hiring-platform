const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    recipientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    content: {
        type: String,
        required: true
    },

    attachments: [{
        fileId: String, // GridFS file ID
        fileName: String,
        fileType: String,
        fileSize: Number
    }],

    read: {
        type: Boolean,
        default: false
    },

    readAt: Date,

    // Message metadata
    metadata: {
        edited: Boolean,
        editedAt: Date,
        deleted: Boolean,
        deletedAt: Date
    }
}, {
    timestamps: true
});

messageSchema.index({ senderId: 1, recipientId: 1 });
messageSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
