import os
import json
import sys
import subprocess

try:
    import whisper
    from yt_dlp import YoutubeDL
except ImportError:
    print("❌ Erro: As bibliotecas 'openai-whisper' ou 'yt-dlp' não foram encontradas.")
    print("💡 Execute: pip install openai-whisper yt-dlp")
    sys.exit(1)

def sync_song_ai(video_id, title=None, artist=None):
    # 1. Configuração do download
    url = f"https://www.youtube.com/watch?v={video_id}"
    audio_file = f"temp_audio_{video_id}.mp3"
    
    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': audio_file.replace('.mp3', ''), # yt-dlp adiciona a extensão
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
    
    # yt-dlp garante que o arquivo termine em .mp3
    full_audio_path = audio_file

    # 2. Transcrição com Whisper
    print("🧠 IA Analisando o áudio (Whisper 'base' model)...")
    model = whisper.load_model("base")
    result = model.transcribe(full_audio_path, verbose=False)
    
    lyrics = []
    for segment in result['segments']:
        lyrics.append({
            "time": round(segment['start'], 2),
            "text": segment['text'].strip()
        })

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

    # 4. Limpeza
    if os.path.exists(full_audio_path):
        os.remove(full_audio_path)
    
    print(f"✅ Sucesso! {len(lyrics)} versos sincronizados automaticamente.")
    print(f"🎵 Salvo em: {db_path}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python scripts/ai_sync.py VIDEO_ID [TITLE] [ARTIST]")
    else:
        vid = sys.argv[1]
        t = sys.argv[2] if len(sys.argv) > 2 else None
        a = sys.argv[3] if len(sys.argv) > 3 else None
        sync_song_ai(vid, t, a)
