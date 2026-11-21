import { useEffect, useState } from 'react';
import Home from './Home.jsx';
import Camera from './Camera.jsx';
import DoodlePage from './DoodlePage.jsx';
import Frames from './Frames.jsx';
import QrCodeScreen from './QrCodeScreen.jsx';
import SharedStrip from './SharedStrip.jsx';
import { BUILTIN } from './frames.js';
import { api } from './api.js';

function getInitialToken() {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const tokenParam = params.get('strip') || params.get('token');
  if (tokenParam) return tokenParam;
  const match = window.location.pathname.match(/\/strip\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

// Flow: home (coin) -> choose a frame -> camera -> doodle -> qr code
export default function App() {
  const initialToken = getInitialToken();
  const [screen, setScreen] = useState(initialToken ? 'view-strip' : 'home');
  const [sharedToken, setSharedToken] = useState(initialToken);
  const [photos, setPhotos] = useState(null);
  const [frame, setFrame] = useState(BUILTIN[0]);
  const [session, setSession] = useState(0); // remount the doodle page for each new strip
  const [qrData, setQrData] = useState(null);

  useEffect(() => {
    api.csrf().catch(() => {});
  }, []);

  const handleFinish = async (blob) => {
    const res = await api.finishStrip(blob);
    setQrData(res);
    setScreen('qr');
  };

  const handleDone = () => {
    setPhotos(null);
    setQrData(null);
    setSession((s) => s + 1);
    setScreen('home');
  };

  const handleGoToBooth = () => {
    if (typeof window !== 'undefined' && window.history?.replaceState) {
      window.history.replaceState({}, '', '/');
    }
    setSharedToken(null);
    setPhotos(null);
    setSession((s) => s + 1);
    setScreen('home');
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
            onStart={() => setScreen('frames')}
            onSkip={() => {
              setPhotos(null);
              setSession((s) => s + 1);
              setScreen('doodle');
            }}
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
            onBack={() => setScreen('camera')}
            onFinish={handleFinish}
          />
        )}
        {screen === 'qr' && (
          <QrCodeScreen
            qrData={qrData}
            onBack={() => setScreen('doodle')}
            onDone={handleDone}
          />
        )}
        {screen === 'view-strip' && (
          <SharedStrip
            token={sharedToken}
            onGoToBooth={handleGoToBooth}
          />
        )}
      </div>
    </div>
  );
}
