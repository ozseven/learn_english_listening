import { useState, useEffect, useRef } from 'react';
import './App.css';
import { shuffleArray, tokenizeSentence, extractYoutubeId, fetchYoutubeSubtitles, getApiUrl } from './srtParser';
import AuthModal from './components/AuthModal';
import SavedWordsModal from './components/SavedWordsModal';

function App() {
  const [db, setDb] = useState([]);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [originalSentence, setOriginalSentence] = useState('');
  const [expectedTokens, setExpectedTokens] = useState([]);
  const [wordPool, setWordPool] = useState([]); 
  const [selectedWords, setSelectedWords] = useState([]); 
  const [status, setStatus] = useState('idle'); 
  const [isLoading, setIsLoading] = useState(true);

  // User Auth & Saved Words State
  const [token, setToken] = useState(() => localStorage.getItem('auth_token') || '');
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user_info');
    return saved ? JSON.parse(saved) : null;
  });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSavedWordsModal, setShowSavedWordsModal] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 3000);
  };

  const handleAuthSuccess = (userData, userToken) => {
    setUser(userData);
    setToken(userToken);
    showToast(`Hoş geldin, ${userData.username}! 🎉`);
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_info');
    setUser(null);
    setToken('');
    showToast('Oturum kapatıldı.');
  };

  const handleSaveWord = async (word, e) => {
    if (e) e.stopPropagation();
    if (!token || !user) {
      setShowAuthModal(true);
      return;
    }

    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/saved-words`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          word: word,
          sentence_context: originalSentence,
          video_id: currentVideo?.youtubeId || ''
        })
      });

      const data = await response.json();
      if (response.ok) {
        showToast(data.already_exists ? `"${word}" zaten defterinizde ekli!` : `⭐ "${word}" defterinize eklendi!`);
      } else {
        showToast(data.error || 'Kelime kaydedilemedi.');
      }
    } catch (err) {
      showToast('Sunucu bağlantı hatası.');
    }
  };
  
  // Drag and Drop State
  const [draggedItem, setDraggedItem] = useState(null);

  // Video State synced with YouTube API
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(() => {
    return parseFloat(localStorage.getItem('videoPlaybackRate')) || 1.0;
  });

  const [ytApiReady, setYtApiReady] = useState(false);
  const playerRef = useRef(null);
  const progressRef = useRef(null);
  const timeUpdateInterval = useRef(null);
  const currentVideoRef = useRef(null);

  // Sync ref with currentVideo to prevent stale closures in intervals
  useEffect(() => {
    currentVideoRef.current = currentVideo;
  }, [currentVideo]);
  
  // Custom Video States
  const DEFAULT_EXAMPLE_URL = 'https://www.youtube.com/watch?v=52t241OQ7Ec';
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customUrl, setCustomUrl] = useState('');

  // Fallback States if automated subtitle fetching fails
  const [showManualFallback, setShowManualFallback] = useState(false);
  const [failedYtId, setFailedYtId] = useState('');
  const [fallbackStart, setFallbackStart] = useState('');
  const [fallbackEnd, setFallbackEnd] = useState('');
  const [fallbackText, setFallbackText] = useState('');

  const handleCustomVideoSubmit = async (e) => {
    e.preventDefault();
    
    let ytId = customUrl.trim() || DEFAULT_EXAMPLE_URL;
    if (ytId.includes('http') || ytId.includes('/') || ytId.includes('?')) {
      const parsed = extractYoutubeId(ytId);
      if (parsed) {
        ytId = parsed;
      } else {
        alert("Geçersiz YouTube linki!");
        return;
      }
    }

    setIsLoading(true);
    setStatus('idle');
    setShowManualFallback(false);
    
    try {
      const segments = await fetchYoutubeSubtitles(ytId);
      const firstSegment = segments[0];
      
      const newVideo = {
        id: `custom-${Date.now()}`,
        youtubeId: ytId,
        startTime: firstSegment.startTime,
        endTime: firstSegment.endTime,
        text: firstSegment.text,
        isCustom: true,
        segments: segments,
        segmentIndex: 0
      };

      setSelectedWords([]);
      setIsPlaying(false);
      setProgress(0);
      setDraggedItem(null);
      setIsScrubbing(false);

      setCurrentVideo(newVideo);

      const sentence = newVideo.text;
      setOriginalSentence(sentence);
      const tokens = tokenizeSentence(sentence);
      setExpectedTokens(tokens);
      const wordObjects = tokens.map((word, index) => ({ id: `${index}-${word}`, word }));
      setWordPool(shuffleArray(wordObjects));

      setCustomUrl('');
      setShowCustomForm(false);
    } catch (err) {
      console.warn("Autofetch failed, falling back to manual entry:", err);
      setIsLoading(false);
      setFailedYtId(ytId);
      setShowManualFallback(true);
    }
  };

  const handleManualFallbackSubmit = (e) => {
    e.preventDefault();

    const start = parseFloat(fallbackStart);
    const end = parseFloat(fallbackEnd);

    if (start >= end) {
      alert("Başlangıç süresi bitiş süresinden küçük olmalıdır!");
      return;
    }

    const newVideo = {
      id: `custom-manual-${Date.now()}`,
      youtubeId: failedYtId,
      startTime: start,
      endTime: end,
      text: fallbackText.trim(),
      isCustom: true,
      segments: [{ startTime: start, endTime: end, text: fallbackText.trim() }],
      segmentIndex: 0
    };

    setIsLoading(true);
    setStatus('idle');
    setSelectedWords([]);
    setIsPlaying(false);
    setProgress(0);
    setDraggedItem(null);
    setIsScrubbing(false);

    setCurrentVideo(newVideo);

    const sentence = newVideo.text;
    setOriginalSentence(sentence);
    const tokens = tokenizeSentence(sentence);
    setExpectedTokens(tokens);
    const wordObjects = tokens.map((word, index) => ({ id: `${index}-${word}`, word }));
    setWordPool(shuffleArray(wordObjects));

    setFallbackStart('');
    setFallbackEnd('');
    setFallbackText('');
    setFailedYtId('');
    setShowManualFallback(false);
    setShowCustomForm(false);
  };
  
  // Ref to differentiate click vs drag
  const dragTracker = useRef(false);

  // 1. Load YouTube Iframe API Script
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      setYtApiReady(true);
    } else {
      if (!document.getElementById('youtube-iframe-api')) {
        const tag = document.createElement('script');
        tag.id = 'youtube-iframe-api';
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      }
      
      const previousCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (previousCallback) previousCallback();
        setYtApiReady(true);
      };
    }

    setIsLoading(false);

    return () => {
      stopTimeUpdateLoop();
    };
  }, []);

  // 2. Initialize or Update YouTube Player when video changes
  useEffect(() => {
    if (!ytApiReady || !currentVideo) return;

    const disableCaptions = (player) => {
      if (!player) return;
      try {
        if (typeof player.unloadModule === 'function') {
          player.unloadModule("captions");
          player.unloadModule("cc");
        }
        if (typeof player.setOption === 'function') {
          player.setOption("captions", "track", {});
          player.setOption("cc", "track", {});
          player.setOption("captions", "reload", false);
        }
      } catch (e) {
        // Ignore if player API doesn't support unload
      }
    };

    // Helper: setup events for the player
    const onPlayerReady = (event) => {
      disableCaptions(event.target);
      event.target.setPlaybackRate(playbackRate);
      event.target.seekTo(currentVideo.startTime, true);
      setIsLoading(false);
    };

    const onPlayerStateChange = (event) => {
      disableCaptions(event.target);
      if (event.data === window.YT.PlayerState.PLAYING) {
        setIsPlaying(true);
        startTimeUpdateLoop();
      } else {
        setIsPlaying(false);
        stopTimeUpdateLoop();
      }
    };

    if (!playerRef.current) {
      playerRef.current = new window.YT.Player('yt-player', {
        height: '100%',
        width: '100%',
        videoId: currentVideo.youtubeId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          rel: 0,
          disablekb: 1,
          showinfo: 0,
          modestbranding: 1,
          fs: 0,
          iv_load_policy: 3,
          cc_load_policy: 0,
          start: currentVideo.startTime,
        },
        events: {
          onReady: onPlayerReady,
          onStateChange: onPlayerStateChange,
        },
      });
    } else {
      let currentLoadedId = "";
      if (typeof playerRef.current.getVideoData === 'function') {
        const videoData = playerRef.current.getVideoData();
        if (videoData) {
          currentLoadedId = videoData.video_id;
        }
      }

      if (currentLoadedId === currentVideo.youtubeId) {
        // Same video, just seek to start of next segment and play
        setIsLoading(false);
        disableCaptions(playerRef.current);
        playerRef.current.seekTo(currentVideo.startTime, true);
        playerRef.current.playVideo();
      } else {
        // Different video, reload it
        setIsLoading(true);
        setIsPlaying(false);
        setProgress(0);
        stopTimeUpdateLoop();
        
        playerRef.current.loadVideoById({
          videoId: currentVideo.youtubeId,
          startSeconds: currentVideo.startTime,
        });

        // Give it a brief moment to load metadata, then set rates and seek
        setTimeout(() => {
          if (playerRef.current) {
            disableCaptions(playerRef.current);
            if (typeof playerRef.current.setPlaybackRate === 'function') {
              playerRef.current.setPlaybackRate(playbackRate);
              playerRef.current.seekTo(currentVideo.startTime, true);
            }
          }
          setIsLoading(false);
        }, 500);
      }
    }
  }, [ytApiReady, currentVideo]);

  // 3. Segment loop timer to track playback and enforce endTime boundary
  const startTimeUpdateLoop = () => {
    stopTimeUpdateLoop();
    timeUpdateInterval.current = setInterval(() => {
      const activeVideo = currentVideoRef.current;
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function' && activeVideo) {
        const currentTime = playerRef.current.getCurrentTime();
        const duration = activeVideo.endTime - activeVideo.startTime;
        const elapsed = currentTime - activeVideo.startTime;
        const pct = Math.max(0, Math.min((elapsed / duration) * 100, 100));
        setProgress(pct);

        // Pause the video when we reach the end of the current subtitle sentence segment
        if (currentTime >= activeVideo.endTime) {
          playerRef.current.pauseVideo();
        }
      }
    }, 100);
  };

  const stopTimeUpdateLoop = () => {
    if (timeUpdateInterval.current) {
      clearInterval(timeUpdateInterval.current);
      timeUpdateInterval.current = null;
    }
  };

  const loadRandomVideo = () => {
    // If custom video with remaining segments, proceed to the next segment
    if (currentVideo && currentVideo.isCustom && currentVideo.segments && currentVideo.segmentIndex < currentVideo.segments.length - 1) {
      const nextIndex = currentVideo.segmentIndex + 1;
      const nextSegment = currentVideo.segments[nextIndex];
      
      const updatedVideo = {
        ...currentVideo,
        startTime: nextSegment.startTime,
        endTime: nextSegment.endTime,
        text: nextSegment.text,
        segmentIndex: nextIndex
      };
      
      setStatus('idle');
      setSelectedWords([]);
      setIsPlaying(true);
      setProgress(0);
      setDraggedItem(null);
      setIsScrubbing(false);
      setCurrentVideo(updatedVideo);
      
      const sentence = nextSegment.text;
      setOriginalSentence(sentence);
      const tokens = tokenizeSentence(sentence);
      setExpectedTokens(tokens);
      const wordObjects = tokens.map((word, index) => ({ id: `${index}-${word}`, word }));
      setWordPool(shuffleArray(wordObjects));
    } else {
      alert("Tebrikler! Videodaki tüm cümleleri tamamladınız. Yeni bir link girin.");
      setCurrentVideo(null);
    }
  };

  const evaluateSelections = (currentSelected) => {
    const updated = currentSelected.map((w, index) => ({
      ...w,
      isCorrect: w.word === expectedTokens[index]
    }));
    
    if (updated.length === expectedTokens.length && updated.every(w => w.isCorrect)) {
      setStatus('success');
    } else {
      setStatus('idle');
    }
    return updated;
  };

  const handleWordSelect = (wordObj) => {
    if (status === 'success') return;
    setWordPool(prev => prev.filter(w => w.id !== wordObj.id));
    setSelectedWords(prev => evaluateSelections([...prev, wordObj]));
  };

  const handleWordDeselect = (wordObj) => {
    if (status === 'success') return;
    setWordPool(prev => [...prev, wordObj]);
    setSelectedWords(prev => evaluateSelections(prev.filter(w => w.id !== wordObj.id)));
  };

  /* ---- DROP AND DRAG LOGIC ---- */
  const handleDragStart = (e, source, index, wordObj) => {
    dragTracker.current = true;
    if (status === 'success') {
      e.preventDefault();
      return;
    }
    setDraggedItem({ source, index, wordObj });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', wordObj.id);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, destType, destIndex = null) => {
    e.preventDefault();
    if (!draggedItem || status === 'success') return;

    const { source, index: srcIndex, wordObj } = draggedItem;

    if (destType === 'answer') {
      let newSelected = [...selectedWords];
      let newPool = [...wordPool];

      if (source === 'pool') {
        newPool = newPool.filter(w => w.id !== wordObj.id);
        if (destIndex !== null) {
          newSelected.splice(destIndex, 0, wordObj);
        } else {
          newSelected.push(wordObj);
        }
      } else if (source === 'answer') {
        if (destIndex === srcIndex) return; 
        newSelected.splice(srcIndex, 1); 
        const adjustedDestIndex = (destIndex !== null && destIndex > srcIndex) ? destIndex - 1 : destIndex;
        if (adjustedDestIndex !== null) {
          newSelected.splice(adjustedDestIndex, 0, wordObj);
        } else {
          newSelected.push(wordObj);
        }
      }
      setWordPool(newPool);
      setSelectedWords(evaluateSelections(newSelected));

    } else if (destType === 'pool') {
      if (source === 'answer') {
        let newSelected = [...selectedWords];
        newSelected.splice(srcIndex, 1);
        setWordPool(prev => [...prev, wordObj]);
        setSelectedWords(evaluateSelections(newSelected));
      }
    }
    setDraggedItem(null);
    dragTracker.current = false;
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setTimeout(() => { dragTracker.current = false; }, 50);
  };

  const robustClickPool = (wordObj) => {
    if (!dragTracker.current) {
        handleWordSelect(wordObj);
    }
  };
  const robustClickAnswer = (wordObj) => {
    if (!dragTracker.current) {
        handleWordDeselect(wordObj);
    }
  };

  /* ----- VIDEO CONTROLS ----- */
  const togglePlay = () => {
    if (playerRef.current && typeof playerRef.current.playVideo === 'function') {
      if (isPlaying) {
        playerRef.current.pauseVideo();
      } else {
        playerRef.current.playVideo();
      }
    }
  };

  const handleSpeedChange = (e, rate) => {
    e.stopPropagation();
    setPlaybackRate(rate);
    localStorage.setItem('videoPlaybackRate', rate.toString());
    if (playerRef.current && typeof playerRef.current.setPlaybackRate === 'function') {
      playerRef.current.setPlaybackRate(rate);
    }
  };

  // Video Scrubbing Logic
  const updateProgressFromEvent = (e) => {
    if (!playerRef.current || !progressRef.current || !currentVideo || typeof playerRef.current.seekTo !== 'function') return;
    const rect = progressRef.current.getBoundingClientRect();
    let pos = (e.clientX - rect.left) / rect.width;
    pos = Math.max(0, Math.min(pos, 1));
    setProgress(pos * 100);
    
    const duration = currentVideo.endTime - currentVideo.startTime;
    const targetTime = currentVideo.startTime + pos * duration;
    playerRef.current.seekTo(targetTime, true);
  };

  const handlePointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsScrubbing(true);
    updateProgressFromEvent(e);
  };

  const handlePointerMove = (e) => {
    if (isScrubbing) {
      updateProgressFromEvent(e);
    }
  };

  const handlePointerUp = (e) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    setIsScrubbing(false);
  };

  const renderNavbar = () => (
    <nav className="top-navbar">
      <div className="nav-brand" onClick={() => setCurrentVideo(null)} style={{ cursor: 'pointer' }}>
        <span className="brand-logo">🎧 LearnEnglish</span>
      </div>
      <div className="nav-actions">
        {user ? (
          <>
            <button className="nav-btn btn-saved-words" onClick={() => setShowSavedWordsModal(true)}>
              ⭐ Kelimelerim
            </button>
            <div className="user-badge">
              👤 <span>{user.username}</span>
            </div>
            <button className="nav-btn btn-logout" onClick={handleLogout}>
              Çıkış
            </button>
          </>
        ) : (
          <button className="nav-btn btn-login" onClick={() => setShowAuthModal(true)}>
            🔑 Giriş Yap / Üye Ol
          </button>
        )}
      </div>
    </nav>
  );

  const renderModalsAndToast = () => (
    <>
      {toastMessage && (
        <div className="toast-notification">
          {toastMessage}
        </div>
      )}

      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      <SavedWordsModal
        isOpen={showSavedWordsModal}
        onClose={() => setShowSavedWordsModal(false)}
        user={user}
        token={token}
      />
    </>
  );

  if (!currentVideo) {
    return (
      <div className="landing-page-container">
        {renderNavbar()}
        {renderModalsAndToast()}
        {isLoading && (
          <div className="loading-overlay">
            <div className="spinner"></div>
            <p>Altyazılar indiriliyor ve işleniyor...</p>
          </div>
        )}
        <header className="landing-header">
          <h1>LearnEnglish</h1>
          <p>YouTube linkini yapıştırın, cümle bittiğinde otomatik duraklayan etkileşimli dikte dersiniz başlasın!</p>
        </header>

        <div className="landing-card">
          <form className="landing-form" onSubmit={handleCustomVideoSubmit}>
            <div className="form-group">
              <label>YouTube Video Linki:</label>
              <input 
                type="text" 
                value={customUrl} 
                onChange={(e) => setCustomUrl(e.target.value)} 
                placeholder="Örn: https://www.youtube.com/watch?v=52t241OQ7Ec" 
              />
              <div className="example-link-hint" style={{ marginTop: '0.5rem', fontSize: '0.88rem', color: 'var(--text-secondary)', textAlign: 'left' }}>
                💡 <span>Örnek Link: </span>
                <button 
                  type="button" 
                  onClick={() => setCustomUrl(DEFAULT_EXAMPLE_URL)}
                  style={{ background: 'none', border: 'none', color: '#818cf8', textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}
                >
                  {DEFAULT_EXAMPLE_URL}
                </button>
                <span style={{ display: 'block', fontSize: '0.8rem', opacity: 0.8, marginTop: '2px' }}>(Boş bırakıp 'Dersi Başlat'a basarsanız bu örnek video yüklenir)</span>
              </div>
            </div>
            <button type="submit" className="btn-primary landing-btn">
              Dersi Başlat 🚀
            </button>
          </form>

          {showManualFallback && (
            <form className="custom-video-form manual-fallback-form" onSubmit={handleManualFallbackSubmit}>
              <p className="fallback-warning" style={{ color: "var(--error-color)", fontWeight: "600" }}>
                ⚠️ Altyazılar otomatik çekilemedi. Süreleri ve cümleyi kendiniz girerek başlayın:
              </p>
              <div className="form-row">
                <div className="form-group">
                  <label>Start (sec):</label>
                  <input 
                    type="number" 
                    value={fallbackStart} 
                    onChange={(e) => setFallbackStart(e.target.value)} 
                    placeholder="e.g. 12" 
                    required 
                    min="0"
                  />
                </div>
                <div className="form-group">
                  <label>End (sec):</label>
                  <input 
                    type="number" 
                    value={fallbackEnd} 
                    onChange={(e) => setFallbackEnd(e.target.value)} 
                    placeholder="e.g. 18" 
                    required 
                    min="0"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>English Sentence:</label>
                <input 
                  type="text" 
                  value={fallbackText} 
                  onChange={(e) => setFallbackText(e.target.value)} 
                  placeholder="Type the exact sentence here..." 
                  required 
                />
              </div>
              <button type="submit" className="btn-primary">
                Dersi Manuel Başlat 🚀
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {renderNavbar()}
      {renderModalsAndToast()}
      {isLoading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>Loading Video...</p>
        </div>
      )}
      <div className="layout-split">
        {/* LEFT COLUMN: 45% */}
        <div className="video-column">
          <div className="header-mobile">
             <h1>LearnEnglish</h1>
          </div>
          <div className="video-wrapper">
             <div className="video-section">
              {/* YouTube Player mounting node */}
              <div id="yt-player" className="video-player"></div>
              
              {/* Overlay layers to capture clicks and support custom styling */}
              <div className="video-overlay" onClick={togglePlay}></div>

              {!isPlaying && (
                <div className="play-overlay" onClick={togglePlay}>
                   <div className="play-icon">▶</div>
                </div>
              )}
              
              <div className="speed-controls" onClick={(e) => e.stopPropagation()}>
                <span className="speed-label">Speed:</span>
                {[0.75, 1.0, 1.25, 1.5].map(speed => (
                  <button 
                    key={speed}
                    className={`speed-btn ${playbackRate === speed ? 'active' : ''}`}
                    onClick={(e) => handleSpeedChange(e, speed)}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>
            
            {/* Clickable and Draggable Progress Bar for Scrubbing */}
            <div 
              className="progress-bar-container"
              ref={progressRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            >
               <div className="progress-fill" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: 55% */}
        <div className="game-column">
          <header className="header-desktop">
            <h1>LearnEnglish</h1>
            <p>Listen & Form the Expression</p>
          </header>

          <div className="game-section">
            {/* ANSWER AREA */}
            <div 
              className="answer-area"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 'answer')}
            >
              {status === 'success' && <div className="inline-success">✨ Perfect! ✨</div>}
              {selectedWords.length === 0 && status !== 'success' && <span className="placeholder-text">Tap or Drag chunks below to build!</span>}
              
              {selectedWords.map((wordObj, i) => (
                <div
                  key={wordObj.id}
                  className="drag-wrapper"
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={(e) => { e.stopPropagation(); handleDrop(e, 'answer', i); }}
                >
                  <div className="word-card-container">
                    <button 
                      draggable={status !== 'success'}
                      onDragStart={(e) => handleDragStart(e, 'answer', i, wordObj)}
                      onDragEnd={handleDragEnd}
                      onClick={() => robustClickAnswer(wordObj)}
                      className={`word-card answer-word ${wordObj.isCorrect ? 'correct' : 'incorrect'} ${draggedItem?.wordObj.id === wordObj.id ? 'dragging' : ''}`}
                    >
                      <span className="word-icon">
                        {wordObj.isCorrect ? '✓' : '✖'}
                      </span>
                      {wordObj.word}
                    </button>
                    <span 
                      className="star-save-btn" 
                      title="Bu kelimeyi defterime kaydet" 
                      onClick={(e) => handleSaveWord(wordObj.word, e)}
                    >
                      ⭐
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* WORD POOL */}
            <div 
              className="word-pool"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 'pool')}
            >
              {wordPool.map((wordObj, i) => (
                <div key={wordObj.id} className="word-card-container">
                  <button 
                    draggable={status !== 'success'}
                    onDragStart={(e) => handleDragStart(e, 'pool', i, wordObj)}
                    onDragEnd={handleDragEnd}
                    onClick={() => robustClickPool(wordObj)}
                    className={`word-card pool-word ${draggedItem?.wordObj.id === wordObj.id ? 'dragging' : ''}`}
                  >
                    {wordObj.word}
                  </button>
                  <span 
                    className="star-save-btn" 
                    title="Bu kelimeyi defterime kaydet" 
                    onClick={(e) => handleSaveWord(wordObj.word, e)}
                  >
                    ⭐
                  </span>
                </div>
              ))}
            </div>

            <div className="controls">
              <button className="btn-secondary" onClick={() => loadRandomVideo()}>
                {currentVideo.segmentIndex < currentVideo.segments.length - 1 ? "Sonraki Cümle ⏭" : "Dersi Tamamla 🎉"}
              </button>
              <button className="btn-secondary" onClick={() => { if(confirm("Dersi bitirip yeni bir video yüklemek istiyor musunuz?")) setCurrentVideo(null); }}>
                Yeni Video Yükle 🏠
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
