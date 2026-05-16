const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const rooms = {};

io.on('connection', (socket) => {
  console.log('Connected:', socket.id);

  socket.on('join-room', ({ roomId, userName, isHost }) => {
    socket.join(roomId);
    socket.roomId = roomId;
    socket.userName = userName;

    if (!rooms[roomId]) {
      rooms[roomId] = {
        hostId: socket.id,
        videoUrl: '',
        isPlaying: false,
        position: 0,
        lastUpdate: Date.now(),
        members: {}
      };
    }
    if (isHost) rooms[roomId].hostId = socket.id;

    rooms[roomId].members[socket.id] = { name: userName };

    const memberList = () => Object.entries(rooms[roomId].members).map(([id, m]) => ({
      id, name: m.name, isHost: id === rooms[roomId].hostId
    }));

    socket.emit('room-state', {
      videoUrl: rooms[roomId].videoUrl,
      isPlaying: rooms[roomId].isPlaying,
      position: rooms[roomId].position,
      lastUpdate: rooms[roomId].lastUpdate,
      members: memberList()
    });

    io.to(roomId).emit('members-update', memberList());
    socket.to(roomId).emit('chat-message', {
      system: true, text: `${userName} joined the room`
    });
  });

  socket.on('video-change', (url) => {
    const room = rooms[socket.roomId];
    if (!room || socket.id !== room.hostId) return;
    room.videoUrl = url;
    room.position = 0;
    room.isPlaying = false;
    room.lastUpdate = Date.now();
    io.to(socket.roomId).emit('video-change', url);
  });

  socket.on('video-play', (position) => {
    const room = rooms[socket.roomId];
    if (!room || socket.id !== room.hostId) return;
    room.isPlaying = true;
    room.position = position;
    room.lastUpdate = Date.now();
    socket.to(socket.roomId).emit('video-play', position);
  });

  socket.on('video-pause', (position) => {
    const room = rooms[socket.roomId];
    if (!room || socket.id !== room.hostId) return;
    room.isPlaying = false;
    room.position = position;
    room.lastUpdate = Date.now();
    socket.to(socket.roomId).emit('video-pause', position);
  });

  socket.on('video-seek', (position) => {
    const room = rooms[socket.roomId];
    if (!room || socket.id !== room.hostId) return;
    room.position = position;
    room.lastUpdate = Date.now();
    socket.to(socket.roomId).emit('video-seek', position);
  });

  socket.on('chat-message', (msg) => {
    if (!socket.roomId) return;
    io.to(socket.roomId).emit('chat-message', {
      text: msg.text,
      senderId: socket.id,
      senderName: socket.userName,
      timestamp: Date.now()
    });
  });

  socket.on('disconnect', () => {
    if (!socket.roomId || !rooms[socket.roomId]) return;
    const room = rooms[socket.roomId];
    delete room.members[socket.id];

    const memberList = Object.entries(room.members).map(([id, m]) => ({
      id, name: m.name, isHost: id === room.hostId
    }));

    if (Object.keys(room.members).length === 0) {
      delete rooms[socket.roomId];
    } else {
      io.to(socket.roomId).emit('members-update', memberList);
      io.to(socket.roomId).emit('chat-message', {
        system: true, text: `${socket.userName} left the room`
      });
    }
  });
});

app.get('/', (req, res) => res.send('MoveShare backend is running'));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server on port ${PORT}`));
