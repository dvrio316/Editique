import { useState } from 'react';
import Home from './Home.jsx';
import Camera from './Camera.jsx';
import DoodlePage from './DoodlePage.jsx';
import Frames from './Frames.jsx';
import { BUILTIN } from './frames.js';

// Flow: home (coin) -> choose a frame -> camera -> doodle
export default function App() {
  const [screen, setScreen] = useState('home');
  const [photos, setPhotos] = useState(null);
  const [frame, setFrame] = useState(BUILTIN[0]);
  const [session, setSession] = useState(0); // remount the doodle page for each new strip

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
        {screen === 'doodle' && <DoodlePage key={session} photos={photos} frame={frame} onBack={() => setScreen('camera')} />}
      </div>
    </div>
  );
}
