import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

const rooms = {};

io.on('connection', (socket) => {
  console.log('⚡ Jogador Conectado na rede:', socket.id);

  socket.on('join_room', ({ roomId, username, difficulty }) => {
    socket.join(roomId);
    
    if (!rooms[roomId]) {
      rooms[roomId] = { 
        id: roomId,
        hostSocketId: socket.id, // Rastrear Host pelo ID Único de Conexão
        hostUsername: username, 
        players: {}, 
        gameState: 'waiting',
        difficulty: difficulty || 'medium',
        selectedSong: null
      };
    }
    
    rooms[roomId].players[socket.id] = {
      username,
      isHost: rooms[roomId].hostUsername === username,
      score: 0,
      progress: 0,
      combo: 0,
      isReady: false // Variável de Check-in Adicionada
    };

    console.log(`🎮 [${roomId}] ${username} Conectado! (Host: ${rooms[roomId].players[socket.id].isHost})`);

    io.to(roomId).emit('room_state_update', {
      players: rooms[roomId].players,
      difficulty: rooms[roomId].difficulty,
      selectedSong: rooms[roomId].selectedSong
    });
  });

  socket.on('start_game_request', ({ roomId, songId }) => {
    const room = rooms[roomId];
    if (room && room.hostSocketId === socket.id) {
       room.gameState = 'arena_idle';
       // Reinicia status para a nova partida purificada
       for (const pId in room.players) {
          room.players[pId].isReady = false;
          room.players[pId].score = 0;
          room.players[pId].progress = 0;
          room.players[pId].combo = 0;
       }
       console.log(`🚀 Host Iníciou Partida [${roomId}] / Música: ${songId}. Aguardando Jogadores darem Ready.`);
       io.to(roomId).emit('game_starting', { songId });
    }
  });

  socket.on('player_ready_arena', ({ roomId }) => {
    const room = rooms[roomId];
    if (room && room.players[socket.id]) {
      room.players[socket.id].isReady = true;

      io.to(roomId).emit('room_state_update', {
        players: room.players,
        difficulty: room.difficulty
      });

      // Varredura de Chefe de Mesa para checar se todos na sala disseram OK
      const playersArray = Object.values(room.players);
      const allReady = playersArray.every(p => p.isReady);

      // Se absolutamente todos estiverem prontos (mínimo 1 jogador logado), dá LARGADA GERAL MATEMÁTICA!
      if (allReady && playersArray.length > 0) {
         room.gameState = 'countdown';
         console.log(`⏱️  TODOS OS JOGADORES PRONTOS! Disparando Countdown na TV da Sala [${roomId}]!`);
         io.to(roomId).emit('all_players_ready');
      }
    }
  });

  socket.on('change_song', ({ roomId, songId }) => {
    const room = rooms[roomId];
    if (room && room.hostSocketId === socket.id) {
       room.selectedSong = songId;
       io.to(roomId).emit('room_state_update', {
         players: room.players,
         difficulty: room.difficulty,
         selectedSong: room.selectedSong
       });
    }
  });

  socket.on('force_return_lobby', ({ roomId }) => {
    const room = rooms[roomId];
    if (room && room.hostSocketId === socket.id) {
       room.gameState = 'waiting';
       console.log(`⏸️ O Host forçou a Partida [${roomId}] de volta ao Lobby!`);
       io.to(roomId).emit('game_forcing_return');
    }
  });

  socket.on('word_completed', ({ roomId, payload }) => {
    const room = rooms[roomId];
    if (room && room.players[socket.id]) {
      const player = room.players[socket.id];
      
      if (payload.accuracy >= 90) player.combo += 1;
      else player.combo = 0;

      const fireMultiplier = player.combo >= 2 ? 1.5 : 1;
      player.score += Math.floor(payload.points * fireMultiplier);
      player.progress += 1; 

      // Lógica de Sincronização Global
      player.hasSubmittedCurrentVerse = true;
      
      const playersArray = Object.values(room.players);
      const allSubmitted = playersArray.every(p => p.hasSubmittedCurrentVerse);

      if (allSubmitted) {
        // Resetar sinalizadores para o próximo verso
        playersArray.forEach(p => p.hasSubmittedCurrentVerse = false);
        
        console.log(`🎤 [${roomId}] Todos submeteram o verso! Disparando revelação global.`);
        io.to(roomId).emit('start_reveal_phase');
      }

      // Notifica sempre a atualização de pontos para todos
      io.to(roomId).emit('room_state_update', {
        players: room.players,
        difficulty: room.difficulty,
        selectedSong: room.selectedSong
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('❌ O Jogador Fechou a Aba:', socket.id);
    for (const roomId in rooms) {
      const room = rooms[roomId];
      if (room.players[socket.id]) {
        const leavingPlayer = room.players[socket.id];
        delete room.players[socket.id];

        console.log(`🚪 [${roomId}] ${leavingPlayer.username} saiu.`);

        // Se quem saiu era o host, precisamos de um sucessor imediato
        if (socket.id === room.hostSocketId) {
          const remainingPlayerIds = Object.keys(room.players);
          if (remainingPlayerIds.length > 0) {
            const newHostId = remainingPlayerIds[0];
            const newHost = room.players[newHostId];
            room.hostSocketId = newHostId;
            room.hostUsername = newHost.username;
            newHost.isHost = true;
            console.log(`👑 [${roomId}] Novo Host Coroado: ${newHost.username}`);
          } else {
            // Se não sobrou absolutamente ninguém, destrói a sala para economizar memória
            delete rooms[roomId];
            console.log(`🏚️ [${roomId}] Sala vazia. Destruindo com sucesso.`);
          }
        }

        // Se a sala ainda existe após a saída, notifica os sobreviventes e checa sincronização
        if (rooms[roomId]) {
          const remainingPlayers = Object.values(rooms[roomId].players);
          const allSubmitted = remainingPlayers.length > 0 && remainingPlayers.every(p => p.hasSubmittedCurrentVerse);

          if (allSubmitted && remainingPlayers.length > 0) {
            remainingPlayers.forEach(p => p.hasSubmittedCurrentVerse = false);
            io.to(roomId).emit('start_reveal_phase');
          }

          io.to(roomId).emit('room_state_update', {
            players: rooms[roomId].players,
            difficulty: rooms[roomId].difficulty,
            selectedSong: rooms[roomId].selectedSong
          });
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Servidor Administrativo L-Clash rodando na Porta ${PORT}`);
});
