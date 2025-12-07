const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Post = require('../models/Post');
const Notification = require('../models/Notification');

// Get public profile
router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.query.currentUserId; // Optional: for checking follow status

        const user = await User.findById(userId)
            .select('-password -testingMode')
            .populate('resume');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check privacy settings
        if (user.privacy?.profileVisibility === 'private' && currentUserId !== userId) {
            return res.status(403).json({ error: 'This profile is private' });
        }

        if (user.privacy?.profileVisibility === 'connections-only' && currentUserId) {
            const isFollowing = user.connections?.followers?.includes(currentUserId);
            if (!isFollowing && currentUserId !== userId) {
                return res.status(403).json({ error: 'This profile is only visible to connections' });
            }
        }

        // Check if current user is following this profile
        let isFollowing = false;
        if (currentUserId) {
            isFollowing = user.connections?.followers?.includes(currentUserId) || false;
        }

        res.json({
            user,
            isFollowing
        });
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// Get user's posts
router.get('/:userId/posts', async (req, res) => {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 10 } = req.query;

        const posts = await Post.find({ userId })
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .populate('userId', 'profile.name profile.photo profile.headline');

        const count = await Post.countDocuments({ userId });

        res.json({
            posts: posts || [],
            totalPages: Math.ceil(count / limit),
            currentPage: parseInt(page)
        });
    } catch (error) {
        console.error('Error fetching user posts:', error);
        // Return empty array instead of error to prevent frontend crashes
        res.json({
            posts: [],
            totalPages: 0,
            currentPage: 1
        });
    }
});

// Follow a user
router.post('/:userId/follow', async (req, res) => {
    try {
        const { userId } = req.params; // User to follow
        const { currentUserId } = req.body; // Current user

        if (!currentUserId) {
            return res.status(400).json({ error: 'Current user ID required' });
        }

        if (userId === currentUserId) {
            return res.status(400).json({ error: 'Cannot follow yourself' });
        }

        // Update target user's followers
        const targetUser = await User.findByIdAndUpdate(
            userId,
            {
                $addToSet: { 'connections.followers': currentUserId },
                $inc: { 'connections.followersCount': 1 }
            },
            { new: true }
        );

        // Update current user's following
        await User.findByIdAndUpdate(
            currentUserId,
            {
                $addToSet: { 'connections.following': userId },
                $inc: { 'connections.followingCount': 1 }
            }
        );

        // Create notification
        if (targetUser.notificationSettings?.notifyOnFollow) {
            const currentUser = await User.findById(currentUserId).select('profile.name');
            await Notification.create({
                userId: userId,
                sender: currentUserId,
                type: 'follow',
                title: 'New Follower',
                message: `${currentUser.profile.name} started following you`,
                relatedEntity: {
                    entityType: 'user',
                    entityId: currentUserId
                },
                actionUrl: `/profile/${currentUserId}`
            });
        }

        res.json({ message: 'Successfully followed user', user: targetUser });
    } catch (error) {
        console.error('Error following user:', error);
        res.status(500).json({ error: 'Failed to follow user' });
    }
});

// Unfollow a user
router.delete('/:userId/unfollow', async (req, res) => {
    try {
        const { userId } = req.params;
        const { currentUserId } = req.body;

        if (!currentUserId) {
            return res.status(400).json({ error: 'Current user ID required' });
        }

        // Update target user's followers
        await User.findByIdAndUpdate(
            userId,
            {
                $pull: { 'connections.followers': currentUserId },
                $inc: { 'connections.followersCount': -1 }
            }
        );

        // Update current user's following
        await User.findByIdAndUpdate(
            currentUserId,
            {
                $pull: { 'connections.following': userId },
                $inc: { 'connections.followingCount': -1 }
            }
        );

        res.json({ message: 'Successfully unfollowed user' });
    } catch (error) {
        console.error('Error unfollowing user:', error);
        res.status(500).json({ error: 'Failed to unfollow user' });
    }
});

// Get followers list
router.get('/:userId/followers', async (req, res) => {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 20 } = req.query;

        const user = await User.findById(userId)
            .populate({
                path: 'connections.followers',
                select: 'profile.name profile.photo profile.headline role',
                options: {
                    limit: limit * 1,
                    skip: (page - 1) * limit
                }
            });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            followers: user.connections?.followers || [],
            totalCount: user.connections?.followersCount || 0
        });
    } catch (error) {
        console.error('Error fetching followers:', error);
        res.status(500).json({ error: 'Failed to fetch followers' });
    }
});

// Get following list
router.get('/:userId/following', async (req, res) => {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 20 } = req.query;

        const user = await User.findById(userId)
            .populate({
                path: 'connections.following',
                select: 'profile.name profile.photo profile.headline role',
                options: {
                    limit: limit * 1,
                    skip: (page - 1) * limit
                }
            });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            following: user.connections?.following || [],
            totalCount: user.connections?.followingCount || 0
        });
    } catch (error) {
        console.error('Error fetching following:', error);
        res.status(500).json({ error: 'Failed to fetch following' });
    }
});

// Check if current user is following
router.get('/:userId/is-following', async (req, res) => {
    try {
        const { userId } = req.params;
        const { currentUserId } = req.query;

        if (!currentUserId) {
            return res.json({ isFollowing: false });
        }

        const user = await User.findById(userId).select('connections.followers');
        const isFollowing = user?.connections?.followers?.includes(currentUserId) || false;

        res.json({ isFollowing });
    } catch (error) {
        console.error('Error checking follow status:', error);
        res.status(500).json({ error: 'Failed to check follow status' });
    }
});

// Get mutual connections
router.get('/:userId/mutual-connections', async (req, res) => {
    try {
        const { userId } = req.params;
        const { currentUserId } = req.query;

        if (!currentUserId) {
            return res.json({ mutualConnections: [], count: 0 });
        }

        const [user, currentUser] = await Promise.all([
            User.findById(userId).select('connections.followers'),
            User.findById(currentUserId).select('connections.followers')
        ]);

        if (!user || !currentUser) {
            return res.json({ mutualConnections: [], count: 0 });
        }

        const userFollowers = user?.connections?.followers || [];
        const currentUserFollowers = currentUser?.connections?.followers || [];

        // Find mutual followers
        const mutualIds = userFollowers.filter(id =>
            currentUserFollowers.some(cid => cid.toString() === id.toString())
        );

        const mutualConnections = await User.find({ _id: { $in: mutualIds } })
            .select('profile.name profile.photo profile.headline')
            .limit(5);

        res.json({
            mutualConnections: mutualConnections || [],
            count: mutualIds.length
        });
    } catch (error) {
        console.error('Error fetching mutual connections:', error);
        // Return empty array instead of error
        res.json({ mutualConnections: [], count: 0 });
    }
});

// Get profile stats
router.get('/:userId/stats', async (req, res) => {
    try {
        const { userId } = req.params;

        const [user, postCount] = await Promise.all([
            User.findById(userId).select('connections'),
            Post.countDocuments({ userId })
        ]);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            followers: user.connections?.followersCount || 0,
            following: user.connections?.followingCount || 0,
            posts: postCount
        });
    } catch (error) {
        console.error('Error fetching profile stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// Update privacy settings
router.put('/privacy', async (req, res) => {
    try {
        const { userId, privacy } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'User ID required' });
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { $set: { privacy } },
            { new: true, runValidators: true }
        ).select('privacy');

        res.json({ privacy: user.privacy });
    } catch (error) {
        console.error('Error updating privacy settings:', error);
        res.status(500).json({ error: 'Failed to update privacy settings' });
    }
});

// Get privacy settings
router.get('/privacy/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId).select('privacy');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ privacy: user.privacy });
    } catch (error) {
        console.error('Error fetching privacy settings:', error);
        res.status(500).json({ error: 'Failed to fetch privacy settings' });
    }
});

module.exports = router;
