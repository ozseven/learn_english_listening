import { useState, useEffect, useRef } from 'react';
import './App.css';
import { parseSRT, shuffleArray, tokenizeSentence } from './srtParser';

function App() {
  const [db, setDb] = useState([]);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [originalSentence, setOriginalSentence] = useState('');
  const [expectedTokens, setExpectedTokens] = useState([]);
  const [wordPool, setWordPool] = useState([]); 
  const [selectedWords, setSelectedWords] = useState([]); 
  const [status, setStatus] = useState('idle'); 
  const [isLoading, setIsLoading] = useState(true);
  
  // Drag and Drop State
  const [draggedItem, setDraggedItem] = useState(null);

  // Video Custom Controls
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(() => {
    return parseFloat(localStorage.getItem('videoPlaybackRate')) || 1.0;
  });

  const videoRef = useRef(null);
  const progressRef = useRef(null);
  
  // Ref to differentiate click vs drag
  const dragTracker = useRef(false);

  useEffect(() => {
    fetch('/database.json')
      .then(res => res.json())
      .then(data => {
        setDb(data);
        if (data.length > 0) loadRandomVideo(data);
      });
  }, []);

  const loadRandomVideo = async (database = db) => {
    if (database.length === 0) return;
    setIsLoading(true);
    setStatus('idle');
    setSelectedWords([]);
    setIsPlaying(false);
    setProgress(0);
    setDraggedItem(null);
    setIsScrubbing(false);
    
    let randomIndex;
    do {
      randomIndex = Math.floor(Math.random() * database.length);
    } while (database.length > 1 && currentVideo && database[randomIndex].id === currentVideo.id);

    const selected = database[randomIndex];
    setCurrentVideo(selected);

    try {
      const sentences = await parseSRT(selected.srtSrc);
      if (sentences.length > 0) {
        const sentence = sentences[0]; 
        setOriginalSentence(sentence);
        const tokens = tokenizeSentence(sentence);
        setExpectedTokens(tokens);
        const wordObjects = tokens.map((word, index) => ({ id: `${index}-${word}`, word }));
        setWordPool(shuffleArray(wordObjects));
      }
    } catch(err) {
      console.error("VTT/SRT load failed:", err);
    }
    setIsLoading(false);
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
    dragTracker.current = true; // explicitly mark as a drag to stop click conflicts
    if (status === 'success') {
      e.preventDefault();
      return;
    }
    setDraggedItem({ source, index, wordObj });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', wordObj.id);
  };

  const handleDragOver = (e) => {
    e.preventDefault(); // allow drop
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

  // Robust click resolving
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
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
    }
  };

  const handleSpeedChange = (e, rate) => {
    e.stopPropagation();
    setPlaybackRate(rate);
    localStorage.setItem('videoPlaybackRate', rate.toString());
    if (videoRef.current) videoRef.current.playbackRate = rate;
  };

  const handleTimeUpdate = () => {
    if (videoRef.current && !isScrubbing) {
      const p = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(p || 0);
    }
  };

  // Video Scrubbing Logic
  const updateProgressFromEvent = (e) => {
    if (!videoRef.current || !progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    let pos = (e.clientX - rect.left) / rect.width;
    pos = Math.max(0, Math.min(pos, 1)); // clamp 0-1
    setProgress(pos * 100);
    videoRef.current.currentTime = pos * videoRef.current.duration;
  };

  const handlePointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId); // lock pointer to this element
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

  const handleVideoLoaded = () => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
      setProgress(0);
    }
  };

  if (isLoading || !currentVideo) {
    return <div className="loading">Loading experience...</div>;
  }

  return (
    <div className="app-container">
      <div className="layout-split">
        {/* LEFT COLUMN: 45% */}
        <div className="video-column">
          <div className="header-mobile">
             <h1>LearnEnglish</h1>
          </div>
          <div className="video-wrapper">
             <div className="video-section" onClick={togglePlay}>
              <video 
                ref={videoRef}
                src={currentVideo.videoSrc} 
                className="video-player"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
                onTimeUpdate={handleTimeUpdate}
                onLoadedData={handleVideoLoaded}
              />
              {!isPlaying && (
                <div className="play-overlay">
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
                <button 
                  key={wordObj.id} 
                  draggable={status !== 'success'}
                  onDragStart={(e) => handleDragStart(e, 'pool', i, wordObj)}
                  onDragEnd={handleDragEnd}
                  onClick={() => robustClickPool(wordObj)}
                  className={`word-card pool-word ${draggedItem?.wordObj.id === wordObj.id ? 'dragging' : ''}`}
                >
                  {wordObj.word}
                </button>
              ))}
            </div>

            <div className="controls">
              <button className="btn-secondary" onClick={() => loadRandomVideo()}>
                Skip / Next Video ⏭
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
