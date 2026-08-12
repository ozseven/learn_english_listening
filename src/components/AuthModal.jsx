import React, { useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [isLoginTab, setIsLoginTab] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    const endpoint = isLoginTab ? `${API_BASE_URL}/api/auth/login` : `${API_BASE_URL}/api/auth/register`;
    const payload = isLoginTab
      ? { username_or_email: username, password }
      : { username, email, password };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Bir hata oluştu.');
      }

      // Token ve kullanıcı bilgisini kaydet
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user_info', JSON.stringify(data.user));

      onAuthSuccess(data.user, data.token);
      onClose();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>&times;</button>
        
        <div className="auth-tabs">
          <button 
            className={`auth-tab ${isLoginTab ? 'active' : ''}`}
            onClick={() => { setIsLoginTab(true); setErrorMsg(''); }}
          >
            Giriş Yap
          </button>
          <button 
            className={`auth-tab ${!isLoginTab ? 'active' : ''}`}
            onClick={() => { setIsLoginTab(false); setErrorMsg(''); }}
          >
            Üye Ol
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {errorMsg && <div className="auth-error-badge">⚠️ {errorMsg}</div>}

          <div className="form-group">
            <label>{isLoginTab ? 'Kullanıcı Adı veya E-Posta:' : 'Kullanıcı Adı:'}</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={isLoginTab ? 'kullanici_adi veya ornek@email.com' : 'kullanici_adi'}
              required
            />
          </div>

          {!isLoginTab && (
            <div className="form-group">
              <label>E-Posta Adresi:</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@email.com"
                required
              />
            </div>
          )}

          <div className="form-group">
            <label>Şifre:</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" className="btn-primary auth-submit-btn" disabled={isLoading}>
            {isLoading ? 'Lütfen bekleyin...' : (isLoginTab ? 'Giriş Yap 🔓' : 'Aramıza Katıl 🚀')}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AuthModal;
