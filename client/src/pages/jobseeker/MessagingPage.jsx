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

        fetchConversations();

        return () => newSocket.close();
    }, [userId]);

    // Filter conversations based on search and tab
    useEffect(() => {
        let filtered = conversations;

        // Apply search filter
        if (searchQuery) {
            filtered = filtered.filter(conv =>
                conv.user.profile?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                conv.lastMessage?.content?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Apply tab filter
        if (activeTab === 'recruiters') {
            filtered = filtered.filter(conv => conv.user.role === 'recruiter');
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
                conv.user._id === targetUserId
            );

            if (existingConv) {
                // Select the existing conversation
                selectConversation(existingConv);
            } else {
                // Create a new conversation object for this user
                const newConv = {
                    user: location.state.selectedUser,
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
            recipientId: selectedConversation.user._id,
            content: newMessage
        };

        try {
            await api.post('/messages', messageData);
            setNewMessage('');
            fetchMessages(selectedConversation.user._id);
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    const selectConversation = (conversation) => {
        setSelectedConversation(conversation);
        fetchMessages(conversation.user._id);
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
        setSelectedConversation({ user, lastMessage: null, unreadCount: 0 });
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
                    <h3>{selectedConversation?.user.profile?.name || 'Messages'}</h3>
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
                        filteredConversations.map((conv) => (
                            <div
                                key={conv.user._id}
                                className={`conversation-item ${selectedConversation?.user._id === conv.user._id ? 'active' : ''}`}
                                onClick={() => selectConversation(conv)}
                            >
                                <div className="user-avatar">
                                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                                        <circle cx="12" cy="12" r="10" fill="var(--primary)" />
                                        <path d="M12 12C13.6569 12 15 10.6569 15 9C15 7.34315 13.6569 6 12 6C10.3431 6 9 7.34315 9 9C9 10.6569 10.3431 12 12 12Z" fill="white" />
                                        <path d="M6 18C6 15.7909 7.79086 14 10 14H14C16.2091 14 18 15.7909 18 18V19H6V18Z" fill="white" />
                                    </svg>
                                </div>
                                <div className="conversation-info">
                                    <h4>{conv.user.profile?.name || 'User'}</h4>
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
                                <div className="user-avatar">
                                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                                        <circle cx="12" cy="12" r="10" fill="var(--primary)" />
                                        <path d="M12 12C13.6569 12 15 10.6569 15 9C15 7.34315 13.6569 6 12 6C10.3431 6 9 7.34315 9 9C9 10.6569 10.3431 12 12 12Z" fill="white" />
                                        <path d="M6 18C6 15.7909 7.79086 14 10 14H14C16.2091 14 18 15.7909 18 18V19H6V18Z" fill="white" />
                                    </svg>
                                </div>
                                <div>
                                    <h3>{selectedConversation.user.profile?.name || 'User'}</h3>
                                    <p className="text-muted">{selectedConversation.user.profile?.company || 'Online'}</p>
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
                                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="message-input">
                            <input
                                type="text"
                                className="input"
                                placeholder="Type a message..."
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
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
