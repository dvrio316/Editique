import { useEffect, useState } from 'react';
import { api } from './api.js';

export default function SharedStrip({ token, onGoToBooth }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState(token ? null : 'No photo strip token provided.');
  const [isExpired, setIsExpired] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!token) return;

    let active = true;

    api
      .getSharedStrip(token)
      .then((res) => {
        if (!active) return;
        setData(res.strip);
        setError(null);
        setIsExpired(false);
      })
      .catch((err) => {
        if (!active) return;
        if (err.expired || err.status === 410 || /expired/i.test(err.message)) {
          setIsExpired(true);
          setError(
            err.message ||
              'This QR code has expired. Please generate a new one to access your photo strip.'
          );
        } else {
          setError(err.message || 'Invalid QR code. Photo strip not found.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  const handleDownload = async () => {
    if (!data?.url) return;
    setDownloading(true);
    try {
      // Fetch image as blob for reliable cross-browser download
      const res = await fetch(data.url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `editique-strip-${data.id || 'custom'}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch {
      // Fallback: direct download link
      const fallbackUrl = data.download_url || data.url;
      window.open(fallbackUrl, '_blank');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* header */}
      <header className="relative flex items-center justify-center px-3 pt-3 pb-2 shrink-0">
        <h1 className="title-box text-base">EDITIQUE</h1>
      </header>

      {/* main content */}
      <main className="flex-1 overflow-y-auto scroll-hide px-4 py-3 flex flex-col items-center justify-between">
        {loading && (
          <div className="flex-1 flex flex-col items-center justify-center gap-2">
            <div className="w-8 h-8 border-3 border-[#151515] border-t-transparent rounded-full animate-spin" />
            <p className="hand text-xl">Loading your photo strip…</p>
          </div>
        )}

        {!loading && (isExpired || error) && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center max-w-xs">
            <div className="note p-5 flex flex-col items-center gap-3">
              <span className="text-4xl">⌛</span>
              <h2 className="hand text-2xl font-bold" style={{ color: isExpired ? '#c0262d' : '#151515' }}>
                {isExpired ? 'QR Code Expired' : 'Not Found'}
              </h2>
              <p className="hand text-lg leading-snug">
                {isExpired
                  ? 'This QR code has expired. Please generate a new one to access your photo strip.'
                  : error}
              </p>
            </div>
            <button
              className="btn font-marker text-lg"
              style={{ background: '#151515', color: '#fff', padding: '0.4rem 1.8rem' }}
              onClick={onGoToBooth}
            >
              Go to Photo Booth
            </button>
          </div>
        )}

        {!loading && !error && data && (
          <div className="flex flex-col items-center w-full gap-3">
            <h2 className="hand text-2xl font-bold text-center -rotate-1">
              Your Customized Photo Strip!
            </h2>

            {/* Strip image container */}
            <div className="card-shadow bg-white p-2 rounded-lg max-w-[280px]">
              <img
                src={data.url}
                alt="Your Customized Photo Strip"
                className="w-full block h-auto rounded"
                style={{ WebkitTouchCallout: 'default', userSelect: 'auto' }}
              />
            </div>

            <p className="hand text-sm text-[#555] text-center">
              (On iPhone: you can also press &amp; hold the image to save)
            </p>

            <button
              className="btn font-marker text-xl"
              style={{ background: '#151515', color: '#fff', padding: '0.4rem 2rem' }}
              onClick={handleDownload}
              disabled={downloading}
            >
              {downloading ? 'Downloading…' : 'Download Photo Strip ⬇'}
            </button>

            <div className="text-xs hand text-[#666] flex items-center gap-1 mt-1">
              <span>⏳</span>
              <span>This link expires 24 hours after generation.</span>
            </div>

            <button
              className="btn text-sm mt-2"
              style={{ padding: '0.25rem 1.2rem' }}
              onClick={onGoToBooth}
            >
              Create Your Own Strip
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
