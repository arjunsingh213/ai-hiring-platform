const socketIO = require('socket.io');

let io;

const initializeSocket = (server) => {
    io = socketIO(server, {
        cors: {
            origin: process.env.CLIENT_URL || 'http://localhost:5173',
            methods: ['GET', 'POST'],
            credentials: true
        }
    });

    io.on('connection', (socket) => {
        console.log('✅ New client connected:', socket.id);

        // Join user-specific room
        socket.on('join', (userId) => {
            socket.join(userId);
            console.log(`User ${userId} joined their room`);
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
