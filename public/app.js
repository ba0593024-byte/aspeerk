// ========================================
// 🔍 البحث عن قطع الغيار
// ========================================

async function searchParts() {
    const searchInput = document.getElementById("searchInput");
    const results = document.getElementById("results");

    const search = searchInput.value.trim();

    if (!search) {
        results.innerHTML = `
            <h2>النتائج</h2>
            <p>اكتب اسم القطعة أو رقمها أولاً.</p>
        `;
        return;
    }

    results.innerHTML = `
        <h2>النتائج</h2>
        <p>🔍 جاري البحث...</p>
    `;

    try {
        const response = await fetch(
            "/api/search?q=" + encodeURIComponent(search)
        );

        const parts = await response.json();

        if (!response.ok) {
            throw new Error("Search failed");
        }

        if (parts.length === 0) {
            results.innerHTML = `
                <h2>النتائج</h2>
                <p>❌ لم نجد هذه القطعة حاليًا.</p>
            `;
            return;
        }

        results.innerHTML = `
            <h2>وجدنا ${parts.length} نتيجة</h2>

            ${parts.map(part => `
                <div class="card">
                    <h3>🔧 ${part.name || "بدون اسم"}</h3>

                    <p>🚗 السيارة:
                        ${part.car_model || "غير محددة"}
                    </p>

                    <p>🔢 رقم القطعة:
                        ${part.part_number || "غير متوفر"}
                    </p>

                    <p>💰 السعر:
                        ${part.price ?? 0} جنيه
                    </p>

                    <p>📦 الكمية:
                        ${part.quantity ?? 0}
                    </p>

                    <p>🏪 المحل:
                        ${part.shop_name || "غير معروف"}
                    </p>

                    <p>📍 الموقع:
                        ${part.location || "غير محدد"}
                    </p>

                    <p>📞 الهاتف:
                        ${part.phone || "غير متوفر"}
                    </p>
                </div>
            `).join("")}
        `;

    } catch (error) {
        console.error(error);

        results.innerHTML = `
            <h2>النتائج</h2>
            <p>⚠️ حدث خطأ أثناء البحث.</p>
        `;
    }
}


// ========================================
// 🏪 تحميل المحلات
// ========================================

async function loadShops() {

    const shopSelect = document.getElementById("shopId");

    if (!shopSelect) return;

    try {

        const response = await fetch("/api/shops");
        const shops = await response.json();

        shopSelect.innerHTML =
            '<option value="">🏪 اختر المحل</option>';

        shops.forEach(shop => {

            const option = document.createElement("option");

            option.value = shop.id;

            option.textContent =
                shop.name +
                (shop.location ? " - " + shop.location : "");

            shopSelect.appendChild(option);
        });

    } catch (error) {

        console.error("خطأ في تحميل المحلات:", error);

    }
}


// ========================================
// 🏪 تسجيل محل جديد
// ========================================

async function addShop() {

    const data = {
        name: document.getElementById("shopName").value.trim(),
        phone: document.getElementById("shopPhone").value.trim(),
        address: document.getElementById("shopAddress").value.trim(),
        location: document.getElementById("shopLocation").value.trim()
    };

    const message = document.getElementById("shopMessage");

    if (!data.name) {
        message.innerHTML = "⚠️ اكتب اسم المحل أولاً";
        return;
    }

    try {

        const response = await fetch("/api/shops", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {

            message.innerHTML =
                "✅ تم تسجيل المحل بنجاح. رقم المحل: " +
                result.shop_id;

            document.getElementById("shopName").value = "";
            document.getElementById("shopPhone").value = "";
            document.getElementById("shopAddress").value = "";
            document.getElementById("shopLocation").value = "";

            await loadShops();

        } else {

            message.innerHTML =
                "❌ " + (result.error || "حدث خطأ");

        }

    } catch (error) {

        console.error(error);

        message.innerHTML =
            "⚠️ تعذر الاتصال بالخادم";
    }
}


// ========================================
// 🔧 إضافة قطعة غيار
// ========================================

async function addPart() {

    const data = {
        shop_id: document.getElementById("shopId").value,
        name: document.getElementById("partName").value.trim(),
        part_number: document.getElementById("partNumber").value.trim(),
        car_model: document.getElementById("carModel").value.trim(),
        price: document.getElementById("partPrice").value,
        quantity: document.getElementById("partQuantity").value
    };

    const message = document.getElementById("partMessage");

    if (!data.shop_id) {
        message.innerHTML = "⚠️ اختر المحل أولاً";
        return;
    }

    if (!data.name) {
        message.innerHTML = "⚠️ اكتب اسم القطعة أولاً";
        return;
    }

    try {

        const response = await fetch("/api/parts", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {

            message.innerHTML =
                "✅ تمت إضافة قطعة الغيار بنجاح";

            document.getElementById("partName").value = "";
            document.getElementById("partNumber").value = "";
            document.getElementById("carModel").value = "";
            document.getElementById("partPrice").value = "";
            document.getElementById("partQuantity").value = "";

        } else {

            message.innerHTML =
                "❌ " + (result.error || "حدث خطأ");

        }

    } catch (error) {

        console.error(error);

        message.innerHTML =
            "⚠️ تعذر الاتصال بالخادم";
    }
}


// ========================================
// 🛠️ إدارة البيانات
// ========================================

async function loadManagement() {

    const management =
        document.getElementById("management");

    management.innerHTML =
        "<p>🔄 جاري تحميل البيانات...</p>";

    try {

        const shopsResponse =
            await fetch("/api/shops");

        const shops =
            await shopsResponse.json();

        if (!shops.length) {

            management.innerHTML =
                "<p>لا توجد محلات مسجلة.</p>";

            return;
        }

        let html = "";

        for (const shop of shops) {

            html += `
                <div class="card">

                    <h3>🏪 ${shop.name}</h3>

                    <p>📞 ${shop.phone || "لا يوجد رقم"}</p>

                    <p>📍 ${shop.location || "غير محدد"}</p>

                    <p>🏠 ${shop.address || "غير محدد"}</p>

                    <button onclick="editShop(
                        ${shop.id},
                        '${escapeText(shop.name)}',
                        '${escapeText(shop.phone || "")}',
                        '${escapeText(shop.address || "")}',
                        '${escapeText(shop.location || "")}'
                    )">
                        ✏️ تعديل المحل
                    </button>

                    <button onclick="deleteShop(${shop.id})">
                        🗑️ حذف المحل
                    </button>

                </div>
            `;
        }

        management.innerHTML = html;

    } catch (error) {

        console.error(error);

        management.innerHTML =
            "<p>⚠️ تعذر تحميل البيانات.</p>";
    }
}


// ========================================
// ✏️ تعديل محل
// ========================================

async function editShop(
    id,
    name,
    phone,
    address,
    location
) {

    const newName =
        prompt("اسم المحل:", name);

    if (newName === null) return;

    const newPhone =
        prompt("رقم الهاتف:", phone);

    if (newPhone === null) return;

    const newAddress =
        prompt("عنوان المحل:", address);

    if (newAddress === null) return;

    const newLocation =
        prompt("الموقع / المنطقة:", location);

    if (newLocation === null) return;

    try {

        const response = await fetch(
            "/api/shops/" + id,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    name: newName,
                    phone: newPhone,
                    address: newAddress,
                    location: newLocation
                })
            }
        );

        const result = await response.json();

        alert(
            result.success
                ? "✅ تم تعديل المحل"
                : "❌ " + result.error
        );

        if (result.success) {

            await loadShops();
            await loadManagement();
        }

    } catch (error) {

        alert("⚠️ تعذر الاتصال بالخادم");
    }
}


// ========================================
// 🗑️ حذف محل
// ========================================

async function deleteShop(id) {

    const confirmed =
        confirm(
            "⚠️ هل أنت متأكد من حذف هذا المحل؟"
        );

    if (!confirmed) return;

    try {

        const response = await fetch(
            "/api/shops/" + id,
            {
                method: "DELETE"
            }
        );

        const result = await response.json();

        alert(
            result.success
                ? "✅ تم حذف المحل"
                : "❌ " + result.error
        );

        if (result.success) {

            await loadShops();
            await loadManagement();
        }

    } catch (error) {

        alert("⚠️ تعذر الاتصال بالخادم");
    }
}


// ========================================
// 🧹 حماية النصوص
// ========================================

function escapeText(text) {

    return String(text)
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'")
        .replace(/\n/g, "\\n")
        .replace(/\r/g, "\\r");
}


// ========================================
// 🚀 تشغيل عند فتح الموقع
// ========================================

document.addEventListener(
    "DOMContentLoaded",
    () => {
        loadShops();
    }
);






// ========================================
// 🔧 إدارة قطع الغيار
// ========================================

async function loadManagement() {

    const management =
        document.getElementById("management");

    management.innerHTML =
        "<p>🔄 جاري تحميل المحلات وقطع الغيار...</p>";

    try {

        const shopsResponse =
            await fetch("/api/shops");

        const partsResponse =
            await fetch("/api/parts");

        const shops =
            await shopsResponse.json();

        const parts =
            await partsResponse.json();

        if (!shops.length) {

            management.innerHTML =
                "<p>لا توجد محلات مسجلة.</p>";

            return;
        }

        let html = "";

        for (const shop of shops) {

            const shopParts =
                parts.filter(
                    part => Number(part.shop_id) === Number(shop.id)
                );

            html += `
                <div class="card">

                    <h3>🏪 ${escapeText(shop.name)}</h3>

                    <p>📞 ${escapeText(shop.phone || "لا يوجد رقم")}</p>

                    <p>📍 ${escapeText(shop.location || "غير محدد")}</p>

                    <p>🏠 ${escapeText(shop.address || "غير محدد")}</p>

                    <button onclick="editShop(
                        ${shop.id},
                        '${escapeText(shop.name)}',
                        '${escapeText(shop.phone || "")}',
                        '${escapeText(shop.address || "")}',
                        '${escapeText(shop.location || "")}'
                    )">
                        ✏️ تعديل المحل
                    </button>

                    <button onclick="deleteShop(${shop.id})">
                        🗑️ حذف المحل
                    </button>

                    <hr>

                    <h4>🔧 قطع الغيار (${shopParts.length})</h4>
            `;

            if (!shopParts.length) {

                html += `
                    <p>لا توجد قطع غيار مسجلة لهذا المحل.</p>
                `;

            } else {

                for (const part of shopParts) {

                    html += `
                        <div class="card">

                            <h4>🔧 ${escapeText(part.name)}</h4>

                            <p>🔢 رقم القطعة:
                                ${escapeText(part.part_number || "غير محدد")}
                            </p>

                            <p>🚗 السيارة:
                                ${escapeText(part.car_model || "غير محددة")}
                            </p>

                            <p>💰 السعر:
                                ${escapeText(String(part.price ?? "0"))}
                            </p>

                            <p>📦 الكمية:
                                ${escapeText(String(part.quantity ?? "0"))}
                            </p>

                            <button onclick="editPart(${part.id})">
                                ✏️ تعديل القطعة
                            </button>

                            <button onclick="deletePart(${part.id})">
                                🗑️ حذف القطعة
                            </button>

                        </div>
                    `;
                }
            }

            html += `
                </div>
            `;
        }

        management.innerHTML = html;

    } catch (error) {

        console.error(error);

        management.innerHTML =
            "<p>⚠️ تعذر تحميل البيانات.</p>";
    }
}


// ========================================
// ✏️ تعديل قطعة غيار
// ========================================

async function editPart(id) {

    try {

        const response =
            await fetch("/api/parts");

        const parts =
            await response.json();

        const part =
            parts.find(
                item => Number(item.id) === Number(id)
            );

        if (!part) {

            alert("❌ القطعة غير موجودة");

            return;
        }

        const name =
            prompt("اسم القطعة:", part.name);

        if (name === null) return;

        const partNumber =
            prompt(
                "رقم القطعة:",
                part.part_number || ""
            );

        if (partNumber === null) return;

        const carModel =
            prompt(
                "موديل السيارة:",
                part.car_model || ""
            );

        if (carModel === null) return;

        const price =
            prompt(
                "السعر:",
                part.price ?? ""
            );

        if (price === null) return;

        const quantity =
            prompt(
                "الكمية:",
                part.quantity ?? ""
            );

        if (quantity === null) return;

        const updateResponse =
            await fetch(
                "/api/parts/" + id,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        name: name,
                        part_number: partNumber,
                        car_model: carModel,
                        price: price,
                        quantity: quantity
                    })
                }
            );

        const result =
            await updateResponse.json();

        if (!result.success) {

            alert(
                "❌ " +
                (result.error || "تعذر تعديل القطعة")
            );

            return;
        }

        alert("✅ تم تعديل القطعة بنجاح");

        await loadManagement();

    } catch (error) {

        console.error(error);

        alert("⚠️ تعذر الاتصال بالخادم");
    }
}


// ========================================
// 🗑️ حذف قطعة غيار
// ========================================

async function deletePart(id) {

    const confirmed =
        confirm(
            "⚠️ هل أنت متأكد من حذف قطعة الغيار هذه؟\n\nلا يمكن التراجع عن الحذف."
        );

    if (!confirmed) return;

    try {

        const response =
            await fetch(
                "/api/parts/" + id,
                {
                    method: "DELETE"
                }
            );

        const result =
            await response.json();

        if (!result.success) {

            alert(
                "❌ " +
                (result.error || "تعذر حذف القطعة")
            );

            return;
        }

        alert("✅ تم حذف القطعة بنجاح");

        await loadManagement();

    } catch (error) {

        console.error(error);

        alert("⚠️ تعذر الاتصال بالخادم");
    }
}

