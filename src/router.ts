import { URL } from 'url';
import { enableCORS } from './cors.ts';
import type { Server } from 'bun';
import type { ServerHandler } from './server.ts';

export const routeRequest = (request: Request, server: Server, serverHandler: ServerHandler): Response | undefined => {
    const url = new URL(request.url);

    if (url.pathname === '/rlgl') {
        const data = {
            id: url.searchParams.get('userId') || 0,
            isSpectator: url.searchParams.get('spectator') === 'true',
            isAdmin: url.searchParams.get('admin') === 'true'
        };
        server.upgrade(request, {
            data: data
        });
        return;
    }

    if (url.pathname === '/api/currentRoom') {
        return enableCORS(new Response(JSON.stringify({
            room: serverHandler.room.getType()
        })));
    }

    const response = new Response("hello world");
    return enableCORS(response);
};