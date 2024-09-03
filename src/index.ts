import * as rl from 'readline';
import { Room } from "./room";
import type { WebSocketData } from "./user";
import { getStudentInfo, isColorValid, parseNameFromDlslEmail } from './utils';
import { startServer } from './server';
import { ask } from './debug';

const room = new Room();
const server = startServer(room);

console.log(`Server started on port ${server.port}`);

ask(room);