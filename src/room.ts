import type { ServerWebSocket } from "bun";
import type { User, WebSocketData } from "./user";
import { getStudentInfo } from "./utils";

/**
 * Handles the main game state, users, and game logic
 */
export class Room {
    users: User[] = [];

    state: 'red' | 'green' | 'idle' = 'idle';

    constructor() {

    }


    /**
     * Called when a message is received from a use
     */
    onMessage(ws: ServerWebSocket<WebSocketData>, message: string | Buffer) {
        const fromUser = this.users.find(s => s.id === ws.data.id);
        if (!fromUser) {
            console.error("User " + ws.data.id + " not found");
            return;
        }

        const data = JSON.parse(message.toString());
        if (data.type === 'moved') {
            this.userEliminated(fromUser);
        } else if (data.type === 'state' && fromUser.admin) {
            if (data.state === 'red') {
                this.redLight();
            } else if (data.state === 'green') {
                this.greenLight();
            }
        }
    }


    async addUser(socket: ServerWebSocket<WebSocketData>): Promise<User> {
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
            return existing;
        }

        const studentInfo = await getStudentInfo(socket.data.id.toString()).catch(e => {
            return null;
        }).then(data => {
            if (data) return data;

            return {
                email_address: 'unknown_student_' + socket.data.id + '@dlsl.edu.ph',
                department: 'BSIT',
            }
        });

        const user: User = {
            socket: socket,
            id: socket.data.id,
            course: studentInfo.department,
            email: studentInfo.email_address,
            spectator: socket.data.isSpectator,
            connectionState: 'connected',
            admin: socket.data.isAdmin,
            state: 'active'
        };
        this.users.push(user);


        if (!user.spectator && !user.admin) {
            this.getSpectators()
                .forEach(s => {
                    s.socket?.send(JSON.stringify({
                        type: 'join',
                        id: user.id,
                        course: user.course,
                        email: user.email,
                    }));
                });
        }

        return user;
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

        const spectators = this.users.filter(s => s.spectator);
        if (!spectators) return;

        // notify spectators
        spectators.forEach(s => {
            s.socket?.send(JSON.stringify({
                type: 'eliminated',
                id: user.id
            }));
        });
    }


    /**
     * Send a red light to all users
     */
    redLight() {
        this.state = 'red';

        this.getPlayers()
            .filter(s => s.state === 'active')
            .forEach(s => {
                s.socket?.send(JSON.stringify({
                    type: 'game_state',
                    state: 'red'
                }));
            });

        this.getSpectators()
            .forEach(s => {
                s.socket?.send(JSON.stringify({
                    type: 'game_state',
                    state: 'red'
                }));
            });
    }

    /**
     * Send a green light to all users
     */
    greenLight() {
        this.state = 'green';


        this.getPlayers()
            .filter(s => s.state === 'active')
            .forEach(s => {
                s.socket?.send(JSON.stringify({
                    type: 'game_state',
                    state: 'green'
                }));
            });


        this.getSpectators()
            .forEach(s => {
                s.socket?.send(JSON.stringify({
                    type: 'game_state',
                    state: 'green'
                }));
            });
    }

    getPlayers() {
        return this.users
            .filter(s => s.connectionState === 'connected')
            .filter(s => !s.admin)
            .filter(s => !s.spectator);
    }

    getSpectators() {
        return this.users
            .filter(s => s.connectionState === 'connected')
            .filter(s => s.spectator)
            .filter(s => !s.admin);
    }
}