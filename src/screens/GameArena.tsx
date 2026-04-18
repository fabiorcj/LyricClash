import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import YouTube from "react-youtube";
import socketManager from "../services/socket";
import { calculatePhraseAccuracy } from "../utils/fuzzyMatch";
import { useParams, useNavigate } from "react-router-dom";
import songsData from "../data/songs.json";

type GameState =
  | "idle"
  | "countdown"
  | "playing"
  | "typing"
  | "waiting_for_others"
  | "revealing"
  | "success";

interface SongLyric {
  time: number;
  text: string;
}

export default function GameArena() {
  const { roomId, username, songId } = useParams();
  const navigate = useNavigate();

  const [gameState, setGameState] = useState<GameState>("idle");
  const [countdownValue, setCountdownValue] = useState(3);
  const [gapInputs, setGapInputs] = useState<{ [key: number]: string }>({});
  const [lastAccuracy, setLastAccuracy] = useState<{
    percentage: number;
    points: number;
  } | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [hasVotedRepeat, setHasVotedRepeat] = useState(false);
  const [repeatVotes, setRepeatVotes] = useState({ current: 0, total: 0 });
  const [player, setPlayer] = useState<any | null>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);

  const [liveScoreboard, setLiveScoreboard] = useState<any>({});
  const [roomDifficulty, setRoomDifficulty] = useState("medium");
  const [currentLineIndex, setCurrentLineIndex] = useState(0);

  // Limpeza dinâmica do ID (remove parâmetros extras como &list=...)
  const cleanSongId = songId?.split(/[?&]/)[0] || "_dK2tDK9grQ";
  const songData = (songsData as any)[cleanSongId];
  const songLyrics: SongLyric[] = songData?.lyrics || [];

  const handleLeave = () => {
    socketManager.disconnect();
    navigate("/");
  };

  useEffect(() => {
    socketManager.connect();
    const timer = setTimeout(() => {
      socketManager.joinRoom(
        roomId || "GLOBAL",
        username || "Convidado",
        undefined,
      );

      socketManager.socket?.on("room_state_update", (roomData) => {
        setLiveScoreboard(roomData.players || {});
        if (roomData.difficulty) setRoomDifficulty(roomData.difficulty);
      });

      socketManager.socket?.on("game_forcing_return", () => {
        navigate(`/room/${roomId}/${encodeURIComponent(username || "")}`);
      });

      socketManager.socket?.on("all_players_ready", () => {
        setGameState("countdown");
        setCountdownValue(3);
      });

      socketManager.socket?.on("start_reveal_phase", () => {
        setGameState("revealing");
      });

      socketManager.socket?.on("repeat_vote_update", ({ currentVotes, totalPlayers }) => {
        setRepeatVotes({ current: currentVotes, total: totalPlayers });
      });
    }, 300);

    return () => {
      socketManager.socket?.off("room_state_update");
      socketManager.socket?.off("game_forcing_return");
      socketManager.socket?.off("all_players_ready");
      socketManager.socket?.off("start_reveal_phase");
      socketManager.socket?.off("repeat_vote_update");
      clearTimeout(timer);
    };
  }, [roomId, username, navigate]);

  // Efeito isolado para a execução da repetição (precisa do player e currentLineIndex atualizados)
  useEffect(() => {
    const handleExecuteRepeat = () => {
      if (!player) return;
      
      const startTime = songLyrics[currentLineIndex]?.time || 0;
      const globalOffset = songData.offset || 0;
      
      console.log(`🎬 Repetindo verso: Voltando para ${startTime + globalOffset}s`);
      
      player.seekTo(Math.max(0, startTime + globalOffset), true);
      player.playVideo();
      
      setGapInputs({});
      setHasVotedRepeat(false);
      setRepeatVotes({ current: 0, total: 0 });
      setGameState("playing");
    };

    socketManager.socket?.on("execute_repeat_verse", handleExecuteRepeat);
    return () => {
      socketManager.socket?.off("execute_repeat_verse", handleExecuteRepeat);
    };
  }, [player, currentLineIndex, songLyrics, songData.offset]);

  // Motor Gráfico do Contador de Largada
  useEffect(() => {
    let cT: any;
    if (gameState === "countdown") {
      if (countdownValue > 0) {
        cT = setTimeout(() => setCountdownValue((prev) => prev - 1), 1000);
      } else {
        setGameState("playing");
        if (player) {
          player.seekTo(0);
          player.playVideo();
        }
      }
    }
    return () => clearTimeout(cT);
  }, [gameState, countdownValue, player]);

  useEffect(() => {
    let interval: any;
    if (
      gameState === "playing" &&
      player &&
      currentLineIndex < songLyrics.length
    ) {
      interval = setInterval(async () => {
        const currentTime = await player.getCurrentTime();
        const globalOffset = songData.offset || 0;

        let targetTime = 0;
        if (currentLineIndex < songLyrics.length - 1) {
          targetTime = songLyrics[currentLineIndex + 1].time + globalOffset;
        } else {
          targetTime = songLyrics[currentLineIndex].time + globalOffset + 4.0;
        }

        if (currentTime >= targetTime + 0.15) {
          player.pauseVideo();
          setGapInputs({});
          setGameState("typing");
        }
      }, 100);
    }
    return () => clearInterval(interval);
  }, [gameState, player, currentLineIndex, songLyrics, songData.offset]);

  // Lógica de Processamento de Palavras (Gaps)
  const getProcessedWords = () => {
    // Garante no mínimo 1 gap, a menos que a frase seja vazia ou sem música
    if (!songLyrics[currentLineIndex]) return [];
    
    const words = songLyrics[currentLineIndex].text.split(/\s+/);

    let gapRatio = 0.2;
    if (roomDifficulty === "medium") gapRatio = 0.5;
    if (roomDifficulty === "hard") gapRatio = 0.8;
    if (roomDifficulty === "expert") gapRatio = 1.0;

    // Garante no mínimo 1 gap, a menos que a frase seja vazia
    const numGaps = Math.max(
      1,
      Math.min(words.length, Math.floor(words.length * gapRatio)),
    );

    // Gerar uma lista de índices disponíveis
    const indices = words.map((_, i) => i);

    // Embaralhar os índices deterministicamente baseado na semente da linha
    // Isso garante que todos os players vejam os mesmos gaps
    let seed = currentLineIndex + (songId?.length || 0);

    // Adicionamos o peso da dificuldade na semente para variar os gaps entre níveis
    if (roomDifficulty === "easy") seed += 10;
    if (roomDifficulty === "medium") seed += 20;
    if (roomDifficulty === "hard") seed += 30;

    for (let i = indices.length - 1; i > 0; i--) {
      // Gerador Linear Congruencial simples para estabilidade
      seed = (seed * 9301 + 49297) % 233280;
      const j = Math.floor((seed / 233280) * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    // Selecionamos exatamente N índices para serem gaps
    const gapIndices = indices.slice(0, numGaps);

    return words.map((word, idx) => {
      const cleanWord = word.replace(/[.,!?;:()]/g, "");
      const isGap = gapIndices.includes(idx);

      return {
        original: word,
        clean: cleanWord,
        isGap,
        index: idx,
      };
    });
  };

  const processedWords = getProcessedWords();

  // Auto-focus no primeiro gap ao entrar no modo de digitação
  useEffect(() => {
    if (gameState === "typing") {
      const firstGap = processedWords.findIndex((p) => p.isGap);
      if (firstGap !== -1) {
        setTimeout(() => {
          const el = document.getElementById(`gap-${firstGap}`);
          el?.focus();
        }, 100);
      }
    }
  }, [gameState, currentLineIndex]);

  useEffect(() => {
    if (gameState === "typing" || gameState === "playing") {
      activeLineRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [currentLineIndex, gameState]);

  const onPlayerReady = (event: any) => setPlayer(event.target);

  const submitPhrase = () => {
    if (gameState !== "typing") return;

    const targetPhrase = songLyrics[currentLineIndex].text;

    // Reconstrói a frase final combinando palavras fixas e inputs do usuário
    const reconstructedPhrase = processedWords
      .map((pw) => {
        if (!pw.isGap) return pw.original;
        return gapInputs[pw.index] || "";
      })
      .join(" ");

    const { accuracy } = calculatePhraseAccuracy(
      reconstructedPhrase,
      targetPhrase,
    );

    let minAccuracy = 30;
    if (roomDifficulty === "medium") minAccuracy = 50;
    if (roomDifficulty === "hard") minAccuracy = 70;
    if (roomDifficulty === "expert") minAccuracy = 90;

    const pointsEarned = accuracy >= minAccuracy ? accuracy : 0;
    setLastAccuracy({ percentage: accuracy, points: pointsEarned });

    socketManager.socket?.emit("word_completed", {
      roomId: roomId || "GLOBAL",
      payload: { points: pointsEarned, accuracy },
    });

    setGameState("waiting_for_others");
  };

  const sortedPlayers = Object.values(liveScoreboard).sort(
    (a: any, b: any) => b.score - a.score,
  );
  const currentPlayer = Object.values(liveScoreboard).find(
    (p: any) => p.username === username,
  ) as any;
  const isHost = currentPlayer?.isHost;
  const amIReady = currentPlayer?.isReady;

  // Efeito para avançar após a revelação (somente quando entrar em revealing)
  useEffect(() => {
    if (gameState === "revealing") {
      const timer = setTimeout(() => {
        if (currentLineIndex < songLyrics.length - 1) {
          setCurrentLineIndex((prev) => prev + 1);
          setGapInputs({});
          setGameState("playing");
          player?.playVideo();
        } else {
          setGameState("success");
          player?.playVideo();
        }
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [gameState, currentLineIndex, player, songLyrics.length]);

  // Novo Efeito Robusto para o Fim de Jogo
  useEffect(() => {
    if (gameState === "success") {
      const timer = setTimeout(() => {
        navigate("/results", { 
          state: { 
            scoreboard: sortedPlayers,
            roomId,
            username
          } 
        });
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [gameState, sortedPlayers, navigate]);


  return (
    <div className="relative flex flex-col w-full max-w-[1400px] mx-auto h-[95vh] sm:h-[90vh] bg-[#050505] rounded-none sm:rounded-[40px] overflow-hidden border-0 sm:border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.8)] transition-all duration-500 sm:my-auto ring-0 sm:ring-1 ring-white/5">
      <div className="h-[30%] sm:h-[45%] w-full bg-black flex items-center justify-center relative border-b border-white/10 overflow-hidden shadow-[0_10px_50px_rgba(0,0,0,0.5)] z-0">
        <div className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent opacity-100" />

        <YouTube
          videoId={cleanSongId}
          opts={{
            height: "1000%",
            width: "100%",
            playerVars: {
              autoplay: 0,
              controls: 0,
              disablekb: 1,
              modestbranding: 1,
              origin: window.location.origin,
            },
          }}
          onReady={onPlayerReady}
          onError={() => {
            setVideoError("O YouTube não permitiu carregar este vídeo (pode ser restrito ou excluído).");
          }}
          iframeClassName="w-full h-full absolute inset-0 object-cover scale-[1.5] opacity-40 mix-blend-screen filter contrast-125 saturate-150"
          className="w-full h-full pointer-events-none"
        />

        {videoError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-50 p-8 text-center">
            <div className="text-red-500 text-5xl mb-6">⚠️</div>
            <h2 className="text-white text-2xl font-black mb-4 uppercase">Erro de Carregamento</h2>
            <p className="text-gray-400 mb-8 max-w-md">{videoError}</p>
            <button 
              onClick={handleLeave}
              className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-all border border-white/10"
            >
              Voltar para o Lobby
            </button>
          </div>
        )}

        {gameState === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20 backdrop-blur-xl gap-8">
            {!amIReady ? (
              <button
                onClick={() =>
                  socketManager.socket?.emit("player_ready_arena", { roomId })
                }
                className="px-12 py-5 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-full font-black text-lg shadow-[0_0_40px_rgba(59,130,246,0.3)] hover:scale-105 active:scale-95 hover:shadow-[0_0_60px_rgba(59,130,246,0.6)] transition-all duration-300 tracking-[0.2em] flex items-center gap-3 uppercase"
              >
                ✅ ESTOU PRONTO
              </button>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(59,130,246,0.5)]" />
                <p className="text-blue-400 font-bold tracking-[0.3em] uppercase text-[10px] animate-pulse">
                  Aguardando Equipe...
                </p>
              </div>
            )}
          </div>
        )}

        {gameState === "countdown" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-30 backdrop-blur-xl">
            <motion.div
              key={countdownValue}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 2, opacity: 0 }}
              transition={{ duration: 0.5 }}
              className={`text-[120px] md:text-[200px] font-black drop-shadow-[0_0_100px_rgba(255,255,255,0.8)] ${countdownValue === 0 ? "text-emerald-400" : "text-white"}`}
            >
              {countdownValue > 0 ? countdownValue : "FIGHT!"}
            </motion.div>
            {countdownValue > 0 && (
              <p className="text-blue-400 font-bold uppercase tracking-[0.5em] mt-8 text-xl animate-pulse">
                Prepare seus ouvidos
              </p>
            )}
          </div>
        )}

        {/* HUD Ranking Flutuante (Estilo Broadcast) */}
        <div className="absolute top-4 right-4 sm:top-6 sm:right-8 z-30 flex flex-row sm:flex-col gap-2 sm:gap-3 max-w-[95%] sm:max-w-xs overflow-x-auto no-scrollbar pointer-events-none">
          {sortedPlayers.slice(0, 5).map((p: any, idx: number) => {
            const isMe = p.username === username;
            return (
              <motion.div
                key={p.username}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border backdrop-blur-xl shadow-2xl transition-all duration-500 whitespace-nowrap pointer-events-auto ${
                  isMe
                    ? "bg-emerald-500/10 border-emerald-500/40 shadow-emerald-500/10 ring-1 ring-emerald-500/20"
                    : "bg-black/30 border-white/5 opacity-90"
                }`}
              >
                <div
                  className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shadow-[0_0_8px_currentColor] ${idx === 0 ? "bg-yellow-400 text-yellow-400" : isMe ? "bg-emerald-400 text-emerald-400" : "bg-blue-400 text-blue-400"}`}
                />
                <div className="flex flex-col min-w-0">
                  <span className="text-[8px] sm:text-[9px] font-black text-white/40 uppercase tracking-tighter truncate max-w-[60px] sm:max-w-[100px]">
                    {p.username}
                  </span>
                  <span className="text-[10px] sm:text-[12px] font-black text-white -mt-0.5">
                    {p.score}{" "}
                    <span className="text-[7px] sm:text-[8px] opacity-30">
                      XP
                    </span>
                  </span>
                </div>
                {p.combo >= 2 && (
                  <span className="text-xs sm:text-sm animate-pulse">🔥</span>
                )}

                {isHost && isMe && (
                  <button
                    onClick={() =>
                      socketManager.socket?.emit("force_return_lobby", {
                        roomId,
                      })
                    }
                    className="ml-1 sm:ml-2 p-1 bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white rounded-md sm:rounded-lg transition-all border border-red-500/30"
                    title="Encerrar Partida"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>

        {gameState === "playing" && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-6 left-8 glass-panel px-6 py-3 rounded-full z-20 flex items-center gap-4"
          >
            <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
            <span className="text-gray-200 font-black uppercase tracking-[0.3em] text-[10px]">
              Aprecie e Memorize...
            </span>
          </motion.div>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-12 relative bg-gradient-to-b from-[#050505] to-[#0a0a0a] z-10 overflow-y-auto custom-scrollbar no-scrollbar scroll-smooth">
        <div className="absolute top-4 sm:top-6 w-full flex flex-col items-center sm:items-start justify-start px-6 sm:px-10 gap-2">
          <div className="flex flex-col sm:flex-row justify-between w-full gap-2">
            <div className="flex flex-col gap-2 items-center sm:items-start">
              <div className="px-4 sm:px-5 py-1.5 sm:py-2 rounded-full glass-panel flex items-center gap-2 w-fit text-[8px] sm:text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">
                Música:{" "}
                <span className="text-emerald-400 truncate max-w-[100px] sm:max-w-[150px]">
                  {songData.title}
                </span>
              </div>
              <button
                onClick={handleLeave}
                className="px-4 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-full text-[7px] sm:text-[9px] font-black tracking-[0.25em] uppercase transition-all duration-300 flex items-center gap-2 w-fit"
              >
                Abandonar Sala
              </button>
            </div>
            <div className="px-3 sm:px-4 py-1 sm:py-1.5 rounded-full glass-panel flex items-center gap-1.5 w-fit text-[7px] sm:text-[9px] text-gray-500 font-bold uppercase tracking-[0.1em]">
              Mínimo:{" "}
              <span className="text-blue-400 font-black">
                {roomDifficulty === "easy"
                  ? "30%"
                  : roomDifficulty === "medium"
                    ? "50%"
                    : roomDifficulty === "hard"
                      ? "70%"
                      : "90%"}
              </span>
            </div>
          </div>
        </div>

        {gameState === "idle" || gameState === "playing" ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-gray-600 font-medium text-lg tracking-[0.3em] uppercase text-center max-w-lg mt-8"
          >
            {gameState === "idle"
              ? "AGUARDANDO O START."
              : "SINTA O FLOW. A PAUSA É IMINENTE."}
          </motion.div>
        ) : gameState === "typing" ? (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full flex flex-col items-center max-w-5xl"
          >
            <div className="text-blue-400 font-bold tracking-[0.3em] uppercase mb-8 text-xs">
              Complete as lacunas do verso:
            </div>

            <div
              ref={activeLineRef}
              className="flex flex-wrap justify-center gap-x-2 sm:gap-x-4 gap-y-4 sm:gap-y-6 mb-10 leading-relaxed min-h-[120px] sm:min-h-[160px]"
            >
              {processedWords.map((pw, i) => (
                <div key={i} className="relative flex items-center">
                  {!pw.isGap ? (
                    <span className="text-2xl sm:text-4xl font-black text-white/40 select-none">
                      {pw.original}
                    </span>
                  ) : (
                    <input
                      autoFocus={i === processedWords.findIndex((p) => p.isGap)}
                      value={gapInputs[pw.index] || ""}
                      onChange={(e) =>
                        setGapInputs((prev) => ({
                          ...prev,
                          [pw.index]: e.target.value,
                        }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          // Ir para o próximo gap
                          const nextGap = processedWords.findIndex(
                            (p, idx) => p.isGap && idx > i,
                          );
                          if (nextGap !== -1) {
                            e.preventDefault();
                            const nextEl = document.getElementById(
                              `gap-${nextGap}`,
                            );
                            nextEl?.focus();
                          } else if (e.key === "Enter") {
                            submitPhrase();
                          }
                        }
                      }}
                      id={`gap-${pw.index}`}
                      placeholder="..."
                      className="bg-white/5 border-b-2 border-white/20 text-blue-400 text-2xl sm:text-4xl font-black px-2 sm:px-3 py-1 outline-none focus:border-blue-500 focus:bg-blue-500/10 transition-all text-center min-w-[60px] sm:min-w-[80px]"
                      style={{
                        width: `${Math.max(pw.clean.length * (window.innerWidth < 640 ? 18 : 25), 60)}px`,
                      }}
                      spellCheck="false"
                      autoComplete="off"
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mt-8">
              <button
                onClick={submitPhrase}
                className="px-16 py-5 border border-blue-500/50 bg-blue-600/20 hover:bg-blue-500 hover:text-black rounded-2xl font-black text-blue-400 shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:scale-105 active:scale-95 transition-all text-sm tracking-[0.3em] uppercase flex-1"
              >
                FINALIZAR VERSO (ENTER)
              </button>

              <button
                disabled={hasVotedRepeat}
                onClick={() => {
                  socketManager.socket?.emit("vote_repeat_segment", { roomId });
                  setHasVotedRepeat(true);
                }}
                className={`px-10 py-5 rounded-2xl font-black transition-all border flex items-center justify-center gap-3 text-xs tracking-[0.2em] uppercase ${
                  hasVotedRepeat 
                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400 opacity-60" 
                    : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 active:scale-95"
                }`}
                title="Pede para repetir o áudio do verso atual"
              >
                <span>{hasVotedRepeat ? "VOTADO" : "Repetir 🔁"}</span>
                {repeatVotes.total > 0 && (
                  <span className="bg-black/60 px-2 py-1 rounded-md">
                    {repeatVotes.current}/{repeatVotes.total}
                  </span>
                )}
              </button>
            </div>
          </motion.div>
        ) : gameState === "waiting_for_others" ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-6"
          >
            <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(52,211,153,0.3)]" />
            <p className="text-emerald-400 font-black tracking-[0.4em] uppercase text-sm animate-pulse">
              Aguardando o resto da equipe...
            </p>
            <div className="px-6 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <span className="text-white font-bold text-lg">Sucesso!</span>
              <span className="text-emerald-400 ml-2">Resposta enviada.</span>
            </div>

            {/* Sistema de Voto para Repetir (Modo Espera) */}
            <div className="mt-8 flex flex-col items-center gap-4">
              <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">
                Não ouviu direito? Peça repetição:
              </p>
              <button
                disabled={hasVotedRepeat}
                onClick={() => {
                  socketManager.socket?.emit("vote_repeat_segment", { roomId });
                  setHasVotedRepeat(true);
                }}
                className={`px-8 py-3 rounded-xl font-bold transition-all border flex items-center gap-3 ${
                  hasVotedRepeat 
                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400 opacity-60 cursor-not-allowed" 
                    : "bg-white/5 border-white/10 text-white hover:bg-white/10 active:scale-95"
                }`}
              >
                <span>{hasVotedRepeat ? "✅ VOTO REGISTRADO" : "🔁 REPETIR VERSO"}</span>
                {repeatVotes.total > 0 && (
                  <span className="bg-black/40 px-2 py-0.5 rounded-md text-xs">
                    {repeatVotes.current}/{repeatVotes.total}
                  </span>
                )}
              </button>
            </div>
          </motion.div>
        ) : gameState === "revealing" && lastAccuracy ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full flex flex-col items-center max-w-3xl"
          >
            <h2 className="text-gray-500 text-xs font-black tracking-[0.3em] uppercase mb-4">
              Relatório de Semelhança da IA
            </h2>

            <div
              className={`text-7xl font-black mb-2 drop-shadow-lg ${lastAccuracy.percentage >= 80 ? "text-emerald-400" : lastAccuracy.percentage >= 50 ? "text-yellow-400" : "text-red-500"}`}
            >
              {lastAccuracy.percentage}% Exato
            </div>

            <div className="text-gray-300 font-bold mb-8 flex items-center gap-3 bg-white/5 px-6 py-2 rounded-full border border-white/5">
              Recompensa obtida:{" "}
              <span className="text-emerald-400 text-xl">
                +{lastAccuracy.points} XP
              </span>
            </div>

            <div className="bg-black/60 border border-white/10 p-8 rounded-[30px] w-full text-center shadow-inner relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
              <span className="block text-gray-500 text-[10px] font-black uppercase tracking-widest mb-3">
                Verso Original Oficial
              </span>
              <span className="text-white text-3xl font-bold tracking-wide drop-shadow-md">
                {songLyrics[currentLineIndex].text}
              </span>
            </div>

            <div className="mt-6 text-gray-600 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">
              Retomando a fita em segundos...
            </div>
          </motion.div>
        ) : gameState === "success" ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 drop-shadow-[0_0_40px_rgba(250,204,21,0.6)] uppercase tracking-tighter"
          >
            COMPOSIÇÃO FINALIZADA
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
