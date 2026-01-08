import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import io from 'socket.io-client';
import api from '../../services/api';
import './MessagingPage.css';

const MessagingPage = () => {
    const location = useLocation();
    const [conversations, setConversations] = useState([]);
    const [filteredConversations, setFilteredConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [socket, setSocket] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('all');
    const [showNewMessageDialog, setShowNewMessageDialog] = useState(false);
    const [userSearchQuery, setUserSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [typingUsers, setTypingUsers] = useState({}); // Track who is typing
    const [onlineUsers, setOnlineUsers] = useState({}); // Track online status
    const userId = localStorage.getItem('userId');

    useEffect(() => {
        // Initialize Socket.io with environment variable
        const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
        const newSocket = io(socketUrl);
        setSocket(newSocket);

        newSocket.emit('join', userId);

        newSocket.on('receive_message', (message) => {
            setMessages(prev => [...prev, message]);
            fetchConversations(); // Refresh conversations
        });

        // Typing indicator listeners
        newSocket.on('user_typing', ({ userId: typingUserId }) => {
            setTypingUsers(prev => ({ ...prev, [typingUserId]: true }));
        });

        newSocket.on('user_stopped_typing', ({ userId: typingUserId }) => {
            setTypingUsers(prev => ({ ...prev, [typingUserId]: false }));
        });

        // Online status listeners
        newSocket.on('user_online', ({ userId: onlineUserId }) => {
            setOnlineUsers(prev => ({ ...prev, [onlineUserId]: true }));
        });

        newSocket.on('user_offline', ({ userId: offlineUserId }) => {
            setOnlineUsers(prev => ({ ...prev, [offlineUserId]: false }));
        });

        fetchConversations();

        return () => newSocket.close();
    }, [userId]);

    // Filter conversations based on search and tab
    useEffect(() => {
        let filtered = conversations;

        // Apply search filter
        if (searchQuery) {
            filtered = filtered.filter(conv =>
                conv.otherUser?.profile?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                conv.lastMessage?.content?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Apply tab filter
        if (activeTab === 'recruiters') {
            filtered = filtered.filter(conv => conv.otherUser?.role === 'recruiter');
        } else if (activeTab === 'unread') {
            filtered = filtered.filter(conv => conv.unreadCount > 0);
        }

        setFilteredConversations(filtered);
    }, [conversations, searchQuery, activeTab]);

    // Handle selectedUser from navigation (e.g., from profile page)
    useEffect(() => {
        if (location.state?.selectedUser && conversations.length > 0) {
            const targetUserId = location.state.selectedUser._id;

            // Find existing conversation with this user
            const existingConv = conversations.find(conv =>
                conv.otherUser?._id === targetUserId
            );

            if (existingConv) {
                // Select the existing conversation
                selectConversation(existingConv);
            } else {
                // Create a new conversation object for this user
                const newConv = {
                    otherUser: location.state.selectedUser,
                    lastMessage: null,
                    unreadCount: 0
                };
                setSelectedConversation(newConv);
                setMessages([]);
            }

            // Clear the location state to prevent re-triggering
            window.history.replaceState({}, document.title);
        }
    }, [location.state, conversations]);

    const fetchConversations = async () => {
        try {
            console.log('Fetching conversations for userId:', userId);
            const response = await api.get(`/messages/conversations/${userId}`);
            console.log('Conversations response:', response);
            // Axios interceptor unwraps response.data, so response is already the data
            setConversations(response.data || []);
        } catch (error) {
            console.error('Error fetching conversations:', error);
        }
    };

    const fetchMessages = async (otherUserId) => {
        try {
            const response = await api.get(`/messages/conversation/${userId}/${otherUserId}`);
            // Axios interceptor unwraps response.data
            setMessages(response.data || []);
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
    };

    const sendMessage = async () => {
        if (!newMessage.trim() || !selectedConversation) return;

        const messageData = {
            senderId: userId,
            receiverId: selectedConversation.otherUser._id,
            content: newMessage
        };

        try {
            // Stop typing indicator
            if (socket) {
                socket.emit('stop_typing', {
                    userId,
                    recipientId: selectedConversation.otherUser._id
                });
            }

            await api.post('/messages', messageData);
            setNewMessage('');
            fetchMessages(selectedConversation.otherUser._id);
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    // Handle typing indicator
    const handleTyping = (value) => {
        setNewMessage(value);

        if (socket && selectedConversation) {
            if (value.trim()) {
                socket.emit('typing', {
                    userId,
                    recipientId: selectedConversation.otherUser._id
                });
            } else {
                socket.emit('stop_typing', {
                    userId,
                    recipientId: selectedConversation.otherUser._id
                });
            }
        }
    };

    // Format message timestamp
    const getMessageTimestamp = (date) => {
        const now = new Date();
        const msgDate = new Date(date);
        const diffMs = now - msgDate;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return msgDate.toLocaleDateString([], { weekday: 'short' });
        return msgDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    const selectConversation = async (conversation) => {
        setSelectedConversation(conversation);
        fetchMessages(conversation.otherUser._id);

        // Mark messages as read if there are unread messages
        if (conversation.unreadCount > 0) {
            try {
                // Mark all messages from the other user to current user as read
                await api.put(`/messages/conversation/${conversation.otherUser._id}/${userId}/read`);

                // Update local state to clear unread badge
                setConversations(prev => prev.map(conv =>
                    conv.otherUser?._id === conversation.otherUser._id
                        ? { ...conv, unreadCount: 0 }
                        : conv
                ));
            } catch (error) {
                console.error('Error marking messages as read:', error);
            }
        }

        if (window.innerWidth < 768) {
            setSidebarOpen(false); // Close sidebar on mobile
        }
    };

    const searchUsers = async (query) => {
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        try {
            const response = await api.get(`/messages/search-users/${query}`);
            setSearchResults(response.data.data || []);
        } catch (error) {
            console.error('Error searching users:', error);
        }
    };

    const startConversation = (user) => {
        setSelectedConversation({ otherUser: user, lastMessage: null, unreadCount: 0 });
        setShowNewMessageDialog(false);
        setUserSearchQuery('');
        setSearchResults([]);
        setMessages([]);
        if (window.innerWidth < 768) {
            setSidebarOpen(false);
        }
    };

    return (
        <div className="messaging-page">
            {/* Mobile header */}
            {!sidebarOpen && (
                <div className="mobile-header">
                    <button className="btn-icon" onClick={() => setSidebarOpen(true)}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M3 12H21M3 6H21M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </button>
                    <h3>{selectedConversation?.otherUser?.profile?.name || 'Messages'}</h3>
                </div>
            )}

            <div className={`conversations-sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <h2>Messages</h2>
                    <button
                        className="btn btn-primary btn-sm"
                        onClick={() => setShowNewMessageDialog(true)}
                    >
                        New Message
                    </button>
                </div>

                <div className="search-bar">
                    <input
                        type="text"
                        className="input"
                        placeholder="Search messages..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="conversation-tabs">
                    <button
                        className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
                        onClick={() => setActiveTab('all')}
                    >
                        All
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'recruiters' ? 'active' : ''}`}
                        onClick={() => setActiveTab('recruiters')}
                    >
                        Recruiters
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'unread' ? 'active' : ''}`}
                        onClick={() => setActiveTab('unread')}
                    >
                        Unread
                    </button>
                </div>

                <div className="conversations-list">
                    {filteredConversations.length === 0 ? (
                        <div className="empty-state">
                            <p>No conversations found</p>
                        </div>
                    ) : (
                        filteredConversations.map((conv, index) => (
                            <div
                                key={conv.otherUser?._id || index}
                                className={`conversation-item ${selectedConversation?.otherUser?._id === conv.otherUser?._id ? 'active' : ''}`}
                                onClick={() => selectConversation(conv)}
                            >
                                <div className="user-avatar" style={{ position: 'relative' }}>
                                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                                        <circle cx="12" cy="12" r="10" fill="var(--primary)" />
                                        <path d="M12 12C13.6569 12 15 10.6569 15 9C15 7.34315 13.6569 6 12 6C10.3431 6 9 7.34315 9 9C9 10.6569 10.3431 12 12 12Z" fill="white" />
                                        <path d="M6 18C6 15.7909 7.79086 14 10 14H14C16.2091 14 18 15.7909 18 18V19H6V18Z" fill="white" />
                                    </svg>
                                    {onlineUsers[conv.otherUser?._id] && (
                                        <div className="online-indicator"></div>
                                    )}
                                </div>
                                <div className="conversation-info">
                                    <h4>{conv.otherUser?.profile?.name || 'User'}</h4>
                                    <p className="last-message">{conv.lastMessage?.content?.substring(0, 40)}...</p>
                                </div>
                                {conv.unreadCount > 0 && (
                                    <span className="unread-badge">{conv.unreadCount}</span>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="chat-window">
                {selectedConversation ? (
                    <>
                        <div className="chat-header">
                            <div className="user-info">
                                <div className="user-avatar" style={{ position: 'relative' }}>
                                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                                        <circle cx="12" cy="12" r="10" fill="var(--primary)" />
                                        <path d="M12 12C13.6569 12 15 10.6569 15 9C15 7.34315 13.6569 6 12 6C10.3431 6 9 7.34315 9 9C9 10.6569 10.3431 12 12 12Z" fill="white" />
                                        <path d="M6 18C6 15.7909 7.79086 14 10 14H14C16.2091 14 18 15.7909 18 18V19H6V18Z" fill="white" />
                                    </svg>
                                    {onlineUsers[selectedConversation.otherUser?._id] && (
                                        <div className="online-indicator"></div>
                                    )}
                                </div>
                                <div>
                                    <h3>{selectedConversation.otherUser?.profile?.name || 'User'}</h3>
                                    <p className="text-muted">
                                        {typingUsers[selectedConversation.otherUser?._id]
                                            ? 'typing...'
                                            : onlineUsers[selectedConversation.otherUser?._id]
                                                ? 'Online'
                                                : selectedConversation.otherUser?.profile?.company || 'Offline'
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="messages-container">
                            {messages.length === 0 ? (
                                <div className="empty-state">
                                    <p>No messages yet. Start the conversation!</p>
                                </div>
                            ) : (
                                messages.map((msg, index) => (
                                    <div
                                        key={index}
                                        className={`message ${msg.senderId === userId ? 'sent' : 'received'}`}
                                    >
                                        <div className="message-content">
                                            <p>{msg.content}</p>
                                            <span className="message-time">
                                                {getMessageTimestamp(msg.createdAt)}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                            {typingUsers[selectedConversation.otherUser?._id] && (
                                <div className="message received">
                                    <div className="typing-indicator">
                                        <span className="typing-dot"></span>
                                        <span className="typing-dot"></span>
                                        <span className="typing-dot"></span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="message-input">
                            <input
                                type="text"
                                className="input"
                                placeholder="Type a message..."
                                value={newMessage}
                                onChange={(e) => handleTyping(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                            />
                            <button className="btn btn-primary" onClick={sendMessage}>
                                Send
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="empty-state">
                        <svg width="80" height="80" viewBox="0 0 24 24" fill="none">
                            <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" strokeWidth="2" />
                        </svg>
                        <h3>Select a conversation</h3>
                        <p>Choose a conversation from the left to start messaging</p>
                    </div>
                )}
            </div>

            {/* New Message Dialog */}
            {showNewMessageDialog && (
                <div className="modal-overlay" onClick={() => setShowNewMessageDialog(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>New Message</h3>
                            <button className="btn-close" onClick={() => setShowNewMessageDialog(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <input
                                type="text"
                                className="input"
                                placeholder="Search users..."
                                value={userSearchQuery}
                                onChange={(e) => {
                                    setUserSearchQuery(e.target.value);
                                    searchUsers(e.target.value);
                                }}
                            />
                            <div className="search-results">
                                {searchResults.map(user => (
                                    <div
                                        key={user._id}
                                        className="user-result"
                                        onClick={() => startConversation(user)}
                                    >
                                        <div className="user-avatar">
                                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                                                <circle cx="12" cy="12" r="10" fill="var(--primary)" />
                                                <path d="M12 12C13.6569 12 15 10.6569 15 9C15 7.34315 13.6569 6 12 6C10.3431 6 9 7.34315 9 9C9 10.6569 10.3431 12 12 12Z" fill="white" />
                                                <path d="M6 18C6 15.7909 7.79086 14 10 14H14C16.2091 14 18 15.7909 18 18V19H6V18Z" fill="white" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h4>{user.profile?.name || user.email}</h4>
                                            <p className="text-muted">{user.profile?.company || user.role}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MessagingPage;
