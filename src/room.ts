import type { ServerWebSocket } from "bun";
import type { User, WebSocketData } from "./user";

export class Room {
    users: User[] = [];

    state: 'red' | 'green' | 'idle' = 'idle';

    constructor() {

    }


    onMessage(ws: ServerWebSocket<WebSocketData>, message: string | Buffer) {
        const fromUser = this.users.find(s => s.id === ws.data.id);
        if (!fromUser) {
            console.error("User " + ws.data.id + " not found");
            return;
        }

        const data = JSON.parse(message.toString());
        if (data.type === 'moved') {
            this.userEliminated(fromUser);

        }
    }


    addUser(socket: ServerWebSocket<WebSocketData>) {
        const existing = this.users.find(s => s.id === socket.data.id);
        if (existing) {
            existing.socket = socket;

            if (existing.connectionState === "disconnected") {
                socket.send(JSON.stringify({
                    type: 'sync',
                    gameState: this.state,
                    eliminated: existing.state === 'eliminated'
                }));
            }

            existing.connectionState = 'connected';
            return;
        }

        this.users.push({
            socket: socket,
            id: socket.data.id,
            connectionState: 'connected',
            state: 'active'
        });
    }

    userDisconnected(socket: ServerWebSocket<WebSocketData>) {
        const user = this.users.find(s => s.id === socket.data.id);
        if (user) {
            user.socket = null;
            user.connectionState = 'disconnected';
        }
    }

    userEliminated(user: User) {
        user.socket?.send(JSON.stringify({
            type: 'eliminated',
        }));

        user.state = 'eliminated';
    }


    /**
     * Send a red light to all users
     */
    redLight() {
        this.state = 'red';

        this.users
            .filter(s => s.state === 'active')
            .forEach(s => {
                s.socket?.send(JSON.stringify({
                    type: 'game_state',
                    state: 'started'
                }));
            });
    }

    /**
     * Send a green light to all users
     */
    greenLight() {
        this.users
            .filter(s => s.state === 'active')
            .forEach(s => {
                s.socket?.send(JSON.stringify({
                    type: 'game_state',
                    state: 'idle'
                }));
            });

        this.state = 'idle';
    }
}