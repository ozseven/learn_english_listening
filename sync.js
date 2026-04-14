import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mediaDir = path.join(__dirname, 'public', 'media');
const dbPath = path.join(__dirname, 'public', 'database.json');

console.log("Scanning media directory...");
try {
  const files = fs.readdirSync(mediaDir);
  const videos = files.filter(f => f.endsWith('.mp4'));

  // Use a write stream to avoid any JSON.stringify string length or buffer capping issues
  const stream = fs.createWriteStream(dbPath, { encoding: 'utf8' });
  stream.write('[\n');
  
  let first = true;
  for (const video of videos) {
    const rootName = video.replace('.mp4', '');
    const entry = {
      id: rootName,
      videoSrc: `/media/${video}`,
      srtSrc: `/media/${rootName}.srt`
    };
    
    if (!first) {
      stream.write(',\n');
    }
    stream.write('  ' + JSON.stringify(entry));
    first = false;
  }
  
  stream.write('\n]\n');
  stream.end();

  // Wait for stream to finish strictly for logging accurate numbers
  stream.on('finish', () => {
    console.log(`Success! Streamed database.json with exactly ${videos.length} video(s). Limits bypassed!`);
  });

} catch (error) {
  console.error("Error reading media directory:", error.message);
}
