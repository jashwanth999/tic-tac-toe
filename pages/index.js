import { useEffect, useMemo, useRef, useState } from "react";
import Head from "next/head";
import { io } from "socket.io-client";
import GameBoard from "../components/GameBoard";

const initialBoard = Array(9).fill(null);

const generateRoomId = () => Math.random().toString(36).slice(2, 7).toUpperCase();

export default function Home() {
  const socketRef = useRef(null);
  const symbolRef = useRef(null);

  const [connectionMessage, setConnectionMessage] = useState("Connecting…");
  const [roomId, setRoomId] = useState(null);
  const [roomInput, setRoomInput] = useState("");
  const [hasJoinedRoom, setHasJoinedRoom] = useState(false);
  const [symbol, setSymbol] = useState(null);
  const [turn, setTurn] = useState("X");
  const [board, setBoard] = useState(initialBoard);
  const [winner, setWinner] = useState(null);
  const [winningLine, setWinningLine] = useState(null);
  const [lastMove, setLastMove] = useState(null);
  const [opponentId, setOpponentId] = useState(null);
  const [opponentReady, setOpponentReady] = useState(false);
  const [rematchRequested, setRematchRequested] = useState(false);
  const [rematchOffer, setRematchOffer] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [joinError, setJoinError] = useState(null);

  useEffect(() => {
    symbolRef.current = symbol;
  }, [symbol]);

  const resetLocalGameState = () => {
    setBoard([...initialBoard]);
    setTurn("X");
    setWinner(null);
    setWinningLine(null);
    setLastMove(null);
    setRematchRequested(false);
    setRematchOffer(false);
  };

  useEffect(() => {
    const defaultRoom = generateRoomId();
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const queryRoom = params.get("room");
      setRoomInput((queryRoom ?? defaultRoom).toUpperCase());
    } else {
      setRoomInput(defaultRoom);
    }
  }, []);

  useEffect(() => {
 const socket = io("https://tic-tac-socket.up.railway.app", {
  transports: ["websocket"], // skip polling
});

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnectionMessage("Connected. Enter a room to start playing.");
      setErrorMessage(null);
    });

    socket.on("joinedRoom", ({ roomId: incomingRoomId, symbol: playerSymbol, players }) => {
      resetLocalGameState();
      setJoinError(null);
      setHasJoinedRoom(true);
      setRoomId(incomingRoomId);
      setSymbol(playerSymbol);
      symbolRef.current = playerSymbol;
      setConnectionMessage(`Joined room ${incomingRoomId.toUpperCase()}. Waiting for opponent…`);
      const opponentSymbol = playerSymbol === "X" ? "O" : "X";
      setOpponentId(players?.[opponentSymbol] ?? null);
      setOpponentReady(Boolean(players?.X && players?.O));
    });

    socket.on("waitingForPlayer", (state) => {
      setJoinError(null);
      setErrorMessage(null);
      setConnectionMessage("Waiting for another player to join…");
      setOpponentReady(false);
      if (state?.roomId) {
        setRoomId(state.roomId);
      }
      if (state?.board) {
        setBoard(state.board);
      }
      if (typeof state?.turn === "string") {
        setTurn(state.turn);
      }
      setWinner(state?.winner ?? null);
      setWinningLine(state?.winningLine ?? null);
      setLastMove(typeof state?.lastMove === "number" ? state.lastMove : null);
      const mySymbol = symbolRef.current;
      if (mySymbol) {
        const opponentSymbol = mySymbol === "X" ? "O" : "X";
        setOpponentId(state?.players?.[opponentSymbol] ?? null);
      }
    });

    socket.on("start-game", (state) => {
      setJoinError(null);
      setErrorMessage(null);
      setConnectionMessage("Game started!");
      if (state?.roomId) {
        setRoomId(state.roomId);
      }
      setBoard(state.board);
      setTurn(state.turn);
      setWinner(state.winner);
      setWinningLine(state.winningLine);
      setLastMove(typeof state.lastMove === "number" ? state.lastMove : null);
      setOpponentReady(true);
      setRematchRequested(false);
      setRematchOffer(false);
      const mySymbol = symbolRef.current;
      if (mySymbol) {
        const opponentSymbol = mySymbol === "X" ? "O" : "X";
        setOpponentId(state.players?.[opponentSymbol] ?? null);
      }
    });

    socket.on("gameState", (state) => {
      if (state?.roomId) {
        setRoomId(state.roomId);
      }
      setBoard(state.board);
      setTurn(state.turn);
      setWinner(state.winner);
      setWinningLine(state.winningLine);
      setLastMove(typeof state.lastMove === "number" ? state.lastMove : null);
      const mySymbol = symbolRef.current;
      if (mySymbol) {
        const opponentSymbol = mySymbol === "X" ? "O" : "X";
        setOpponentId(state.players?.[opponentSymbol] ?? null);
        setOpponentReady(Boolean(state.players?.X && state.players?.O));
      }
    });

    socket.on("gameError", (message) => {
      setErrorMessage(message);
      setConnectionMessage(message);
    });

    socket.on("roomJoinError", (message) => {
      setJoinError(message);
      setConnectionMessage(message);
    });

    socket.on("opponentLeft", () => {
      setConnectionMessage("Opponent left the room. Waiting for another player…");
      setOpponentReady(false);
      setRematchOffer(false);
      setRematchRequested(false);
    });

    socket.on("rematchRequested", () => {
      setRematchOffer(true);
      setConnectionMessage("Opponent requested a rematch.");
    });

    socket.on("disconnect", () => {
      setConnectionMessage("Disconnected. Attempting to reconnect…");
      setOpponentReady(false);
      setHasJoinedRoom(false);
      setSymbol(null);
      symbolRef.current = null;
    });

    socket.on("connect_error", (err) => {
      setConnectionMessage("Connection error. Retrying…");
      setErrorMessage(err?.message ?? "Unknown connection error.");
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, []);

  const isMyTurn = useMemo(() => {
    return Boolean(
      hasJoinedRoom && symbol && turn === symbol && !winner && opponentReady
    );
  }, [hasJoinedRoom, symbol, turn, winner, opponentReady]);

  const statusText = useMemo(() => {
    if (joinError) {
      return joinError;
    }
    if (errorMessage) {
      return errorMessage;
    }
    if (!hasJoinedRoom) {
      return connectionMessage;
    }
    if (!opponentReady) {
      return connectionMessage;
    }
    if (winner === "draw") {
      return "Game ended in a draw.";
    }
    if (winner) {
      return winner === symbol ? "You win! 🎉" : "You lose. 😞";
    }
    if (isMyTurn) {
      return "Your move.";
    }
    return "Waiting for opponent…";
  }, [
    connectionMessage,
    errorMessage,
    hasJoinedRoom,
    joinError,
    opponentReady,
    winner,
    symbol,
    isMyTurn
  ]);

  const shareText = useMemo(() => {
    if (roomId) {
      return `Room: ${roomId.toUpperCase()}`;
    }
    return null;
  }, [roomId]);

  const handleSelectCell = (index) => {
    if (!isMyTurn || !socketRef.current || !roomId) {
      return;
    }
    socketRef.current.emit("playerMove", { roomId, index });
  };

  const handleJoinRoom = () => {
    if (!socketRef.current) {
      return;
    }
    if (!socketRef.current.connected) {
      setJoinError("Connecting to server. Try again in a moment.");
      return;
    }
    const trimmed = roomInput.trim();
    if (!trimmed) {
      setJoinError("Room ID is required.");
      return;
    }
    setJoinError(null);
    setErrorMessage(null);
    resetLocalGameState();
    setHasJoinedRoom(false);
    setSymbol(null);
    symbolRef.current = null;
    setOpponentId(null);
    setOpponentReady(false);
    setRoomId(null);
    setConnectionMessage(`Joining room ${trimmed.toUpperCase()}…`);

      console.log("[client] joining new room", { trimmed });
    socketRef.current.emit("joinRoom", { roomId: trimmed });
  };

  const handleRequestRematch = () => {
    if (!socketRef.current || !roomId) {
      return;
    }
    socketRef.current.emit("requestRematch");
    setRematchRequested(true);
    setConnectionMessage("Rematch requested. Waiting for opponent…");
  };

  const handleAcceptRematch = () => {
    if (!socketRef.current || !roomId) {
      return;
    }
    socketRef.current.emit("acceptRematch");
    setRematchOffer(false);
    setConnectionMessage("Rematch accepted! Game restarting…");
  };

  const handleFindNewMatch = () => {
    if (!socketRef.current) {
      return;
    }
    const newRoom = generateRoomId();
    setRoomInput(newRoom);
    setJoinError(null);
    setErrorMessage(null);
    if (roomId) {
      socketRef.current.emit("leaveRoom");
    }
    resetLocalGameState();
    setHasJoinedRoom(false);
    setSymbol(null);
    symbolRef.current = null;
    setOpponentId(null);
    setOpponentReady(false);
    setRoomId(null);
    setConnectionMessage(`Creating fresh room ${newRoom}…`);

  
    socketRef.current.emit("joinRoom", { roomId: newRoom });
  };

  const handleRoomInputChange = (event) => {
    const value = event.target.value.toUpperCase().replace(/\s+/g, "-");
    setRoomInput(value);
  };

  const handleRoomInputKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleJoinRoom();
    }
  };

  return (
    <>
      <Head>
        <title>Realtime Tic Tac Toe</title>
        <meta
          name="description"
          content="Play real-time multiplayer Tic Tac Toe with friends on the web."
        />
      </Head>
      <main className="flex min-h-screen flex-col bg-slate-950 px-4 py-10 text-slate-100 md:px-0">
        <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center gap-8">
          <header className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Real-time Tic Tac Toe
            </h1>
            <p className="text-sm text-slate-400 md:text-base">
              Join a shared room with a friend, take turns in real-time, and request instant rematches.
            </p>
          </header>

          <section className="flex w-full flex-col gap-6 rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl shadow-slate-900/40 backdrop-blur md:flex-row md:items-start md:justify-between">
            <div className="flex flex-col items-center gap-6 md:w-2/3">
              <div className="w-full rounded-2xl border border-slate-800 bg-slate-950/70 p-5 text-center">
                <p className="text-lg font-semibold text-slate-200 md:text-xl">
                  {statusText}
                </p>
                {symbol && (
                  <p className="mt-2 text-sm uppercase tracking-wide text-slate-500">
                    You are playing as{" "}
                    <span
                      className={
                        symbol === "X" ? "font-bold text-emerald-400" : "font-bold text-sky-400"
                      }
                    >
                      {symbol}
                    </span>
                  </p>
                )}
                {shareText && (
                  <p className="mt-1 text-xs text-slate-500">
                    {shareText}
                  </p>
                )}
              </div>
              <GameBoard
                board={board}
                onSelectCell={handleSelectCell}
                isDisabled={!isMyTurn}
                winningLine={winningLine}
                lastMove={lastMove}
              />
            </div>
            <aside className="flex w-full flex-col gap-4 md:w-1/3">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500">
                  Match
                </h2>
                <ul className="mt-3 space-y-2 text-sm text-slate-300">
                  <li>
                    <span className="text-slate-500">Room</span>:{" "}
                    {roomId ? roomId.toUpperCase() : "—"}
                  </li>
                  <li>
                    <span className="text-slate-500">Opponent</span>:{" "}
                    {opponentReady && opponentId
                      ? opponentId
                      : hasJoinedRoom
                        ? "Waiting…"
                        : "—"}
                  </li>
                  <li>
                    <span className="text-slate-500">Your turn</span>:{" "}
                    {isMyTurn ? "Yes" : "No"}
                  </li>
                  <li>
                    <span className="text-slate-500">Winner</span>:{" "}
                    {winner ? (winner === "draw" ? "Draw" : winner) : "—"}
                  </li>
                </ul>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500">
                  Actions
                </h2>
                <div className="mt-3 flex flex-col gap-3">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Room ID
                    </label>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        value={roomInput}
                        onChange={handleRoomInputChange}
                        onKeyDown={handleRoomInputKeyDown}
                        placeholder="Enter room code"
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                      />
                      <button
                        type="button"
                        onClick={handleJoinRoom}
                        className="w-full rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 sm:w-auto"
                      >
                        Join room
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleFindNewMatch}
                    className="w-full rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-700"
                  >
                    Find new match
                  </button>
                  <button
                    type="button"
                    onClick={handleRequestRematch}
                    disabled={!winner || rematchRequested}
                    className="w-full rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-500/40 disabled:text-slate-300"
                  >
                    {rematchRequested ? "Rematch requested" : "Request rematch"}
                  </button>
                  {rematchOffer && (
                    <button
                      type="button"
                      onClick={handleAcceptRematch}
                      className="w-full rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
                    >
                      Accept opponent rematch
                    </button>
                  )}
                </div>
              </div>
            </aside>
          </section>

          <footer className="pb-4 text-center text-xs text-slate-500">
            Destiny games
          </footer>
        </div>
      </main>
    </>
  );
}
