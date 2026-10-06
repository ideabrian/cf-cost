#!/usr/bin/env bash
# Narrated motion clip of the exploded view: Kokoro TTS (talking-mac setup) + Playwright screen recording + ffmpeg.
# Usage: promo/make-video.sh [voice]   → promo/out/exploded.mp4
set -euo pipefail
cd "$(dirname "$0")/.."
VOICE="${1:-bm_george}"; OUT=promo/out; mkdir -p "$OUT"
SP="$HOME/.claude/speech"
TEXT="This is your Cloudflare bill. Exploded. Every charge bursts out of the cloud, with a label. Red means it costs you money. Faded means you are still inside the free tier. This sample account pays five dollars and seventy two cents a month. See yours in ten seconds, at C F cost dot com. Read only token. Nothing stored."
KOKORO_TEXT="$TEXT" KOKORO_VOICE="$VOICE" OUTWAV="$OUT/narration.wav" "$SP/kokoro-env/bin/python3" -c "
import os, soundfile as sf
from kokoro_onnx import Kokoro
k = Kokoro('$SP/kokoro-v1.0.onnx', '$SP/voices-v1.0.bin')
s, sr = k.create(os.environ['KOKORO_TEXT'], voice=os.environ['KOKORO_VOICE'], speed=1.0, lang='en-us')
sf.write(os.environ['OUTWAV'], s, sr)"
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT/narration.wav")
echo "narration ${DUR}s"
DUR="$DUR" OUT="$OUT" node promo/record.mjs
ffmpeg -y -loglevel error -ss "$(cat "$OUT/start.txt")" -i "$OUT/raw.webm" -i "$OUT/narration.wav" -map 0:v -map 1:a -c:v libx264 -pix_fmt yuv420p -crf 20 -c:a aac -b:a 160k -shortest -movflags +faststart "$OUT/exploded.mp4"
ls -la "$OUT/exploded.mp4"
