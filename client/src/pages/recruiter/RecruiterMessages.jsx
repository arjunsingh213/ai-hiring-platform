import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import '../jobseeker/MessagingPage.css';

const RecruiterMessages = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [conversations, setConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [pendingUser, setPendingUser] = useState(null);
    const userId = localStorage.getItem('userId');

    useEffect(() => {
        fetchConversations();
    }, []);

    // Handle selectedUser from navigation state (Contact Candidate button)
    useEffect(() => {
        if (location.state?.selectedUser) {
            const incomingUser = location.state.selectedUser;
            console.log('RecruiterMessages - Incoming user:', incomingUser);

            const existingConv = conversations.find(conv =>
                conv.participants?.includes(incomingUser._id) ||
                conv.otherUser?._id === incomingUser._id
            );

            if (existingConv) {
                handleSelectConversation(existingConv);
            } else {
                setPendingUser(incomingUser);
            }

            window.history.replaceState({}, document.title);
        }
    }, [location.state, conversations]);

    const fetchConversations = async () => {
        try {
            const response = await api.get(`/messages/conversations/${userId}`);
            const convData = response.data || response || [];
            setConversations(Array.isArray(convData) ? convData : []);
        } catch (error) {
            console.error('Error fetching conversations:', error);
        }
    };

    const fetchMessages = async (otherUserId) => {
        if (!otherUserId || !userId) return;

        try {
            // Call the conversation endpoint with both user IDs
            const response = await api.get(`/messages/conversation/${userId}/${otherUserId}`);
            const messagesData = response.data || response || [];
            setMessages(Array.isArray(messagesData) ? messagesData : []);
        } catch (error) {
            console.error('Error fetching messages:', error);
            setMessages([]);
        }
    };

    const handleSelectConversation = async (conversation) => {
        setSelectedConversation(conversation);
        setPendingUser(null);
        // Get the other user's ID from the conversation
        const otherUserId = conversation.otherUser?._id ||
            conversation.participants?.find(p => p !== userId);
        if (otherUserId) {
            fetchMessages(otherUserId);

            // Mark messages as read if there are unread messages
            if (conversation.unreadCount > 0) {
                try {
                    // Mark all messages from the other user to current user as read
                    await api.put(`/messages/conversation/${otherUserId}/${userId}/read`);

                    // Update local state to clear unread badge
                    setConversations(prev => prev.map(conv =>
                        conv.otherUser?._id === otherUserId
                            ? { ...conv, unreadCount: 0 }
                            : conv
                    ));

                    // Notify global navbar to refresh unread count
                    window.dispatchEvent(new CustomEvent('messages_read'));
                } catch (error) {
                    console.error('Error marking messages as read:', error);
                }
            }
        }
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim()) return;

        let receiverId = null;
        if (selectedConversation) {
            receiverId = selectedConversation.participants?.find(p => p !== userId) ||
                selectedConversation.otherUser?._id;
        } else if (pendingUser) {
            receiverId = pendingUser._id;
        }

        if (!receiverId) {
            console.error('No receiver ID found');
            return;
        }

        try {
            await api.post('/messages', {
                senderId: userId,
                receiverId: receiverId,
                content: newMessage
            });
            setNewMessage('');

            if (pendingUser) {
                await fetchConversations();
                setPendingUser(null);
            }

            if (selectedConversation) {
                fetchMessages(selectedConversation._id);
            } else {
                const resp = await api.get(`/messages/conversations/${userId}`);
                const convs = resp.data || resp || [];
                const newConv = convs.find(c =>
                    c.participants?.includes(receiverId) ||
                    c.otherUser?._id === receiverId
                );
                if (newConv) {
                    setConversations(convs);
                    handleSelectConversation(newConv);
                }
            }
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    const getDisplayName = () => {
        if (selectedConversation) {
            return selectedConversation.otherUser?.profile?.name ||
                selectedConversation.otherUser?.name ||
                'Candidate';
        }
        if (pendingUser) {
            return pendingUser.name || 'New Conversation';
        }
        return '';
    };

    const getDisplayPhoto = () => {
        if (selectedConversation) {
            return selectedConversation.otherUser?.profile?.photo ||
                selectedConversation.otherUser?.photo;
        }
        if (pendingUser) {
            return pendingUser.photo;
        }
        return null;
    };

    const handleProfileClick = (e, targetUserId) => {
        e.stopPropagation();
        if (targetUserId) {
            navigate(`/profile/${targetUserId}`);
        }
    };

    const getOtherUserId = (conversation) => {
        return conversation?.otherUser?._id ||
            conversation?.participants?.find(p => p !== userId);
    };

    return (
        <div className="messaging-page">
            {/* Conversations Sidebar */}
            <div className="conversations-sidebar">
                <div className="sidebar-header">
                    <h2>Messages</h2>
                </div>

                <div className="conversations-list">
                    {conversations.length === 0 && !pendingUser ? (
                        <div className="empty-state" style={{ padding: 'var(--spacing-xl)' }}>
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                                <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" strokeWidth="2" />
                            </svg>
                            <p>No conversations yet</p>
                        </div>
                    ) : (
                        <>
                            {/* Pending new conversation */}
                            {pendingUser && (
                                <div
                                    className="conversation-item active"
                                    style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.15))' }}
                                >
                                    <div
                                        className="user-avatar"
                                        onClick={(e) => handleProfileClick(e, pendingUser._id)}
                                        style={{ cursor: 'pointer' }}
                                        title="View Profile"
                                    >
                                        {pendingUser.photo ? (
                                            <img
                                                src={pendingUser.photo}
                                                alt={pendingUser.name}
                                                style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }}
                                            />
                                        ) : (
                                            <div style={{
                                                width: 48, height: 48, borderRadius: '50%',
                                                background: 'var(--gradient-primary)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: 'white', fontWeight: 600, fontSize: '1.125rem'
                                            }}>
                                                {pendingUser.name?.charAt(0).toUpperCase() || '?'}
                                            </div>
                                        )}
                                    </div>
                                    <div className="conversation-info">
                                        <h4>{pendingUser.name}</h4>
                                        <p className="last-message" style={{ color: 'var(--accent)' }}>
                                            ✨ New conversation
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Existing conversations */}
                            {conversations.map((conv) => (
                                <div
                                    key={conv._id}
                                    className={`conversation-item ${selectedConversation?._id === conv._id ? 'active' : ''}`}
                                    onClick={() => handleSelectConversation(conv)}
                                >
                                    <div
                                        className="user-avatar"
                                        onClick={(e) => handleProfileClick(e, getOtherUserId(conv))}
                                        style={{ cursor: 'pointer' }}
                                        title="View Profile"
                                    >
                                        {conv.otherUser?.profile?.photo ? (
                                            <img
                                                src={conv.otherUser.profile.photo}
                                                alt={conv.otherUser.profile.name}
                                                style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }}
                                            />
                                        ) : (
                                            <div style={{
                                                width: 48, height: 48, borderRadius: '50%',
                                                background: 'var(--primary)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: 'white', fontWeight: 600, fontSize: '1.125rem'
                                            }}>
                                                {(conv.otherUser?.profile?.name || conv.otherUser?.name || 'C').charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div className="conversation-info">
                                        <h4>{conv.otherUser?.profile?.name || conv.otherUser?.name || 'Candidate'}</h4>
                                        <p className="last-message">
                                            {conv.lastMessage?.content?.substring(0, 35) || 'No messages yet'}
                                            {conv.lastMessage?.content?.length > 35 ? '...' : ''}
                                        </p>
                                    </div>
                                    {conv.unreadCount > 0 && (
                                        <span className="unread-badge">{conv.unreadCount}</span>
                                    )}
                                </div>
                            ))}
                        </>
                    )}
                </div>
            </div>

            {/* Chat Window */}
            <div className="chat-window">
                {(selectedConversation || pendingUser) ? (
                    <>
                        {/* Chat Header */}
                        <div className="chat-header">
                            <div
                                className="user-info"
                                onClick={(e) => {
                                    const otherId = selectedConversation ? getOtherUserId(selectedConversation) : pendingUser?._id;
                                    handleProfileClick(e, otherId);
                                }}
                                style={{ cursor: 'pointer' }}
                                title="View Profile"
                            >
                                <div className="user-avatar">
                                    {getDisplayPhoto() ? (
                                        <img
                                            src={getDisplayPhoto()}
                                            alt={getDisplayName()}
                                            style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }}
                                        />
                                    ) : (
                                        <div style={{
                                            width: 48, height: 48, borderRadius: '50%',
                                            background: 'var(--gradient-primary)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: 'white', fontWeight: 600, fontSize: '1.125rem'
                                        }}>
                                            {getDisplayName().charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <h3>{getDisplayName()}</h3>
                                    {pendingUser && !selectedConversation ? (
                                        <p className="text-muted" style={{ color: 'var(--accent)' }}>
                                            New conversation - send a message to start
                                        </p>
                                    ) : (
                                        <p className="text-muted">
                                            {selectedConversation?.otherUser?.jobSeekerProfile?.profession || 'Candidate'}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Messages Container */}
                        <div className="messages-container">
                            {messages.length === 0 ? (
                                <div className="empty-state">
                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                                        <path d="M21 11.5C21.0034 12.8199 20.6951 14.1219 20.1 15.3C19.3944 16.7118 18.3098 17.8992 16.9674 18.7293C15.6251 19.5594 14.0782 19.9994 12.5 20C11.1801 20.0035 9.87812 19.6951 8.7 19.1L3 21L4.9 15.3C4.30493 14.1219 3.99656 12.8199 4 11.5C4.00061 9.92179 4.44061 8.37488 5.27072 7.03258C6.10083 5.69028 7.28825 4.6056 8.7 3.90003C9.87812 3.30496 11.1801 2.99659 12.5 3.00003H13C15.0843 3.11502 17.053 3.99479 18.5291 5.47089C20.0052 6.94699 20.885 8.91568 21 11V11.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    <h3>No messages yet</h3>
                                    <p>Start the conversation by sending a message below</p>
                                </div>
                            ) : (
                                messages.map((msg) => (
                                    <div
                                        key={msg._id}
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

                        {/* Message Input */}
                        <div className="message-input">
                            <input
                                type="text"
                                className="input"
                                placeholder={pendingUser ? `Message ${pendingUser.name}...` : "Type your message..."}
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                            />
                            <button className="btn btn-primary" onClick={handleSendMessage}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="empty-state">
                        <svg width="80" height="80" viewBox="0 0 24 24" fill="none">
                            <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" strokeWidth="2" />
                        </svg>
                        <h3>Select a conversation</h3>
                        <p>Choose a candidate from the list to start messaging</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RecruiterMessages;
