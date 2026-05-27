# 🎧 LearnEnglish - Dynamic YouTube Dictation & Listening App

LearnEnglish, YouTube videolarındaki altyazıları otomatik olarak çekip cümlelere ayıran; kelimeleri karıştırarak kullanıcıya sürükle-bırak veya tıklama yöntemiyle etkileşimli bir cümle kurma (dictation) testi sunan modern bir yabancı dil öğrenme uygulamasıdır.

Kullanıcılar herhangi bir YouTube video linkini yapıştırarak kendi özel çalışma içeriklerini anında oluşturabilirler!

> 🚀 **Canlı Demo (Live Demo):** Projenizi GitHub Pages veya Vercel'e yükledikten sonra buraya canlı demo linkinizi ekleyebilirsiniz! (Örn: `https://kullaniciadi.github.io/learn_english_listening/`)

---

## ✨ Özellikler (Features)

*   🔗 **Dinamik YouTube Video Girişi**: İstediğiniz herhangi bir İngilizce YouTube videosunun URL'sini yapıştırarak testi anında başlatın.
*   📝 **Otomatik Altyazı Çekme & Cümle Oluşturma**:
    *   Sistem, videodaki altyazıları otomatik olarak çeker.
    *   Alt yazıları `.?!` noktalama işaretlerine göre akıllı bir şekilde birleştirerek anlamlı cümle grupları (segmentler) oluşturur.
*   🎮 **Etkileşimli Cümle Kurma Testi (Scrambled Word Cards)**:
    *   Cümledeki kelime grupları karıştırılarak kartlar halinde sunulur.
    *   Kartları ister sürükle-bırak yöntemiyle, ister sadece üzerlerine tıklayarak doğru sıraya dizin.
*   📺 **Özel Segment Oynatıcı**:
    *   Video, o an çözülen cümlenin başlangıç saniyesine otomatik sarar ve cümle bittiğinde kendiliğinden durur.
    *   Hassas ilerleme barı (custom progress bar) ve hız kontrolü (`0.75x`, `1.0x`, `1.25x`, `1.5x`) mevcuttur.
*   ⚙️ **Çift Yönlü Subtitle Fetching (Dual-Mode Fallback)**:
    *   **Local Mod**: Geliştirici ortamında lokal Python (Flask + `yt-dlp`) backend'i ile 100% kararlı altyazı çekimi.
    *   **Canlı Demo / Static Mod**: GitHub Pages veya Vercel üzerinde canlı demo sunulduğunda, backend gerektirmeksizin tarayıcı üzerinden alternatif CORS proxy servisleri ile doğrudan YouTube'dan altyazı çekme.
*   🐳 **Docker & Docker Compose**: Tek komutla hem frontend'i hem backend'i ayağa kaldırabilme.
*   📱 **Responsive Premium Arayüz**: Gece modu odaklı, modern animasyonlar ve üst düzey kullanıcı deneyimi sunan responsive tasarım.

---

## 🛠️ Teknolojiler (Tech Stack)

*   **Frontend**: React 19, Vite 8, Vanilla CSS (Premium Glassmorphism & Neon efektleri)
*   **Backend (Subtitle Extractor)**: Python 3.10, Flask, CORS, `yt-dlp`
*   **Video API**: YouTube IFrame Player API
*   **Containerization**: Docker, Nginx, Docker Compose

---

## 📁 Proje Yapısı (Project Structure)

```text
learn_english_listening/
├── backend/                 # Python Flask API (yt-dlp ile altyazı indirme)
│   ├── app.py               # Flask API sunucusu
│   ├── requirements.txt     # Python bağımlılıkları
│   └── Dockerfile           # Backend Docker imaj dosyası
├── public/                  # Statik dosyalar
│   └── database.json        # Varsayılan video listesi (Offline/Yedek)
├── src/                     # React Kaynak Kodları
│   ├── App.css              # Premium stil dosyaları
│   ├── App.jsx              # Ana oyun akışı, YouTube API entegrasyonu ve kart sürükleme
│   ├── index.css            # Global CSS ayarları ve CSS değişkenleri (Theme)
│   ├── main.jsx             # React giriş noktası
│   └── srtParser.js         # Altyazı çekme, gruplama ve proxy fallback mantığı
├── Dockerfile               # Frontend Nginx / Multi-stage Docker dosyası
├── docker-compose.yml       # Frontend + Backend servis tanımları
├── nginx.conf               # Frontend Nginx SPA yönlendirme ayarları
└── vite.config.js           # Vite yapılandırması
```

---

## 🚀 Yerel Kurulum ve Çalıştırma (Local Setup)

Projeyi bilgisayarınızda yerel olarak çalıştırmak için iki yöntem kullanabilirsiniz.

### Yöntem A: Docker Compose ile (Önerilen - En Kolayı)

Bilgisayarınızda Docker yüklüyse, tek bir komutla tüm uygulamayı çalıştırabilirsiniz:

```bash
docker-compose up -d --build
```

*   **Frontend:** `http://localhost:1212` adresinde çalışacaktır.
*   **Backend API:** `http://localhost:5000` adresinde çalışacaktır.

---

### Yöntem B: Manuel Çalıştırma (Node.js & Python)

#### 1. Backend Sunucusunu Başlatma
1. `backend` klasörüne girin:
   ```bash
   cd backend
   ```
2. Python sanal ortamı oluşturun ve aktif edin (Opsiyonel ama önerilir):
   ```bash
   python -m venv venv
   # Windows için:
   .\venv\Scripts\activate
   # macOS/Linux için:
   source venv/bin/activate
   ```
3. Gerekli kütüphaneleri yükleyin:
   ```bash
   pip install -r requirements.txt
   ```
4. API sunucusunu başlatın:
   ```bash
   python app.py
   ```
   *Backend sunucusu `http://127.0.0.1:5000` portundan hizmet vermeye başlayacaktır.*

#### 2. Frontend'i Başlatma
1. Projenin kök dizinine dönün ve paketleri yükleyin:
   ```bash
   npm install
   ```
2. Geliştirici sunucusunu başlatın:
   ```bash
   npm run dev
   ```
3. Tarayıcınızdan `http://localhost:5173` adresine giderek uygulamayı kullanmaya başlayabilirsiniz.

---

## 🌐 GitHub Pages / Vercel Canlı Demo Yayını

Projenizi ziyaretçilere çalışan bir demo halinde göstermek için tamamen ücretsiz olan **Vercel** veya **GitHub Pages** servislerini kullanabilirsiniz.

### 🌟 Vercel ile Yayınlama (En Hızlı ve Etkileyici Yöntem)
1. [Vercel](https://vercel.com/) sitesine üye olun ve GitHub hesabınızı bağlayın.
2. **"Add New" > "Project"** butonuna basarak bu depoyu seçin.
3. Kurulum ayarlarında **Framework Preset** olarak **Vite** seçildiğinden emin olun.
4. **"Deploy"** butonuna basın. Birkaç saniye içinde canlı demo linkiniz hazır olacaktır!
5. *Canlı demoda yerel backend çalışmayacağı için uygulama otomatik olarak browser proxy'lerini kullanarak YouTube altyazılarını başarıyla çekecektir.*

### 🛠️ GitHub Pages ile Yayınlama
1. Projenize `gh-pages` paketini kurun:
   ```bash
   npm install gh-pages --save-dev
   ```
2. `package.json` dosyasını açıp en üst seviyeye `homepage` tanımını ekleyin:
   ```json
   "homepage": "https://<kullanici-adiniz>.github.io/<repo-adiniz>",
   ```
3. `package.json` dosyasındaki `scripts` bölümüne şu iki komutu ekleyin:
   ```json
   "predeploy": "npm run build",
   "deploy": "gh-pages -d dist"
   ```
4. Terminalde aşağıdaki komutu çalıştırarak yayına alın:
   ```bash
   npm run deploy
   ```
5. GitHub deponuzun ayarlarından (Settings > Pages) kaynak olarak `gh-pages` dalının (branch) seçili olduğunu doğrulayın.

---

## 🎮 Nasıl Oynanır?

1. **YouTube Linki Girin**: Ana ekrandaki şık arama kutusuna dilediğiniz İngilizce videonun linkini girip "Başla" deyin.
2. **Dinleyin**: Video ilgili cümlenin başladığı yere gider ve oynatılır. Cümle bitiminde otomatik duraklar.
3. **Kartları Düzenleyin**: Karıştırılmış kelime kartlarını doğru İngilizce cümleyi kuracak şekilde yerleştirin.
4. **Doğrula**: Sistem yerleşimlerinizi anlık kontrol eder. Yanlış yerleşimler kırmızı, doğrular yeşil olur.
5. **Cümleyi Tamamla**: Doğru cümleyi kurduğunuzda **Perfect!** animasyonu belirir ve sonraki cümleye geçebilirsiniz.
