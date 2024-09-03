import { SpotifyApi, type Track } from "@spotify/web-api-ts-sdk";
import { AbstractRoom } from "../room";
import type { User } from "../user";
import { getStudentInfo } from "../utils";

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

    start() {
        this.startTime = Date.now();
    }


    onUserGuess(user: User, guess: string) {
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


    getType(): string {
        return "GUESS_THE_SONG";
    }

    constructor() {
        super();

        this.loadRounds();
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
    }

    onExistingUserConnected(user: User): void {
        const currentRound = this.rounds[this.currentRoundIndex];
        if (!currentRound) {
            return;
        }

        user.socket?.send(JSON.stringify({
            type: "sync",
            submitted: currentRound.userGuessed.includes(user),
        }))
    }

    override onNewUserConnected(user: User): void {
        if (this.roomState === "playing") {
            user.socket?.send(JSON.stringify({
                type: "start"
            }));
        }
    }

    async loadRounds() {
        console.log("Loading tracks");
        const playlist = await api.playlists.getPlaylist("6MKl35HliU3UdPnmib2XJG");

        // shuffle the tracks
        const shuffled = playlist.tracks.items.sort(() => Math.random() - 0.5);
        shuffled.forEach((track) => {
            if (!track.track) {
                return;
            }
            if (!track.track.preview_url) {
                return;
            }
            this.rounds.push(new Round(track.track));
        });

        // trim rounds to 5
        this.rounds = this.rounds.slice(0, 5);

        this.currentRoundIndex = 0;
    }

    start() {
        this.roomState = "playing";
        this.currentRoundIndex = -1;

        this.getPlayers().forEach(player => {
            player.socket?.send(JSON.stringify({
                type: "start",
            }))
        });

        this.nextRound();
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
                    this.getSpectators().forEach(player => {
                        player.socket?.send(JSON.stringify({
                            type: "roundEnd",
                        }))
                    });
                    return;
                }
            }, 1000);
        } else {
            // game over
            // calculate the scores, per user

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

            // print to console
            const top3 = sortedScores.slice(0, 3);

            this.sendTop3(top3);

            ;

        }
    }

    async sendTop3(top3: [string, number][]) {
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