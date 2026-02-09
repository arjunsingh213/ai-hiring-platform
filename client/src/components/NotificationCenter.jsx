import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './NotificationCenter.css';

const NotificationCenter = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();
    const userId = localStorage.getItem('userId');

    useEffect(() => {
        if (userId) {
            fetchUnreadCount();

            // Listen for manual reads (e.g. from the notification list)
            const handleRefresh = () => fetchUnreadCount();
            window.addEventListener('notifications_read', handleRefresh);

            // Poll for updates every 2 minutes
            const interval = setInterval(fetchUnreadCount, 120000);
            return () => {
                window.removeEventListener('notifications_read', handleRefresh);
                clearInterval(interval);
            };
        }
    }, [userId]);

    useEffect(() => {
        if (isOpen) {
            fetchNotifications();
        }
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchUnreadCount = async () => {
        try {
            // Securely fetching using authenticated token handled by interceptor
            // The backend endpoint requires userId in query for validation
            const response = await api.get(`/notifications/unread-count?userId=${userId}`);
            setUnreadCount(response.count || 0);
        } catch (error) {
            console.error('Error fetching unread count:', error);
        }
    };

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/notifications?userId=${userId}&limit=10`);
            setNotifications(response.notifications || []);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleNotificationClick = async (notification) => {
        try {
            // Mark as read
            if (!notification.read) {
                await api.put(`/notifications/${notification._id}/read`);
                setUnreadCount(prev => Math.max(0, prev - 1));

                // Notify global components to refresh their badges
                window.dispatchEvent(new CustomEvent('notifications_read'));
            }

            // Navigate to relevant content
            if (notification.actionUrl) {
                navigate(notification.actionUrl);
            } else if (notification.relatedEntity?.entityType === 'user') {
                navigate(`/profile/${notification.relatedEntity.entityId}`);
            }

            setIsOpen(false);
        } catch (error) {
            console.error('Error handling notification click:', error);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await api.put('/notifications/mark-all-read', { userId });
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);

            // Notify global components to refresh their badges
            window.dispatchEvent(new CustomEvent('notifications_read'));
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'follow':
                return (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M16 21V19C16 17.9391 15.5786 16.9217 14.8284 16.1716C14.0783 15.4214 13.0609 15 12 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="var(--primary)" strokeWidth="2" />
                        <circle cx="8.5" cy="7" r="4" stroke="var(--primary)" strokeWidth="2" />
                        <path d="M20 8V14M23 11H17" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                );
            case 'like':
                return (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M20.84 4.61C20.3292 4.099 19.7228 3.69364 19.0554 3.41708C18.3879 3.14052 17.6725 2.99817 16.95 2.99817C16.2275 2.99817 15.5121 3.14052 14.8446 3.41708C14.1772 3.69364 13.5708 4.099 13.06 4.61L12 5.67L10.94 4.61C9.9083 3.57831 8.50903 2.99871 7.05 2.99871C5.59096 2.99871 4.19169 3.57831 3.16 4.61C2.1283 5.64169 1.54871 7.04097 1.54871 8.5C1.54871 9.95903 2.1283 11.3583 3.16 12.39L4.22 13.45L12 21.23L19.78 13.45L20.84 12.39C21.351 11.8792 21.7564 11.2728 22.0329 10.6054C22.3095 9.93789 22.4518 9.22248 22.4518 8.5C22.4518 7.77752 22.3095 7.06211 22.0329 6.39464C21.7564 5.72718 21.351 5.12084 20.84 4.61Z" fill="#f44" stroke="#f44" strokeWidth="2" />
                    </svg>
                );
            case 'comment':
                return (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="var(--primary)" strokeWidth="2" />
                    </svg>
                );
            case 'message_received':
                return (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="var(--primary)" strokeWidth="2" />
                    </svg>
                );
            default:
                return (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="var(--primary)" strokeWidth="2" />
                        <path d="M12 8V12L15 15" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                );
        }
    };

    const formatTime = (date) => {
        const now = new Date();
        const notifDate = new Date(date);
        const diffMs = now - notifDate;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return notifDate.toLocaleDateString();
    };

    return (
        <div className="notification-center" ref={dropdownRef}>
            <button
                className="notification-button"
                onClick={() => setIsOpen(!isOpen)}
                title="Notifications"
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M13.73 21C13.5542 21.3031 13.3019 21.5547 12.9982 21.7295C12.6946 21.9044 12.3504 21.9965 12 21.9965C11.6496 21.9965 11.3054 21.9044 11.0018 21.7295C10.6982 21.5547 10.4458 21.3031 10.27 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {unreadCount > 0 && (
                    <span className="notification-badge">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="notification-dropdown">
                    <div className="notification-header">
                        <h3>Notifications</h3>
                        {unreadCount > 0 && (
                            <button className="mark-all-read-btn" onClick={handleMarkAllRead}>
                                Mark all read
                            </button>
                        )}
                    </div>

                    <div className="notification-list">
                        {loading ? (
                            <div className="notification-loading">
                                <div className="spinner"></div>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="notification-empty">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                                    <path d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" stroke="currentColor" strokeWidth="2" />
                                </svg>
                                <p>No notifications yet</p>
                            </div>
                        ) : (
                            notifications.map(notification => (
                                <div
                                    key={notification._id}
                                    className={`notification-item ${!notification.read ? 'unread' : ''}`}
                                    onClick={() => handleNotificationClick(notification)}
                                >
                                    <div className="notification-icon">
                                        {getNotificationIcon(notification.type)}
                                    </div>
                                    <div className="notification-content">
                                        <p className="notification-message">{notification.message}</p>
                                        <span className="notification-time">{formatTime(notification.createdAt)}</span>
                                    </div>
                                    {!notification.read && <div className="notification-dot"></div>}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationCenter;
