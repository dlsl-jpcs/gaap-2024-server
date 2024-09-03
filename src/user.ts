import type { ServerWebSocket } from "bun";

export type WebSocketData = {
    id: number; // the id number of the student,
    isSpectator: boolean; // whether the student is a spectator or not
    isAdmin: boolean; // whether the student is an admin or not
}

export type User = {
    socket: ServerWebSocket<WebSocketData> | null;

    // info
    id: number;
    course: string;
    email: string;
    spectator: boolean;
    admin: boolean;





    // state
    connectionState: 'connected' | 'disconnected';
}
