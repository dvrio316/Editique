import { useEffect, useState } from 'react';
import Home from './Home.jsx';
import Camera from './Camera.jsx';
import DoodlePage from './DoodlePage.jsx';
import Auth from './Auth.jsx';
import Gallery from './Gallery.jsx';
import { api } from './api.js';

// Flow: home -> camera (3 shots) -> doodle -> (save to server, needs login) -> my strips
export default function App() {
  const [screen, setScreen] = useState('home');
  const [photos, setPhotos] = useState(null);
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
      <div className="phone relative flex flex-col w-full max-w-[430px] h-full max-h-[880px]">
        {screen === 'home' && (
          <Home
            user={user}
            online={online}
            onStart={() => setScreen('camera')}
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
        {screen === 'camera' && (
          <Camera
            onBack={() => setScreen('home')}
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
