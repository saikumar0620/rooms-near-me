const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// N1: Great Circle Distance (Haversine formula, R = 6,371 km)
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371.0;
  const toRad = (deg) => (deg * Math.PI) / 180.0;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// N4: Convert all 7 messy rent formats into integer rupees
function parseRent(rentStr) {
  if (rentStr === null || rentStr === undefined) return null;
  const s = String(rentStr).trim();

  // Handles '12k', '12.5k', 'Rs 12k'
  const kMatch = s.match(/([0-9]+(?:\.[0-9]+)?)\s*k/i);
  if (kMatch) {
    return Math.round(parseFloat(kMatch[1]) * 1000);
  }

  // Removes 'Rs', 'Rs.', '/month', commas, spaces
  const cleaned = s.replace(/rs\.?|\/month|,|\s/gi, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : Math.round(num);
}

// N3: Numbers only, inside India (lat 6-37, lon 68-98)
function isValidIndiaCoords(lat, lng) {
  if (lat === null || lat === undefined || lat === '' || isNaN(Number(lat))) return false;
  if (lng === null || lng === undefined || lng === '' || isNaN(Number(lng))) return false;
  const nLat = Number(lat);
  const nLng = Number(lng);
  return nLat >= 6.0 && nLat <= 37.0 && nLng >= 68.0 && nLng <= 98.0;
}

// RFC4180 CSV parser handling commas inside quoted fields
function parseCSV(content) {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = lines[0].split(',').map((h) => h.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const values = [];
    let cur = '';
    let inQuotes = false;
    for (let c = 0; c < line.length; c++) {
      const char = line[c];
      if (char === '"') inQuotes = !inQuotes;
      else if (char === ',' && !inQuotes) {
        values.push(cur.trim());
        cur = '';
      } else {
        cur += char;
      }
    }
    values.push(cur.trim());
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });
    rows.push(row);
  }
  return rows;
}

// In-Memory Data Store (S1)
let rooms = [];
function loadData() {
  const candidatePaths = [
    path.join(__dirname, 'data', 'rooms.csv'),
    path.join(__dirname, 'rooms.csv'),
  ];
  const target = candidatePaths.find((p) => fs.existsSync(p));
  if (!target) {
    throw new Error(`Rooms data file not found. Expected one of: ${candidatePaths.join(', ')}`);
  }

  const csv = fs.readFileSync(target, 'utf8');
  rooms = parseCSV(csv);
  if (rooms.length === 0) {
    throw new Error(`Rooms data file is empty or has no data rows: ${target}`);
  }
  console.log(`Loaded ${rooms.length} rooms into memory from ${target}`);
}
// S1: Diagnostic route
app.get('/rooms/stats', (req, res) => {
  const activeRooms = rooms.filter((r) => r.status && r.status.trim().toLowerCase() === 'active');
  const activeUnusable = activeRooms.filter((r) => !isValidIndiaCoords(r.lat, r.lng));
  res.json({
    total: rooms.length,
    active: activeRooms.length,
    active_unusable_coords: activeUnusable.length,
  });
});

// S2: Search Near Route (N1 - N7)
app.get('/rooms/near', (req, res) => {
  const { lat, lng, radius_km, max_rent, room_type, furnished } = req.query;

  // N7 Validation
  if (lat === undefined || lat.trim() === '' || !Number.isFinite(Number(lat))) {
    return res.status(400).json({ error: 'Missing or invalid required parameter: lat' });
  }
  if (lng === undefined || lng.trim() === '' || !Number.isFinite(Number(lng))) {
    return res.status(400).json({ error: 'Missing or invalid required parameter: lng' });
  }
  if (radius_km === undefined || radius_km.trim() === '' || !Number.isFinite(Number(radius_km)) || Number(radius_km) <= 0) {
    return res.status(400).json({ error: 'Missing or invalid required parameter: radius_km' });
  }

  const searchLat = Number(lat);
  const searchLng = Number(lng);
  const radius = Number(radius_km);
  const parsedMaxRent = max_rent !== undefined && max_rent !== '' ? Number(max_rent) : null;
  if (parsedMaxRent !== null && !Number.isFinite(parsedMaxRent)) {
    return res.status(400).json({ error: 'Invalid optional parameter: max_rent must be a number' });
  }
  const filterType = room_type ? room_type.trim().toLowerCase() : null;
  const filterFurnished = furnished ? furnished.trim().toLowerCase() : null;

  const matches = [];

  for (const r of rooms) {
    // N3: Only active, coordinates inside India, do not repair
    if (!r.status || r.status.trim().toLowerCase() !== 'active') continue;
    if (!isValidIndiaCoords(r.lat, r.lng)) continue;

    // N4: Inclusive max rent check
    const parsedRent = parseRent(r.rent);
    if (parsedRent === null) continue;
    if (parsedMaxRent !== null && parsedRent > parsedMaxRent) continue;

    // N5: Case-insensitive, whitespace-trimmed
    if (filterType && r.room_type.trim().toLowerCase() !== filterType) continue;
    if (filterFurnished && r.furnished.trim().toLowerCase() !== filterFurnished) continue;

    // N1 & N2: Distance <= radius_km
    const dist = haversine(searchLat, searchLng, Number(r.lat), Number(r.lng));
    if (dist <= radius) {
      matches.push({
        ...r,
        parsed_rent: parsedRent,
        raw_distance: dist,
        distance_km: Number(dist.toFixed(1)), // N6: Formatted to 1 decimal place
        distance_display: dist.toFixed(1),
      });
    }
  }

  // N6: Nearest first, tiebreak on room_id
  matches.sort((a, b) => {
    if (a.raw_distance !== b.raw_distance) {
      return a.raw_distance - b.raw_distance;
    }
    return a.room_id.localeCompare(b.room_id);
  });

  res.json({
    count: matches.length,
    results: matches.map(({ raw_distance, ...rest }) => rest),
  });
});

// S4: Post Room Endpoint (F1, F3)
app.post('/rooms', (req, res) => {
  const { title, room_type, furnished, area, lat, lng, rent, deposit, available_from } = req.body;
  const errors = {};

  // Step 1: Room
  if (!title || typeof title !== 'string' || title.trim().length < 5 || title.trim().length > 80) {
    errors.title = 'Title must be between 5 and 80 characters';
  }
  const validTypes = ['private', 'shared', 'studio'];
  if (!room_type || !validTypes.includes(String(room_type).trim().toLowerCase())) {
    errors.room_type = 'Room type must be private, shared, or studio';
  }
  const validFurnished = ['yes', 'no'];
  if (!furnished || !validFurnished.includes(String(furnished).trim().toLowerCase())) {
    errors.furnished = 'Furnished must be yes or no';
  }

  // Step 2: Location
  if (!area || typeof area !== 'string' || area.trim().length === 0) {
    errors.area = 'Area is required';
  }
  if (lat === undefined || lat === '' || isNaN(Number(lat)) || Number(lat) < 6.0 || Number(lat) > 37.0) {
    errors.lat = 'Latitude must be between 6.0 and 37.0 (inside India)';
  }
  if (lng === undefined || lng === '' || isNaN(Number(lng)) || Number(lng) < 68.0 || Number(lng) > 98.0) {
    errors.lng = 'Longitude must be between 68.0 and 98.0 (inside India)';
  }

  // Step 3: Rent
  const nRent = Number(rent);
  if (rent === undefined || isNaN(nRent) || !Number.isInteger(nRent) || nRent < 1000 || nRent > 200000) {
    errors.rent = 'Rent must be a whole rupee amount between 1,000 and 200,000';
  }
  const nDeposit = Number(deposit);
  if (deposit === undefined || isNaN(nDeposit) || !Number.isInteger(nDeposit) || nDeposit < 0) {
    errors.deposit = 'Deposit must be a non-negative whole rupee amount';
  } else if (!errors.rent && nDeposit > 6 * nRent) {
    errors.deposit = 'Deposit cannot exceed 6 times the monthly rent';
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const isValidAvailableDate = typeof available_from === 'string'
    && /^\d{4}-\d{2}-\d{2}$/.test(available_from)
    && !Number.isNaN(Date.parse(`${available_from}T00:00:00.000Z`))
    && new Date(`${available_from}T00:00:00.000Z`).toISOString().slice(0, 10) === available_from;
  if (!isValidAvailableDate || available_from < todayStr) {
    errors.available_from = 'Available date must be today or later';
  }

  // F3: Return 400 with an error per field
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ errors });
  }

  const newRoom = {
    room_id: `R${String(rooms.length + 1).padStart(3, '0')}`,
    lister_id: 'L_USER',
    title: title.trim(),
    room_type: room_type.trim().toLowerCase(),
    furnished: furnished.trim().toLowerCase(),
    area: area.trim(),
    lat: String(lat),
    lng: String(lng),
    rent: String(rent),
    status: 'active',
    posted_at: todayStr,
  };

  rooms.push(newRoom);
  res.status(201).json({ success: true, room: newRoom });
});

module.exports = { app, haversine, parseRent, isValidIndiaCoords };

if (require.main === module) {
  const PORT = process.env.PORT || 5001;
  try {
    loadData();
  } catch (error) {
    console.error(`Cannot start Rooms API: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  const server = app.listen(PORT, () => console.log(`Rooms API running on port ${PORT}`));
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Stop the other Rooms API process, or start this one with PORT=<free-port>.`);
      process.exitCode = 1;
      return;
    }
    console.error('Could not start Rooms API:', error.message);
    process.exitCode = 1;
  });
}
