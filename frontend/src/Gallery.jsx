import { useEffect, useState } from 'react';
import { api } from './api.js';

// "My strips": everything the logged-in user saved to the server.
export default function Gallery({ onBack }) {
  const [strips, setStrips] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .listStrips()
      .then((d) => setStrips(d.strips))
      .catch((e) => setError(e.message));
  }, []);

  const remove = async (id) => {
    if (!window.confirm('Delete this strip?')) return;
    try {
      await api.deleteStrip(id);
      setStrips((s) => s.filter((x) => x.id !== id));
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <>
      <header className="relative flex items-center justify-center pt-4 pb-2 shrink-0">
        <button className="absolute left-4 top-3 text-[#1b1b8f] text-3xl font-bold leading-none px-2" onClick={onBack} aria-label="Back">
          ‹
        </button>
        <h1 className="title-box text-xl">My strips</h1>
      </header>

      <main className="flex-1 overflow-y-auto scroll-hide px-4 pb-6">
        {error && <p className="text-[#c0262d] text-center mt-4">{error}</p>}
        {!strips && !error && <p className="text-center mt-8 text-[#1b1b8f]">Loading…</p>}
        {strips && strips.length === 0 && (
          <p className="font-marker text-[#1b1b8f] text-xl text-center mt-10 -rotate-1">
            Nothing here yet.
            <br />
            Doodle a strip and tap the ☁ button!
          </p>
        )}

        <div className="grid grid-cols-2 gap-5 pt-4">
          {strips?.map((s, i) => (
            <div key={s.id} className="relative bg-white p-2 card-shadow" style={{ transform: `rotate(${i % 2 ? 1.5 : -1.5}deg)` }}>
              <img src={s.url} alt={s.title || `Strip ${s.id}`} className="w-full block" />
              <div className="flex items-center justify-between mt-2 text-sm">
                <a className="underline text-[#1b1b8f]" href={s.url} download={`editique-${s.id}.png`}>
                  ⬇ save
                </a>
                <button className="underline text-[#c0262d]" onClick={() => remove(s.id)}>
                  delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
