import { serve } from 'bun';
import { handleWebSocketConnection } from './websocket';
import { routeRequest } from './router';
import type { WebSocketData } from './user';
import type { AbstractRoom } from './room';

const PORT = 3000;

export function startServer(room: AbstractRoom) {
    return serve<WebSocketData>({
        fetch(request, server) {
            return routeRequest(request, server);
        },

        websocket: {
            ...handleWebSocketConnection(room),
            perMessageDeflate: true,
        },

        port: PORT,


    });
}