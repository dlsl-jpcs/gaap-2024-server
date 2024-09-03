import { startServer } from './server';
import { ask } from './debug';
import { RedLightGreenLightRoom } from './redLightGreenLight';

const room = new RedLightGreenLightRoom();
const server = startServer(room);

console.log(`Server started on port ${server.port}`);

ask(room);