import type { ServerWebSocket } from 'bun';
import { Room } from './room';
import type { WebSocketData } from './user';

export const handleWebSocketConnection = (room: Room) => (
    {
        open: async (ws: ServerWebSocket<WebSocketData>) => {
            await room.addUser(ws);

            room.users.forEach(s => {
                s.socket?.send(JSON.stringify({
                    type: 'users',
                    count: room.getPlayers().length
                }));
            });
        },

        close: (ws: ServerWebSocket<WebSocketData>) => {
            room.userDisconnected(ws);

            room.users.forEach(s => {
                s.socket?.send(JSON.stringify({
                    type: 'users',
                    count: room.getPlayers().length
                }));
            });
        },

        message: (ws: ServerWebSocket<WebSocketData>, message: string) => {
            room.onMessage(ws, message);
        },
    }
);
