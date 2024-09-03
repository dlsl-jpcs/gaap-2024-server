import { AbstractRoom } from "../room";
import type { User } from "../user";

export class RedLightGreenLightRoom extends AbstractRoom {


    state: 'red' | 'green' | 'idle' = 'idle';

    eliminatedUsers: User[] = [];


    constructor() {
        super();
    }

    getType(): string {
        return "RED_LIGHT_GREEN_LIGHT";
    }

    override onUserMessage(fromUser: User, data: any): void {
        if (data.type === 'moved') {
            this.userEliminated(fromUser);
        } else if (data.type === 'state' && fromUser.admin) {
            if (data.state === 'red') {
                this.redLight();
            } else if (data.state === 'green') {
                this.greenLight();
            }
        }
    }


    override onExistingUserConnected(user: User): void {
        user.socket?.send(JSON.stringify({
            type: 'sync',
            gameState: this.state,
            eliminated: this.isUserEliminated(user)
        }));
    }

    override onNewUserConnected(user: User): void {
        const alreadyStarted = this.state !== 'idle';

        this.users.forEach(s => {
            s.socket?.send(JSON.stringify({
                type: 'users',
                count: this.getPlayers().length
            }));
        });

        if (!user.spectator && !user.admin) {
            if (alreadyStarted) {
                user.socket?.send(JSON.stringify({
                    type: 'sync',
                    gameState: this.state,
                    eliminated: this.isUserEliminated(user)
                }));
            }

            this.getSpectators()
                .forEach(s => {
                    s.socket?.send(JSON.stringify({
                        type: 'join',
                        id: user.id,
                        course: user.course,
                        email: user.email,
                    }));
                });
        }
    }

    override onUserDisconnected(user: User): void {
        this.users.forEach(s => {
            s.socket?.send(JSON.stringify({
                type: 'users',
                count: this.getPlayers().length
            }));
        });
    }

    /**
     * Helper function to eliminate a user
     */
    userEliminated(user: User) {
        user.socket?.send(JSON.stringify({
            type: 'eliminated',
        }));

        this.eliminatedUsers.push(user);

        // notify spectators that a user has been eliminated,
        // this is useful later on when we want to show the eliminated users

        const spectators = this.users.filter(s => s.spectator);
        if (!spectators) return;


        spectators.forEach(s => {
            s.socket?.send(JSON.stringify({
                type: 'eliminated',
                id: user.id
            }));
        });
    }


    /**
     * Send a red light to all users
     */
    redLight() {
        this.state = 'red';

        this.getPlayers()
            .filter(s => !this.isUserEliminated(s))
            .forEach(s => {
                s.socket?.send(JSON.stringify({
                    type: 'game_state',
                    state: 'red'
                }));
            });

        this.getSpectators()
            .forEach(s => {
                s.socket?.send(JSON.stringify({
                    type: 'game_state',
                    state: 'red'
                }));
            });
    }

    isUserEliminated(user: User) {
        return this.eliminatedUsers.indexOf(user) !== -1;
    }

    /**
     * Send a green light to all users
     */
    greenLight() {
        this.state = 'green';


        this.getPlayers()
            .filter(s => !this.isUserEliminated(s))
            .forEach(s => {
                s.socket?.send(JSON.stringify({
                    type: 'game_state',
                    state: 'green'
                }));
            });


        this.getSpectators()
            .forEach(s => {
                s.socket?.send(JSON.stringify({
                    type: 'game_state',
                    state: 'green'
                }));
            });
    }

    getPlayers() {
        return this.users
            .filter(s => s.connectionState === 'connected')
            .filter(s => !s.admin)
            .filter(s => !s.spectator);
    }

    getSpectators() {
        return this.users
            .filter(s => s.connectionState === 'connected')
            .filter(s => s.spectator)
            .filter(s => !s.admin);
    }
}