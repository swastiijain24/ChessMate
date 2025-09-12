
// Random Bot (easy / medium)
function createRandomBotMove(game) {
    const moves = game.moves();
    if (moves.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * moves.length);
    return moves[randomIndex];
}

function createStockfishBot() {
    const engine = new Worker("/js/stockfish.js");
    engine.postMessage("uci");

    engine.onmessage= (msg)=>{
        console.log("stockfish ", msg.data);
        // console.log("hello");
        
    };

    return {
        getBestMove: (fen) =>
            new Promise((resolve) => {
                engine.postMessage("position fen " + fen);
                engine.postMessage("go depth 15");

                const handler = (msg) => {
                    const data = msg.data;
                    if (typeof data === "string" && data.startsWith("bestmove")) {
                        const move = data.split(" ")[1];
                        engine.removeEventListener("message", handler);
                        resolve(move);
                    }
                };

                engine.addEventListener("message", handler);
            }),
    };
}

// module.exports = { createRandomBotMove, createStockfishBot };
export { createRandomBotMove, createStockfishBot };
