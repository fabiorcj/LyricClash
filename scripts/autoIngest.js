import fs from 'fs';
import path from 'path';
import yts from 'yt-search';

// Curadoria das 8 Músicas Mais Eficazes e Recomendadas para Aprender Inglês (ESL)
const eslSongs = [
  { title: "Here Comes The Sun", artist: "The Beatles" },
  { title: "Stand by Me", artist: "Ben E. King" },
  { title: "Friday I'm in Love", artist: "The Cure" },
  { title: "Thinking Out Loud", artist: "Ed Sheeran" },
  { title: "Yellow", artist: "Coldplay" },
  { title: "Let It Be", artist: "The Beatles" },
  { title: "Hello", artist: "Adele" },
  { title: "Just The Way You Are", artist: "Bruno Mars" }
];

function parseLRC(lrcText) {
  const lines = lrcText.split('\n');
  const lyrics = [];
  const timeRegex = /\[(\d{2}):(\d{2}(?:\.\d{2,3})?)\]/;
  const cleanRegex = /\[.*?\]|\(.*?\)|(Chorus|Verse|Intro|Outro|Solo)[:\-]?/gi;

  lines.forEach(line => {
    const match = timeRegex.exec(line);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseFloat(match[2]);
      const totalSeconds = (minutes * 60) + seconds;

      let text = line.replace(timeRegex, '').trim();
      text = text.replace(cleanRegex, '').trim();

      // Ignora linhas sem texto real (instrumentais longos)
      if (text.length > 1) {
        lyrics.push({
          time: parseFloat(totalSeconds.toFixed(2)),
          text: text
        });
      }
    }
  });
  return lyrics;
}

async function fetchFromLRCLib(title, artist) {
  const query = encodeURIComponent(`${title} ${artist}`);
  // Crawler oficial e ético do LRCLib
  const res = await fetch(`https://lrclib.net/api/search?q=${query}`);
  if (!res.ok) return null;
  const data = await res.json();
  
  // Procura a linha que contenha as Letras Sincronizadas
  const track = data.find(t => t.syncedLyrics);
  if (track) return track.syncedLyrics;
  return null;
}

async function fetchYouTubeId(title, artist) {
  // Scraper Sem-API que contorna o bloqueio de chaves do Google!
  const r = await yts(`${title} ${artist} official lyric video`);
  const videos = r.videos.slice(0, 3);
  if (videos.length > 0) return videos[0].videoId;
  return null;
}

async function autoIngest() {
  console.log('🚀 Iniciando Robô Auto-Ingestor LRCLib + YouTube Crawler 🚀\n');
  
  const dbPath = path.join(process.cwd(), 'src', 'data', 'songs.json');
  let db = {};
  if (fs.existsSync(dbPath)) {
     db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  }

  let addedCount = 0;
  
  // Detecção de argumentos: node autoIngest.js "Musica" "Cantor"
  const args = process.argv.slice(2);
  let songsToFetch = eslSongs;

  if (args.length >= 2) {
    songsToFetch = [{ title: args[0], artist: args[1] }];
    console.log(`🎯 Alvo Único Identificado: [${args[0]}] por [${args[1]}]\n`);
  }

  for (const song of songsToFetch) {
    console.log(`🔍 Caçando em Múltiplas APIs: "${song.title}" - ${song.artist}...`);
    
    // 1. Puxa a letra perfeitamente sincronizada em milissegundos
    const lrcText = await fetchFromLRCLib(song.title, song.artist);
    if (!lrcText) {
      console.log(`❌ Letra sincronizada nativa não encontrada na LRCLib. Pulando.\n`);
      continue;
    }

    const parsedLyrics = parseLRC(lrcText);
    if (parsedLyrics.length === 0) {
      console.log(`❌ Letra encontrada, mas era Texto Puro (Sem tempos marcados). Pulando.\n`);
      continue;
    }

    // 2. Extrai o ID do Clipe ou Áudio Oficial cego do servidor do Google
    const videoId = await fetchYouTubeId(song.title, song.artist);
    if (!videoId) {
      console.log(`❌ Áudio não localizado nos trilhos do YouTube. Pulando.\n`);
      continue;
    }

    // 3. Empurra pro Banco de Dados Master
    db[videoId] = {
      title: song.title,
      artist: song.artist,
      lyrics: parsedLyrics
    };
    
    addedCount++;
    console.log(`✅ Compilado Ouro! YouTube ID [${videoId}] fundido com ${parsedLyrics.length} linhas de LRC.\n`);
    
    // Anti-ban delay preventivo entre as buscas
    await new Promise(r => setTimeout(r, 3000));
  }

  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
  console.log(`🎉 Missão Espacial Cumprida! A Inteligência agregou ${addedCount} novas músicas didáticas de altíssima fidelidade ao jogo!`);
}

autoIngest();
