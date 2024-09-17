import { SpotifyApi, type Playlist, type Track } from "@spotify/web-api-ts-sdk";
import { AbstractRoom } from "../room";
import type { User } from "../user";
import { getStudentInfo, shuffle } from "../utils";

const api = SpotifyApi.withClientCredentials(
    Bun.env.VITE_SPOTIFY_CLIENT_ID!,
    Bun.env.VITE_CLIENT_SECRET!,

)


const PLAYLIST = [

]

/**
 * Represents a correct guess, with the user and the time it took to guess
 */
type CorrectGuess = {
    user: User;
    seconds: number;
}

/**
 * Represents a single round of the game
 */
class Round {

    startTime: number = 0;

    correctGuesses: CorrectGuess[] = [];

    // The users that have attempted to guess the song, though their guess
    // is not necessarily correct.
    // this is used to prevent users from guessing multiple times
    userGuessed: User[] = [];

    ended: boolean = false;

    start() {
        this.startTime = Date.now();
    }

    end() {
        this.ended = true;
    }


    onUserGuess(user: User, guess: string) {
        if (this.ended) {
            return;
        }

        if (this.userGuessed.includes(user)) {
            // already guessed
            return;
        }


        const correct = this.isGuessCorrect(guess);

        if (correct) {
            const time = Date.now() - this.startTime;
            this.correctGuesses.push({
                user,
                seconds: time / 1000
            });

            console.log(`User ${user.id} guessed correctly in ${time / 1000} seconds`);
        }
    }

    isGuessCorrect(guess: string) {
        const trackName = this.track.name;
        // remove all spaces and make it lowercase
        const lenientTrackName = trackName.replace(/\s/g, "").toLowerCase();
        const lenientGuess = guess.replace(/\s/g, "").toLowerCase();

        if (lenientTrackName === lenientGuess) {
            return true;
        }

        // check if the guess is a substring of the track name
        return lenientTrackName.includes(lenientGuess);
    }

    constructor(public track: Track) { }

}

export class GuessTheSong extends AbstractRoom {

    rounds: Round[] = [];
    currentRoundIndex: number = 0;

    currentRoundTime: number = 0;

    roomState: "waiting" | "playing" = "waiting";

    playlist: Track[] = [];


    getType(): string {
        return "GUESS_THE_SONG";
    }

    constructor() {
        super();

        this.loadPlaylist().then(playlist => {
            this.playlist = playlist.tracks.items.map(item => item.track);

            console.log("Loaded playlist", playlist.tracks.items.length);
        }).then(() => {
            return this.loadRounds();
        }).catch(e => {
            console.error("Failed to load playlist", e);
        });
    }

    async loadPlaylist() {
        return api.playlists.getPlaylist("6MKl35HliU3UdPnmib2XJG");
    }

    onUserMessage(user: User, data: any): void {
        const type = data.type;

        if (type === "guess") {
            const guess = data.guess;
            const round = this.rounds[this.currentRoundIndex];

            if (round) {
                round.onUserGuess(user, guess);
            }

            // send acknowledgement
            user.socket?.send(JSON.stringify({
                type: "guess_acknowledged"
            }));

            return;
        }

        if (type === "nextRound") {
            this.nextRound();
            return;
        }

        if (user.admin && type === "start") {
            this.start();
            return;
        }

        if (user.admin && type === "shuffle") {
            this.loadRounds().then(() => {
                console.log("Shuffled tracks");
                this.syncAdmin();
            });
            return;
        }
    }

    onExistingUserConnected(user: User): void {
        const currentRound = this.rounds[this.currentRoundIndex];
        if (!currentRound) {
            return;
        }

        if (user.admin) {
            this.syncAdmin();
            return;
        }


        if (!currentRound.ended) {
            user.socket?.send(JSON.stringify({
                type: "sync",
                submitted: currentRound.userGuessed.includes(user),
            }));
        }
    }

    override onNewUserConnected(user: User): void {
        if (this.roomState === "playing") {
            user.socket?.send(JSON.stringify({
                type: "start"
            }));
        }

        console.log("New user connected", user.id);

        if (user.admin) {
            this.syncAdmin();
        }
    }

    async loadRounds() {
        console.log("Loading tracks");
        const playlist = this.playlist;

        this.rounds = [];

        // shuffle the tracks
        const shuffled = shuffle(new Array(...playlist));



        const pickedTracks: Track[] = [];
        let tries = 0;
        while (pickedTracks.length < 5) {
            const track = shuffled.pop();


            if (track && track.preview_url) {
                pickedTracks.push(track);
            }

            tries++;

            if (tries > 100) {
                console.error("Failed to pick tracks");
                break;
            }
        }

        this.rounds = pickedTracks.map(track => new Round(track));

        this.currentRoundIndex = 0;
    }

    start() {
        if (this.roomState === "playing") {
            return;
        }

        this.roomState = "playing";
        this.currentRoundIndex = -1;

        this.getPlayers().forEach(player => {
            player.socket?.send(JSON.stringify({
                type: "start",
            }))
        });
        this.nextRound();
    }

    syncAdmin() {
        this.users.filter(user => user.admin).forEach(admin => {
            admin.socket?.send(JSON.stringify({
                type: "sync",
                currentRound: this.currentRoundIndex,
                state: this.roomState,
                songs: this.rounds.map(round => round.track)
            }))
        });
    }


    getPlayers() {
        return this.users.filter(user => !user.spectator)
            .filter(user => user.connectionState === "connected");
    }

    getSpectators() {
        return this.users.filter(user => user.spectator)
            .filter(user => user.connectionState === "connected");
    }

    nextRound() {
        this.currentRoundIndex++;
        const round = this.rounds[this.currentRoundIndex];

        if (round) {
            round.start();

            // broadcast the new round to all players
            this.getPlayers().forEach(player => {
                player.socket?.send(JSON.stringify({
                    type: "newRound",
                    roundNumber: this.currentRoundIndex + 1,
                }))
            });

            // we braodcast the track to spectators
            this.getSpectators().forEach(player => {
                player.socket?.send(JSON.stringify({
                    type: "newRound",
                    roundNumber: this.currentRoundIndex + 1,
                    track: round.track
                }))
            });

            this.syncAdmin();

            // countdown timer
            this.currentRoundTime = 30;
            const interval = setInterval(() => {
                this.currentRoundTime--;

                if (this.currentRoundTime <= 0) {
                    clearInterval(interval);
                    this.getPlayers().forEach(player => {
                        player.socket?.send(JSON.stringify({
                            type: "roundEnd",
                        }))
                    });

                    const top = this.getTop5();
                    const users = top.map(async ([id, score]) => {
                        const info = await getStudentInfo(id);

                        return {
                            id: id,
                            email: info.email_address,
                            course: info.department,
                            score: score
                        }
                    });

                    const allPromise = Promise.all(users);

                    allPromise.then(users => {
                        this.getSpectators().forEach(player => {
                            player.socket?.send(JSON.stringify({
                                type: "roundEnd",
                                top5: users
                            }))
                        });

                    });


                    round.end();

                    this.syncAdmin();
                    return;
                }
            }, 1000);
        } else {
            // game over
            // calculate the scores, per user

            const scores = this.getTop5();
            this.sendTopScores(scores);

            this.syncAdmin();
        }
    }

    getTop5() {
        const scores: Record<string, number> = {};
        this.rounds.forEach(round => {
            round.correctGuesses.forEach(guess => {
                const user = guess.user;
                const score = 1 / guess.seconds;
                if (scores[user.id]) {
                    scores[user.id] += score;
                } else {
                    scores[user.id] = score;
                }
            });
        });

        const sortedScores = Object.entries(scores).sort((a, b) => b[1] - a[1]);

        return sortedScores.slice(0, 5);
    }

    async sendTopScores(top3: [string, number][]) {
        const top3Users = top3.map(async ([id, score]) => {
            const info = await getStudentInfo(id);

            return {
                id: id,
                email: info.email_address,
                course: info.department,
                score: score
            }
        });

        const awaitTop3 = await Promise.all(top3Users);

        this.getSpectators().forEach(player => {
            player.socket?.send(JSON.stringify(
                {
                    type: "gameOver",
                    top3: awaitTop3
                }
            ));

        });

    }


}