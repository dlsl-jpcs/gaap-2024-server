import type { ServerWebSocket } from "bun";
import type { User, WebSocketData } from "./user";
import { getStudentInfo } from "./utils";
import { Database } from "bun:sqlite";


const db = new Database("students.db");
const query = db.query(`CREATE TABLE IF NOT EXISTS students (id INTEGER PRIMARY KEY, email_address TEXT, department TEXT audio TEXT)`);
query.run();



/**
 * Base class for a room.
 * 
 * This can be extended to create different types of games.
 */
export abstract class AbstractRoom {
    users: User[] = [];

    constructor() {

    }

    /**
     * Ideally, each game should have a unique type,
     */
    abstract getType(): string;

    /**
     * Callback when a user who previously connected to the room reconnects.
     * 
     * @param user The user that connected
     */
    onExistingUserConnected(user: User) {

    }

    /**
     * Callback when a new user connects to the room
     * 
     * @param user The user that connected
     */
    onNewUserConnected(user: User) {

    }

    /**
     * INTERNAL: Called when a user has connected to the room
     * 
     * do not override this method.
     */
    async userConnected(socket: ServerWebSocket<WebSocketData>): Promise<User> {
        const existing = this.users.find(s => s.id === socket.data.id);
        if (existing) {
            existing.socket = socket;

            if (existing.connectionState === "disconnected") {
                // confirm the room to the user
                socket.send(JSON.stringify({
                    type: 'room_confirmation',
                    room: this.getType()
                }));


                this.onExistingUserConnected(existing);
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
            admin: socket.data.isAdmin
        };
        this.users.push(user);

        // confirm the room to the user
        socket.send(JSON.stringify({
            type: 'room_confirmation',
            room: this.getType()
        }));

        this.onNewUserConnected(user);

        return user;
    }

    userDisconnected(socket: ServerWebSocket<WebSocketData>) {
        const user = this.users.find(s => s.id === socket.data.id);
        if (!user) {
            return;
        }

        this.onUserDisconnected(user);

        user.socket = null;
        user.connectionState = 'disconnected';
    }

    /**
     * Callback when a user disconnects from the room.
     * @param user 
     */
    onUserDisconnected(user: User) {

    }


    /**
     *  INTERNAL: Called when a message is received from a user
     * 
     * Do not override this method. Instead, override onUserMessage
     */
    onMessage(ws: ServerWebSocket<WebSocketData>, message: string | Buffer) {
        const user = this.users.find(s => s.id === ws.data.id);
        if (!user) {
            return;
        }

        this.onUserMessage(user, JSON.parse(message.toString()));
    }

    /**
     *  Callback when a user sends a message to the server
     * 
     * @param user The user that sent the message
     * @param data The data sent by the user
     */
    onUserMessage(user: User, data: any) {

    }
}
