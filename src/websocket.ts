import type { ServerWebSocket } from 'bun';
import { AbstractRoom } from './room';
import type { WebSocketData } from './user';

export const handleWebSocketConnection = (room: AbstractRoom) => (
    {
        open: async (ws: ServerWebSocket<WebSocketData>) => {
            await room.userConnected(ws);
        },

        close: (ws: ServerWebSocket<WebSocketData>) => {
            room.userDisconnected(ws);
        },

        message: (ws: ServerWebSocket<WebSocketData>, message: string) => {
            room.onMessage(ws, message);
        },
    }
);
