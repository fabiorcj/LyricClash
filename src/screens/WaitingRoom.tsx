import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import socketManager from "../services/socket";
import songsData from "../data/songs.json";

export default function WaitingRoom() {
  const { roomId, username, difficulty } = useParams();
  const navigate = useNavigate();

  const [liveScoreboard, setLiveScoreboard] = useState<any>({});
  const [isHost, setIsHost] = useState(false);
  const songKeys = Object.keys(songsData);
  const [selectedSong, setSelectedSong] = useState(songKeys[0]);

  // Funções de varredura diretas em lista substituíram o Carrossel antigo.

  useEffect(() => {
    socketManager.connect();

    const timer = setTimeout(() => {
      socketManager.joinRoom(
        roomId || "GLOBAL",
        username || "Convidado",
        difficulty,
      );

      socketManager.socket?.on("room_state_update", (roomData) => {
        setLiveScoreboard(roomData.players || {});
        // O pulo do gato: Descobrir se eu sou o Reizinho da sala
        const me = Object.values(roomData.players).find(
          (p: any) => p.username === username,
        ) as any;
        if (me && me.isHost) {
          setIsHost(true);
        }
        // Se a Nuvem mandou uma música nova do Host, o carrossel local gira instantaneamente
        if (roomData.selectedSong) setSelectedSong(roomData.selectedSong);
      });

      // Se o Host ativar os mísseis da Nave Mãe, todos viajam pra Arena Juntos
      socketManager.socket?.on("game_starting", ({ songId }) => {
        navigate(
          `/arena/${roomId}/${encodeURIComponent(username || "")}/${songId}`,
        );
      });
    }, 300);

    return () => {
      socketManager.socket?.off("room_state_update");
      socketManager.socket?.off("game_starting");
      // O socket continua vivo e o usuário viaja de tela sem perder ping!
      clearTimeout(timer);
    };
  }, [roomId, username, difficulty, navigate]);

  const handleStartGame = () => {
    if (isHost) {
      socketManager.socket?.emit("start_game_request", {
        roomId,
        songId: selectedSong,
      });
    }
  };

  const handleLeave = () => {
    socketManager.disconnect();
    navigate("/");
  };

  const players = Object.values(liveScoreboard);

  return (
    <div className="flex flex-col items-center justify-center min-h-[100vh] bg-[#030303] relative overflow-hidden">
      {/* Background Anime */}
      <div className="absolute top-1/4 -left-10 w-[500px] h-[500px] bg-emerald-500/10 rounded-full mix-blend-screen filter blur-[120px] animate-blob" />
      <div className="absolute top-1/3 -right-20 w-[500px] h-[500px] bg-blue-600/10 rounded-full mix-blend-screen filter blur-[120px] animate-blob animation-delay-2000" />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="glass-panel rounded-[32px] sm:rounded-[40px] p-6 sm:p-12 max-w-4xl w-[94%] sm:w-full h-auto max-h-[95vh] md:h-[700px] my-4 md:my-0 z-10 relative flex flex-col md:flex-row gap-6 md:gap-12 ring-1 ring-white/10 shadow-[0_20px_70px_rgba(0,0,0,0.6)]"
      >
        {/* Lado Esquerdo VIP: Códigos e Jogadores */}
        <div className="flex-1 flex flex-col h-auto md:h-full overflow-hidden">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-6 mb-6 flex flex-col items-center sm:items-start group hover:border-emerald-500/30 transition-all duration-500 shadow-inner">
            <h2 className="text-gray-500 font-bold tracking-[0.3em] text-[8px] sm:text-[10px] uppercase mb-1">
              Código da Sala
            </h2>
            <div className="text-4xl sm:text-6xl font-black tracking-widest text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.4)] transition-transform group-hover:scale-105">
              {roomId}
            </div>
            <button
              onClick={handleLeave}
              className="mt-4 text-gray-500 hover:text-red-400 font-bold tracking-[0.2em] text-[8px] sm:text-[9px] uppercase transition-all flex items-center gap-1.5 group/btn"
            >
              <span className="group-hover/btn:-translate-x-1 transition-transform">
                ←
              </span>{" "}
              Abandonar
            </button>
          </div>

          <h3 className="text-gray-500 font-bold tracking-widest text-[10px] uppercase mb-4 border-b border-white/5 pb-2">
            Competidores na Escuta ({players.length})
          </h3>

          <div className="flex-1 flex flex-col gap-3 min-h-0 overflow-y-auto pr-2 custom-scrollbar max-h-[150px] sm:max-h-none">
            {players.length === 0 && (
              <span className="text-gray-600 text-sm">Carregando lista...</span>
            )}
            {players.map((p: any, i) => (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                key={p.username}
                className={`border rounded-2xl p-4 flex items-center gap-4 ${p.isHost ? "bg-gradient-to-r from-yellow-500/10 to-transparent border-yellow-500/30" : "bg-white/5 border-white/5"}`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${p.isHost ? "bg-gradient-to-tr from-yellow-400 to-orange-500 shadow-[0_0_15px_rgba(250,204,21,0.4)] ring-2 ring-yellow-300/50" : "bg-gray-800"}`}
                >
                  {p.isHost ? "👑" : "👾"}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-200">
                    {p.username} {p.username === username ? "(Você)" : ""}
                  </p>
                  <p
                    className={`text-[10px] uppercase tracking-widest font-black ${p.isHost ? "text-yellow-400" : "text-gray-500"}`}
                  >
                    {p.isHost ? "Dono da Sala / Host" : "Convidado"}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Lado Direito Carrossel: Músicas Nativas */}
        <div className="flex-1 flex flex-col min-h-0 h-[320px] sm:h-full bg-black/40 rounded-[30px] p-6 sm:p-8 border border-white/5 shadow-inner relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 pointer-events-none" />

          <h3 className="text-gray-400 font-bold tracking-[0.3em] text-xs uppercase mb-6 z-10 text-center">
            Setlist da Batalha
          </h3>

          <div className="flex-1 overflow-y-auto mb-4 z-10 px-2 pr-2 custom-scrollbar min-h-0">
            <div className="flex flex-col gap-3.5">
              {Object.entries(songsData).map(([id, song]: [string, any]) => (
                <button
                  key={id}
                  disabled={!isHost}
                  onClick={() => {
                    setSelectedSong(id);
                    if (isHost) {
                      socketManager.socket?.emit("change_song", {
                        roomId,
                        songId: id,
                      });
                    }
                  }}
                  className={`text-left p-4 sm:p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden group ${
                    selectedSong === id
                      ? "border-blue-500/30 bg-blue-600/10 shadow-[0_0_35px_rgba(59,130,246,0.15)]"
                      : "border-white/5 bg-white/5 hover:bg-white/10 opacity-70 hover:opacity-100 disabled:hover:bg-white/5"
                  }`}
                >
                  {selectedSong === id && (
                    <>
                      <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-12 h-24 bg-blue-500/40 blur-[30px] rounded-full z-10" />
                      <div className="absolute left-0 top-1/4 bottom-1/4 w-[2px] bg-gradient-to-b from-transparent via-blue-400 to-transparent z-20 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                    </>
                  )}
                  <div className="flex justify-between items-center relative z-20">
                    <div className="min-w-0 flex-1 pl-2">
                      <div className="font-black text-base sm:text-lg text-white mb-0.5 truncate drop-shadow-md">
                        {song.title}
                      </div>
                      <div className="font-bold text-gray-500 text-[10px] sm:text-xs tracking-widest uppercase truncate">
                        {song.artist}
                      </div>
                    </div>

                    {/* Link para YouTube */}
                    <a
                      href={`https://www.youtube.com/watch?v=${id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="ml-3 p-2.5 rounded-xl border border-white/10 bg-white/5 text-gray-400 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10 transition-all group/yt"
                      title="Ver clipe no YouTube"
                    >
                      <span className="text-lg">📺</span>
                    </a>

                    {selectedSong === id && (
                      <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shadow-[0_0_10px_rgba(59,130,246,1)] ml-3 shrink-0" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="z-10 mt-auto pt-4 border-t border-white/5 sticky bottom-0 bg-transparent">
            {isHost ? (
              <button
                onClick={handleStartGame}
                className="w-full py-4 sm:py-5 rounded-2xl font-black text-black bg-emerald-400 hover:bg-emerald-300 hover:shadow-[0_0_40px_rgba(52,211,153,0.6)] active:scale-95 transition-all shadow-[0_0_20px_rgba(52,211,153,0.4)] text-[11px] sm:text-[12px] tracking-[0.3em] relative overflow-hidden group uppercase px-6 sm:px-8"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/40 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-[800ms]" />
                COMEÇAR A GUERRA
              </button>
            ) : (
              <div className="w-full py-5 flex items-center justify-center gap-4 rounded-2xl border border-white/10 bg-white/5 font-black text-gray-400 text-[10px] tracking-[0.3em] uppercase">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_100px_rgba(59,130,246,0.8)]" />
                AGUARDANDO O HOST
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
