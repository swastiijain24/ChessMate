const socket = io();
const chess = new Chess();
import { createRandomBotMove, createStockfishBot } from "./botService.js";

let boardElement;
document.addEventListener('DOMContentLoaded', () => {
    boardElement = document.querySelector('.chessboard');
    renderBoard(); // render after DOM is ready
});

const board = chess.board();
console.log(board);

let draggedPiece = null;
let sourceSquare = null;
let playerRole = null;

const urlParams = new URLSearchParams(window.location.search);
const botType = urlParams.get("botType");
let bot=null;
if(botType==="hard"){
    bot = createStockfishBot();
}

const roomId = urlParams.get("roomId"); 
socket.emit("joinGame", roomId);

const renderBoard = () => {
    const board = chess.board();
    boardElement.innerHTML = "";
    board.forEach((row, rowindex) => {
        row.forEach((square, squareindex) => {
            const squareElement = document.createElement("div");
            squareElement.classList.add(
                "square",
                (rowindex + squareindex) % 2 === 0 ? "light" : "dark"
            );

            squareElement.dataset.row = rowindex;
            squareElement.dataset.col = squareindex;

            if (square) {
                const pieceElement = document.createElement("div");
                pieceElement.classList.add(
                    "piece",
                    square.color === 'w' ? 'white' : 'black'
                );
                pieceElement.innerText = getPieceUnicode(square);
                pieceElement.draggable = playerRole === square.color;

                pieceElement.addEventListener('dragstart', (e) => {
                    if (pieceElement.draggable) {
                        draggedPiece = pieceElement;
                        sourceSquare = { row: rowindex, col: squareindex };
                        e.dataTransfer.setData('text/plain', "");
                    }
                });

                pieceElement.addEventListener('dragend', () => {
                    draggedPiece = null;
                    sourceSquare = null;
                });

                squareElement.appendChild(pieceElement);
            }

            squareElement.addEventListener('dragover', (e) => {
                e.preventDefault();
            });

            squareElement.addEventListener('drop', (e) => {
                e.preventDefault();
                if (draggedPiece) {
                    const targetSource = {
                        row: parseInt(squareElement.dataset.row),
                        col: parseInt(squareElement.dataset.col),
                    };
                    handleMove(sourceSquare, targetSource);
                }
            });

            boardElement.appendChild(squareElement);
        });
    });

    if (playerRole === 'b') {
        boardElement.classList.add('flipped');
    } else {
        boardElement.classList.remove('flipped');
    }
};

const handleMove = async (source, target) => {
    const move = {
        from: `${String.fromCharCode(97 + source.col)}${8 - source.row}`,
        to: `${String.fromCharCode(97 + target.col)}${8 - target.row}`,
        promotion: 'q',
    };

    const result = chess.move(move);

    if (result) {
        socket.emit('move', { roomId, move });
        renderBoard();

        if (botType) {
            // Wait a bit for UX
            await new Promise(res => setTimeout(res, 300));

            if (botType === "easy" || botType === "medium") {
                const botMove = createRandomBotMove(chess);
                if (botMove) {
                    chess.move(botMove);
                    renderBoard();
                }
            } else if (botType === "hard" && bot) {
                const botMove = await bot.getBestMove(chess.fen());
                console.log("bot plays", botMove);
                
                if (botMove) {
                    chess.move(botMove, {sloppy: true});
                    renderBoard();
                }
            }
        }
    }
};


const getPieceUnicode = (piece) => {
    const unicodePieces = {
        K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙",
        k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟"
    };
    return unicodePieces[piece.type] || "";
};

socket.on('playerRole', (role) => {
    playerRole = role;
    renderBoard();
});

socket.on('spectatorRole', () => {
    playerRole = null;
    renderBoard();
});

socket.on('boardState', (fen) => {
    chess.load(fen);
    renderBoard();
});

socket.on('move', (move) => {
    chess.move(move);
    renderBoard();
});

renderBoard();
