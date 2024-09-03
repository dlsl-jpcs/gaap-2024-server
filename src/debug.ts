import * as rl from 'readline';
import { isColorValid } from './utils';
import type { Room } from './room';


const readline = rl.createInterface({
    input: process.stdin,
    output: process.stdout
});

/**
 * Reads input from the console to test specific stuff
 * such as sending colors to all users,
 * disconnecting all users, 
 * changing room state, etc.
 */
export function ask(room: Room) {
    readline.question("Enter a command: ", (command) => {
        if (command === 'exit') {
            readline.close();
            return;
        }

        if (command === 'users') {
            console.log("[Users] " + room.users.length);
            for (let i = 0; i < room.users.length; i++) {
                const user = room.users[i];
                console.log(`[${user.id}]: [${user.state}] ${user.connectionState}`);
            }
            return ask(room);
        }

        if (command === 'dc') {
            room.users.forEach(s => {
                s.socket?.close();
            });
            return ask(room);
        }

        if (command == "red") {
            room.redLight();
            return ask(room);
        }

        if (command == "green") {
            room.greenLight();
            return ask(room);
        }

        if (command == "reset") {
            room.state = 'idle';
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
            return ask(room);
        }


        if (command === "clear") {
            room.users = [];
            return ask(room);
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


        ask(room);
    });
}