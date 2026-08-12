import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../srtParser';

function SavedWordsModal({ isOpen, onClose, user, token, onSelectVideoWord }) {
  const [words, setWords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Manuel kelime ekleme durumları
  const [showAddForm, setShowAddForm] = useState(false);
  const [newWord, setNewWord] = useState('');
  const [newContext, setNewContext] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [addMsg, setAddMsg] = useState('');

  useEffect(() => {
    if (isOpen && token) {
      fetchSavedWords();
    }
  }, [isOpen, token]);

  const fetchSavedWords = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/saved-words`, {
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

  const handleAddWordSubmit = async (e) => {
    e.preventDefault();
    if (!newWord.trim()) return;
    setIsAdding(true);
    setAddMsg('');

    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/saved-words`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          word: newWord.trim(),
          sentence_context: newContext.trim()
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Kelime eklenemedi.');
      }

      if (data.already_exists) {
        setAddMsg('⚠️ Bu kelime zaten defterinizde kayıtlı.');
      } else {
        setWords(prev => [data, ...prev]);
        setNewWord('');
        setNewContext('');
        setShowAddForm(false);
      }
    } catch (err) {
      setAddMsg(`⚠️ ${err.message}`);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteWord = async (wordId, e) => {
    e.stopPropagation();
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/saved-words/${wordId}`, {
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
        <button type="button" className="modal-close-btn" onClick={onClose}>&times;</button>

        <div className="saved-words-header">
          <h2>⭐ Kelime Defterim ({words.length})</h2>
          <p className="saved-words-subtitle">Gelişimin için kaydettiğin tüm kelimeler ve geçtikleri cümleler</p>
        </div>

        <div className="add-word-bar">
          <button 
            type="button" 
            className="btn-add-word-toggle" 
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? '➖ İptal Et' : '➕ Dışarıdan Kelime Ekle'}
          </button>
        </div>

        {showAddForm && (
          <form onSubmit={handleAddWordSubmit} className="add-word-form">
            {addMsg && <div className="auth-error-badge">{addMsg}</div>}
            <div className="form-group">
              <input 
                type="text" 
                placeholder="İngilizce Kelime (Örn: Perseverance)" 
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <input 
                type="text" 
                placeholder="Örnek Cümle / Anlam / Not (Opsiyonel)" 
                value={newContext}
                onChange={(e) => setNewContext(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary" disabled={isAdding}>
              {isAdding ? 'Ekleniyor...' : 'Deftere Kaydet 💾'}
            </button>
          </form>
        )}

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
