import { io, Socket } from 'socket.io-client';

// Define a URL do servidor backend usando variáveis de ambiente do Vite
const SERVER_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class SocketManager {
  public socket: Socket | null = null;

  connect() {
    if (!this.socket) {
      this.socket = io(SERVER_URL, {
        transports: ['websocket'],
        autoConnect: true,
      });

      this.socket.on('connect', () => {
        console.log('🔗 Conectado ao servidor multiplayer do LyricClash!');
      });

      this.socket.on('disconnect', () => {
        console.log('❌ Desconectado do servidor.');
      });
    } else if (!this.socket.connected) {
      // Se já existe mas dormiu, acorda ele!
      this.socket.connect();
    }
  }

  // Exemplos de métodos para o Jogo:
  joinRoom(roomId: string, username: string, difficulty?: string) {
    this.socket?.emit('join_room', { roomId, username, difficulty });
  }

  // Envia o progresso (Levenshtein aceitou a palavra)
  sendWordProgress(roomId: string, scoreData: { distance: number, multiplier: number }) {
    this.socket?.emit('word_completed', {
      roomId,
      timestamp: Date.now(),
      scoreData
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export default new SocketManager();
