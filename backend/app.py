from flask import Flask, request, jsonify
from flask_cors import CORS
import yt_dlp
import requests

app = Flask(__name__)
CORS(app)  # Enable CORS so frontend can fetch from it

@app.route('/api/subtitles')
def get_subtitles():
    video_id = request.args.get('video_id')
    if not video_id:
        return jsonify({"error": "Missing video_id parameter"}), 400
        
    ydl_opts = {
        'writeautomaticsub': True,
        'writesubtitles': True,
        'subtitleslangs': ['en'],
        'skip_download': True,
        'quiet': True,
        'no_warnings': True
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(video_id, download=False)
            subs = info.get('subtitles') or {}
            auto_subs = info.get('automatic_captions') or {}
            
            en_key = None
            track_source = None
            
            # Priority: 1. Manual 'en', 2. Manual 'en-*', 3. Auto 'en', 4. Auto 'en-*'
            if 'en' in subs:
                en_key = 'en'
                track_source = subs
            else:
                manual_en_keys = [k for k in subs.keys() if k.startswith('en-')]
                if manual_en_keys:
                    en_key = manual_en_keys[0]
                    track_source = subs
                elif 'en' in auto_subs:
                    en_key = 'en'
                    track_source = auto_subs
                else:
                    auto_en_keys = [k for k in auto_subs.keys() if k.startswith('en-')]
                    if auto_en_keys:
                        en_key = auto_en_keys[0]
                        track_source = auto_subs
            
            # Fallback to any available language key
            if not en_key:
                if subs:
                    en_key = next(iter(subs.keys()))
                    track_source = subs
                elif auto_subs:
                    en_key = next(iter(auto_subs.keys()))
                    track_source = auto_subs
                else:
                    raise Exception("No subtitle tracks found for this video")
            
            en_track = track_source.get(en_key)
            
            # Find json3 format URL
            json3_url = None
            for fmt in en_track:
                if fmt.get('ext') == 'json3':
                    json3_url = fmt.get('url')
                    break
            
            if not json3_url:
                raise Exception("json3 format not found in caption formats")
            
            # Fetch json3 content using browser headers
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
                "Accept-Language": "en-US,en;q=0.9"
            }
            resp = requests.get(json3_url, headers=headers)
            if resp.status_code != 200:
                raise Exception(f"Failed to fetch captions JSON from YouTube (HTTP {resp.status_code})")
            
            captions_json = resp.json()
            subtitle_data = []
            
            for event in captions_json.get('events', []):
                if not event.get('segs'):
                    continue
                
                # Combine subtitle segments
                text = "".join([s.get('utf8', '') for s in event['segs']]).strip()
                if not text:
                    continue
                
                start_time = event['tStartMs'] / 1000
                duration = event.get('dDurationMs', 0) / 1000
                
                subtitle_data.append({
                    "text": text,
                    "start": start_time,
                    "duration": duration,
                    "end": round(start_time + duration, 2)
                })
                
            return jsonify(subtitle_data)
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
