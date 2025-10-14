const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const ADMIN_PASS = process.env.ADMIN_PASS || 'KerstinFischer-Logikreich';

// --- Datenbank ---
const db = new sqlite3.Database('escape.db', (err) => {
  if (err) console.error(err);
  else console.log('DB verbunden');
});

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS manual_slots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    start TEXT NOT NULL,
    note TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT,
    customer_email TEXT,
    start TEXT,
    duration_min INTEGER,
    persons INTEGER,
    room TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);
});

// --- Helper: Auth ---
function checkAdmin(req, res) {
  const pass = req.headers['x-admin-pass'];
  if (pass !== ADMIN_PASS) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

// --- Endpoints ---

// Manuelle Slots
app.get('/manual-slots', (req, res) => {
  if (!checkAdmin(req, res)) return;
  db.all('SELECT * FROM manual_slots ORDER BY start', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/manual-slots', (req, res) => {
  if (!checkAdmin(req, res)) return;
  const { start, note } = req.body;
  db.run('INSERT INTO manual_slots (start, note) VALUES (?, ?)', [start, note], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, start, note });
  });
});

app.delete('/manual-slots/:id', (req, res) => {
  if (!checkAdmin(req, res)) return;
  const { id } = req.params;
  db.run('DELETE FROM manual_slots WHERE id = ?', [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: id });
  });
});

// Buchungen
app.get('/bookings', (req, res) => {
  if (!checkAdmin(req, res)) return;
  db.all('SELECT * FROM bookings ORDER BY start', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));

