import React, { useState, useEffect } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

function SavedWordsModal({ isOpen, onClose, user, token, onSelectVideoWord }) {
  const [words, setWords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen && token) {
      fetchSavedWords();
    }
  }, [isOpen, token]);

  const fetchSavedWords = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/saved-words`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Kelime defteri yüklenemedi.');
      }
      setWords(data.saved_words || []);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteWord = async (wordId, e) => {
    e.stopPropagation();
    try {
      const response = await fetch(`${API_BASE_URL}/api/saved-words/${wordId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        setWords(prev => prev.filter(w => w.id !== wordId));
      }
    } catch (err) {
      console.error("Silme hatası:", err);
    }
  };

  if (!isOpen) return null;

  const filteredWords = words.filter(w => 
    w.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (w.sentence_context && w.sentence_context.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card saved-words-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>&times;</button>

        <div className="saved-words-header">
          <h2>⭐ Kelime Defterim ({words.length})</h2>
          <p className="saved-words-subtitle">Gelişimin için kaydettiğin tüm kelimeler ve geçtikleri cümleler</p>
        </div>

        <div className="saved-words-search">
          <input 
            type="text" 
            placeholder="Kelimelerde veya cümlelerde ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="saved-words-loading">
            <div className="spinner-small"></div>
            <span>Kelimeleriniz yükleniyor...</span>
          </div>
        ) : errorMsg ? (
          <div className="auth-error-badge">⚠️ {errorMsg}</div>
        ) : filteredWords.length === 0 ? (
          <div className="empty-words-state">
            {searchQuery ? 'Aramanıza uygun kelime bulunamadı.' : 'Henüz hiç kelime kaydetmediniz. Cümle kurarken bilmediğiniz kelimelere ⭐ tıklayarak kaydedebilirsiniz!'}
          </div>
        ) : (
          <div className="words-list">
            {filteredWords.map((item) => (
              <div key={item.id} className="word-item-card">
                <div className="word-item-header">
                  <span className="word-item-title">{item.word}</span>
                  <button 
                    className="word-delete-btn"
                    title="Kelimeyi Defterden Sil"
                    onClick={(e) => handleDeleteWord(item.id, e)}
                  >
                    🗑️
                  </button>
                </div>
                {item.sentence_context && (
                  <p className="word-item-context">
                    💬 "{item.sentence_context}"
                  </p>
                )}
                <span className="word-item-date">
                  📅 {new Date(item.created_at).toLocaleDateString('tr-TR')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default SavedWordsModal;
