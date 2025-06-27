'use client';

import Link from 'next/link';
import Layout from '@/components/Layout';

export default function Home() {
  return (
    <Layout>
      <div style={{ textAlign: 'center', paddingTop: '50px' }}>
        <h1>Welcome!</h1>
        <p>
          Click here to play the{' '}
          <Link href="/mouse-practice-game">Mouse Practice Game</Link>
        </p>
        <p>
          Or check out this other cool thing: {' '}
          <Link href="/mini-metro">Mini Metro</Link>
        </p>
      </div>
    </Layout>
  );
}
