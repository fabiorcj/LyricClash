import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function ResultScreen() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[100vh] bg-[#030303] relative overflow-hidden">
      
      {/* Background Animated Blobs */}
      <div className="absolute top-0 inset-x-0 h-[500px] bg-gradient-to-b from-yellow-500/20 to-transparent blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 -left-20 w-[600px] h-[600px] bg-orange-600/10 rounded-full mix-blend-screen filter blur-[150px] animate-blob pointer-events-none" />
      <div className="absolute top-1/2 -right-20 w-[600px] h-[600px] bg-yellow-500/10 rounded-full mix-blend-screen filter blur-[150px] animate-blob animation-delay-2000 pointer-events-none" />

      <motion.h1 
        initial={{ opacity: 0, scale: 0.5, y: -50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", bounce: 0.5 }}
        className="text-fluid-6xl font-black mb-4 tracking-tighter bg-gradient-to-br from-yellow-200 via-yellow-400 to-orange-500 bg-clip-text text-transparent drop-shadow-[0_0_40px_rgba(250,204,21,0.4)] z-10 text-center px-4"
      >
        FIM DE SHOW!
      </motion.h1>
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-gray-400/80 text-[10px] sm:text-[12px] mb-12 sm:mb-20 font-black tracking-[0.4em] uppercase z-10 text-center max-w-[280px] sm:max-w-md"
      >
        Essa performance entrou para a história oficial.
      </motion.p>

      {/* Pódio Gamificado Padrão Esports */}
      <div className="flex flex-col sm:flex-row items-center sm:items-end justify-center gap-12 sm:gap-8 mb-16 sm:mb-20 h-auto sm:h-72 z-10 w-full max-w-3xl px-4 pb-10 sm:pb-0">
        
        {/* Prata (Perdedor Secundário) */}
        <motion.div 
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, type: "spring" }}
          className="flex flex-col items-center group w-32 sm:w-40 order-2 sm:order-1"
        >
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-tr from-gray-800 to-gray-600 rounded-full mb-4 sm:mb-6 flex items-center justify-center text-xl sm:text-2xl shadow-[0_0_20px_rgba(156,163,175,0.3)] ring-4 ring-gray-600/50 group-hover:scale-110 transition-transform">👾</div>
          <p className="text-gray-300 font-bold mb-2 sm:mb-3 tracking-widest text-xs sm:text-sm">João</p>
          <div className="w-full bg-gradient-to-t from-black via-gray-900 to-gray-700 h-24 sm:h-40 rounded-t-[20px] sm:rounded-t-[30px] relative overflow-hidden ring-1 ring-white/10 border-t-[4px] sm:border-t-[6px] border-gray-400 shadow-[0_-10px_40px_rgba(156,163,175,0.15)] flex flex-col items-center pt-4 sm:pt-6">
             <div className="text-gray-300 font-black text-2xl sm:text-3xl mb-1 sm:mb-2 drop-shadow-md">2º</div>
             <div className="px-2 py-0.5 sm:px-3 sm:py-1 bg-black/40 rounded-full text-gray-400 text-[8px] sm:text-[10px] font-black tracking-widest border border-white/5 whitespace-nowrap">450 XP</div>
          </div>
        </motion.div>

        {/* Ouro (Vencedor Central) */}
        <motion.div 
          initial={{ opacity: 0, y: 150 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, type: "spring" }}
          className="flex flex-col items-center z-10 group w-40 sm:w-48 order-1 sm:order-2"
        >
          <motion.div 
            animate={{ y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="text-4xl sm:text-5xl mb-3 sm:mb-4 drop-shadow-[0_0_15px_rgba(250,204,21,0.6)]"
          >
            👑
          </motion.div>
          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-tr from-yellow-500 to-orange-400 rounded-full mb-4 sm:mb-6 flex items-center justify-center text-3xl sm:text-4xl shadow-[0_0_40px_rgba(250,204,21,0.6)] ring-4 ring-yellow-400/50 group-hover:scale-110 transition-transform">😎</div>
          <p className="text-yellow-400 font-black mb-2 sm:mb-3 tracking-widest text-base sm:text-lg drop-shadow-md">Você</p>
          <div className="w-full bg-gradient-to-t from-[#1a1200] via-yellow-900/40 to-yellow-600 h-32 sm:h-56 rounded-t-[30px] sm:rounded-t-[40px] relative overflow-hidden ring-1 ring-yellow-500/20 border-t-[6px] sm:border-t-[8px] border-yellow-400 shadow-[0_-20px_50px_rgba(250,204,21,0.25)] flex flex-col items-center pt-6 sm:pt-8">
            <div className="text-yellow-200 font-black text-4xl sm:text-5xl mb-2 sm:mb-3 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]">1º</div>
            <div className="px-3 py-1 sm:px-4 sm:py-1.5 bg-black/40 rounded-full text-yellow-300 text-[10px] sm:text-xs font-black tracking-[0.2em] border border-yellow-500/30 shadow-inner whitespace-nowrap">890 XP</div>
          </div>
        </motion.div>

      </div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        onClick={() => navigate('/')}
        className="px-12 py-5 rounded-2xl font-black text-white bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 active:scale-95 transition-all tracking-[0.2em] text-sm hover:shadow-[0_0_30px_rgba(255,255,255,0.1)] group overflow-hidden relative"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
        VOLTAR AO LOBBY
      </motion.button>

    </div>
  );
}
