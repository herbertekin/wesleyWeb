require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();

// Ensure 'uploads' directory exists
if (!fs.existsSync('./uploads')) {
    fs.mkdirSync('./uploads');
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); 
app.use('/uploads', express.static('uploads')); 

// 1. Live MySQL Connection Pool with Keep-Alive to prevent ECONNRESET
const db = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,        // Keeps the connection from timing out
    keepAliveInitialDelay: 10000  // Pings the DB every 10 seconds
});

// Check connection status on startup
db.getConnection((err, connection) => {
    if (err) {
        console.error("❌ Database connection failed: " + err.message);
    } else {
        console.log("✅ Successfully connected to Live Railway Database via Pool!");
        connection.release(); 
    }
});

// 2. Image Upload Logic
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
        cb(null, 'prod_' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// 3. API: Get All Products
app.get('/api/products', (req, res) => {
    db.query('SELECT * FROM products ORDER BY id DESC', (err, results) => {
        if (err) {
            console.error("❌ Database Query Error:", err.message);
            return res.status(500).json({ error: "Database error: " + err.message });
        }
        res.json(results);
    });
});

// 4. API: Add Product
app.post('/api/products', upload.single('image'), (req, res) => {
    const { name, category, condition, price, desc } = req.body;
    if (!req.file) return res.status(400).json({ message: "Image is required" });
    
    const imageUrl = `/uploads/${req.file.filename}`;
    const sql = 'INSERT INTO products (name, category, p_condition, price, description, image_url) VALUES (?,?,?,?,?,?)';
    
    db.query(sql, [name, category, condition, price, desc, imageUrl], (err, result) => {
        if (err) {
            console.error("❌ Insert Error:", err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: "Success", id: result.insertId });
    });
});

// 5. API: Delete Product
app.delete('/api/products/:id', (req, res) => {
    db.query('DELETE FROM products WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Deleted" });
    });
});

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
module.exports = app;