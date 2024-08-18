import * as rl from 'readline';
import { Room } from "./room";
import type { WebSocketData } from "./user";

const PORT = 3000;

const room = new Room();


const server = Bun.serve<WebSocketData>({
    fetch(request, server) {
        const url = new URL(request.url);

        if (url.pathname === '/rlgl') {
            const data = {
                id: url.searchParams.get('userId') || 0
            };
            server.upgrade(request, {
                data: data
            })
            return;
        }

        // enable cors
        const response = new Response("hello world");
        response.headers.set('Access-Control-Allow-Origin', '*');
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        return response;
    },

    websocket: {
        open: async (ws) => {
            room.addUser(ws);
            console.log("User " + ws.data.id + " connected.");

            room.users.forEach(s => {
                s.socket?.send(JSON.stringify({
                    type: 'users',
                    count: room.users.filter(s => s.connectionState === 'connected').length
                }));
            });
        },

        close: (ws) => {
            room.userDisconnected(ws);
            console.log("User disconnected.");

            room.users.forEach(s => {
                s.socket?.send(JSON.stringify({
                    type: 'users',
                    count: room.users.filter(s => s.connectionState === 'connected').length
                }));
            });
        },

        message: (ws, message) => {
            room.onMessage(ws, message);
        },


    },

    port: PORT,
});

console.log(`Server is running on ip ${server.hostname} and port ${PORT}`);






const readline = rl.createInterface({
    input: process.stdin,
    output: process.stdout
});

function isColorValid(color: string) {
    return /^#[0-9A-F]{6}$/i.test(color);
}

function ask() {
    readline.question("Enter a command: ", (command) => {
        if (command === 'exit') {
            readline.close();
            return;
        }

        if (command === 'users') {
            console.log("[Users] " + room.users.length);
            for (let i = 0; i < room.users.length; i++) {
                const user = room.users[i];
                console.log(`User [${user.id}]: ${user.connectionState}`);
            }
            return ask();
        }

        if (command === 'dc') {
            room.users.forEach(s => {
                s.socket?.close();
            });
            return ask();
        }

        if (command == "red") {
            room.redLight();
            return ask();
        }

        if (command == "green") {
            room.greenLight();
            return ask();
        }

        if (command == "reset") {
            room.users.forEach(s => {
                s.state = 'active';
            });
            // sync
            room.users.forEach(s => {
                s.socket?.send(JSON.stringify({
                    type: 'sync',
                    eliminated: false
                }));
            }); 1
            return ask();
        }



        if (isColorValid(command)) {
            room.users.forEach(s => {
                console.log("Sending color to user " + s.id);
                s.socket?.send(JSON.stringify({
                    type: 'color',
                    color: command
                }));
            });
        }


        ask();
    });
}

ask();