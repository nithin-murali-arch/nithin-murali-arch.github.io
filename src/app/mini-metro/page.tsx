'use client';
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

export default function MiniMetroPage() {
  return (
    <Layout>
      <div style={containerStyles}>
        <Header title="Mini Metro" />
        <iframe
            src="/mini-metro.html"
            style={iframeStyles}
            title="Mini Metro"
        />
      </div>
    </Layout>
  );
} 