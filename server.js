
const express = require("express");
const path = require("path");
const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();

const app = express();
fs.mkdirSync("./data", { recursive: true });
const PORT = process.env.PORT || 3000;

// قاعدة البيانات
const db = new sqlite3.Database("./data/aspeerk.db");
// إنشاء جداول قاعدة البيانات تلقائياً
db.serialize(() => {

    db.run(`
        CREATE TABLE IF NOT EXISTS shops (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT,
            address TEXT,
            location TEXT
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
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));


// ========================================
// 🔍 البحث عن قطع الغيار
// ========================================

app.get("/api/search", (req, res) => {
    const q = (req.query.q || "").trim();

    if (!q) {
        return res.json([]);
    }

    const sql = `
        SELECT
            parts.id,
            parts.name,
            parts.part_number,
            parts.car_model,
            parts.price,
            parts.quantity,
            shops.name AS shop_name,
            shops.phone,
            shops.address,
            shops.location
        FROM parts
        JOIN shops ON parts.shop_id = shops.id
        WHERE parts.name LIKE ?
           OR parts.part_number LIKE ?
           OR parts.car_model LIKE ?
        ORDER BY parts.price ASC
    `;

    const search = "%" + q + "%";

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
// 🏪 تسجيل محل جديد
// ========================================

app.post("/api/shops", (req, res) => {
    const {
        name,
        phone,
        address,
        location
    } = req.body;

    if (!name || !name.trim()) {
        return res.status(400).json({
            error: "اسم المحل مطلوب"
        });
    }

    const sql = `
        INSERT INTO shops
        (name, phone, address, location)
        VALUES (?, ?, ?, ?)
    `;

    db.run(
        sql,
        [
            name.trim(),
            phone || "",
            address || "",
            location || ""
        ],
        function(err) {

            if (err) {
                console.error(err);

                return res.status(500).json({
                    error: "تعذر تسجيل المحل"
                });
            }

            res.json({
                success: true,
                shop_id: this.lastID,
                message: "تم تسجيل المحل بنجاح"
            });
        }
    );
});


// ========================================
// 🏪 جلب جميع المحلات
// ========================================

app.get("/api/shops", (req, res) => {

    db.all(
        `SELECT
            id,
            name,
            phone,
            address,
            location
         FROM shops
         ORDER BY name ASC`,
        [],
        (err, rows) => {

            if (err) {
                console.error(err);

                return res.status(500).json({
                    error: "تعذر جلب المحلات"
                });
            }

            res.json(rows);
        }
    );
});


// ========================================
// 🔧 إضافة قطعة غيار
// ========================================

app.post("/api/parts", (req, res) => {

    const {
        shop_id,
        name,
        part_number,
        car_model,
        price,
        quantity
    } = req.body;

    if (!shop_id || !name || !name.trim()) {
        return res.status(400).json({
            error: "المحل واسم القطعة مطلوبان"
        });
    }

    const sql = `
        INSERT INTO parts
        (
            shop_id,
            name,
            part_number,
            car_model,
            price,
            quantity
        )
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.run(
        sql,
        [
            shop_id,
            name.trim(),
            part_number || "",
            car_model || "",
            Number(price) || 0,
            Number(quantity) || 0
        ],
        function(err) {

            if (err) {
                console.error(err);

                return res.status(500).json({
                    error: "تعذر إضافة القطعة"
                });
            }

            res.json({
                success: true,
                part_id: this.lastID,
                message: "تمت إضافة القطعة بنجاح"
            });
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
        location
    } = req.body;

    if (!name || !name.trim()) {
        return res.status(400).json({
            error: "اسم المحل مطلوب"
        });
    }

    db.run(
        `UPDATE shops
         SET name = ?,
             phone = ?,
             address = ?,
             location = ?
         WHERE id = ?`,
        [
            name.trim(),
            phone || "",
            address || "",
            location || "",
            id
        ],
        function(err) {

            if (err) {
                console.error(err);

                return res.status(500).json({
                    error: "تعذر تعديل المحل"
                });
            }

            if (this.changes === 0) {
                return res.status(404).json({
                    error: "المحل غير موجود"
                });
            }

            res.json({
                success: true,
                message: "تم تعديل المحل بنجاح"
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
        function(err) {

            if (err) {
                console.error(err);

                return res.status(500).json({
                    error: "تعذر حذف المحل"
                });
            }

            if (this.changes === 0) {
                return res.status(404).json({
                    error: "المحل غير موجود"
                });
            }

            res.json({
                success: true,
                message: "تم حذف المحل بنجاح"
            });
        }
    );
});


// ========================================
// ✏️ تعديل قطعة غيار
// ========================================

app.put("/api/parts/:id", (req, res) => {

    const id = req.params.id;

    const {
        name,
        part_number,
        car_model,
        price,
        quantity
    } = req.body;

    if (!name || !name.trim()) {
        return res.status(400).json({
            error: "اسم القطعة مطلوب"
        });
    }

    db.run(
        `UPDATE parts
         SET name = ?,
             part_number = ?,
             car_model = ?,
             price = ?,
             quantity = ?
         WHERE id = ?`,
        [
            name.trim(),
            part_number || "",
            car_model || "",
            Number(price) || 0,
            Number(quantity) || 0,
            id
        ],
        function(err) {

            if (err) {
                console.error(err);

                return res.status(500).json({
                    error: "تعذر تعديل القطعة"
                });
            }

            if (this.changes === 0) {
                return res.status(404).json({
                    error: "القطعة غير موجودة"
                });
            }

            res.json({
                success: true,
                message: "تم تعديل القطعة بنجاح"
            });
        }
    );
});


// ========================================
// 🗑️ حذف قطعة غيار
// ========================================

app.delete("/api/parts/:id", (req, res) => {

    const id = req.params.id;

    db.run(
        `DELETE FROM parts WHERE id = ?`,
        [id],
        function(err) {

            if (err) {
                console.error(err);

                return res.status(500).json({
                    error: "تعذر حذف القطعة"
                });
            }

            if (this.changes === 0) {
                return res.status(404).json({
                    error: "القطعة غير موجودة"
                });
            }

            res.json({
                success: true,
                message: "تم حذف القطعة بنجاح"
            });
        }
    );
});

// ========================================
// 🔧 جلب جميع قطع الغيار
// ========================================

app.get("/api/parts", (req, res) => {

    const sql = `
        SELECT
            parts.id,
            parts.shop_id,
            parts.name,
            parts.part_number,
            parts.car_model,
            parts.price,
            parts.quantity,
            shops.name AS shop_name
        FROM parts
        JOIN shops ON parts.shop_id = shops.id
        ORDER BY parts.id DESC
    `;

    db.all(sql, [], (err, rows) => {

        if (err) {
            console.error(err);

            return res.status(500).json({
                error: "تعذر جلب قطع الغيار"
            });
        }

        res.json(rows);
    });
});
// ========================================
// 🚀 تشغيل اسبيرك
// ========================================

app.listen(PORT, () => {
    console.log(`ASPEERK running on http://localhost:${PORT}`);
});
