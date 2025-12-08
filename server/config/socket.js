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
            console.log(`[Socket Debug] socket.on('join') received for userId: ${userId}`);
            if (!userId) {
                console.log('[Socket Debug] join failed: userId is null/undefined');
                return;
            }
            socket.join(userId);
            console.log(`[Socket Debug] Socket ${socket.id} successfully joined room: ${userId}`);

            // Inspect rooms
            const rooms = Array.from(socket.rooms);
            console.log(`[Socket Debug] Socket ${socket.id} is now in rooms:`, rooms);
        });

        // Handle messaging
        socket.on('send_message', (data) => {
            io.to(data.recipientId).emit('receive_message', data);
        });

        // Handle typing indicators
        socket.on('typing', (data) => {
            socket.to(data.recipientId).emit('user_typing', data);
        });

        // Handle notifications
        socket.on('send_notification', (data) => {
            io.to(data.userId).emit('receive_notification', data);
        });

        socket.on('disconnect', () => {
            console.log('❌ Client disconnected:', socket.id);
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
