// socketManager.js
// Singleton socket.io instance — shared across all route files
// Usage: import { getIO, emitToStation } from './socketManager.js'

let _io = null;

export const setIO = (io) => {
    _io = io;
};

export const getIO = () => {
    return _io;
};

/**
 * Emit an event scoped to a specific station room.
 * Components that call socket.emit('join-station', stationId) will receive it.
 * @param {string|number} stationId
 * @param {string} event  e.g. 'session:changed', 'order:new'
 * @param {object} data
 */
export const emitToStation = (stationId, event, data = {}) => {
    if (!_io) return;
    if (!stationId) {
        // Broadcast globally if no stationId (fallback)
        _io.emit(event, data);
        return;
    }
    _io.to(`station:${stationId}`).emit(event, data);
};
