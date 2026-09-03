const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const setupAuth = require("./auth");
const PORT = process.env.PORT || 3000;

// ========================================
// 📁 المجلدات
// ========================================

const dataDir = path.join(__dirname, "data");
const uploadDir = path.join(__dirname, "public", "uploads");

fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(uploadDir, { recursive: true });

// ========================================
// 📤 رفع الصور
// ========================================

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },

    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const name =
            Date.now() +
            "-" +
            Math.random().toString(36).substring(2, 8) +
            ext;

        cb(null, name);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024
    }
});

// ========================================
// ⚙️ إعداد Express
// ========================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public")));

// ========================================
// 🗄️ قاعدة البيانات
// ========================================

const dbPath = path.join(dataDir, "aspeerk.db");
const db = new sqlite3.Database(dbPath);
setupAuth(app, db);

// ========================================
// 🏗️ إنشاء الجداول
// ========================================

db.serialize(() => {

    db.run(`
        CREATE TABLE IF NOT EXISTS shops (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT,
            address TEXT,
            location TEXT,
            latitude REAL,
            longitude REAL
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS parts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            shop_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            part_number TEXT,
            car_model TEXT,
            price REAL,
            quantity INTEGER DEFAULT 0,
            image TEXT,
            FOREIGN KEY (shop_id) REFERENCES shops(id)
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS cars (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            brand TEXT NOT NULL,
            model TEXT NOT NULL,
            year INTEGER
        )
    `);
});

// ========================================
// 🔍 البحث عن قطع الغيار
// ========================================

app.get("/api/search", (req, res) => {

    const q = String(req.query.q || "").trim();

    if (!q) {
        return res.json([]);
    }

    const search = `%${q}%`;

    const sql = `
        SELECT
            parts.id,
            parts.name,
            parts.part_number,
            parts.car_model,
            parts.price,
            parts.quantity,
            parts.image,

            shops.id AS shop_id,
            shops.name AS shop_name,
            shops.phone,
            shops.address,
            shops.location,
            shops.latitude,
            shops.longitude

        FROM parts

        LEFT JOIN shops
        ON parts.shop_id = shops.id

        WHERE
            parts.name LIKE ?
            OR parts.part_number LIKE ?
            OR parts.car_model LIKE ?

        ORDER BY parts.id DESC
    `;

    db.all(sql, [search, search, search], (err, rows) => {

        if (err) {
            console.error(err);
            return res.status(500).json({
                error: "حدث خطأ في البحث"
            });
        }

        res.json(rows);
    });
});

// ========================================
// 🏪 عرض المحلات
// ========================================

app.get("/api/shops", (req, res) => {

    db.all(
        `SELECT * FROM shops ORDER BY id DESC`,
        [],
        (err, rows) => {

            if (err) {
                console.error(err);
                return res.status(500).json({
                    error: "حدث خطأ"
                });
            }

            res.json(rows);
        }
    );
});

// ========================================
// ➕ إضافة محل
// ========================================

app.post("/api/shops", app.authMiddleware, (req, res) => {

    const {
        name,
        phone,
        address,
        location,
        latitude,
        longitude
    } = req.body;

    if (!name || !String(name).trim()) {
        return res.status(400).json({
            error: "اسم المحل مطلوب"
        });
    }

    const sql = `
        INSERT INTO shops
        (name, phone, address, location, latitude, longitude)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.run(
        sql,
        [
            String(name).trim(),
            phone || "",
            address || "",
            location || "",
            latitude || null,
            longitude || null
        ],
        function (err) {

            if (err) {
                console.error(err);
                return res.status(500).json({
                    error: "تعذر تسجيل المحل"
                });
            }

            const shopId = this.lastID;

            db.run(
                `UPDATE users SET shop_id = ? WHERE id = ?`,
                [shopId, req.user.id],
                (updateErr) => {

                    if (updateErr) {
                        console.error(updateErr);
                        return res.status(500).json({
                            error: "تم إنشاء المحل لكن تعذر ربطه بالحساب"
                        });
                    }

                    res.json({
                        success: true,
                        shop_id: shopId
                    });
                }
            );
        }
    );
});

// ========================================
// ✏️ تعديل محل
// ========================================

app.put("/api/shops/:id", (req, res) => {

    const id = req.params.id;

    const {
        name,
        phone,
        address,
        location,
        latitude,
        longitude
    } = req.body;

    db.run(
        `
        UPDATE shops
        SET
            name = ?,
            phone = ?,
            address = ?,
            location = ?,
            latitude = ?,
            longitude = ?

        WHERE id = ?
        `,
        [
            name || "",
            phone || "",
            address || "",
            location || "",
            latitude || null,
            longitude || null,
            id
        ],
        function (err) {

            if (err) {
                console.error(err);
                return res.status(500).json({
                    error: "تعذر تعديل المحل"
                });
            }

            res.json({
                success: true
            });
        }
    );
});

// ========================================
// 🗑️ حذف محل
// ========================================

app.delete("/api/shops/:id", (req, res) => {

    const id = req.params.id;

    db.run(
        `DELETE FROM shops WHERE id = ?`,
        [id],
        function (err) {

            if (err) {
                console.error(err);
                return res.status(500).json({
                    error: "تعذر حذف المحل"
                });
            }

            res.json({
                success: true
            });
        }
    );
});

// ========================================
// 🔧 عرض قطع الغيار
// ========================================

app.get("/api/parts", (req, res) => {

    const sql = `
        SELECT
            parts.*,
            shops.name AS shop_name,
            shops.phone,
            shops.address,
            shops.location,
            shops.latitude,
            shops.longitude

        FROM parts

        LEFT JOIN shops
        ON parts.shop_id = shops.id

        ORDER BY parts.id DESC
    `;

    db.all(sql, [], (err, rows) => {

        if (err) {
            console.error(err);
            return res.status(500).json({
                error: "حدث خطأ"
            });
        }

        res.json(rows);
    });
});

// ========================================
// ➕ إضافة قطعة غيار
// ========================================

app.post(
    "/api/parts",
    app.authMiddleware,
    upload.single("image"),
    (req, res) => {

        const {
            name,
            part_number,
            car_model,
            price,
            quantity
        } = req.body;

        if (!name || !String(name).trim()) {
            return res.status(400).json({
                error: "اسم قطعة الغيار مطلوب"
            });
        }

        const shopId = req.user.shop_id;

        if (!shopId) {
            return res.status(400).json({
                error: "يجب تسجيل محل أولاً قبل إضافة قطع الغيار"
            });
        }

        const image = req.file
            ? "/uploads/" + req.file.filename
            : "";

        const sql = `
            INSERT INTO parts
            (
                shop_id,
                name,
                part_number,
                car_model,
                price,
                quantity,
                image
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        db.run(
            sql,
            [
                shopId,
                String(name).trim(),
                part_number || "",
                car_model || "",
                price || 0,
                quantity || 0,
                image
            ],
            function (err) {

                if (err) {
                    console.error(err);

                    return res.status(500).json({
                        error: "تعذر إضافة القطعة"
                    });
                }

                res.json({
                    success: true,
                    part_id: this.lastID,
                    image: image
                });
            }
        );
    }
);

// ========================================
// ✏️ تعديل قطعة
// ========================================


// ========================================

app.put("/api/parts/:id", (req, res) => {

    const id = req.params.id;

    const {
        shop_id,
        name,
        part_number,
        car_model,
        price,
        quantity
    } = req.body;

    db.run(
        `
        UPDATE parts

        SET
            shop_id = ?,
            name = ?,
            part_number = ?,
            car_model = ?,
            price = ?,
            quantity = ?

        WHERE id = ?
        `,
        [
            shop_id,
            name,
            part_number || "",
            car_model || "",
            price || 0,
            quantity || 0,
            id
        ],
        function (err) {

            if (err) {
                console.error(err);

                return res.status(500).json({
                    error: "تعذر تعديل القطعة"
                });
            }

            res.json({
                success: true
            });
        }
    );
});

// ========================================
// 🗑️ حذف قطعة
// ========================================

app.delete("/api/parts/:id", (req, res) => {

    const id = req.params.id;

    db.run(
        `DELETE FROM parts WHERE id = ?`,
        [id],
        function (err) {

            if (err) {
                console.error(err);

                return res.status(500).json({
                    error: "تعذر حذف القطعة"
                });
            }

            res.json({
                success: true
            });
        }
    );
});

// ========================================
// 🏠 الصفحة الرئيسية
// ========================================

app.get("/", (req, res) => {

    res.sendFile(
        path.join(__dirname, "public", "index.html")
    );
});

// ========================================
// 🚀 تشغيل السيرفر
// ========================================

app.listen(PORT, "0.0.0.0", () => {

    console.log(
        `ASPEERK running on port ${PORT}`
    );

});

