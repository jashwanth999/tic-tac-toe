import { Server } from "socket.io";

export const config = {
  api: {
    bodyParser: false
  }
};

const winningCombos = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6]
];

function evaluateBoard(board) {
  for (const line of winningCombos) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], winningLine: line };
    }
  }
  if (board.every((cell) => cell)) {
    return { winner: "draw", winningLine: null };
  }
  return { winner: null, winningLine: null };
}

function normalizeRoomId(roomId = "") {
  return roomId
    .toString()
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
}

function createSocketServer(res) {
  const io = new Server(res.socket.server, {
    path: "/api/socket",
    addTrailingSlash: false,
    cors: {
      origin: "*"
    }
  });

  const games = new Map();

  const createGame = (roomId) => {
    const game = {
      roomId,
      board: Array(9).fill(null),
      turn: "X",
      winner: null,
      winningLine: null,
      players: { X: null, O: null },
      lastMove: null,
      started: false
    };
    games.set(roomId, game);
    return game;
  };

  const getOrCreateGame = (roomId) => games.get(roomId) ?? createGame(roomId);

  const resetGameState = (game) => {
    game.board = Array(9).fill(null);
    game.turn = "X";
    game.winner = null;
    game.winningLine = null;
    game.lastMove = null;
  };

  const sanitizeGame = (game) => ({
    roomId: game.roomId,
    board: [...game.board],
    turn: game.turn,
    winner: game.winner,
    winningLine: game.winningLine,
    players: { ...game.players },
    lastMove: typeof game.lastMove === "number" ? game.lastMove : null
  });

  const emitGameState = (roomId) => {
    const game = games.get(roomId);
    if (!game) {
      return;
    }
    io.to(roomId).emit("gameState", sanitizeGame(game));
  };

  const removeSocketFromGame = (socket) => {
    const { roomId, symbol } = socket.data || {};
    if (!roomId || !symbol) {
      return;
    }
    const game = games.get(roomId);
    if (!game) {
      return;
    }

    game.players[symbol] = null;
    game.started = false;
    socket.leave(roomId);
    socket.data.roomId = null;
    socket.data.symbol = null;

    const remainingSymbol = symbol === "X" ? "O" : "X";
    const remainingPlayerId = game.players[remainingSymbol];
    if (remainingPlayerId) {
      const remainingSocket = io.sockets.sockets.get(remainingPlayerId);
      if (remainingSocket && remainingSocket.connected) {
        remainingSocket.emit("opponentLeft");
        io.to(roomId).emit("waitingForPlayer", sanitizeGame(game));
      }
    } else {
      games.delete(roomId);
    }
  };

  io.on("connection", (socket) => {
    console.log("[socket] connected", { socketId: socket.id });
    socket.emit("connected", { id: socket.id });

    socket.on("joinRoom", ({ roomId }) => {

      console.log("[socket] joinRoom", { roomId, socketId: socket.id });
      const normalizedRoomId = normalizeRoomId(roomId);
      if (!normalizedRoomId) {
        socket.emit("roomJoinError", "Room ID is required.");
        return;
      }

      if (socket.data.roomId && socket.data.roomId !== normalizedRoomId) {
        removeSocketFromGame(socket);
      } else if (socket.data.roomId === normalizedRoomId) {
        socket.emit("roomJoinError", "You are already in this room.");
        return;
      }

      const game = getOrCreateGame(normalizedRoomId);
      let assignedSymbol = null;
      if (!game.players.X) {
        assignedSymbol = "X";
        game.players.X = socket.id;
      } else if (!game.players.O) {
        assignedSymbol = "O";
        game.players.O = socket.id;
      } else {
        socket.emit("roomJoinError", "Room is full.");
        return;
      }

      socket.join(normalizedRoomId);
      socket.data.roomId = normalizedRoomId;
      socket.data.symbol = assignedSymbol;

      console.log("[socket] user joined room", {
        roomId: normalizedRoomId,
        socketId: socket.id,
        symbol: assignedSymbol
      });

      socket.emit("joinedRoom", {
        roomId: normalizedRoomId,
        symbol: assignedSymbol,
        players: { ...game.players }
      });

      const bothPlayersConnected =
        Boolean(game.players.X) && Boolean(game.players.O);

      if (bothPlayersConnected) {
        game.started = true;
        console.log("[socket] both players connected", {
          roomId: normalizedRoomId,
          players: { ...game.players }
        });
        console.log("[socket] game started", { roomId: normalizedRoomId });
        io.to(normalizedRoomId).emit("start-game", sanitizeGame(game));
        emitGameState(normalizedRoomId);
      } else {
        io.to(normalizedRoomId).emit("waitingForPlayer", sanitizeGame(game));
      }
    });

    socket.on("leaveRoom", () => {
      removeSocketFromGame(socket);
    });

    socket.on("playerMove", ({ roomId, index }) => {
      const normalizedRoomId = normalizeRoomId(roomId);
      const game = games.get(normalizedRoomId);
      if (!game || !game.started) {
        return;
      }
      if (game.winner) {
        return;
      }
      if (game.players[game.turn] !== socket.id) {
        return;
      }
      if (typeof index !== "number" || index < 0 || index > 8) {
        return;
      }
      if (game.board[index]) {
        return;
      }

      const symbol = socket.data.symbol;
      if (!symbol || game.turn !== symbol) {
        return;
      }

      game.board[index] = symbol;
      game.lastMove = index;
      const result = evaluateBoard(game.board);
      game.winner = result.winner;
      game.winningLine = result.winningLine;
      if (!game.winner) {
        game.turn = symbol === "X" ? "O" : "X";
      }


      emitGameState(normalizedRoomId);
    });

    socket.on("requestRematch", () => {
      const { roomId } = socket.data || {};
      if (!roomId) {
        return;
      }
      socket.to(roomId).emit("rematchRequested");
    });

    socket.on("acceptRematch", () => {
      const { roomId } = socket.data || {};
      if (!roomId) {
        return;
      }
      const game = games.get(roomId);
      if (!game) {
        return;
      }
      resetGameState(game);
      game.started = true;
      console.log("[socket] game started", { roomId });
      io.to(roomId).emit("start-game", sanitizeGame(game));
      emitGameState(roomId);
    });

    socket.on("disconnect", () => {
      removeSocketFromGame(socket);
    });
  });

  return io;
}

export default function handler(req, res) {
  if (!res.socket.server.io) {
    createSocketServer(res);
  }
  res.end();
}
