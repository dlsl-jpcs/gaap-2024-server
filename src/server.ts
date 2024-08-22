import { serve } from 'bun';
import { handleWebSocketConnection } from './websocket';
import { routeRequest } from './router';
import type { WebSocketData } from './user';
import { Room } from './room';

const PORT = 3000;

export function startServer(room: Room) {
    return serve<WebSocketData>({
        fetch(request, server) {
            return routeRequest(request, server);
        },

        websocket: handleWebSocketConnection(room),

        port: PORT,
    });
}