import React, { useState } from 'react';
import SearchPage from './components/SearchPage';
import PostRoomForm from './components/PostRoomForm';

export default function App() {
  const [activeTab, setActiveTab] = useState('search');

  return (
    <div style={{ maxWidth: 880, margin: '24px auto', fontFamily: 'system-ui, -apple-system, sans-serif', padding: '0 16px' }}>
      <header style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: 16, marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 26, color: '#0f172a' }}>Rooms Near Me</h1>
        <p style={{ margin: '4px 0 16px 0', color: '#64748b', fontSize: 14 }}>
          Location-based room search and rental listings in Hyderabad
        </p>
        <nav style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => setActiveTab('search')}
            style={{
              padding: '9px 18px',
              fontWeight: 600,
              cursor: 'pointer',
              background: activeTab === 'search' ? '#2563eb' : '#f1f5f9',
              color: activeTab === 'search' ? '#fff' : '#334155',
              border: 'none',
              borderRadius: 6,
            }}
          >
            Find Rooms
          </button>
          <button
            onClick={() => setActiveTab('post')}
            style={{
              padding: '9px 18px',
              fontWeight: 600,
              cursor: 'pointer',
              background: activeTab === 'post' ? '#2563eb' : '#f1f5f9',
              color: activeTab === 'post' ? '#fff' : '#334155',
              border: 'none',
              borderRadius: 6,
            }}
          >
            Post a Room
          </button>
        </nav>
      </header>

      <main>
        {activeTab === 'search' ? (
          <SearchPage />
        ) : (
          <PostRoomForm onRoomCreated={() => setActiveTab('search')} />
        )}
      </main>
    </div>
  );
}