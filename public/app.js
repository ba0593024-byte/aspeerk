const API = "/api";

let shopLatitude = null;
let shopLongitude = null;

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function whatsappNumber(phone) {
    let number = String(phone || "").replace(/\D/g, "");

    if (number.startsWith("0")) {
        number = "249" + number.substring(1);
    }

    return number;
}

function mapUrl(latitude, longitude) {
    if (latitude == null || longitude == null) {
        return "";
    }

    return `https://www.google.com/maps?q=${latitude},${longitude}`;
}

// ========================================
// تحميل المحلات
// ========================================

async function loadShops() {
    try {
        const response = await fetch(`${API}/shops`);
        const shops = await response.json();

        const select = document.getElementById("shopId");

        if (!select) return;

        select.innerHTML = '<option value="">اختر المحل</option>';

        shops.forEach(shop => {
            const option = document.createElement("option");
            option.value = shop.id;
            option.textContent = shop.name;
            select.appendChild(option);
        });

    } catch (error) {
        console.error("خطأ في تحميل المحلات:", error);
    }
}

// ========================================
// تحديد موقع المحل
// ========================================

function getShopLocation() {
    const message = document.getElementById("locationMessage");

    if (!navigator.geolocation) {
        message.textContent = "المتصفح لا يدعم تحديد الموقع";
        return;
    }

    message.textContent = "جاري تحديد موقعك...";

    navigator.geolocation.getCurrentPosition(
        position => {
            shopLatitude = position.coords.latitude;
            shopLongitude = position.coords.longitude;

            message.textContent =
                `تم تحديد الموقع بنجاح 📍`;
        },
        error => {
            console.error(error);
            message.textContent =
                "تعذر تحديد الموقع، تأكد من السماح للموقع.";
        }
    );
}

// ========================================
// إضافة محل
// ========================================

async function addShop() {
    const name = document.getElementById("shopName").value.trim();
    const phone = document.getElementById("shopPhone").value.trim();
    const address = document.getElementById("shopAddress").value.trim();
    const location = document.getElementById("shopLocation").value.trim();
    const message = document.getElementById("shopMessage");

    if (!name) {
        message.textContent = "يرجى إدخال اسم المحل";
        return;
    }

    try {
        const response = await fetch(`${API}/shops`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name,
                phone,
                address,
                location,
                latitude: shopLatitude,
                longitude: shopLongitude
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "حدث خطأ");
        }

        message.textContent = "تمت إضافة المحل بنجاح ✅";

        document.getElementById("shopName").value = "";
        document.getElementById("shopPhone").value = "";
        document.getElementById("shopAddress").value = "";
        document.getElementById("shopLocation").value = "";

        shopLatitude = null;
        shopLongitude = null;

        await loadShops();

    } catch (error) {
        console.error(error);
        message.textContent = "حدث خطأ أثناء إضافة المحل";
    }
}

// ========================================
// البحث عن قطع الغيار
// ========================================

async function searchParts() {
    const input = document.getElementById("searchInput");
    const results = document.getElementById("results");

    const query = input.value.trim();

    if (!query) {
        results.innerHTML = "<p>اكتب اسم القطعة أو رقمها أو موديل السيارة.</p>";
        return;
    }

    results.innerHTML = "<p>جاري البحث... 🔎</p>";

    try {
        const response = await fetch(
            `${API}/search?q=${encodeURIComponent(query)}`
        );

        const parts = await response.json();

        if (!parts.length) {
            results.innerHTML = "<p>لم نجد قطع غيار مطابقة.</p>";
            return;
        }

        results.innerHTML = `
            <h3>وجدنا ${parts.length} نتيجة</h3>
            ${parts.map(part => {

                const imageHtml = part.image
                    ? `
                        <div class="part-image-box">
                            <img
                                src="${escapeHtml(part.image)}"
                                alt="${escapeHtml(part.name)}"
                                class="part-image"
                                onerror="this.parentElement.style.display='none'"
                            >
                        </div>
                    `
                    : "";

                const phone = escapeHtml(part.phone || "");
                const whatsapp = whatsappNumber(part.phone);
                const map = mapUrl(part.latitude, part.longitude);

                return `
                    <div class="part-card">

                        ${imageHtml}

                        <div class="part-info">

                            <h3>🔧 ${escapeHtml(part.name)}</h3>

                            <p>
                                🚗 السيارة:
                                ${escapeHtml(part.car_model || "غير محدد")}
                            </p>

                            <p>
                                🔢 رقم القطعة:
                                ${escapeHtml(part.part_number || "غير محدد")}
                            </p>

                            <p>
                                💰 السعر:
                                ${escapeHtml(part.price ?? "غير محدد")} جنيه
                            </p>

                            <p>
                                📦 الكمية:
                                ${escapeHtml(part.quantity ?? 0)}
                            </p>

                            <hr>

                            <p>
                                🏪 المحل:
                                <strong>${escapeHtml(part.shop_name || "غير محدد")}</strong>
                            </p>

                            <p>
                                📍 العنوان:
                                ${escapeHtml(part.address || "غير محدد")}
                            </p>

                            <p>
                                📌 الموقع:
                                ${escapeHtml(part.location || "غير محدد")}
                            </p>

                            <div class="action-buttons">

                                ${
                                    part.phone
                                    ? `
                                        <a
                                            href="tel:${phone}"
                                            class="action-button call-button"
                                        >
                                            📞 اتصال
                                        </a>

                                        <a
                                            href="https://wa.me/${whatsapp}"
                                            target="_blank"
                                            class="action-button whatsapp-button"
                                        >
                                            💬 واتساب
                                        </a>
                                    `
                                    : ""
                                }

                                ${
                                    map
                                    ? `
                                        <a
                                            href="${map}"
                                            target="_blank"
                                            class="action-button map-button"
                                        >
                                            🗺️ الخريطة
                                        </a>
                                    `
                                    : ""
                                }

                            </div>

                        </div>
                    </div>
                `;
            }).join("")}
        `;

    } catch (error) {
        console.error(error);
        results.innerHTML = "<p>حدث خطأ أثناء البحث.</p>";
    }
}

// ========================================
// البحث عند الضغط على Enter
// ========================================

document.addEventListener("DOMContentLoaded", () => {

    loadShops();

    const searchInput = document.getElementById("searchInput");

    if (searchInput) {
        searchInput.addEventListener("keydown", event => {
            if (event.key === "Enter") {
                searchParts();
            }
        });
    }

});

// ========================================
// إضافة قطعة غيار
// ========================================

async function addPart() {
    const shopId = document.getElementById("shopId").value;
    const name = document.getElementById("partName").value.trim();
    const partNumber = document.getElementById("partNumber").value.trim();
    const carModel = document.getElementById("carModel").value.trim();
    const price = document.getElementById("partPrice").value.trim();
    const quantity = document.getElementById("partQuantity").value.trim();
    const imageInput = document.getElementById("partImage");
    const message = document.getElementById("partMessage");

    if (!shopId) {
        message.textContent = "اختر المحل أولاً";
        return;
    }

    if (!name) {
        message.textContent = "أدخل اسم قطعة الغيار";
        return;
    }

    const formData = new FormData();

    formData.append("shop_id", shopId);
    formData.append("name", name);
    formData.append("part_number", partNumber);
    formData.append("car_model", carModel);
    formData.append("price", price);
    formData.append("quantity", quantity);

    if (imageInput && imageInput.files.length > 0) {

        const file = imageInput.files[0];

        if (file.size > 5 * 1024 * 1024) {
            message.textContent =
                "حجم الصورة يجب ألا يتجاوز 5 ميجابايت";
            return;
        }

        formData.append("image", file);
    }

    try {
        const response = await fetch(`${API}/parts`, {
            method: "POST",
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "حدث خطأ");
        }

        message.textContent = "تمت إضافة قطعة الغيار بنجاح ✅";

        document.getElementById("partName").value = "";
        document.getElementById("partNumber").value = "";
        document.getElementById("carModel").value = "";
        document.getElementById("partPrice").value = "";
        document.getElementById("partQuantity").value = "";

        if (imageInput) {
            imageInput.value = "";
        }

    } catch (error) {
        console.error(error);
        message.textContent =
            "حدث خطأ أثناء إضافة قطعة الغيار";
    }
}

// ========================================
// الإدارة
// ========================================

async function loadManagement() {
    const management = document.getElementById("management");

    if (!management) return;

    management.innerHTML = "<p>جاري تحميل البيانات...</p>";

    try {
        const [shopsResponse, partsResponse] = await Promise.all([
            fetch(`${API}/shops`),
            fetch(`${API}/parts`)
        ]);

        const shops = await shopsResponse.json();
        const parts = await partsResponse.json();

        management.innerHTML = `
            <h3>🏪 المحلات</h3>

            ${
                shops.length
                ? shops.map(shop => {

                    const map = mapUrl(
                        shop.latitude,
                        shop.longitude
                    );

                    return `
                        <div class="management-card">

                            <h4>${escapeHtml(shop.name)}</h4>

                            <p>📞 ${escapeHtml(shop.phone || "لا يوجد")}</p>
                            <p>📍 ${escapeHtml(shop.address || "لا يوجد")}</p>
                            <p>📌 ${escapeHtml(shop.location || "لا يوجد")}</p>

                            ${
                                map
                                ? `
                                    <a
                                        href="${map}"
                                        target="_blank"
                                        class="action-button map-button"
                                    >
                                        🗺️ الخريطة
                                    </a>
                                `
                                : ""
                            }

                            <div class="action-buttons">

                                <button onclick="editShop(${shop.id})">
                                    ✏️ تعديل
                                </button>

                                <button onclick="deleteShop(${shop.id})">
                                    🗑️ حذف
                                </button>

                            </div>

                        </div>
                    `;
                }).join("")
                : "<p>لا توجد محلات.</p>"
            }

            <h3>🔧 قطع الغيار</h3>

            ${
                parts.length
                ? parts.map(part => {

                    const imageHtml = part.image
                        ? `
                            <div class="part-image-box">
                                <img
                                    src="${escapeHtml(part.image)}"
                                    alt="${escapeHtml(part.name)}"
                                    class="part-image"
                                >
                            </div>
                        `
                        : "";

                    return `
                        <div class="management-card">

                            ${imageHtml}

                            <h4>${escapeHtml(part.name)}</h4>

                            <p>
                                🏪 المحل:
                                ${escapeHtml(part.shop_name || "غير محدد")}
                            </p>

                            <p>
                                🔢 رقم القطعة:
                                ${escapeHtml(part.part_number || "غير محدد")}
                            </p>

                            <p>
                                🚗 السيارة:
                                ${escapeHtml(part.car_model || "غير محدد")}
                            </p>

                            <p>
                                💰 السعر:
                                ${escapeHtml(part.price ?? "غير محدد")} جنيه
                            </p>

                            <p>
                                📦 الكمية:
                                ${escapeHtml(part.quantity ?? 0)}
                            </p>

                            <div class="action-buttons">

                                <button onclick="editPart(${part.id})">
                                    ✏️ تعديل
                                </button>

                                <button onclick="deletePart(${part.id})">
                                    🗑️ حذف
                                </button>

                            </div>

                        </div>
                    `;
                }).join("")
                : "<p>لا توجد قطع غيار.</p>"
            }
        `;

    } catch (error) {
        console.error(error);
        management.innerHTML =
            "<p>حدث خطأ أثناء تحميل الإدارة.</p>";
    }
}

// ========================================
// تعديل محل
// ========================================

async function editShop(id) {

    const name = prompt("اسم المحل الجديد:");
    if (name === null) return;

    const phone = prompt("رقم الهاتف:");
    if (phone === null) return;

    const address = prompt("العنوان:");
    if (address === null) return;

    const location = prompt("الموقع:");
    if (location === null) return;

    try {

        const response = await fetch(`${API}/shops/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name,
                phone,
                address,
                location
            })
        });

        if (!response.ok) {
            throw new Error("فشل تعديل المحل");
        }

        await loadManagement();
        await loadShops();

    } catch (error) {
        console.error(error);
        alert("حدث خطأ أثناء تعديل المحل");
    }
}

// ========================================
// حذف محل
// ========================================

async function deleteShop(id) {

    if (!confirm("هل أنت متأكد من حذف المحل؟")) {
        return;
    }

    try {

        const response = await fetch(`${API}/shops/${id}`, {
            method: "DELETE"
        });

        if (!response.ok) {
            throw new Error("فشل حذف المحل");
        }

        await loadManagement();
        await loadShops();

    } catch (error) {
        console.error(error);
        alert("حدث خطأ أثناء حذف المحل");
    }
}

// ========================================
// تعديل قطعة
// ========================================

async function editPart(id) {

    const name = prompt("اسم القطعة الجديد:");
    if (name === null) return;

    const partNumber = prompt("رقم القطعة:");
    if (partNumber === null) return;

    const carModel = prompt("موديل السيارة:");
    if (carModel === null) return;

    const price = prompt("السعر:");
    if (price === null) return;

    const quantity = prompt("الكمية:");
    if (quantity === null) return;

    try {

        const response = await fetch(`${API}/parts/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name,
                part_number: partNumber,
                car_model: carModel,
                price,
                quantity
            })
        });

        if (!response.ok) {
            throw new Error("فشل تعديل القطعة");
        }

        await loadManagement();

    } catch (error) {
        console.error(error);
        alert("حدث خطأ أثناء تعديل القطعة");
    }
}

// ========================================
// حذف قطعة
// ========================================

async function deletePart(id) {

    if (!confirm("هل أنت متأكد من حذف قطعة الغيار؟")) {
        return;
    }

    try {

        const response = await fetch(`${API}/parts/${id}`, {
            method: "DELETE"
        });

        if (!response.ok) {
            throw new Error("فشل حذف القطعة");
        }

        await loadManagement();

    } catch (error) {
        console.error(error);
        alert("حدث خطأ أثناء حذف القطعة");
    }
}
