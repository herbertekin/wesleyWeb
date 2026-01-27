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
const dbUrl = process.env.DATABASE_URL;
let dbConfig;

if (dbUrl) {
    try {
        const url = new URL(dbUrl);
        dbConfig = {
            host: url.hostname,
            port: url.port,
            user: url.username,
            password: url.password,
            database: url.pathname.slice(1),
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            enableKeepAlive: true,
            keepAliveInitialDelay: 10000
        };
    } catch (err) {
        console.error("❌ Invalid DATABASE_URL:", err.message);
        dbConfig = null;
    }
} else {
    dbConfig = {
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
    };
}

const db = dbConfig ? mysql.createPool(dbConfig) : null;

// Verification Log
if (db) {
    db.getConnection((err, connection) => {
        if (err) {
            console.error("❌ Database connection failed!");
            console.error("DB Config Used:", JSON.stringify(dbConfig, null, 2));
            console.error("Error Code:", err.code || "No code");
            console.error("Error Message:", err.message || "No message");
            console.error("Full Error:", JSON.stringify(err, null, 2));
        } else {
            console.log("✅ Successfully connected to Railway Database!");
            connection.release();
        }
    });
} else {
    console.error("❌ No DB config—check Railway variables.");
}

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
    if (!db) return res.status(500).json({ error: "Database not connected" });
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
    if (!db) return res.status(500).json({ error: "Database not connected" });
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
    if (!db) return res.status(500).json({ error: "Database not connected" });
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

// Global error handling to prevent crashes
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// --- 7. START SERVER ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
});