"use client";

import React, { useState, useEffect } from "react";

// CSS to hide the up/down arrows AND make scrollbars invisible
const hideSpinnersCSS = `
  input::-webkit-outer-spin-button,
  input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  input[type=number] {
    -moz-appearance: textfield;
  }
  /* Make scrollbar invisible but still functional */
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
`;

const checkWin = (board: (string | null)[][], row: number, col: number) => {
  const symbol = board[row][col];
  if (!symbol) return null;
  const size = 8;
  const directions = [
    { name: "H", delta: [0, 1] }, { name: "V", delta: [1, 0] },
    { name: "D1", delta: [1, 1] }, { name: "D2", delta: [1, -1] },
  ];
  for (const { delta } of directions) {
    let winningCells = [[row, col]];
    const [dr, dc] = delta;
    for (const factor of [1, -1]) {
      let r = row + dr * factor;
      let c = col + dc * factor;
      while (r >= 0 && r < size && c >= 0 && c < size && board[r][c] === symbol) {
        winningCells.push([r, c]);
        r += dr * factor;
        c += dc * factor;
      }
    }
    if (winningCells.length >= 5) return winningCells;
  }
  return null;
};

export default function GomokuPage() {
  const [players, setPlayers] = useState({ X: "", O: "" });
  
  const [durationInput, setDurationInput] = useState({ min: "3", sec: "0" }); 
  const [gameDuration, setGameDuration] = useState(180);
  
  const [scores, setScores] = useState({ X: 0, O: 0 });
  const [gameState, setGameState] = useState<"setup" | "playing" | "timesup" | "ended">("setup");
  const [canClickEnd, setCanClickEnd] = useState(false);
  const [board, setBoard] = useState<(string | null)[][]>(Array(8).fill(null).map(() => Array(8).fill(null)));
  const [turn, setTurn] = useState<"X" | "O">("X");
  const [winningLine, setWinningLine] = useState<number[][] | null>(null);
  
  const [timeLeft, setTimeLeft] = useState(180);
  const [timerActive, setTimerActive] = useState(false);

  // FEATURE: Turn Timer State
  const [turnTimeLeft, setTurnTimeLeft] = useState(3);

  const [showRules, setShowRules] = useState(false);

  useEffect(() => {
    if (gameState === "setup") {
      const m = parseInt(durationInput.min) || 0;
      const s = parseInt(durationInput.sec) || 0;
      const totalSeconds = (m * 60) + s;
      setGameDuration(totalSeconds);
      setTimeLeft(totalSeconds);
      setCanClickEnd(false);
    }
  }, [durationInput, gameState]);

  useEffect(() => {
    let interval: any;
    if (timerActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    } else if (timeLeft === 0 && gameState === "playing") {
      setTimerActive(false);
      setGameState("timesup"); 
      
      setTimeout(() => {
        setGameState("ended");
        setTimeout(() => {
          setCanClickEnd(true);
        }, 3000);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [timerActive, timeLeft, gameState]);

  // FEATURE: Turn Timer Logic (3 seconds)
  useEffect(() => {
    let turnInterval: any;
    if (gameState === "playing" && timerActive) {
      turnInterval = setInterval(() => {
        setTurnTimeLeft((prev) => {
          if (prev <= 1) {
            // Time is up! Add point to opponent
            const opponent = turn === "X" ? "O" : "X";
            setScores(s => ({ ...s, [opponent]: s[opponent] + 1 }));
            
            // Logic: Do NOT switch turn, just reset the 3s clock for the same player
            return 3; 
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(turnInterval);
  }, [gameState, timerActive, turn]);

  const handleMove = (r: number, c: number) => {
    if (board[r][c] || winningLine || gameState !== "playing") return;
    if (!timerActive && timeLeft > 0) setTimerActive(true);

    // Reset turn timer on successful move
    setTurnTimeLeft(3);

    const newBoard = board.map(row => [...row]);
    newBoard[r][c] = turn;
    setBoard(newBoard);

    const win = checkWin(newBoard, r, c);
    if (win) {
      setWinningLine(win);
      setScores(prev => ({ ...prev, [turn]: prev[turn] + 1 }));
      const starter = turn === "X" ? "O" : "X";
      setTimeout(() => {
        setBoard(Array(8).fill(null).map(() => Array(8).fill(null)));
        setWinningLine(null);
        setTurn(starter);
        setTurnTimeLeft(3); // Reset timer for new round
      }, 2000);
    } else {
      if (newBoard.flat().every(cell => cell !== null)) {
        setTimeout(() => {
          setBoard(Array(8).fill(null).map(() => Array(8).fill(null)));
          setTurn(turn === "X" ? "O" : "X");
          setTurnTimeLeft(3);
        }, 1000);
      } else {
        setTurn(turn === "X" ? "O" : "X");
      }
    }
  };

  const restartFullGame = () => {
    if (gameState === "ended" && !canClickEnd) return; 
    setGameState("setup");
    setScores({ X: 0, O: 0 });
    setTimeLeft(gameDuration);
    setTurnTimeLeft(3);
    setTimerActive(false);
    setBoard(Array(8).fill(null).map(() => Array(8).fill(null)));
    setWinningLine(null);
    setTurn("X");
    setShowRules(false);
  };

  const getOverallWinner = () => {
    if (scores.X > scores.O) return { name: players.X, symbol: "X" };
    if (scores.O > scores.X) return { name: players.O, symbol: "O" };
    return { name: "DRAW", symbol: null };
  };

  const overallWinner = getOverallWinner();

  if (gameState === "setup") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#002b5c] px-4 py-8">
        <style>{hideSpinnersCSS}</style>

        {showRules && (
          <div 
            className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm transition-opacity"
            onClick={() => { setGameState("playing"); setShowRules(false); }}
          >
            <div 
              className="bg-[#004080] border-4 border-yellow-400 p-6 md:p-8 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl relative no-scrollbar"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl md:text-3xl font-black text-yellow-400 mb-6 text-center">📜 GAME RULES</h2>
              <div className="space-y-4 text-blue-50 text-sm md:text-base text-left">
                <p className="bg-red-500/20 p-2 rounded border border-red-500/50 text-red-200"><strong>🔥 SPEED FEATURE:</strong> You have only 3 seconds to move! If you fail, the opponent gets +1 point automatically, but it remains your turn.</p>
                <p><strong>2. Objective</strong><br/>Be the player with the highest score when the match timer ends. You earn points by connecting: 5 of your symbols in a row.</p>
                <p><strong> 3. Board Layout</strong><br/>The board is an 8×8 grid. Players take turns placing one symbol per move. A symbol cannot be placed on an occupied cell.</p>
                <p><strong> 4. Turn System</strong><br/>Player ✕ starts first. Players alternate turns automatically. After each round (win or draw), the starting player switches for fairness.</p>
                <p><strong> 5. How to Win a Round</strong><br/>A round is won when a player connects 5 consecutive symbols in any of the following directions: Horizontally ➡, Vertically ⬇, and Diagonally ↘. The winning line is highlighted, the player earns +1 point, and the board resets automatically.</p>
                <p><strong> 6. Draw Round</strong><br/>If the board fills completely and no player connects 5 symbols: The round ends in a draw, no points awarded, and the board resets.</p>
                <p><strong> 7. Match Timer</strong><br/>The match lasts the time you set. The timer starts on the first move. Multiple rounds can occur within the time limit.</p>
                <p><strong> 8. Final Victory</strong><br/>When the timer reaches 0: The player with the higher score wins the match. If equal, it is a DRAW. Final results are displayed on screen.</p>
              </div>
              <button 
                onClick={() => { setGameState("playing"); setShowRules(false); }}
                className="mt-8 w-full py-4 bg-yellow-400 text-[#002b5c] font-black rounded-xl hover:bg-yellow-300 transition-all shadow-lg"
              >
                GOT IT!
              </button>
            </div>
          </div>
        )}

        <h1 className="text-4xl md:text-5xl font-black text-center mb-10 text-white tracking-tighter italic leading-none drop-shadow-lg">
          CROSSWAY <br /> 
          <span className="text-yellow-400 text-2xl md:text-3xl not-italic tracking-normal">TIC-TAC-TOE</span>
        </h1>

        <div className="bg-[#004080] p-6 md:p-8 rounded-3xl shadow-2xl w-full max-w-md border-4 border-[#0059b3]">
          <p className="text-center text-blue-200 font-bold mb-6 uppercase tracking-widest text-sm">Game Setup</p>
          <div className="space-y-5">
            <input 
              className="w-full p-4 bg-[#00264d] border-2 border-blue-400 text-white rounded-xl outline-none placeholder:text-blue-300/50"
              placeholder="Player 1 Name (X)"
              value={players.X}
              onChange={(e) => setPlayers(p => ({...p, X: e.target.value}))}
            />
            <input 
              className="w-full p-4 bg-[#00264d] border-2 border-red-400 text-white rounded-xl outline-none placeholder:text-red-300/50"
              placeholder="Player 2 Name (O)"
              value={players.O}
              onChange={(e) => setPlayers(p => ({...p, O: e.target.value}))}
            />

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-blue-300 text-xs font-bold uppercase mb-2 block">Minutes</label>
                <input 
                  type="number"
                  value={durationInput.min}
                  placeholder="0"
                  className="w-full p-4 bg-[#00264d] border-2 border-yellow-400/50 text-white rounded-xl outline-none appearance-none"
                  onChange={(e) => setDurationInput(d => ({...d, min: e.target.value}))}
                />
              </div>
              <div className="flex-1">
                <label className="text-blue-300 text-xs font-bold uppercase mb-2 block">Seconds</label>
                <input 
                  type="number"
                  value={durationInput.sec}
                  placeholder="0"
                  className="w-full p-4 bg-[#00264d] border-2 border-yellow-400/50 text-white rounded-xl outline-none appearance-none"
                  onChange={(e) => setDurationInput(d => ({...d, sec: e.target.value}))}
                />
              </div>
            </div>

            <button 
              disabled={!players.X.trim() || !players.O.trim() || gameDuration === 0}
              onClick={() => setShowRules(true)}
              className="w-full py-5 bg-yellow-400 hover:bg-yellow-300 disabled:bg-slate-500 text-[#002b5c] font-black rounded-xl shadow-lg transition-all active:scale-95 text-lg"
            >
              START BATTLE
            </button>
          </div>
        </div>
      </div>
    );
  }

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <main className="min-h-screen bg-[#002b5c] flex flex-col items-center justify-center py-6 md:py-12 px-2 md:px-4 select-none relative overflow-x-hidden">
      
      {gameState === "timesup" && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none">
           <h2 className="text-6xl md:text-9xl font-black text-yellow-400 drop-shadow-[0_0_30px_rgba(250,204,21,0.8)] italic animate-bounce">
             TIMES UP!
           </h2>
        </div>
      )}

      {gameState === "ended" && (
        <div 
          onClick={restartFullGame} 
          className={`fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md px-4 transition-all duration-500 ${canClickEnd ? "cursor-pointer" : "cursor-default pointer-events-none"}`}
        >
          <div className="bg-[#004080] border-4 md:border-8 border-yellow-400 p-8 md:p-12 rounded-[2rem] md:rounded-[3rem] text-center shadow-[0_0_100px_rgba(250,204,21,0.3)] w-full max-w-sm md:max-w-md">
            <h2 className="text-blue-200 text-xl md:text-2xl font-black uppercase tracking-[0.3em] mb-4">Final Results</h2>
            <div className="flex items-center justify-center gap-8 mb-8">
                <div className="text-center">
                    <p className="text-white text-3xl md:text-4xl font-black break-words">
                        {overallWinner.name === "DRAW" ? "DRAW" : overallWinner.name}
                    </p>
                    <p className="text-yellow-400 text-lg md:text-xl font-bold uppercase">
                        {overallWinner.name === "DRAW" ? " " : "Winner"}
                    </p>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4 bg-[#00264d] p-4 md:p-6 rounded-2xl mb-10">
               <div>
                  <p className="text-blue-300 text-[10px] md:text-xs font-bold uppercase truncate">X - {players.X}</p>
                  <p className="text-white text-2xl md:text-3xl font-black">{scores.X}</p>
               </div>
               <div>
                  <p className="text-red-400 text-[10px] md:text-xs font-bold uppercase truncate">O - {players.O}</p>
                  <p className="text-white text-2xl md:text-3xl font-black">{scores.O}</p>
               </div>
            </div>
            <p className={`text-yellow-400 font-bold text-base md:text-lg transition-opacity duration-300 ${canClickEnd ? "animate-pulse opacity-100" : "opacity-0"}`}>
              Click anywhere to restart battle
            </p>
          </div>
        </div>
      )}

      <header className="mb-4 md:mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-black text-white tracking-tighter italic leading-none drop-shadow-lg">
          CROSSWAY <span className="text-yellow-400 text-xl md:text-2xl not-italic block md:inline-block">TIC-TAC-TOE</span>
        </h1>
      </header>

      {/* Main Game Timer */}
      <div className="relative md:absolute md:top-8 md:left-8 mb-6 md:mb-0 bg-[#d9e6f2] text-[#002b5c] px-6 py-2 rounded-full font-black text-xl md:text-2xl shadow-lg border-2 border-white flex flex-col items-center">
        <span className="text-xs uppercase opacity-50 leading-none mb-1">Match Time</span>
        {formatTime(timeLeft)}
      </div>

      <div className="flex flex-col lg:flex-row items-center justify-center gap-6 md:gap-12 w-full max-w-7xl mt-4">
        
        <div className={`flex flex-row lg:flex-col items-center transition-all duration-300 ${turn === 'O' ? 'scale-105 opacity-100' : 'opacity-40 scale-95'}`}>
          <div className="bg-[#004080] p-4 md:p-6 rounded-2xl md:rounded-3xl border-2 md:border-4 border-[#0059b3] shadow-xl flex flex-col items-center min-w-[120px] md:min-w-[160px]">
            <div className="w-12 h-12 md:w-20 md:h-20 rounded-full border-[6px] md:border-[10px] border-red-600 mb-2 md:mb-4 flex items-center justify-center">
               <div className="w-6 h-6 md:w-10 md:h-10 rounded-full border-[6px] md:border-[10px] border-red-600 opacity-50"></div>
            </div>
            <p className="text-white font-black text-base md:text-xl mb-1 truncate max-w-[100px] md:max-w-[140px]">{players.O}</p>
            <p className="text-blue-200 font-bold text-sm md:text-base">{scores.O} win</p>
          </div>
          {turn === 'O' && (
            <div className="mt-4 text-center">
              <p className="text-white font-black text-xl tracking-wide animate-pulse">Your turn</p>
              <p className="text-red-400 font-black text-3xl">{turnTimeLeft}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-8 gap-1 md:gap-2 p-1.5 md:p-3 bg-[#004080] rounded-xl md:rounded-2xl border-4 border-[#0059b3] shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          {board.map((row, rIdx) => row.map((cell, cIdx) => {
            const isWinning = winningLine?.some(([wr, wc]) => wr === rIdx && wc === cIdx);
            return (
              <button
                key={`${rIdx}-${cIdx}`}
                onClick={() => handleMove(rIdx, cIdx)}
                className={`
                  w-[min(10.5vw,3.5rem)] h-[min(10.5vw,3.5rem)] flex items-center justify-center rounded-md md:rounded-xl transition-all duration-150
                  ${!cell && gameState === "playing" ? "bg-[#0059b3] hover:bg-[#006bd6]" : "bg-[#0059b3]"}
                  ${isWinning ? "bg-yellow-400 scale-110 z-10 shadow-[0_0_20px_#facc15]" : ""}
                `}
              >
                {cell === "X" && (
                  <span className={`text-2xl md:text-4xl lg:text-5xl font-black ${isWinning ? "text-indigo-900" : "text-yellow-400"}`}>✕</span>
                )}
                {cell === "O" && (
                  <div className={`w-5 h-5 md:w-8 md:h-8 lg:w-10 lg:h-10 rounded-full border-[4px] md:border-[6px] lg:border-[8px] ${isWinning ? "border-indigo-900" : "border-red-600"}`}></div>
                )}
              </button>
            );
          }))}
        </div>

        <div className={`flex flex-row lg:flex-col items-center transition-all duration-300 ${turn === 'X' ? 'scale-105 opacity-100' : 'opacity-40 scale-95'}`}>
          <div className="bg-[#004080] p-4 md:p-6 rounded-2xl md:rounded-3xl border-2 md:border-4 border-[#0059b3] shadow-xl flex flex-col items-center min-w-[120px] md:min-w-[160px]">
            <span className="text-4xl md:text-7xl font-black text-yellow-400 mb-2 md:mb-4 drop-shadow-lg leading-none">✕</span>
            <p className="text-white font-black text-base md:text-xl mb-1 truncate max-w-[100px] md:max-w-[140px]">{players.X}</p>
            <p className="text-blue-200 font-bold text-sm md:text-base">{scores.X} win</p>
          </div>  
          {turn === 'X' && (
            <div className="mt-4 text-center">
              <p className="text-white font-black text-xl tracking-wide animate-pulse">Your turn</p>
              <p className="text-yellow-400 font-black text-3xl">{turnTimeLeft}</p>
            </div>
          )}
        </div>

      </div>

      <button 
        onClick={restartFullGame}
        className="mt-8 md:mt-16 text-blue-300/40 hover:text-red-400 font-bold text-[10px] md:text-xs uppercase tracking-[0.3em] transition-all"
      >
        Quit & Reset
      </button>
    </main>
  );
}