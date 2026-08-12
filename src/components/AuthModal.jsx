import React, { useState } from 'react';
import { getApiUrl } from '../srtParser';

function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [isLoginTab, setIsLoginTab] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Verification Step States
  const [isVerifyStep, setIsVerifyStep] = useState(false);
  const [inputCode, setInputCode] = useState('');
  const [pendingUser, setPendingUser] = useState(null);
  const [pendingToken, setPendingToken] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    const apiUrl = getApiUrl();
    const endpoint = isLoginTab ? `${apiUrl}/api/auth/login` : `${apiUrl}/api/auth/register`;
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

      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user_info', JSON.stringify(data.user));
      onAuthSuccess(data.user, data.token);
      resetAndClose();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    const apiUrl = getApiUrl();
    try {
      const response = await fetch(`${apiUrl}/api/auth/verify`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${pendingToken}`
        },
        body: JSON.stringify({ code: inputCode })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Doğrulama başarısız.');
      }

      const verifiedUser = { ...pendingUser, is_verified: true };
      localStorage.setItem('auth_token', pendingToken);
      localStorage.setItem('user_info', JSON.stringify(verifiedUser));

      onAuthSuccess(verifiedUser, pendingToken);
      resetAndClose();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const resetAndClose = () => {
    setIsVerifyStep(false);
    setPendingUser(null);
    setPendingToken('');
    setInputCode('');
    setErrorMsg('');
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={resetAndClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close-btn" onClick={resetAndClose}>&times;</button>
        
        {isVerifyStep ? (
          <div className="verify-step-container">
            <h2 className="verify-title">🔐 Kodu Onayla</h2>
            <p className="verify-desc">
              Kullanıcı profil güvenliğiniz için onay kodu: 
              <span className="verify-code-badge">{pendingUser?.verification_code}</span>
            </p>

            <form onSubmit={handleVerifySubmit} className="auth-form">
              {errorMsg && <div className="auth-error-badge">⚠️ {errorMsg}</div>}

              <div className="form-group">
                <label>4 Haneli Onay Kodu:</label>
                <input 
                  type="text" 
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  placeholder="Örn: 4829"
                  maxLength={6}
                  style={{ textTransform: 'uppercase', letterSpacing: '0.2em', textAlign: 'center', fontSize: '1.2rem' }}
                  required
                />
              </div>

              <button type="submit" className="btn-primary auth-submit-btn" disabled={isLoading}>
                {isLoading ? 'Doğrulanıyor...' : 'Hesabı Onayla ve Başla 🚀'}
              </button>
            </form>
          </div>
        ) : (
          <>
            <div className="auth-tabs">
              <button 
                type="button"
                className={`auth-tab ${isLoginTab ? 'active' : ''}`}
                onClick={() => { setIsLoginTab(true); setErrorMsg(''); }}
              >
                Giriş Yap
              </button>
              <button 
                type="button"
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
          </>
        )}
      </div>
    </div>
  );
}

export default AuthModal;
