import React, { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

export default function SearchPage() {
  const [filters, setFilters] = useState({
    lat: '17.4401',
    lng: '78.3489',
    radius_km: '3',
    max_rent: '15000',
    room_type: 'private',
    furnished: '',
  });

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // S3: AbortController cancels obsolete requests when filters change rapidly
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    async function fetchRooms() {
      if (!filters.lat || !filters.lng || !filters.radius_km) {
        setResults([]);
        return;
      }

      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== '') params.append(k, v);
      });

      try {
        const res = await fetch(`${API_BASE}/rooms/near?${params.toString()}`, { signal });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to fetch rooms');
        }
        setResults(data.results || []);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message);
          setResults([]);
        }
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchRooms();
    return () => controller.abort();
  }, [filters]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div>
      <section style={{ background: '#fff', padding: 20, borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, marginTop: 0, marginBottom: 16 }}>Search Parameters</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
          <div>
            <label style={labelStyle}>Latitude *</label>
            <input type="text" name="lat" value={filters.lat} onChange={handleChange} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Longitude *</label>
            <input type="text" name="lng" value={filters.lng} onChange={handleChange} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Radius (km) *</label>
            <input type="number" name="radius_km" value={filters.radius_km} onChange={handleChange} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Max Rent (₹)</label>
            <input type="number" name="max_rent" value={filters.max_rent} onChange={handleChange} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Room Type</label>
            <select name="room_type" value={filters.room_type} onChange={handleChange} style={inputStyle}>
              <option value="">Any</option>
              <option value="private">Private</option>
              <option value="shared">Shared</option>
              <option value="studio">Studio</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Furnished</label>
            <select name="furnished" value={filters.furnished} onChange={handleChange} style={inputStyle}>
              <option value="">Any</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
        </div>
      </section>

      {/* S3 States: Loading, Error, Empty, and Results */}
      <section aria-live="polite">
        {loading && <p style={{ color: '#475569' }}>Updating results...</p>}
        {error && <div style={{ padding: 12, background: '#fee2e2', color: '#b91c1c', borderRadius: 6 }}>Error: {error}</div>}
        {!loading && !error && results.length === 0 && (
          <p style={{ color: '#64748b' }}>No rooms found matching your exact filters.</p>
        )}
        {!loading && !error && results.length > 0 && (
          <div>
            <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>
              Found {results.length} active rooms within {filters.radius_km} km
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {results.map((room) => (
                <div
                  key={room.room_id}
                  style={{
                    background: '#fff',
                    padding: 16,
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <h3 style={{ margin: '0 0 6px 0', fontSize: 16, color: '#1e293b' }}>
                      {room.title} <span style={{ fontSize: 12, color: '#64748b' }}>({room.room_id})</span>
                    </h3>
                    <div style={{ fontSize: 13, color: '#475569' }}>
                      {room.area} • {room.room_type} • Furnished: {room.furnished}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginTop: 4 }}>
                      ₹{room.parsed_rent.toLocaleString('en-IN')}/month
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span
                      style={{
                        background: '#dbeafe',
                        color: '#1d4ed8',
                        padding: '6px 12px',
                        borderRadius: 20,
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      {room.distance_display} km
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

const inputStyle = { width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14, boxSizing: 'border-box' };
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#334155' };
