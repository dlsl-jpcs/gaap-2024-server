import { URL } from 'url';
import { enableCORS } from './cors.ts';
import type { Server } from 'bun';

export const routeRequest = (request: Request, server: Server): Response | undefined => {
    const url = new URL(request.url);

    if (url.pathname === '/rlgl') {
        const data = {
            id: url.searchParams.get('userId') || 0,
            isSpectator: url.searchParams.get('spectator') === 'true'
        };
        server.upgrade(request, {
            data: data
        });
        return;
    }

    const response = new Response("hello world");
    return enableCORS(response);
};