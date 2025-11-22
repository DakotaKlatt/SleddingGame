const crypto = require('crypto');

const rooms = {};

function generateRoomCode() {
    let code;
    do {
        code = crypto.randomBytes(2).toString('hex').toUpperCase();
    } while (rooms[code]);
    return code;
}

function createRoom(hostId, mode = 'race', options = {}) {
    const code = generateRoomCode();
    rooms[code] = {
        code,
        mode,
        hostId,
        started: false,
        seed: Math.floor(Math.random() * 1000000),
        players: {}, // socketId -> { id, name, cosmetics, state }
        options: {
            maxPlayers: options.maxPlayers || 8,
            isSolo: options.isSolo || false
        },
        createdFormatted: new Date().toISOString()
    };
    return rooms[code];
}

function getRoom(code) {
    return rooms[code];
}

function joinRoom(code, player) {
    const room = rooms[code];
    if (!room) return { error: 'Room not found' };
    if (room.started) return { error: 'Game already started' };
    if (Object.keys(room.players).length >= room.options.maxPlayers) return { error: 'Room full' };

    room.players[player.id] = {
        id: player.id,
        name: player.name || `Player ${Object.keys(room.players).length + 1}`,
        isHost: player.id === room.hostId,
        cosmetics: {
            character: 'char_default',
            sled: 'sled_wood',
            hat: 'hat_beanie'
        },
        state: {} // Position, rotation, etc.
    };

    return { room };
}

function leaveRoom(code, playerId) {
    const room = rooms[code];
    if (!room) return;

    delete room.players[playerId];
    
    // If host leaves, assign new host or close room
    if (room.players.length === 0) {
        delete rooms[code];
    } else if (room.hostId === playerId) {
        const remainingIds = Object.keys(room.players);
        if (remainingIds.length > 0) {
            room.hostId = remainingIds[0];
            room.players[remainingIds[0]].isHost = true;
        } else {
            delete rooms[code];
        }
    }
    return room;
}

function updatePlayerCosmetics(code, playerId, cosmetics) {
    const room = rooms[code];
    if (!room || !room.players[playerId]) return;
    room.players[playerId].cosmetics = { ...room.players[playerId].cosmetics, ...cosmetics };
    return room.players[playerId];
}

module.exports = {
    createRoom,
    getRoom,
    joinRoom,
    leaveRoom,
    updatePlayerCosmetics
};
