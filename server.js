// server.js
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Render-kompatibler Port
const PORT = process.env.PORT || 3000;

// Admin-Passwort aus Environment Variable
const ADMIN_PASS = process.env.ADMIN_PASS || 'testpass';

// SQLite-Datenbank öffnen oder erstellen
const db = new sqlite3.Database('escape.db', (err) => {
  if (err) {
    console.error('Fehler beim Öffnen der Datenbank:', err.message);
  } else {
    console.log('Datenbank erfolgreich geöffnet.');
  }
});

// Tabelle erstellen, falls nicht vorhanden
db.run(`
  CREATE TABLE IF NOT EXISTS manual_slots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    room TEXT NOT NULL
  )
`);

// Middleware: Admin-Check
function checkAdmin(req, res, next) {
  const pass = req.header('X-ADMIN-PASS');
  if (pass !== ADMIN_PASS) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// GET /manual-slots → alle Slots
app.get('/manual-slots', checkAdmin, (req, res) => {
  db.all('SELECT * FROM manual_slots', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// POST /manual-slots → neuen Slot hinzufügen
app.post('/manual-slots', checkAdmin, (req, res) => {
  const { date, start_time, end_time, room } = req.body;
  if (!date || !start_time || !end_time || !room) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const stmt = db.prepare('INSERT INTO manual_slots (date, start_time, end_time, room) VALUES (?, ?, ?, ?)');
  stmt.run(date, start_time, end_time, room, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, date, start_time, end_time, room });
  });
  stmt.finalize();
});

// DELETE /manual-slots/:id → Slot löschen
app.delete('/manual-slots/:id', checkAdmin, (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM manual_slots WHERE id = ?', [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Slot not found' });
    res.json({ message: 'Slot deleted', id });
  });
});

// Server starten
app.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});
