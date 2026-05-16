const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Store room state for sync
const rooms = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', (roomId, userName) => {
    socket.join(roomId);
    socket.roomId = roomId;
    socket.userName = userName;
    
    if (!rooms[roomId]) {
      rooms[roomId] = {
        videoUrl: '',
        isPlaying: false,
        position: 0,
        lastUpdate: Date.now()
      };
    }

    // Tell the new user the current room state
    socket.emit('room-state', rooms[roomId]);
    
    socket.to(roomId).emit('user-connected', { userId: socket.id, userName });
  });

  socket.on('video-change', (url) => {
    if (!socket.roomId) return;
    rooms[socket.roomId].videoUrl = url;
    rooms[socket.roomId].position = 0;
    rooms[socket.roomId].isPlaying = false;
    io.to(socket.roomId).emit('video-change', url);
  });

  socket.on('video-play', (position) => {
    if (!socket.roomId) return;
    rooms[socket.roomId].isPlaying = true;
    rooms[socket.roomId].position = position;
    rooms[socket.roomId].lastUpdate = Date.now();
    socket.to(socket.roomId).emit('video-play', position);
  });

  socket.on('video-pause', (position) => {
    if (!socket.roomId) return;
    rooms[socket.roomId].isPlaying = false;
    rooms[socket.roomId].position = position;
    rooms[socket.roomId].lastUpdate = Date.now();
    socket.to(socket.roomId).emit('video-pause', position);
  });

  socket.on('video-seek', (position) => {
    if (!socket.roomId) return;
    rooms[socket.roomId].position = position;
    rooms[socket.roomId].lastUpdate = Date.now();
    socket.to(socket.roomId).emit('video-seek', position);
  });

  socket.on('chat-message', (message) => {
    if (socket.roomId) {
      io.to(socket.roomId).emit('chat-message', {
        ...message,
        senderId: socket.id,
        senderName: socket.userName
      });
    }
  });

  socket.on('disconnect', () => {
    if (socket.roomId) {
      socket.to(socket.roomId).emit('user-disconnected', socket.id);
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
