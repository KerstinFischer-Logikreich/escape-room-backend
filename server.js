// server.js
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// SQLite-Datenbank öffnen (erstellt Datei, falls nicht vorhanden)
const fs = require('fs');

const dbFile = 'escape.db';
if (fs.existsSync(dbFile)) {
  fs.unlinkSync(dbFile); // löscht alte DB beim Serverstart
  console.log('Alte DB gelöscht.');
}

const db = new sqlite3.Database('escape.db', (err) => {
  if (err) console.error('Datenbankfehler:', err.message);
  else console.log('Datenbank geöffnet.');
});

// Tabelle für Slots erstellen, falls nicht vorhanden
db.run(`CREATE TABLE IF NOT EXISTS manual_slots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room TEXT NOT NULL,
  date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  duration_min INTEGER NOT NULL,
  booked INTEGER DEFAULT 0
)`);

// Tabelle für Buchungen erstellen, falls nicht vorhanden
db.run(`CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room TEXT NOT NULL,
  date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  persons INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
)`);

// ----------- Endpoint: Slots abrufen -----------
app.get('/slots', (req, res) => {
  const { room, date } = req.query;
  if (!room || !date) return res.status(400).json({ error: 'room und date nötig' });

  db.all(
    `SELECT id, start_time as start, duration_min, booked
     FROM manual_slots
     WHERE room = ? AND date = ?`,
    [room, date],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ slots: rows });
    }
  );
});

// ----------- Admin-Seite bereitstellen -----------
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// ----------- Endpoint: Slot hinzufügen (Admin) -----------
app.post('/add-slot', (req, res) => {
  const { room, date, start_time, duration_min } = req.body;

  if (!room || !date || !start_time || !duration_min) {
    return res.json({ error: 'Bitte alle Felder ausfüllen' });
  }

  // booked wird automatisch auf 0 gesetzt, id AUTOINCREMENT
  const sql = 'INSERT INTO manual_slots (room, date, start_time, duration_min) VALUES (?,?,?,?)';
  db.run(sql, [room, date, start_time, duration_min], function(err) {
    if (err) return res.json({ error: err.message });
    res.json({ success: true, id: this.lastID });
  });
});

// ----------- Endpoint: Buchung anlegen -----------
app.post('/bookings', (req, res) => {
  const { room, date, start_time, end_time, name, email, phone, persons } = req.body;
  if (!room || !date || !start_time || !end_time || !name || !email) {
    return res.status(400).json({ error: 'Fehlende Buchungsinformationen' });
  }

  // Slot als gebucht markieren
  db.run(
    `UPDATE manual_slots SET booked = 1 WHERE room = ? AND date = ? AND start_time = ?`,
    [room, date, start_time],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });

      // Buchung in Tabelle speichern
      db.run(
        `INSERT INTO bookings (room,date,start_time,end_time,name,email,phone,persons)
         VALUES (?,?,?,?,?,?,?,?)`,
        [room, date, start_time, end_time, name, email, phone, persons],
        function(err2){
          if(err2) return res.status(500).json({ error: err2.message });
          res.json({ success: true, booking_id: this.lastID });
        }
      );
    }
  );
});

// ----------- Optional: Alle Buchungen abrufen -----------
app.get('/bookings', (req,res)=>{
  db.all(`SELECT * FROM bookings ORDER BY date,start_time`, (err, rows)=>{
    if(err) return res.status(500).json({ error: err.message });
    res.json({ bookings: rows });
  });
});

// Server starten
app.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});
