const bcrypt = require("bcryptjs");
const crypto = require("crypto");

function setupAuth(app, db) {
    db.run(`
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token_hash TEXT NOT NULL UNIQUE,
            expires_at TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    app.post("/api/auth/register", async (req, res) => {
        try {
            const { name, phone, password, shop_id } = req.body;

            if (!name || !phone || !password) {
                return res.status(400).json({
                    error: "الاسم ورقم الهاتف وكلمة المرور مطلوبة"
                });
            }

            if (String(password).length < 6) {
                return res.status(400).json({
                    error: "كلمة المرور يجب أن تكون 6 أحرف أو أكثر"
                });
            }

            const cleanName = String(name).trim();
            const cleanPhone = String(phone).trim();

            db.get(
                `SELECT id FROM users WHERE phone = ?`,
                [cleanPhone],
                async (err, existingUser) => {
                    if (err) {
                        console.error(err);
                        return res.status(500).json({
                            error: "حدث خطأ في قاعدة البيانات"
                        });
                    }

                    if (existingUser) {
                        return res.status(400).json({
                            error: "رقم الهاتف مسجل مسبقًا"
                        });
                    }

                    const hashedPassword = await bcrypt.hash(
                        String(password),
                        10
                    );

                    db.run(
                        `
                        INSERT INTO users
                        (name, phone, password, shop_id)
                        VALUES (?, ?, ?, ?)
                        `,
                        [
                            cleanName,
                            cleanPhone,
                            hashedPassword,
                            shop_id || null
                        ],
                        function (err) {
                            if (err) {
                                console.error(err);
                                return res.status(500).json({
                                    error: "تعذر إنشاء الحساب"
                                });
                            }

                            const userId = this.lastID;

                            const startDate = new Date();
                            const endDate = new Date(startDate);
                            endDate.setMonth(
                                endDate.getMonth() + 3
                            );

                            db.run(
                                `
                                INSERT INTO subscriptions
                                (
                                    user_id,
                                    plan_id,
                                    start_date,
                                    end_date,
                                    status
                                )
                                VALUES (?, 1, ?, ?, 'active')
                                `,
                                [
                                    userId,
                                    startDate.toISOString(),
                                    endDate.toISOString()
                                ],
                                (subErr) => {
                                    if (subErr) {
                                        console.error(subErr);
                                        return res.status(500).json({
                                            error:
                                                "تم إنشاء الحساب لكن تعذر إنشاء الاشتراك"
                                        });
                                    }

                                    res.json({
                                        success: true,
                                        message:
                                            "تم إنشاء الحساب وبدأت فترة 3 أشهر مجانية",
                                        user_id: userId,
                                        subscription_end:
                                            endDate.toISOString()
                                    });
                                }
                            );
                        }
                    );
                }
            );
        } catch (error) {
            console.error(error);

            res.status(500).json({
                error: "حدث خطأ أثناء التسجيل"
            });
        }
    });

    app.post("/api/auth/login", (req, res) => {
        const { phone, password } = req.body;

        if (!phone || !password) {
            return res.status(400).json({
                error: "رقم الهاتف وكلمة المرور مطلوبان"
            });
        }

        db.get(
            `SELECT * FROM users WHERE phone = ?`,
            [String(phone).trim()],
            async (err, user) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({
                        error: "حدث خطأ"
                    });
                }

                if (!user) {
                    return res.status(401).json({
                        error:
                            "رقم الهاتف أو كلمة المرور غير صحيحة"
                    });
                }

                const valid = await bcrypt.compare(
                    String(password),
                    user.password
                );

                if (!valid) {
                    return res.status(401).json({
                        error:
                            "رقم الهاتف أو كلمة المرور غير صحيحة"
                    });
                }

                const token = crypto
                    .randomBytes(32)
                    .toString("hex");

                const tokenHash = crypto
                    .createHash("sha256")
                    .update(token)
                    .digest("hex");

                const expires = new Date();
                expires.setDate(expires.getDate() + 30);

                db.run(
                    `
                    INSERT INTO sessions
                    (user_id, token_hash, expires_at)
                    VALUES (?, ?, ?)
                    `,
                    [
                        user.id,
                        tokenHash,
                        expires.toISOString()
                    ],
                    (sessionErr) => {
                        if (sessionErr) {
                            console.error(sessionErr);
                            return res.status(500).json({
                                error:
                                    "تعذر تسجيل الدخول"
                            });
                        }

                        res.json({
                            success: true,
                            token: token,
                            user: {
                                id: user.id,
                                name: user.name,
                                phone: user.phone,
                                shop_id: user.shop_id
                            }
                        });
                    }
                );
            }
        );
    });

    app.get(
        "/api/auth/subscription/:userId",
        (req, res) => {
            db.get(
                `
                SELECT
                    subscriptions.*,
                    plans.name AS plan_name,
                    plans.months,
                    plans.price
                FROM subscriptions
                JOIN plans
                ON subscriptions.plan_id = plans.id
                WHERE subscriptions.user_id = ?
                ORDER BY subscriptions.id DESC
                LIMIT 1
                `,
                [req.params.userId],
                (err, row) => {
                    if (err) {
                        console.error(err);
                        return res.status(500).json({
                            error: "حدث خطأ"
                        });
                    }

                    if (!row) {
                        return res.status(404).json({
                            error: "لا يوجد اشتراك"
                        });
                    }

                    res.json(row);
                }
            );
        }
    );

    app.authMiddleware = (req, res, next) => {
        const authHeader = req.headers.authorization || "";
        const token = authHeader.startsWith("Bearer ")
            ? authHeader.slice(7).trim()
            : "";

        if (!token) {
            return res.status(401).json({
                error: "يجب تسجيل الدخول أولاً"
            });
        }

        const tokenHash = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

        db.get(
            `
            SELECT users.id, users.name, users.phone, users.shop_id
            FROM sessions
            JOIN users ON users.id = sessions.user_id
            WHERE sessions.token_hash = ?
              AND sessions.expires_at > ?
            `,
            [tokenHash, new Date().toISOString()],
            (err, user) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({
                        error: "حدث خطأ أثناء التحقق من الجلسة"
                    });
                }

                if (!user) {
                    return res.status(401).json({
                        error: "جلسة الدخول غير صالحة أو منتهية"
                    });
                }

                req.user = user;
                next();
            }
        );
    }

    app.get("/api/auth/me", app.authMiddleware, (req, res) => {
        res.json({
            id: req.user.id,
            name: req.user.name,
            phone: req.user.phone,
            shop_id: req.user.shop_id
        });
    });;

    
}
module.exports = setupAuth;
