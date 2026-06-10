import os
import json
import sys
import subprocess
import urllib.request
import urllib.parse
import re

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

try:
    import whisper
    from yt_dlp import YoutubeDL
    HAS_WHISPER = True
except ImportError:
    HAS_WHISPER = False

def fetch_lrc_lyrics(title, artist):
    try:
        query = urllib.parse.urlencode({'track_name': title, 'artist_name': artist})
        url = f"https://lrclib.net/api/search?{query}"
        req = urllib.request.Request(url, headers={'User-Agent': 'LyricClash/1.0'})
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode('utf-8'))
            if data and isinstance(data, list):
                # Procura a primeira faixa que tenha syncedLyrics
                for track in data:
                    if track.get('syncedLyrics'):
                        return track['syncedLyrics']
        return None
    except Exception as e:
        print(f"⚠️ Erro ao buscar LRC da API: {e}")
        return None

def parse_lrc(lrc_text):
    lyrics = []
    for line in lrc_text.split('\n'):
        # Matches [mm:ss.xx] text (e.g. [00:12.34] Hello world)
        match = re.match(r'\[(\d+):(\d+\.\d+)\](.*)', line.strip())
        if match:
            minutes = int(match.group(1))
            seconds = float(match.group(2))
            text = match.group(3).strip()
            if text:
                time_in_seconds = round((minutes * 60) + seconds, 2)
                lyrics.append({
                    "time": time_in_seconds,
                    "text": text
                })
    return lyrics

def sync_song_ai(video_id, title=None, artist=None):
    lyrics = []
    
    # 1. Tentativa de buscar LRC Oficial
    if title and artist:
        print(f"🔍 Buscando letras sincronizadas oficiais (LRC) para '{title}' - '{artist}'...")
        lrc_text = fetch_lrc_lyrics(title, artist)
        if lrc_text:
            lyrics = parse_lrc(lrc_text)
            if lyrics:
                print(f"✨ Letras originais encontradas com precisão! ({len(lyrics)} versos)")

    # 2. Fallback para Whisper (IA) se LRC não for encontrado
    if not lyrics:
        print("⚠️ Não foi possível encontrar a letra sincronizada oficial (LRC).")
        if not HAS_WHISPER:
            print("❌ Erro: As bibliotecas 'openai-whisper' ou 'yt-dlp' não foram encontradas para fallback.")
            print("💡 Execute: pip install openai-whisper yt-dlp")
            sys.exit(1)
            
        print("🤖 Iniciando modo alternativo: Transcrição via IA (Whisper 'base' model)...")
        url = f"https://www.youtube.com/watch?v={video_id}"
        audio_file = f"temp_audio_{video_id}.mp3"
        
        ydl_opts = {
            'format': 'bestaudio/best',
            'outtmpl': audio_file.replace('.mp3', ''),
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }],
            'quiet': True
        }

        print(f"📥 Baixando áudio do YouTube: {video_id}...")
        with YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
        
        full_audio_path = audio_file

        print("🧠 IA Analisando o áudio...")
        model = whisper.load_model("base")
        result = model.transcribe(full_audio_path, verbose=False)
        
        for segment in result['segments']:
            lyrics.append({
                "time": round(segment['start'], 2),
                "text": segment['text'].strip()
            })
            
        if os.path.exists(full_audio_path):
            os.remove(full_audio_path)

    # 3. Salvando no formato do projeto
    db_path = os.path.join(os.getcwd(), 'src', 'data', 'songs.json')
    
    if os.path.exists(db_path):
        with open(db_path, 'r', encoding='utf-8') as f:
            db = json.load(f)
    else:
        db = {}

    db[video_id] = {
        "title": title or "Desconhecido",
        "artist": artist or "Desconhecido",
        "lyrics": lyrics
    }

    with open(db_path, 'w', encoding='utf-8') as f:
        json.dump(db, f, indent=2, ensure_ascii=False)

    print(f"✅ Sucesso! {len(lyrics)} versos processados.")
    print(f"🎵 Salvo em: {db_path}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python scripts/ai_sync.py VIDEO_ID [TITLE] [ARTIST]")
    else:
        vid = sys.argv[1]
        t = sys.argv[2] if len(sys.argv) > 2 else None
        a = sys.argv[3] if len(sys.argv) > 3 else None
        sync_song_ai(vid, t, a)
