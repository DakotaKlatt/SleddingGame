const { createRoom, joinRoom, getRoom } = require('./rooms');
const assert = require('assert');

// Simple test suite
function runTests() {
    console.log('Running server logic tests...');

    // Test 1: Create Room
    const hostId = 'host_123';
    const room = createRoom(hostId, 'race', { isSolo: true });
    
    assert(room.code, 'Room should have a code');
    assert.strictEqual(room.hostId, hostId, 'Host ID should match');
    assert.strictEqual(room.options.isSolo, true, 'Solo option should be set');
    console.log('Test 1 Passed: Create Room');

    // Test 2: Join Room (Host)
    const joinResult = joinRoom(room.code, { id: hostId, name: 'Host' });
    assert(joinResult.room, 'Should return room on join');
    assert.strictEqual(joinResult.room.players[hostId].isHost, true, 'Player should be marked as host');
    console.log('Test 2 Passed: Join Room (Host)');

    // Test 3: Join Room (Guest)
    const guestId = 'guest_456';
    const joinResult2 = joinRoom(room.code, { id: guestId, name: 'Guest' });
    assert(joinResult2.room, 'Guest should be able to join');
    assert.strictEqual(joinResult2.room.players[guestId].isHost, false, 'Guest should not be host');
    console.log('Test 3 Passed: Join Room (Guest)');

    console.log('All server tests passed!');
}

try {
    runTests();
} catch (e) {
    console.error('Test failed:', e);
    process.exit(1);
}

