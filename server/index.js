const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { createRoom, getRoom, joinRoom, leaveRoom, updatePlayerCosmetics } = require('./rooms');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all for dev simplicity
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

// Serve static assets for the game (cosmetics)
const ASSETS_DIR = path.join(__dirname, 'public', 'assets');
app.use('/assets', express.static(ASSETS_DIR));

// EMOJI COSMETICS (Hardcoded for simplicity as requested)
const COSMETICS = {
    characters: [
        { id: '🏂', name: 'Snowboarder' },
        { id: '🎅', name: 'Santa' },
        { id: '👽', name: 'Alien' },
        { id: '🤖', name: 'Robot' },
        { id: '🧟', name: 'Zombie' },
        { id: '🦸', name: 'Hero' },
        { id: '🥷', name: 'Ninja' },
        { id: '🧍', name: 'Person' }
    ],
    sleds: [
        { id: '🛷', name: 'Classic Sled' },
        { id: '🛸', name: 'Saucer' },
        { id: '🛶', name: 'Canoe' },
        { id: '📦', name: 'Box' },
        { id: '🚽', name: 'Toilet' },
        { id: '🛹', name: 'Skateboard' }
    ],
    hats: [
        { id: '🧢', name: 'Cap' },
        { id: '🎩', name: 'Hat' },
        { id: '👑', name: 'Crown' },
        { id: '⛑️', name: 'Helmet' },
        { id: '🎧', name: 'Headphones' },
        { id: '🦄', name: 'Unicorn' }
    ]
};

// API Endpoints for Cosmetics
app.get('/api/cosmetics/:type', (req, res) => {
    const { type } = req.params;
    if (COSMETICS[type]) {
        // Return the emoji directly as 'id' and 'url' (client handles emoji rendering)
        const items = COSMETICS[type].map(c => ({
            id: c.id, // The emoji char IS the id
            name: c.name,
            url: null // No file URL needed
        }));
        res.json({ items });
    } else {
        res.json({ items: [] });
    }
});

// Socket.IO Logic
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Create Room
    socket.on('createRoom', ({ mode, name, isSolo }) => {
        const room = createRoom(socket.id, mode, { isSolo });
        joinRoom(room.code, { id: socket.id, name });
        socket.join(room.code);
        socket.emit('roomCreated', room);
        console.log(`Room created: ${room.code} by ${name}`);
    });

    // Join Room
    socket.on('joinRoom', ({ code, name }) => {
        const result = joinRoom(code, { id: socket.id, name });
        if (result.error) {
            socket.emit('roomError', result.error);
        } else {
            socket.join(code);
            io.to(code).emit('playerJoined', result.room.players);
            socket.emit('roomJoined', result.room);
            console.log(`${name} joined room ${code}`);
        }
    });

    // Update Cosmetics
    socket.on('updateCosmetics', ({ code, cosmetics }) => {
        const updatedPlayer = updatePlayerCosmetics(code, socket.id, cosmetics);
        if (updatedPlayer) {
            io.to(code).emit('playerUpdated', { id: socket.id, cosmetics: updatedPlayer.cosmetics });
        }
    });

    // Start Game
    socket.on('startGame', ({ code }) => {
        console.log(`Attempting to start game for room ${code} by ${socket.id}`);
        const room = getRoom(code);
        
        if (!room) {
            console.log('Room not found');
            return;
        }

        if (room.hostId !== socket.id) {
            console.log(`User ${socket.id} is not host of room ${code} (host is ${room.hostId})`);
            return;
        }

        room.started = true;
        console.log(`Game started for room ${code}`);
        
        io.to(code).emit('gameStarted', { 
            seed: room.seed, 
            players: room.players,
            mode: room.mode 
        });
    });

    // Player State Update (Relay)
    socket.on('playerState', ({ code, state }) => {
        // Relay to others in room, excluding sender
        socket.to(code).emit('playerStateUpdate', { id: socket.id, state });
    });

    // Player Eliminated / Finished
    socket.on('playerFinished', ({ code, time, score }) => {
        io.to(code).emit('playerFinished', { id: socket.id, time, score });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
