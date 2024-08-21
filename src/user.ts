import type { ServerWebSocket } from "bun";

export type WebSocketData = {
    id: number; // the id number of the student,
    isSpectator: boolean; // whether the student is a spectator or not
}

export type User = {
    socket: ServerWebSocket<WebSocketData> | null;

    // info
    id: number;
    course: string;
    email: string;
    spectator: boolean;



    // state
    connectionState: 'connected' | 'disconnected';
    state: 'active' | 'eliminated';

}
