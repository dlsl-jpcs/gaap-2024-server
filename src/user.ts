import type { ServerWebSocket } from "bun";

export type WebSocketData = {
    id: number; // the id number of the student
}

export type User = {
    socket: ServerWebSocket<WebSocketData> | null;
    id: number;
    connectionState: 'connected' | 'disconnected';
    state: 'active' | 'eliminated';
}
