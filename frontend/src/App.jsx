import { useEffect, useState } from 'react';
import Home from './Home.jsx';
import Camera from './Camera.jsx';
import DoodlePage from './DoodlePage.jsx';
import Auth from './Auth.jsx';
import Gallery from './Gallery.jsx';
import Frames from './Frames.jsx';
import { BUILTIN } from './frames.js';
import { api } from './api.js';

// Flow: home -> camera (3 shots) -> doodle -> (save to server, needs login) -> my strips
export default function App() {
  const [screen, setScreen] = useState('home');
  const [photos, setPhotos] = useState(null);
  const [frame, setFrame] = useState(BUILTIN[0]);
  const [session, setSession] = useState(0); // remount the doodle page for each new strip
  const [user, setUser] = useState(null);
  const [online, setOnline] = useState(true); // false when Django can't be reached
  const [authOpen, setAuthOpen] = useState(false);

  // on load: get the CSRF cookie, then ask who is logged in
  useEffect(() => {
    api
      .csrf()
      .then(() => api.me())
      .then((d) => setUser(d.user))
      .catch(() => setOnline(false));
  }, []);

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      /* ignore */
    }
    setUser(null);
    if (screen === 'gallery') setScreen('home');
  };

  return (
    <div className="h-full flex items-center justify-center">
      {/* wobble filter: gives borders a hand-drawn edge */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
        <filter id="wobble" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="4" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="3" />
        </filter>
      </svg>
      <div className="phone relative flex flex-col w-full max-w-[430px] h-full max-h-[880px]">
        {screen === 'home' && (
          <Home
            user={user}
            online={online}
            onStart={() => setScreen('frames')}
            onSkip={() => {
              setPhotos(null);
              setSession((s) => s + 1);
              setScreen('doodle');
            }}
            onLogin={() => setAuthOpen(true)}
            onLogout={logout}
            onGallery={() => setScreen('gallery')}
          />
        )}
        {screen === 'frames' && (
          <Frames
            onBack={() => setScreen('home')}
            onSelect={(f) => {
              setFrame(f);
              setScreen('camera');
            }}
          />
        )}
        {screen === 'camera' && (
          <Camera
            frame={frame}
            onBack={() => setScreen('frames')}
            onDone={(shots) => {
              setPhotos(shots);
              setSession((s) => s + 1);
              setScreen('doodle');
            }}
          />
        )}
        {screen === 'doodle' && (
          <DoodlePage
            key={session}
            photos={photos}
            frame={frame}
            user={user}
            onNeedLogin={() => setAuthOpen(true)}
            onGallery={() => setScreen('gallery')}
            onBack={() => setScreen('camera')}
          />
        )}
        {screen === 'gallery' && <Gallery onBack={() => setScreen('home')} />}

        {authOpen && (
          <Auth
            onClose={() => setAuthOpen(false)}
            onDone={(u) => {
              setUser(u);
              setAuthOpen(false);
            }}
          />
        )}
      </div>
    </div>
  );
}
