export const parseSRT = async (url) => {
  const response = await fetch(url);
  const text = await response.text();
  const lines = text.split('\n');
  const sentences = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.includes('-->')) {
      // Logic suitable for SRT
      let contentLine = lines[i + 1]?.trim() || '';
      if (contentLine) {
        sentences.push(contentLine);
      }
    }
  }
  return sentences;
};

export const shuffleArray = (array) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

export const tokenizeSentence = (sentence) => {
  const words = sentence.split(/\s+/).filter(word => word.length > 0);
  const blocks = [];
  for (let i = 0; i < words.length; i += 3) {
    blocks.push(words.slice(i, i + 3).join(' '));
  }
  return blocks;
};

export const extractYoutubeId = (url) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

export const fetchYoutubeSubtitles = async (videoId) => {
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  let apiUrl = import.meta.env.API_URL || (isLocal ? 'http://localhost:5000' : '');
  const apiKey = import.meta.env.API_KEY || '';

  // Eger protokol (http/https) girilmediyse ve relative path degilse basina otomatik https:// ekle
  if (apiUrl && !apiUrl.startsWith('http://') && !apiUrl.startsWith('https://') && !apiUrl.startsWith('/')) {
    apiUrl = `https://${apiUrl}`;
  }

  if (apiUrl) {
    try {
      // 1. Try to fetch from Python Flask backend (local or deployed)
      const headers = {};
      if (apiKey) {
        headers['X-API-Key'] = apiKey;
      }
      
      const response = await fetch(`${apiUrl}/api/subtitles?video_id=${videoId}`, { headers });
      const contentType = response.headers.get("content-type");
      
      if (response.ok && contentType && contentType.includes("application/json")) {
        const snippets = await response.json();
        return groupBackendSubtitlesIntoSentences(snippets);
      }
    } catch (backendError) {
      console.warn(`Python API backend at ${apiUrl} is offline. Falling back to browser CORS proxies...`, backendError);
    }
  }
  
  // 2. Browser fallback using public CORS proxies
  return fetchSubtitlesViaBrowserProxies(videoId);
};

export const fetchSubtitlesViaBrowserProxies = async (videoId) => {
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  
  const proxies = [
    (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    (url) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
    (url) => `https://thingproxy.freeboard.io/fetch/${url}`
  ];

  let html = null;
  let lastError = null;

  for (const proxy of proxies) {
    try {
      const pUrl = proxy(watchUrl);
      const response = await fetch(pUrl);
      if (!response.ok) continue;
      
      if (pUrl.includes('allorigins')) {
        const json = await response.json();
        html = json.contents;
      } else {
        html = await response.text();
      }
      if (html && html.includes('ytInitialPlayerResponse')) {
        break; 
      }
    } catch (e) {
      lastError = e;
    }
  }

  if (!html) {
    throw new Error("Could not load YouTube watch page via proxies. Please run the local backend server for 100% reliability.");
  }

  const startStr = 'ytInitialPlayerResponse = ';
  const startIndex = html.indexOf(startStr);
  if (startIndex === -1) {
    throw new Error("This video is not embeddable or captions are blocked.");
  }
  
  const jsonStart = startIndex + startStr.length;
  const jsonEnd = html.indexOf('};', jsonStart) + 1;
  const jsonStr = html.substring(jsonStart, jsonEnd);
  
  let playerResponse;
  try {
    playerResponse = JSON.parse(jsonStr);
  } catch (e) {
    throw new Error("Failed to parse YouTube player response.");
  }
  
  const captionTracks = playerResponse.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  if (!captionTracks || captionTracks.length === 0) {
    throw new Error("No English captions available for this video.");
  }
  
  const englishTrack = captionTracks.find(t => t.languageCode === 'en') || captionTracks[0];
  const captionsUrl = `${englishTrack.baseUrl}&fmt=json3`;
  
  let captionsJson = null;
  for (const proxy of proxies) {
    try {
      const pUrl = proxy(captionsUrl);
      const response = await fetch(pUrl);
      if (!response.ok) continue;
      
      if (pUrl.includes('allorigins')) {
        const json = await response.json();
        captionsJson = JSON.parse(json.contents);
      } else {
        captionsJson = await response.json();
      }
      if (captionsJson && captionsJson.events) {
        break; 
      }
    } catch (e) {
      lastError = e;
    }
  }

  if (!captionsJson || !captionsJson.events) {
    throw new Error("Could not load captions track from proxies.");
  }
  
  return groupSubtitlesIntoSentences(captionsJson.events);
};

export const groupSubtitlesIntoSentences = (events) => {
  const segments = [];
  let currentText = '';
  let currentStart = null;
  let wordCount = 0;
  
  for (const event of events) {
    if (!event.segs) continue;
    const text = event.segs.map(s => s.utf8).join('').trim();
    if (!text || text === '[Music]' || text === '[Applaud]') continue;
    
    if (currentStart === null) {
      currentStart = event.tStartMs / 1000;
    }
    
    currentText += (currentText ? ' ' : '') + text;
    const eventWords = text.split(/\s+/).filter(w => w.length > 0).length;
    wordCount += eventWords;
    
    // Check if ends with punctuation or exceeds word limit
    const hasPunctuation = /[.?!]/.test(text);
    if (hasPunctuation || wordCount >= 12) {
      const endTime = (event.tStartMs + (event.dDurationMs || 0)) / 1000;
      
      const cleanedText = currentText
        .replace(/[\r\n]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
        
      if (cleanedText.split(/\s+/).length >= 2) {
        segments.push({
          startTime: currentStart,
          endTime: endTime,
          text: cleanedText
        });
      }
      currentText = '';
      currentStart = null;
      wordCount = 0;
    }
  }
  
  if (currentText && currentStart !== null) {
    const cleanedText = currentText.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (cleanedText.split(/\s+/).length >= 2) {
      segments.push({
        startTime: currentStart,
        endTime: currentStart + 5,
        text: cleanedText
      });
    }
  }
  
  return segments;
};

export const groupBackendSubtitlesIntoSentences = (snippets) => {
  const segments = [];
  let currentText = '';
  let currentStart = null;
  let wordCount = 0;
  
  for (const snippet of snippets) {
    const text = snippet.text.trim();
    if (!text || text === '[Music]' || text === '[Applaud]') continue;
    
    if (currentStart === null) {
      currentStart = snippet.start;
    }
    
    currentText += (currentText ? ' ' : '') + text;
    const eventWords = text.split(/\s+/).filter(w => w.length > 0).length;
    wordCount += eventWords;
    
    const hasPunctuation = /[.?!]/.test(text);
    if (hasPunctuation || wordCount >= 12) {
      const endTime = snippet.end;
      
      const cleanedText = currentText
        .replace(/[\r\n]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
        
      if (cleanedText.split(/\s+/).length >= 2) {
        segments.push({
          startTime: currentStart,
          endTime: endTime,
          text: cleanedText
        });
      }
      currentText = '';
      currentStart = null;
      wordCount = 0;
    }
  }
  
  if (currentText && currentStart !== null) {
    const cleanedText = currentText.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (cleanedText.split(/\s+/).length >= 2) {
      segments.push({
        startTime: currentStart,
        endTime: currentStart + 5,
        text: cleanedText
      });
    }
  }
  
  return segments;
};




