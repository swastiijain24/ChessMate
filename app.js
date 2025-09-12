const express = require('express');
const socket = require('socket.io');
const http = require('http');
const { Chess } = require('chess.js');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socket(server);

const games = {};

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, "public")));

app.get('/', (req, res) => {
    res.render("index", { title: "Chess" });
});

app.get('/game/:roomId', (req, res) => {
    const { botType } = req.query;
    res.render("index", {
        title: "Chess",
        roomId: req.params.roomId,
        botType: botType || null
    });
});

app.get('/lobby', (req, res) => {
    res.render("lobby");
});

app.get('/games', (req, res) => {
    res.json(Object.keys(games));
});

io.on('connection', (socket) => {
    console.log('connected', socket.id);

    socket.on("joinGame", (roomId) => {
        if (!games[roomId]) {
            games[roomId] = {
                chess: new Chess(),
                players: {},
                spectators: []
            };
        }

        const game = games[roomId];

        if (!game.players.white) {
            game.players.white = socket.id;
            socket.emit('playerRole', 'w');
        } else if (!game.players.black) {
            game.players.black = socket.id;
            socket.emit('playerRole', 'b');
        } else {
            game.spectators.push(socket.id);
            socket.emit('spectatorRole');
        }

        socket.join(roomId);
        socket.emit("boardState", game.chess.fen());
    });

    socket.on('move', ({ roomId, move }) => {
        const game = games[roomId];
        if (!game) return;

        const chess = game.chess;

        if (chess.turn() === 'w' && socket.id !== game.players.white) return;
        if (chess.turn() === 'b' && socket.id !== game.players.black) return;

        const result = chess.move(move);

        if (result) {
            io.to(roomId).emit("move", move);
            io.to(roomId).emit("boardState", chess.fen());

            if (chess.isGameOver()) {
                let outcome;
                if (chess.isCheckmate()) {
                    outcome = chess.turn() === 'w' ? 'Black wins' : 'White wins';
                } else {
                    outcome = "Draw";
                }
                io.to(roomId).emit('gameOver', { result: outcome });
            }
        } else {
            console.log("Invalid Move:", move);
            socket.emit("invalidMove", move);
        }
    });

    socket.on("disconnect", () => {
        for (const roomId in games) {
            const game = games[roomId];
            if (!game) continue;

            if (game.players.white === socket.id) delete game.players.white;
            if (game.players.black === socket.id) delete game.players.black;
            game.spectators = game.spectators.filter(id => id !== socket.id);

            if (!game.players.white && !game.players.black && game.spectators.length === 0) {
                delete games[roomId];
                console.log(`Deleted empty game: ${roomId}`);
            }
        }
    });
});

server.listen(3000, () => {
    console.log("listening on port 3000");
});
