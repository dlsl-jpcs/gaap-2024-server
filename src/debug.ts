import * as rl from 'readline';
import { getStudentInfo, isColorValid } from './utils';
import type { RedLightGreenLightRoom } from './redLightGreenLight';
import type { GuessTheSong } from './guessTheSong';


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
export function ask(room: RedLightGreenLightRoom) {
    readline.question("Enter a command: ", (command) => {
        if (command === 'exit') {
            readline.close();
            return;
        }

        if (command === 'users') {
            console.log("[Users] " + room.users.length);
            for (let i = 0; i < room.users.length; i++) {
                const user = room.users[i];
                // console.log(`[${user.id}]: [${user.state}] ${user.connectionState}`);
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
            // room.users.forEach(s => {
            //     s.state = 'active';
            // });
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

        if (command === 'simulateJoin') {
            room.getSpectators().forEach(async s => {
                var ids = Object.keys(testIdToTrack);
                for (let i = 0; i < ids.length; i++) {
                    const id = ids[i];
                    const track = testIdToTrack[id];
                    const info = await getStudentInfo(id);


                    s.socket?.send(JSON.stringify({
                        type: 'join',
                        id: id,
                        email: info.email_address,
                        course: info.department,
                        track: track,
                    }));
                }
            });
        }


        ask(room);
    });
}

export function askGts(room: GuessTheSong) {
    readline.question("Enter a command: ", (command) => {
        if (command === 'exit') {
            readline.close();
            return;
        }

        if (command === 'start') {
            room.start();
            return askGts(room);
        }

        if (command === 'next') {
            room.nextRound();
            return askGts(room);
        }
    });
}

const testIdToTrack: { [key: string]: string } = {
    "2021314281": "34gCuhDGsG4bRPIf9bb02f",
    "2023348471": "44KoJ5JDeP9qCJXtP6WTVd",
    "2023362341": "7FOgcfdz9Nx5V9lCNXdBYv",
    "2023362771": "5XeFesFbtLpXzIVDNQP22n",
}
