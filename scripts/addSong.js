import fs from 'fs';
import readline from 'readline';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const ask = (question) => new Promise(resolve => rl.question(question, resolve));

function parseLRC(lrcText) {
  const lines = lrcText.split('\n');
  const lyrics = [];

  // Regex nativo para captura do padrão exato de LRC temporal.
  const timeRegex = /\[(\d{2}):(\d{2}(?:\.\d{2,3})?)\]/;
  
  // Limpeador Absoluto: Exorciza os famigerados [Chorus], (Guitar Solo), Verse 1, etc.
  const cleanRegex = /\[.*?\]|\(.*?\\)|(Chorus|Verse|Intro|Outro|Solo)[:\-]?/gi;

  lines.forEach(line => {
    const match = timeRegex.exec(line);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseFloat(match[2]);
      const totalSeconds = (minutes * 60) + seconds;

      // Raspa a tag original do tempo fora do texto.
      let text = line.replace(timeRegex, '').trim();
      
      // Passa a foice Regex em qualquer sujeira estrutural da internet.
      text = text.replace(cleanRegex, '').trim();

      if (text.length > 0) {
        lyrics.push({
          time: parseFloat(totalSeconds.toFixed(2)),
          text: text
        });
      }
    }
  });
  return lyrics;
}

async function createSong() {
  console.log('\n🎵 LRC Ingestor Oficial - LyricClash 🎵\n');
  
  const youtubeId = await ask('1. Cole aqui o ID do Vídeo no YouTube (Ex: qN4ooNx77u0): ');
  const title = await ask('2. Título Oficial da Música: ');
  const artist = await ask('3. Nome do Artista: ');
  const lrcPath = await ask('4. Caminho do arquivo .LRC no HD (Ex: ./minhacancao.lrc): ');

  const fullLrcPath = path.resolve(process.cwd(), lrcPath);

  if (!fs.existsSync(fullLrcPath)) {
    console.error('❌ Erro Fatal: Arquivo LRC não foi encontrado na raiz especificada:', fullLrcPath);
    rl.close();
    return;
  }

  const lrcContent = fs.readFileSync(fullLrcPath, 'utf8');
  const lyricsArray = parseLRC(lrcContent);

  if (lyricsArray.length === 0) {
    console.error('❌ Impossível ler tempos. O código não achou nenhuma tag [00:15.20] no seu arquivo.');
    rl.close();
    return;
  }

  const dbPath = path.join(process.cwd(), 'src', 'data', 'songs.json');
  let db = {};
  if (fs.existsSync(dbPath)) {
     db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  }

  db[youtubeId] = { title, artist, lyrics: lyricsArray };
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');

  console.log(`\n✅ SUCESSO! A música "${title}" foi injetada no Banco de Dados central!`);
  console.log(`🧹 O Limpador Regex mastigou, isolou e salvou ${lyricsArray.length} frases temporizadas limpas prontas pro jogo.`);
  rl.close();
}

createSong();
