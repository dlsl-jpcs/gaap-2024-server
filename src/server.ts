import { serve } from 'bun';
import { handleWebSocketConnection } from './websocket';
import { routeRequest } from './router';
import type { WebSocketData } from './user';
import type { AbstractRoom } from './room';
import { enableCORS } from './cors';

const PORT = 3000;

export class ServerHandler {

    room: AbstractRoom;

    constructor(room: AbstractRoom) {
        this.room = room;
    }

    startServer() {
        return serve<WebSocketData>({
            fetch: (request, server) => {
                return routeRequest(request, server, this);
            },

            websocket: {
                ...handleWebSocketConnection(this.room),
                perMessageDeflate: true,
            },

            port: PORT,

        });
    }

    changeRoom(room: AbstractRoom) {
        this.room = room;
    }
}

