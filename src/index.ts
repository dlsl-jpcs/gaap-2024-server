
import { ask, askGts } from './debug';
import { RedLightGreenLightRoom } from './redLightGreenLight';
import { GuessTheSong } from './guessTheSong';
import { ServerHandler } from './server';

const room = new RedLightGreenLightRoom();
const serverHandler = new ServerHandler(room);
const server = serverHandler.startServer();

console.log(`Server started on port ${server.port}`);

// ask(room);
ask(room);