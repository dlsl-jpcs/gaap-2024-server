import * as rl from 'readline';
import type { WebSocketData } from "./user";
import { getStudentInfo, isColorValid, parseNameFromDlslEmail } from './utils';
import { startServer } from './server';
import { ask } from './debug';
import { RedLightGreenLightRoom } from './redLightGreenLight';

const room = new RedLightGreenLightRoom();
const server = startServer(room);

console.log(`Server started on port ${server.port}`);

ask(room);