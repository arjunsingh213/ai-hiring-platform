import io from 'socket.io-client';

let socket = null;

export const getSocket = () => {
    if (!socket) {
        const socketUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SOCKET_URL)
            || 'http://localhost:5000';
        console.log('[SocketService] Initializing socket connection to:', socketUrl);

        socket = io(socketUrl, {
            transports: ['websocket', 'polling'],
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            autoConnect: true
        });

        socket.on('connect', () => {
            console.log('[SocketService] Connected:', socket.id);
        });

        socket.on('connect_error', (err) => {
            console.error('[SocketService] Connection error:', err);
        });

        socket.on('disconnect', (reason) => {
            console.log('[SocketService] Disconnected:', reason);
        });
    }
    return socket;
};

export const joinUserRoom = (userId) => {
    const s = getSocket();
    if (s && userId) {
        if (s.connected) {
            console.log('[SocketService] Joining room:', userId);
            s.emit('join', userId);
        } else {
            s.on('connect', () => {
                console.log('[SocketService] Joining room (after connect):', userId);
                s.emit('join', userId);
            });
        }
    }
};

export const disconnectSocket = () => {
    if (socket) {
        console.log('[SocketService] Disconnecting...');
        socket.disconnect();
        socket = null;
    }
};
