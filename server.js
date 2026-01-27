require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();

// --- 1. DIRECTORY SETUP ---
// Using absolute paths ensures Railway finds the folder reliably
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// --- 2. MIDDLEWARE ---
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); 
app.use('/uploads', express.static(uploadDir)); 

// --- 3. DATABASE CONNECTION ---
const db = mysql.createPool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000 
});

// Verification Log
db.getConnection((err, connection) => {
    if (err) {
        console.error("❌ Database connection failed!");
        console.error("Reason:", err.message || "No error message provided. Check your Variables.");
    } else {
        console.log("✅ Successfully connected to Railway Database!");
        connection.release(); 
    }
});

// --- 4. IMAGE UPLOAD CONFIG ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, 'prod_' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// --- 5. API ROUTES ---

// GET All Products
app.get('/api/products', (req, res) => {
    db.query('SELECT * FROM products ORDER BY id DESC', (err, results) => {
        if (err) {
            console.error("❌ SELECT Error:", err.message);
            return res.status(500).json({ error: "Database error", details: err.message });
        }
        res.json(results);
    });
});

// POST New Product
app.post('/api/products', upload.single('image'), (req, res) => {
    const { name, category, condition, price, desc } = req.body;
    
    if (!req.file) {
        return res.status(400).json({ error: "Image file is required" });
    }
    
    const imageUrl = `/uploads/${req.file.filename}`;
    const sql = 'INSERT INTO products (name, category, p_condition, price, description, image_url) VALUES (?,?,?,?,?,?)';
    
    db.query(sql, [name, category, condition, price, desc, imageUrl], (err, result) => {
        if (err) {
            console.error("❌ INSERT Error:", err.message);
            return res.status(500).json({ error: "Failed to save to database" });
        }
        res.json({ message: "Success", id: result.insertId });
    });
});

// DELETE Product
app.delete('/api/products/:id', (req, res) => {
    const { id } = req.params;
    db.query('DELETE FROM products WHERE id = ?', [id], (err) => {
        if (err) {
            console.error("❌ DELETE Error:", err.message);
            return res.status(500).json({ error: "Failed to delete item" });
        }
        res.json({ message: "Deleted" });
    });
});

// --- 6. FRONTEND SERVING (PATH-ERROR FIX) ---
// Using a Regular Expression /^.*$/ matches everything safely 
// in all versions of Express and Node.js (v20+)
app.get(/^.*$/, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- 7. START SERVER ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
});