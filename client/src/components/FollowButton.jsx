import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { useToast } from './Toast';
import './FollowButton.css';

const FollowButton = ({ userId, initialIsFollowing = false, onFollowChange }) => {
    const toast = useToast();
    const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
    const [loading, setLoading] = useState(false);
    const currentUserId = localStorage.getItem('userId');

    const handleFollow = async () => {
        if (!currentUserId) {
            toast.warning('Please login to follow users');
            return;
        }

        setLoading(true);
        try {
            if (isFollowing) {
                // Unfollow
                await api.delete(`/profiles/${userId}/unfollow`, {
                    data: { currentUserId }
                });
                setIsFollowing(false);
            } else {
                // Follow
                await api.post(`/profiles/${userId}/follow`, {
                    currentUserId
                });
                setIsFollowing(true);
            }

            if (onFollowChange) {
                onFollowChange(!isFollowing);
            }
        } catch (error) {
            console.error('Error toggling follow:', error);
            toast.error('Failed to update follow status');
        } finally {
            setLoading(false);
        }
    };

    if (userId === currentUserId) {
        return null; // Don't show follow button on own profile
    }

    return (
        <motion.button
            className={`follow-btn ${isFollowing ? 'following' : ''} ${loading ? 'loading' : ''}`}
            onClick={handleFollow}
            disabled={loading}
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
            <AnimatePresence mode="wait">
                {loading ? (
                    <motion.span
                        key="spinner"
                        className="follow-btn-spinner"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                    />
                ) : (
                    <motion.span
                        key={isFollowing ? 'following' : 'follow'}
                        className="follow-btn-content"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        {isFollowing ? (
                            <>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                    <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                <span className="follow-btn-text">Following</span>
                                <span className="follow-btn-hover-text">Unfollow</span>
                            </>
                        ) : (
                            <>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                    <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                                Follow
                            </>
                        )}
                    </motion.span>
                )}
            </AnimatePresence>
        </motion.button>
    );
};

export default FollowButton;
