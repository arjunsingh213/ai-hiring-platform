const socketIO = require('socket.io');

let io;

const initializeSocket = (server) => {
    io = socketIO(server, {
        cors: {
            origin: [
                'http://localhost:5173',
                process.env.CLIENT_URL,
                'https://ai-hiring-platform-cm5t.vercel.app'
            ].filter(Boolean),
            methods: ['GET', 'POST'],
            credentials: true
        }
    });

    io.on('connection', (socket) => {
        console.log('✅ New client connected:', socket.id);

        // Join user-specific room
        socket.on('join', (userId) => {
            console.log(`[Socket] User ${userId} joined with socket ${socket.id}`);
            if (!userId) {
                console.log('[Socket] join failed: userId is null/undefined');
                return;
            }
            socket.join(userId);
            socket.userId = userId; // Store userId on socket for disconnect handling

            // Broadcast that user is now online
            socket.broadcast.emit('user_online', { userId });

            // Log rooms
            const rooms = Array.from(socket.rooms);
            console.log(`[Socket] Socket ${socket.id} is now in rooms:`, rooms);
        });

        // Handle messaging
        socket.on('send_message', (data) => {
            io.to(data.recipientId).emit('receive_message', data);
        });

        // Handle typing indicators
        socket.on('typing', (data) => {
            if (data.recipientId) {
                socket.to(data.recipientId).emit('user_typing', {
                    userId: data.userId,
                    conversationId: `${data.userId}-${data.recipientId}`
                });
            }
        });

        socket.on('stop_typing', (data) => {
            if (data.recipientId) {
                socket.to(data.recipientId).emit('user_stopped_typing', {
                    userId: data.userId,
                    conversationId: `${data.userId}-${data.recipientId}`
                });
            }
        });

        // Handle notifications
        socket.on('send_notification', (data) => {
            io.to(data.userId).emit('receive_notification', data);
        });

        socket.on('disconnect', () => {
            console.log('❌ Client disconnected:', socket.id);

            // Broadcast that user is now offline
            if (socket.userId) {
                socket.broadcast.emit('user_offline', { userId: socket.userId });
            }
        });
    });

    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};

module.exports = { initializeSocket, getIO };
