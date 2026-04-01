import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

type LobbyView = 'home' | 'create' | 'join';
type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

export default function LobbyScreen() {
  const [view, setView] = useState<LobbyView>('home');
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const navigate = useNavigate();

  const handleCreateRoom = () => {
    if (username.trim()) {
      const randomRoom = Math.random().toString(36).substring(2, 6).toUpperCase();
      navigate(`/room/${randomRoom}/${encodeURIComponent(username)}/${difficulty}`);
    }
  };

  const handleJoinRoom = () => {
    if (username.trim() && roomId.trim()) {
      navigate(`/room/${encodeURIComponent(roomId.toUpperCase())}/${encodeURIComponent(username)}`);
    }
  };

  const diffColors = {
    easy: 'text-emerald-400 border-emerald-500/50 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.3)]',
    medium: 'text-blue-400 border-blue-500/50 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.3)]',
    hard: 'text-orange-400 border-orange-500/50 bg-orange-500/10 shadow-[0_0_15px_rgba(249,115,22,0.3)]',
    expert: 'text-red-500 border-red-500/80 bg-red-600/20 shadow-[0_0_25px_rgba(220,38,38,0.5)]'
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[100vh] bg-[#020202] relative overflow-hidden">
      
      {/* Background Animated Blobs Premium */}
      <div className="absolute top-1/4 -left-10 w-[500px] h-[500px] bg-emerald-500/20 rounded-full mix-blend-screen filter blur-[120px] animate-blob" />
      <div className="absolute top-1/3 -right-20 w-[500px] h-[500px] bg-blue-600/20 rounded-full mix-blend-screen filter blur-[120px] animate-blob animation-delay-2000" />
      <div className="absolute -bottom-20 left-1/4 w-[600px] h-[600px] bg-purple-600/20 rounded-full mix-blend-screen filter blur-[150px] animate-blob animation-delay-4000" />

      {/* Main Glass Container */}
      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="glass-panel rounded-[32px] sm:rounded-[40px] px-5 py-10 sm:p-12 max-w-lg w-[92%] sm:w-full z-10 relative overflow-hidden ring-1 ring-white/10"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent pointer-events-none" />

        <h1 className="text-fluid-6xl font-black mb-2 tracking-tighter bg-gradient-to-br from-white via-gray-200 to-gray-500 bg-clip-text text-transparent text-center drop-shadow-2xl">
          LyricClash
        </h1>
        <p className="text-gray-400/80 mb-10 sm:mb-14 text-center text-[9px] sm:text-[10px] font-black tracking-[0.4em] uppercase">
          Prove sua fluência no calor da batida
        </p>

        <div className="w-full min-h-[280px] flex justify-center items-start">
          <AnimatePresence mode="wait">
            {view === 'home' && (
              <motion.div 
                key="home"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col gap-5 w-full"
              >
                <button
                  onClick={() => setView('create')}
                  className="group relative w-full py-5 rounded-2xl font-black text-xs text-white bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 hover:border-emerald-500/50 transition-all duration-300 flex items-center justify-center gap-4 tracking-[0.2em] overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <span className="text-xl group-hover:rotate-12 transition-transform">✨</span> CRIAR SALA VIP
                </button>

                <button
                  onClick={() => setView('join')}
                  className="group relative w-full py-5 rounded-2xl font-black text-xs text-white bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 hover:border-blue-500/50 transition-all duration-300 flex items-center justify-center gap-4 tracking-[0.2em] overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <span className="text-xl group-hover:-rotate-12 transition-transform">🤝</span> ENTRAR NA SALA
                </button>
              </motion.div>
            )}

            {view === 'create' && (
              <motion.div 
                key="create"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col gap-6 w-full"
              >
                <div>
                  <label className="block text-[10px] font-black text-gray-500/80 uppercase tracking-widest mb-3 ml-1">Seu Apelido</label>
                  <input
                    autoFocus
                    className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-white font-bold placeholder-gray-700 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all shadow-inner"
                    placeholder="Ex: Mestre Lírico"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-500/80 uppercase tracking-widest mb-3 ml-1">Nível do Desafio</label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['easy', 'medium', 'hard', 'expert'] as Difficulty[]).map(d => (
                      <button 
                        key={d}
                        onClick={() => setDifficulty(d)}
                        className={`flex-1 py-4 rounded-xl text-[11px] font-black uppercase transition-all duration-300 border ${
                          difficulty === d 
                            ? diffColors[d] 
                            : 'bg-black/30 border-transparent text-gray-600 hover:bg-white/5 hover:text-gray-300'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => setView('home')}
                    className="px-6 py-4 rounded-2xl font-bold text-gray-500 hover:text-white bg-black/30 hover:bg-black/50 transition-colors text-xs"
                  >
                    VOLTAR
                  </button>
                  <button
                    onClick={handleCreateRoom}
                    disabled={!username.trim()}
                    className="flex-1 py-4 rounded-2xl font-black text-black bg-emerald-400 hover:bg-white active:scale-95 disabled:opacity-30 disabled:scale-100 disabled:bg-white/10 disabled:text-gray-500 transition-all shadow-[0_0_20px_rgba(52,211,153,0.4)] text-[12px] tracking-[0.2em]"
                  >
                    START ARENA
                  </button>
                </div>
              </motion.div>
            )}

            {view === 'join' && (
              <motion.div 
                key="join"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col gap-6 w-full"
              >
                <div>
                  <label className="block text-[10px] font-black text-gray-500/80 uppercase tracking-widest mb-3 ml-1">Seu Apelido</label>
                  <input
                    autoFocus
                    className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-white font-bold placeholder-gray-700 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all shadow-inner"
                    placeholder="Ex: Visitante"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-500/80 uppercase tracking-widest mb-3 ml-1">Código da Sala VIP</label>
                  <input
                    className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-white font-bold placeholder-gray-700 uppercase focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all tracking-[0.3em] text-center shadow-inner"
                    placeholder="MHY7A1"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                  />
                </div>

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => setView('home')}
                    className="px-6 py-4 rounded-2xl font-bold text-gray-500 hover:text-white bg-black/30 hover:bg-black/50 transition-colors text-xs"
                  >
                    VOLTAR
                  </button>
                  <button
                    onClick={handleJoinRoom}
                    disabled={!username.trim() || !roomId.trim()}
                    className="flex-1 py-4 rounded-2xl font-black text-white bg-blue-500 hover:bg-blue-400 hover:shadow-[0_0_30px_rgba(59,130,246,0.6)] active:scale-95 disabled:opacity-30 disabled:scale-100 disabled:bg-white/10 disabled:text-gray-500 disabled:shadow-none transition-all text-[12px] tracking-[0.2em]"
                  >
                    ACESSAR BATALHA
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
