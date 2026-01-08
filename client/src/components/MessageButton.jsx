import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import './MessageButton.css';

const MessageButton = () => {
    const [unreadCount, setUnreadCount] = useState(0);
    const navigate = useNavigate();
    const location = useLocation();
    const userId = localStorage.getItem('userId');

    useEffect(() => {
        if (userId) {
            fetchUnreadCount();
            // Poll for updates every 30 seconds
            const interval = setInterval(fetchUnreadCount, 30000);
            return () => clearInterval(interval);
        }
    }, [userId]);

    const fetchUnreadCount = async () => {
        try {
            const response = await api.get(`/messages/unread-count?userId=${userId}`);
            setUnreadCount(response.count || 0);
        } catch (error) {
            console.error('Error fetching unread count:', error);
        }
    };

    const handleClick = () => {
        // Determine navigation based on current path, not localStorage
        const isRecruiterPage = location.pathname.startsWith('/recruiter');
        const path = isRecruiterPage ? '/recruiter/messages' : '/jobseeker/messages';
        navigate(path);
    };

    return (
        <motion.button
            className="message-button"
            onClick={handleClick}
            title="Messages"
            whileHover={{ scale: 1.08, y: -2 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <AnimatePresence>
                {unreadCount > 0 && (
                    <motion.span
                        className="message-button-badge"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 20 }}
                    >
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </motion.span>
                )}
            </AnimatePresence>
        </motion.button>
    );
};

export default MessageButton;
