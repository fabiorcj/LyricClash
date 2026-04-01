import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LobbyScreen from './screens/LobbyScreen';
import WaitingRoom from './screens/WaitingRoom';
import GameArena from './screens/GameArena';
import ResultScreen from './screens/ResultScreen';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#050505] text-white flex flex-col justify-center">
        {/* Gestor Global das Rotas (Navegação Multi-tela) */}
        <Routes>
          <Route path="/" element={<LobbyScreen />} />
          
          {/* As Novas Rotas Oficiais de Waiting Room da Fase 5 */}
          <Route path="/room/:roomId/:username" element={<WaitingRoom />} />
          <Route path="/room/:roomId/:username/:difficulty" element={<WaitingRoom />} />
          
          {/* A Rota de Arena agora aceita QUALQUER Música */}
          <Route path="/arena/:roomId/:username/:songId" element={<GameArena />} />
          
          <Route path="/results" element={<ResultScreen />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
