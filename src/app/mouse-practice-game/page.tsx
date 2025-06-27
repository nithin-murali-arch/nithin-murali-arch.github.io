'use client';
import { useState, useEffect, useRef } from 'react';
import Header from '@/components/Header';
import Layout from '@/components/Layout';

const iframeStyles = {
    width: '100%',
    flexGrow: 1,
    border: 'none'
};

const containerStyles = {
    display: 'flex',
    flexDirection: 'column',
    height: '100%'
} as const;

export default function MousePracticeGamePage() {
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [mounted, setMounted] = useState(false);
  const requestIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const requestAttemptsRef = useRef(0);

  useEffect(() => {
    // Only run on client
    if (!mounted) {
      // Read initial state from localStorage
      const saved = localStorage.getItem('mousePracticeGame');
      if (saved) {
        const data = JSON.parse(saved);
        setScore(data.score || 0);
        setLevel(data.level || 1);
      }
      setMounted(true);
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'GAME_UPDATE') {
        setScore(event.data.payload.score);
        setLevel(event.data.payload.level);
        if (requestIntervalRef.current) {
          clearInterval(requestIntervalRef.current);
          requestIntervalRef.current = null;
        }
        const iframe = document.querySelector('iframe[title="Mouse Practice Game"]') as HTMLIFrameElement | null;
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage({ type: 'GAME_UPDATE_ACK' }, '*');
        }
      }
    };

    window.addEventListener('message', handleMessage);

    requestAttemptsRef.current = 0;
    function postRequest() {
      const iframe = document.querySelector('iframe[title="Mouse Practice Game"]') as HTMLIFrameElement | null;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'REQUEST_GAME_STATE' }, '*');
      }
      requestAttemptsRef.current++;
      const delay = Math.min(2000, 200 * Math.pow(2, requestAttemptsRef.current));
      if (!requestIntervalRef.current) {
        requestIntervalRef.current = setInterval(postRequest, delay);
      }
    }
    postRequest();

    return () => {
      window.removeEventListener('message', handleMessage);
      if (requestIntervalRef.current) {
        clearInterval(requestIntervalRef.current);
        requestIntervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Only render after client mount to avoid hydration mismatch
  if (!mounted) {
    return null; // or a spinner/skeleton if you want
  }

  return (
    <Layout>
      <div style={containerStyles}>
        <Header score={score} level={level} />
        <div className="instructions">
          🌟 Click the colorful button to score points! 🌟<br />
          Sometimes you&apos;ll need to right-click for a special menu!
        </div>
        <iframe
            src="/mouse-practice-game.html"
            style={iframeStyles}
            title="Mouse Practice Game"
        />
      </div>
    </Layout>
  );
}
