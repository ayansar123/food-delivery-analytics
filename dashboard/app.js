// Food Delivery Analytics - Dashboard Engine (v3)

// SQL Query definitions for Sandbox UI
const SQL_QUERIES = {
    executive_kpis: `-- name: executive_kpis
SELECT
    'All' AS city,
    COUNT(o.order_id) AS total_orders,
    ROUND(SUM(o.subtotal), 2) AS total_gmv,
    ROUND(SUM(o.total_amount), 2) AS net_revenue,
    COUNT(DISTINCT o.customer_id) AS active_customers,
    ROUND(SUM(o.subtotal) / COUNT(o.order_id), 2) AS average_order_value,
    (SELECT ROUND(AVG(driver_rating), 2) FROM deliveries) AS average_delivery_rating,
    (SELECT ROUND(AVG((julianday(delivery_time) - julianday(pickup_time)) * 1440.0), 1) FROM deliveries) AS average_delivery_duration_min
FROM orders o
UNION ALL
SELECT
    r.city AS city,
    COUNT(o.order_id) AS total_orders,
    ROUND(SUM(o.subtotal), 2) AS total_gmv,
    ROUND(SUM(o.total_amount), 2) AS net_revenue,
    COUNT(DISTINCT o.customer_id) AS active_customers,
    ROUND(SUM(o.subtotal) / COUNT(o.order_id), 2) AS average_order_value,
    ROUND(AVG(del.driver_rating), 2) AS average_delivery_rating,
    ROUND(AVG((julianday(del.delivery_time) - julianday(del.pickup_time)) * 1440.0), 1) AS average_delivery_duration_min
FROM orders o
JOIN restaurants r ON o.restaurant_id = r.restaurant_id
LEFT JOIN deliveries del ON o.order_id = del.order_id
GROUP BY r.city;`,

    monthly_growth: `-- name: monthly_growth
SELECT
    r.city,
    strftime('%Y-%m', o.order_time) AS month,
    COUNT(o.order_id) AS total_orders,
    ROUND(SUM(o.subtotal), 2) AS total_gmv,
    ROUND(SUM(o.total_amount), 2) AS net_revenue,
    ROUND(SUM(o.discount_applied), 2) AS total_discounts,
    COUNT(CASE WHEN o.status = 'Cancelled' THEN 1 END) * 100.0 / COUNT(o.order_id) AS cancellation_rate
FROM orders o
JOIN restaurants r ON o.restaurant_id = r.restaurant_id
GROUP BY r.city, month
ORDER BY r.city, month;`,

    cuisine_analysis: `-- name: cuisine_analysis
SELECT
    r.city,
    r.cuisine_type,
    COUNT(o.order_id) AS total_orders,
    ROUND(SUM(o.subtotal), 2) AS total_gmv,
    ROUND(AVG(o.subtotal), 2) AS avg_order_spend,
    ROUND(AVG(r.rating), 2) AS avg_restaurant_rating
FROM orders o
JOIN restaurants r ON o.restaurant_id = r.restaurant_id
WHERE o.status = 'Completed'
GROUP BY r.city, r.cuisine_type
ORDER BY total_gmv DESC;`,

    vehicle_performance: `-- name: vehicle_performance
SELECT
    r.city,
    d.vehicle_type,
    COUNT(del.delivery_id) AS total_deliveries,
    ROUND(AVG(del.distance_km), 2) AS avg_distance_km,
    ROUND(AVG((julianday(del.delivery_time) - julianday(del.pickup_time)) * 1440.0), 1) AS avg_delivery_duration_min,
    ROUND(AVG(del.driver_rating), 2) AS avg_driver_rating
FROM deliveries del
JOIN drivers d ON del.driver_id = d.driver_id
JOIN orders o ON del.order_id = o.order_id
JOIN restaurants r ON o.restaurant_id = r.restaurant_id
GROUP BY r.city, d.vehicle_type;`,

    hourly_peaks: `-- name: hourly_peaks
SELECT
    r.city,
    strftime('%H', o.order_time) AS hour,
    COUNT(o.order_id) AS total_orders,
    ROUND(SUM(o.subtotal), 2) AS total_gmv,
    COUNT(CASE WHEN o.status = 'Cancelled' THEN 1 END) * 100.0 / COUNT(o.order_id) AS cancellation_rate
FROM orders o
JOIN restaurants r ON o.restaurant_id = r.restaurant_id
GROUP BY r.city, hour
ORDER BY r.city, hour;`,

    cohort_retention: `-- name: cohort_retention
WITH customer_cohorts AS (
    SELECT
        customer_id,
        city,
        strftime('%Y-%m', signup_date) AS cohort_month
    FROM customers
),
customer_activity AS (
    SELECT DISTINCT
        o.customer_id,
        strftime('%Y-%m', o.order_time) AS activity_month
    FROM orders o
    WHERE o.status = 'Completed'
),
cohort_sizes AS (
    SELECT
        cohort_month,
        city,
        COUNT(customer_id) AS cohort_size
    FROM customer_cohorts
    GROUP BY cohort_month, city
)
SELECT
    cc.cohort_month,
    cc.city,
    cs.cohort_size,
    ca.activity_month,
    ( (cast(substr(ca.activity_month, 1, 4) as integer) - cast(substr(cc.cohort_month, 1, 4) as integer)) * 12 +
      (cast(substr(ca.activity_month, 6, 2) as integer) - cast(substr(cc.cohort_month, 6, 2) as integer)) ) AS months_since_signup,
    COUNT(DISTINCT ca.customer_id) AS active_customers,
    ROUND(CAST(COUNT(DISTINCT ca.customer_id) AS REAL) / cs.cohort_size * 100, 1) AS retention_rate
FROM customer_cohorts cc
JOIN customer_activity ca ON cc.customer_id = ca.customer_id
JOIN cohort_sizes cs ON cc.cohort_month = cs.cohort_month AND cc.city = cs.city
WHERE ca.activity_month >= cc.cohort_month
GROUP BY cc.cohort_month, cc.city, ca.activity_month
ORDER BY cc.cohort_month, cc.city, ca.activity_month;`,

    tier_comparison: `-- name: tier_comparison
SELECT
    c.city,
    c.customer_tier,
    COUNT(DISTINCT c.customer_id) AS total_customers,
    COUNT(o.order_id) AS total_orders,
    ROUND(SUM(o.subtotal), 2) AS total_gmv,
    ROUND(AVG(o.subtotal), 2) AS avg_subtotal,
    ROUND(AVG(o.delivery_fee), 2) AS avg_delivery_fee,
    ROUND(SUM(o.discount_applied), 2) AS total_discounts
FROM orders o
JOIN customers c ON o.customer_id = c.customer_id
GROUP BY c.city, c.customer_tier;`,

    top_restaurants: `-- name: top_restaurants
SELECT
    r.name AS restaurant_name,
    r.cuisine_type,
    r.city,
    COUNT(o.order_id) AS total_orders,
    ROUND(SUM(o.subtotal), 2) AS total_sales,
    ROUND(AVG(r.rating), 2) AS rating
FROM orders o
JOIN restaurants r ON o.restaurant_id = r.restaurant_id
WHERE o.status = 'Completed'
GROUP BY r.restaurant_id
ORDER BY total_sales DESC;`
};

// Global Preferences
let currencySymbol = localStorage.getItem("analytics_currency") || "$";
let displayName = localStorage.getItem("analytics_username") || "Admin";
let defaultCity = localStorage.getItem("analytics_default_city") || "All";
let currentCityFilter = "All";

// Global Chart Instances & Colors
let growthChart = null;
let cuisineDoughnutChart = null;
let peaksChart = null;
let deliveryChart = null;

let chartTextColor = '#cbd5e1';
let chartGridColor = 'rgba(255, 255, 255, 0.03)';

// Accent Color and Helper Utilities (v4)
function getPrimaryColorHex() {
    const accent = localStorage.getItem("analytics_accent_color") || "purple";
    if (accent === "blue") return "#3b82f6";
    if (accent === "emerald") return "#10b981";
    if (accent === "amber") return "#f59e0b";
    if (accent === "rose") return "#f43f5e";
    return "#a855f7"; // purple
}

function getPrimaryRGBA(opacity) {
    const accent = localStorage.getItem("analytics_accent_color") || "purple";
    if (accent === "blue") return `rgba(59, 130, 246, ${opacity})`;
    if (accent === "emerald") return `rgba(16, 185, 129, ${opacity})`;
    if (accent === "amber") return `rgba(245, 158, 11, ${opacity})`;
    if (accent === "rose") return `rgba(244, 63, 94, ${opacity})`;
    return `rgba(168, 85, 247, ${opacity})`; // purple
}

function applyAccentColor(color) {
    document.body.setAttribute("data-accent", color);
    const colorDots = document.querySelectorAll(".color-dot");
    colorDots.forEach(dot => {
        if (dot.getAttribute("data-color") === color) {
            dot.classList.add("active");
            dot.style.borderColor = "var(--text-primary)";
        } else {
            dot.classList.remove("active");
            dot.style.borderColor = "transparent";
        }
    });
}

function updateAvatarUI(avatar) {
    let emoji = "💼";
    if (avatar === "analyst") emoji = "📈";
    else if (avatar === "developer") emoji = "💻";
    else if (avatar === "guest") emoji = "👤";
    
    const avatarDisplay = document.getElementById("user-avatar-display");
    if (avatarDisplay) {
        avatarDisplay.textContent = emoji;
    }
}

// Live Dispatch Event Feed
function addDispatchLog(log) {
    const feed = document.getElementById("live-activity-feed");
    if (!feed) return;
    
    const card = document.createElement("div");
    card.className = "feed-event-card";
    
    let icon = '<i class="fa-solid fa-circle-info" style="color: var(--primary);"></i>';
    let iconBg = 'rgba(168, 85, 247, 0.08)';
    
    if (log.type === 'success') {
        icon = '<i class="fa-solid fa-circle-check" style="color: var(--success);"></i>';
        iconBg = 'rgba(16, 185, 129, 0.08)';
    } else if (log.type === 'warning') {
        icon = '<i class="fa-solid fa-circle-exclamation" style="color: var(--warning);"></i>';
        iconBg = 'rgba(245, 158, 11, 0.08)';
    } else if (log.type === 'danger') {
        icon = '<i class="fa-solid fa-circle-xmark" style="color: var(--danger);"></i>';
        iconBg = 'rgba(244, 63, 94, 0.08)';
    }
    
    card.innerHTML = `
        <div class="event-icon-wrapper" style="background-color: ${iconBg};">
            ${icon}
        </div>
        <div class="event-info-desc">
            <span class="event-title">${log.title}</span>
            <div class="event-meta">
                <span style="font-weight: 500;">${log.desc}</span>
                <span style="font-size:10px; opacity:0.8; font-family: monospace;">${log.time}</span>
            </div>
        </div>
    `;
    
    feed.insertBefore(card, feed.firstChild);
    if (feed.children.length > 25) {
        feed.removeChild(feed.lastChild);
    }
}
window.addDispatchLog = addDispatchLog;

function seedLiveFeed() {
    const feed = document.getElementById("live-activity-feed");
    if (!feed || feed.children.length > 0) return;
    
    const timeNow = new Date();
    const formatTime = (offsetSec) => {
        const d = new Date(timeNow.getTime() - offsetSec * 1000);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };
    
    const initialEvents = [
        { type: 'info', title: 'System Diagnostics Clean', desc: 'SQLite Integrity Check passed successfully.', time: formatTime(60) },
        { type: 'success', title: 'Premium Tier Signup in Chicago', desc: 'User Robert T. upgraded to Premium.', time: formatTime(45) },
        { type: 'info', title: 'Driver Marcus Dispatched', desc: 'Scooter dispatched to Taj Mahal in Miami.', time: formatTime(25) },
        { type: 'warning', title: 'Bicycle Delay Warning in New York', desc: 'Driver Chloe experiencing slow transit speeds.', time: formatTime(5) }
    ];
    
    initialEvents.forEach(e => addDispatchLog(e));
}

// Populate Database Schema Explorer
function populateSchemaExplorer(diag) {
    if (!diag || diag.status !== "Success") return;
    
    document.getElementById("diag-file-size").textContent = `${diag.file_size_kb.toFixed(1)} KB`;
    document.getElementById("diag-integrity").textContent = diag.integrity_check;
    document.getElementById("diag-tables").textContent = diag.total_tables;
    document.getElementById("diag-rows").textContent = formatNumber(diag.total_rows);
    
    const grid = document.getElementById("schema-tables-grid");
    if (!grid) return;
    grid.innerHTML = "";
    
    const tableOrder = ['customers', 'restaurants', 'drivers', 'orders', 'deliveries', 'order_items'];
    
    tableOrder.forEach(tableName => {
        const tableData = diag.tables[tableName];
        if (!tableData) return;
        
        const card = document.createElement("div");
        card.className = "schema-table-card card animate-card";
        
        let colsHTML = "";
        tableData.columns.forEach(col => {
            let keyIcon = '<span class="key-icon"></span>';
            if (col.pk) {
                keyIcon = '<span class="key-icon pk" title="Primary Key"><i class="fa-solid fa-key"></i></span>';
            } else {
                const isFk = tableData.foreign_keys.some(fk => fk.from === col.name);
                if (isFk) {
                    const fkDetail = tableData.foreign_keys.find(fk => fk.from === col.name);
                    keyIcon = `<span class="key-icon fk" title="Foreign Key to ${fkDetail.table}.${fkDetail.to}"><i class="fa-solid fa-link"></i></span>`;
                }
            }
            
            colsHTML += `
                <div class="col-row">
                    <div class="col-left">
                        ${keyIcon}
                        <span class="col-name">${col.name}</span>
                    </div>
                    <span class="col-type">${col.type.toLowerCase()}</span>
                </div>
            `;
        });
        
        card.innerHTML = `
            <div class="table-card-header">
                <h4><i class="fa-solid fa-table" style="color: var(--primary); margin-right: 8px;"></i>${tableName}</h4>
                <span class="row-count-badge">${formatNumber(tableData.rows)} rows</span>
            </div>
            <div class="table-card-columns">
                ${colsHTML}
            </div>
        `;
        grid.appendChild(card);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    // 1. Sidebar Tab Switching Setup
    const navItems = document.querySelectorAll(".nav-item");
    const tabContents = document.querySelectorAll(".tab-content");

    navItems.forEach(item => {
        item.addEventListener("click", () => {
            const targetTab = item.getAttribute("data-tab");
            
            navItems.forEach(nav => nav.classList.remove("active"));
            tabContents.forEach(tab => tab.classList.remove("active"));
            
            item.classList.add("active");
            document.getElementById(`tab-${targetTab}`).classList.add("active");
            
            // Initialize Live Map if switching to operations tab
            if (targetTab === "operations" && window.initDispatchMap) {
                setTimeout(() => window.initDispatchMap(), 100);
            }
            
            // Initialize Forecasting if switching to forecasting tab
            if (targetTab === "forecasting" && window.initForecasting) {
                setTimeout(() => window.initForecasting(), 100);
            }
        });
    });

    // 2. SQL Sandbox Tab Switching Setup
    const sqlTabs = document.querySelectorAll(".sql-tab");
    const codeBlock = document.getElementById("sql-code-block");

    sqlTabs.forEach(tab => {
        tab.addEventListener("click", () => {
            sqlTabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
            const sqlKey = tab.getAttribute("data-sql");
            codeBlock.textContent = SQL_QUERIES[sqlKey];
        });
    });

    codeBlock.textContent = SQL_QUERIES.cohort_retention;

    // Copy SQL Query to Clipboard
    const btnCopy = document.getElementById("btn-copy-code");
    btnCopy.addEventListener("click", () => {
        navigator.clipboard.writeText(codeBlock.textContent).then(() => {
            btnCopy.innerHTML = `<i class="fa-solid fa-check text-success"></i> Copied!`;
            setTimeout(() => {
                btnCopy.innerHTML = `<i class="fa-regular fa-copy"></i> Copy Query`;
            }, 2000);
        });
    });

    // 3. Login Page Setup & Session Check
    const loginScreen = document.getElementById("login-screen");
    const appContainer = document.getElementById("app-container");
    const loginForm = document.getElementById("login-form");
    const loginError = document.getElementById("login-error-msg");
    const btnLogout = document.getElementById("btn-logout");

    if (localStorage.getItem("analytics_logged_in") === "true") {
        loginScreen.classList.add("fade-out");
        appContainer.style.display = "flex";
        initializeSettings();
        initializeDashboard(defaultCity);
    }

    loginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const username = document.getElementById("username").value.trim();
        const password = document.getElementById("password").value;

        if (username === "admin" && password === "admin") {
            localStorage.setItem("analytics_logged_in", "true");
            loginError.textContent = "";
            
            loginScreen.classList.add("fade-out");
            appContainer.style.display = "flex";
            
            initializeSettings();
            initializeDashboard(defaultCity);
        } else {
            loginError.textContent = "Invalid corporate credentials.";
        }
    });

    btnLogout.addEventListener("click", () => {
        localStorage.removeItem("analytics_logged_in");
        appContainer.style.display = "none";
        loginScreen.classList.remove("fade-out");
        loginForm.reset();
        loginError.textContent = "";
    });

    // 4. Light / Dark Mode Toggle Setup
    const btnTheme = document.getElementById("btn-theme-toggle");
    
    // Load theme (defaulting to light grey)
    const activeTheme = localStorage.getItem("analytics_theme") || "light";
    if (activeTheme === "light") {
        document.body.classList.add("light-theme");
        btnTheme.innerHTML = `<i class="fa-solid fa-moon"></i> <span>Dark Mode</span>`;
        chartTextColor = '#334155';
        chartGridColor = 'rgba(15, 23, 42, 0.05)';
    } else {
        document.body.classList.remove("light-theme");
        btnTheme.innerHTML = `<i class="fa-solid fa-sun"></i> <span>Light Mode</span>`;
        chartTextColor = '#cbd5e1';
        chartGridColor = 'rgba(255, 255, 255, 0.03)';
    }

    btnTheme.addEventListener("click", () => {
        const isLight = document.body.classList.toggle("light-theme");
        if (isLight) {
            localStorage.setItem("analytics_theme", "light");
            btnTheme.innerHTML = `<i class="fa-solid fa-moon"></i> <span>Dark Mode</span>`;
            chartTextColor = '#334155';
            chartGridColor = 'rgba(15, 23, 42, 0.05)';
        } else {
            localStorage.setItem("analytics_theme", "dark");
            btnTheme.innerHTML = `<i class="fa-solid fa-sun"></i> <span>Light Mode</span>`;
            chartTextColor = '#cbd5e1';
            chartGridColor = 'rgba(255, 255, 255, 0.03)';
        }
        // Force charts rebuild to update theme labels/grids
        if (localStorage.getItem("analytics_logged_in") === "true") {
            initializeDashboard(currentCityFilter);
        }
    });

    // 5. City Filter Selector
    const citySelector = document.getElementById("city-selector");
    citySelector.addEventListener("change", (e) => {
        currentCityFilter = e.target.value;
        initializeDashboard(currentCityFilter);
    });

    // 6. Settings Page Profile & Preference Actions
    // Avatar selection clicks
    const avatarOptions = document.querySelectorAll(".avatar-option");
    let currentSelectedAvatar = localStorage.getItem("analytics_avatar") || "admin";
    
    avatarOptions.forEach(opt => {
        opt.addEventListener("click", () => {
            avatarOptions.forEach(o => {
                o.classList.remove("active");
                o.style.borderColor = "transparent";
            });
            opt.classList.add("active");
            opt.style.borderColor = "var(--primary)";
            currentSelectedAvatar = opt.getAttribute("data-avatar");
        });
    });

    // 6. Settings Page Profile & Preference Actions
    document.getElementById("btn-save-profile").addEventListener("click", () => {
        const val = document.getElementById("settings-username").value.trim();
        if (val) {
            displayName = val;
            localStorage.setItem("analytics_username", displayName);
            localStorage.setItem("analytics_avatar", currentSelectedAvatar);
            
            document.getElementById("header-greeting").textContent = `Welcome back, ${displayName}!`;
            updateAvatarUI(currentSelectedAvatar);
            alert("Profile settings and avatar saved successfully.");
        }
    });

    // Accent color selection clicks
    const colorDots = document.querySelectorAll(".color-dot");
    colorDots.forEach(dot => {
        dot.addEventListener("click", () => {
            const color = dot.getAttribute("data-color");
            applyAccentColor(color);
            localStorage.setItem("analytics_accent_color", color);
            
            // Re-render the dashboard to update chart colors dynamically!
            initializeDashboard(currentCityFilter);
            
            // Re-render forecast chart if currently active
            const activeTab = document.querySelector(".nav-item.active");
            if (activeTab && activeTab.getAttribute("data-tab") === "forecasting" && window.initForecasting) {
                window.initForecasting();
            }
        });
    });

    document.getElementById("btn-save-prefs").addEventListener("click", () => {
        const selectedCity = document.getElementById("settings-default-city").value;
        const selectedCurrency = document.getElementById("settings-currency").value;
        
        defaultCity = selectedCity;
        currencySymbol = selectedCurrency;
        
        localStorage.setItem("analytics_default_city", defaultCity);
        localStorage.setItem("analytics_currency", currencySymbol);
        
        // Refresh dashboard using new preferences
        citySelector.value = defaultCity;
        currentCityFilter = defaultCity;
        initializeDashboard(currentCityFilter);
        
        alert("Dashboard preferences saved and applied.");
    });

    // SQL Sandbox dynamic execution simulation
    const btnRun = document.getElementById("btn-run-query");
    const executionOutput = document.getElementById("sql-execution-output");
    const statusText = document.getElementById("sql-status-text");
    const timeText = document.getElementById("sql-time-text");
    const outputTable = document.getElementById("sql-output-table");
    
    if (btnRun) {
        btnRun.addEventListener("click", () => {
            const activeTab = document.querySelector(".sql-tab.active");
            if (!activeTab) return;
            const sqlKey = activeTab.getAttribute("data-sql");
            
            executionOutput.style.display = "block";
            statusText.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Compiling queries & executing on SQLite...`;
            timeText.textContent = "0.0ms";
            
            outputTable.querySelector("thead").innerHTML = "";
            outputTable.querySelector("tbody").innerHTML = "";
            
            setTimeout(() => {
                try {
                    const queryData = ANALYTICS_DATA[sqlKey];
                    if (!queryData || queryData.length === 0) {
                        statusText.innerHTML = `<i class="fa-solid fa-check text-success"></i> Query completed successfully (no records returned)`;
                        timeText.textContent = "1.1ms";
                        return;
                    }
                    
                    const headers = Object.keys(queryData[0]);
                    const trHead = document.createElement("tr");
                    headers.forEach(h => {
                        const th = document.createElement("th");
                        th.textContent = h.replace(/_/g, ' ').toUpperCase();
                        trHead.appendChild(th);
                    });
                    outputTable.querySelector("thead").appendChild(trHead);
                    
                    const previewRows = queryData.slice(0, 15);
                    const tbody = outputTable.querySelector("tbody");
                    previewRows.forEach(row => {
                        const tr = document.createElement("tr");
                        headers.forEach(h => {
                            const td = document.createElement("td");
                            const val = row[h];
                            if (typeof val === 'number') {
                                if (h.includes('gmv') || h.includes('revenue') || h.includes('sales') || h.includes('discounts') || h.includes('amount') ||  h.includes('subtotal') || h.includes('fee')) {
                                    td.textContent = formatCurrency(val);
                                } else if (h.includes('rate') || h.includes('pct') || h.includes('retention')) {
                                    td.textContent = `${val.toFixed(1)}%`;
                                } else {
                                    td.textContent = formatNumber(val);
                                }
                            } else {
                                td.textContent = val !== null ? val : 'NULL';
                            }
                            tr.appendChild(td);
                        });
                        tbody.appendChild(tr);
                    });
                    
                    const duration = (0.08 + Math.random() * 0.15).toFixed(2);
                    statusText.innerHTML = `<i class="fa-solid fa-circle-check text-success"></i> Query OK. ${queryData.length} rows returned. (Showing preview of first 15)`;
                    timeText.textContent = `${duration}ms`;
                } catch (err) {
                    statusText.innerHTML = `<i class="fa-solid fa-circle-xmark text-danger"></i> Execution Error: ${err.message}`;
                    timeText.textContent = "0.0ms";
                }
            }, 750);
        });
    }

    // Set up periodic mock driver dispatch updates for the Event Feed
    setInterval(() => {
        const operationsTab = document.getElementById("tab-operations");
        if (!operationsTab || !operationsTab.classList.contains("active")) return;
        
        const eventTypes = ['info', 'warning', 'danger', 'info'];
        const randType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
        
        const drivers = ["Carlos", "Elena", "Marcus", "Sarah", "David", "Chloe"];
        const randDriver = drivers[Math.floor(Math.random() * drivers.length)];
        
        const cities = ["New York", "Los Angeles", "Chicago", "Houston", "Miami"];
        const randCity = cities[Math.floor(Math.random() * cities.length)];
        
        let title = "";
        let desc = "";
        
        if (randType === 'info') {
            title = `Driver Dispatch Assigned`;
            desc = `Driver ${randDriver} assigned to new delivery route in ${randCity}.`;
        } else if (randType === 'warning') {
            const delays = ["Traffic congestion", "Heavy rain", "Order delay at kitchen"];
            title = `Transit Advisory`;
            desc = `${randDriver} reported delay: ${delays[Math.floor(Math.random() * delays.length)]} in ${randCity}.`;
        } else if (randType === 'danger') {
            title = `Order Cancellation Alert`;
            desc = `Order canceled for customer in ${randCity} due to driver timeout.`;
        }
        
        addDispatchLog({
            type: randType,
            title: title,
            desc: desc,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        });
    }, 14000);

    document.getElementById("btn-danger-reset").addEventListener("click", () => {
        if (confirm("Are you sure you want to restore the dashboard to factory settings? This will clear all profiles and preferences.")) {
            localStorage.clear();
            location.reload();
        }
    });

    // 7. CSV Exports Setup
    document.getElementById("btn-export-restaurants").addEventListener("click", () => {
        exportRestaurantsCSV();
    });

    document.getElementById("btn-export-tiers").addEventListener("click", () => {
        exportTiersCSV();
    });
});

// Format Currency using global symbol configuration
function formatCurrency(value) {
    return currencySymbol + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

function formatNumber(value) {
    return new Intl.NumberFormat('en-US').format(value);
}

function initializeSettings() {
    document.getElementById("header-greeting").textContent = `Welcome back, ${displayName}!`;
    document.getElementById("settings-username").value = displayName;
    document.getElementById("settings-default-city").value = defaultCity;
    document.getElementById("settings-currency").value = currencySymbol;
    document.getElementById("city-selector").value = defaultCity;
    
    // Set active avatar class
    const savedAvatar = localStorage.getItem("analytics_avatar") || "admin";
    const avatarOptions = document.querySelectorAll(".avatar-option");
    avatarOptions.forEach(opt => {
        if (opt.getAttribute("data-avatar") === savedAvatar) {
            opt.classList.add("active");
            opt.style.borderColor = "var(--primary)";
        } else {
            opt.classList.remove("active");
            opt.style.borderColor = "transparent";
        }
    });
    
    updateAvatarUI(savedAvatar);
    
    const savedAccent = localStorage.getItem("analytics_accent_color") || "purple";
    applyAccentColor(savedAccent);
    currentCityFilter = defaultCity;
}

function initializeDashboard(city) {
    try {
        if (typeof ANALYTICS_DATA === "undefined") {
            throw new Error("Analytics database data not preloaded. Ensure data.js exists.");
        }
        
        const data = ANALYTICS_DATA;
        
        // 1. Filter KPIs
        const kpi = data.executive_kpis.find(row => row.city === city);
        if (kpi) populateKPIs(kpi);
        
        // 2. Filter Top Restaurants Table (Top 5 for city)
        let filteredRest = data.top_restaurants;
        if (city !== "All") {
            filteredRest = filteredRest.filter(row => row.city === city);
        }
        populateTopRestaurants(filteredRest.slice(0, 5));
        
        // 3. Filter and Aggregate Customer Tier Table
        let filteredTiers = [];
        if (city === "All") {
            const tiers = ['Free', 'Premium'];
            tiers.forEach(tier => {
                const rows = data.tier_comparison.filter(r => r.customer_tier === tier);
                const sumCustomers = rows.reduce((a, b) => a + b.total_customers, 0);
                const sumOrders = rows.reduce((a, b) => a + b.total_orders, 0);
                const sumGmv = rows.reduce((a, b) => a + b.total_gmv, 0);
                const totalSubtotal = rows.reduce((a, b) => a + (b.avg_subtotal * b.total_orders), 0);
                const avgSubtotal = sumOrders > 0 ? totalSubtotal / sumOrders : 0;
                const totalDelivery = rows.reduce((a, b) => a + (b.avg_delivery_fee * b.total_orders), 0);
                const avgDelivery = sumOrders > 0 ? totalDelivery / sumOrders : 0;
                const sumDiscounts = rows.reduce((a, b) => a + b.total_discounts, 0);
                filteredTiers.push({
                    customer_tier: tier,
                    total_customers: sumCustomers,
                    total_orders: sumOrders,
                    total_gmv: sumGmv,
                    avg_subtotal: avgSubtotal,
                    avg_delivery_fee: avgDelivery,
                    total_discounts: sumDiscounts
                });
            });
        } else {
            filteredTiers = data.tier_comparison.filter(row => row.city === city);
        }
        populateTierComparison(filteredTiers);
        
        // 4. Monthly Growth Chart (Aggregated/Filtered)
        let filteredGrowth = [];
        if (city === "All") {
            const months = [...new Set(data.monthly_growth.map(r => r.month))].sort();
            months.forEach(m => {
                const rows = data.monthly_growth.filter(r => r.month === m);
                filteredGrowth.push({
                    month: m,
                    total_gmv: rows.reduce((a, b) => a + b.total_gmv, 0),
                    total_orders: rows.reduce((a, b) => a + b.total_orders, 0)
                });
            });
        } else {
            filteredGrowth = data.monthly_growth.filter(row => row.city === city);
        }
        buildGrowthChart(filteredGrowth);
        
        // 5. Cuisine Chart (Aggregated/Filtered)
        let filteredCuisine = [];
        const cuisines = [...new Set(data.cuisine_analysis.map(r => r.cuisine_type))];
        if (city === "All") {
            cuisines.forEach(c => {
                const rows = data.cuisine_analysis.filter(r => r.cuisine_type === c);
                filteredCuisine.push({
                    cuisine_type: c,
                    total_gmv: rows.reduce((a, b) => a + b.total_gmv, 0)
                });
            });
        } else {
            filteredCuisine = data.cuisine_analysis.filter(row => row.city === city);
        }
        buildCuisineChart(filteredCuisine);
        
        // 6. Hourly Peaks Chart (Aggregated/Filtered)
        let filteredPeaks = [];
        const hours = [...new Set(data.hourly_peaks.map(r => r.hour))].sort();
        if (city === "All") {
            hours.forEach(h => {
                const rows = data.hourly_peaks.filter(r => r.hour === h);
                const sumOrders = rows.reduce((a, b) => a + b.total_orders, 0);
                const totalCanceled = rows.reduce((a, b) => a + (b.cancellation_rate * b.total_orders), 0);
                const avgCancel = sumOrders > 0 ? totalCanceled / sumOrders : 0;
                filteredPeaks.push({
                    hour: h,
                    total_orders: sumOrders,
                    cancellation_rate: avgCancel
                });
            });
        } else {
            filteredPeaks = data.hourly_peaks.filter(row => row.city === city);
        }
        buildHourlyPeaksChart(filteredPeaks);
        
        // 7. Vehicle Performance Chart (Aggregated/Filtered)
        let filteredVehicle = [];
        const vehicles = ['Bike', 'Scooter', 'Car'];
        if (city === "All") {
            vehicles.forEach(v => {
                const rows = data.vehicle_performance.filter(r => r.vehicle_type === v);
                const sumDeliveries = rows.reduce((a, b) => a + b.total_deliveries, 0);
                const totalDuration = rows.reduce((a, b) => a + (b.avg_delivery_duration_min * b.total_deliveries), 0);
                const avgDuration = sumDeliveries > 0 ? totalDuration / sumDeliveries : 0;
                filteredVehicle.push({
                    vehicle_type: v,
                    avg_delivery_duration_min: avgDuration
                });
            });
        } else {
            filteredVehicle = data.vehicle_performance.filter(row => row.city === city);
        }
        buildVehiclePerformanceChart(filteredVehicle);
        
        // 8. Cohort Heatmap (Filtered)
        let filteredCohort = [];
        if (city === "All") {
            filteredCohort = data.cohort_retention;
        } else {
            filteredCohort = data.cohort_retention.filter(row => row.city === city);
        }
        buildCohortMatrix(filteredCohort, city === "All");
        
        // 9. Load Database Schema Explorer & Seed Activity Logs
        if (data.db_diagnostics) {
            populateSchemaExplorer(data.db_diagnostics);
        }
        seedLiveFeed();
        
    } catch (error) {
        console.error("Dashboard initialization error:", error);
        document.querySelector(".main-content").innerHTML += `
            <div style="background-color: var(--danger-soft); border: 1px solid var(--danger); padding: 20px; border-radius: 12px; margin-top: 20px;">
                <h3 class="text-danger"><i class="fa-solid fa-circle-exclamation"></i> Analytics Error</h3>
                <p style="margin-top: 8px;">Could not load analytical database. Ensure python src/run_queries.py has run successfully.</p>
            </div>
        `;
    }
}

function populateKPIs(kpi) {
    document.getElementById("kpi-gmv").textContent = formatCurrency(kpi.total_gmv);
    document.getElementById("kpi-revenue").textContent = formatCurrency(kpi.net_revenue);
    
    const revenuePct = ((kpi.net_revenue / kpi.total_gmv) * 100).toFixed(1);
    document.getElementById("kpi-revenue-percentage").textContent = `${revenuePct}% of total GMV (Fees - Discounts)`;
    
    document.getElementById("kpi-orders").textContent = formatNumber(kpi.total_orders);
    document.getElementById("kpi-aov").textContent = `Avg Order Val: ${formatCurrency(kpi.average_order_value)}`;
    
    document.getElementById("kpi-duration").textContent = `${kpi.average_delivery_duration_min.toFixed(1)} mins`;
    document.getElementById("kpi-rating").textContent = `Avg Driver Rating: ${kpi.average_delivery_rating.toFixed(2)} ★`;
}

function populateTopRestaurants(restaurants) {
    const tbody = document.querySelector("#top-restaurants-table tbody");
    tbody.innerHTML = "";
    
    restaurants.forEach(rest => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td style="font-weight: 600;">${rest.restaurant_name}</td>
            <td><span class="badge" style="background-color: rgba(168, 85, 247, 0.08); color: var(--primary);">${rest.cuisine_type}</span></td>
            <td>${rest.city}</td>
            <td>${formatNumber(rest.total_orders)}</td>
            <td style="font-weight: 700;">${formatCurrency(rest.total_sales)}</td>
            <td class="text-warning"><i class="fa-solid fa-star"></i> ${rest.rating.toFixed(1)}</td>
        `;
        tbody.appendChild(tr);
    });
}

function populateTierComparison(tiers) {
    const tbody = document.querySelector("#tier-comparison-table tbody");
    tbody.innerHTML = "";
    
    tiers.forEach(tier => {
        const tr = document.createElement("tr");
        const badgeColor = tier.customer_tier === 'Premium' ? 'background-color: var(--primary-soft); color: var(--primary); font-weight: 700;' : 'color: var(--text-secondary);';
        tr.innerHTML = `
            <td><span class="badge" style="${badgeColor}">${tier.customer_tier}</span></td>
            <td>${formatNumber(tier.total_customers)}</td>
            <td>${formatNumber(tier.total_orders)}</td>
            <td style="font-weight: 600;">${formatCurrency(tier.total_gmv)}</td>
            <td>${formatCurrency(tier.avg_subtotal)}</td>
            <td>${formatCurrency(tier.avg_delivery_fee)}</td>
            <td class="text-success">${formatCurrency(tier.total_discounts)}</td>
        `;
        tbody.appendChild(tr);
    });
}

function buildGrowthChart(data) {
    const ctx = document.getElementById("monthlyGrowthChart").getContext("2d");
    
    const labels = data.map(item => item.month);
    const gmvData = data.map(item => item.total_gmv);
    const ordersData = data.map(item => item.total_orders);
    
    if (growthChart) growthChart.destroy();
    
    const primaryColor = getPrimaryColorHex();
    
    growthChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Gross GMV',
                    data: gmvData,
                    backgroundColor: primaryColor + 'a6', // 65% opacity
                    borderColor: primaryColor,
                    borderWidth: 1,
                    yAxisID: 'y-gmv',
                    order: 2
                },
                {
                    label: 'Orders Filled',
                    data: ordersData,
                    type: 'line',
                    borderColor: '#10b981',
                    borderWidth: 3,
                    pointBackgroundColor: '#10b981',
                    pointHoverRadius: 7,
                    fill: false,
                    yAxisID: 'y-orders',
                    order: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: chartTextColor, font: { family: 'Plus Jakarta Sans', weight: '500' } }
                },
                tooltip: {
                    backgroundColor: '#18181b',
                    titleColor: '#f8fafc',
                    bodyColor: '#cbd5e1',
                    borderColor: 'rgba(255,255,255,0.08)',
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: chartTextColor }
                },
                'y-gmv': {
                    type: 'linear',
                    position: 'left',
                    grid: { color: chartGridColor },
                    ticks: {
                        color: chartTextColor,
                        callback: value => currencySymbol + formatNumber(value)
                    },
                    title: { display: true, text: 'GMV Sales', color: '#a855f7', font: { weight: '600' } }
                },
                'y-orders': {
                    type: 'linear',
                    position: 'right',
                    grid: { display: false },
                    ticks: { color: chartTextColor },
                    title: { display: true, text: 'Order Count', color: '#10b981', font: { weight: '600' } }
                }
            }
        }
    });
}

function buildCuisineChart(data) {
    const ctx = document.getElementById("cuisineChart").getContext("2d");
    
    const labels = data.map(item => item.cuisine_type);
    const gmvData = data.map(item => item.total_gmv);
    
    if (cuisineDoughnutChart) cuisineDoughnutChart.destroy();
    
    cuisineDoughnutChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: gmvData,
                backgroundColor: [
                    '#a855f7', // Purple
                    '#10b981', // Emerald
                    '#f59e0b', // Amber
                    '#f43f5e', // Rose
                    '#d97706', // Amber-Gold
                    '#ec4899', // Pink
                    '#8b5cf6'  // Violet
                ],
                borderWidth: 2,
                borderColor: '#18181b'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: chartTextColor, font: { family: 'Plus Jakarta Sans', size: 11, weight: '500' } }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const val = context.raw;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const pct = ((val / total) * 100).toFixed(1);
                            return ` ${context.label}: ${formatCurrency(val)} (${pct}%)`;
                        }
                    }
                }
            }
        }
    });
}

function buildHourlyPeaksChart(data) {
    const ctx = document.getElementById("hourlyPeaksChart").getContext("2d");
    
    const labels = data.map(item => item.hour + ":00");
    const ordersData = data.map(item => item.total_orders);
    const cancelData = data.map(item => item.cancellation_rate);
    
    if (peaksChart) peaksChart.destroy();
    
    peaksChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Order Volume',
                    data: ordersData,
                    backgroundColor: 'rgba(245, 158, 11, 0.4)',
                    borderColor: '#f59e0b',
                    borderWidth: 1,
                    yAxisID: 'y-orders'
                },
                {
                    label: 'Cancellation Rate (%)',
                    data: cancelData,
                    type: 'line',
                    borderColor: '#f43f5e',
                    borderWidth: 2.5,
                    pointBackgroundColor: '#f43f5e',
                    fill: false,
                    yAxisID: 'y-cancel'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: chartTextColor }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: chartTextColor }
                },
                'y-orders': {
                    type: 'linear',
                    position: 'left',
                    grid: { color: chartGridColor },
                    ticks: { color: chartTextColor },
                    title: { display: true, text: 'Orders', color: '#f59e0b' }
                },
                'y-cancel': {
                    type: 'linear',
                    position: 'right',
                    grid: { display: false },
                    ticks: {
                        color: chartTextColor,
                        callback: value => value.toFixed(0) + '%'
                    },
                    title: { display: true, text: 'Cancellation Rate (%)', color: '#f43f5e' }
                }
            }
        }
    });
}

function buildVehiclePerformanceChart(data) {
    const ctx = document.getElementById("vehiclePerformanceChart").getContext("2d");
    
    const labels = data.map(item => item.vehicle_type);
    const times = data.map(item => item.avg_delivery_duration_min);
    
    if (deliveryChart) deliveryChart.destroy();
    
    deliveryChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Avg Travel Duration (mins)',
                    data: times,
                    backgroundColor: ['#f43f5e', '#a855f7', '#f59e0b'],
                    borderRadius: 8,
                    yAxisID: 'y-time'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: chartTextColor }
                },
                'y-time': {
                    type: 'linear',
                    grid: { color: chartGridColor },
                    ticks: { color: chartTextColor },
                    title: { display: true, text: 'Duration (Minutes)', color: chartTextColor }
                }
            }
        }
    });
}

function buildCohortMatrix(data, isAll) {
    const cohorts = {};
    const months = new Set();
    
    // Group sizes properly to avoid double counting across cities if 'All' is active
    const cohortSizesMap = {};
    const seenCohortCities = new Set();
    
    data.forEach(row => {
        const uniqueKey = `${row.cohort_month}_${row.city}`;
        if (isAll) {
            if (!seenCohortCities.has(uniqueKey)) {
                seenCohortCities.add(uniqueKey);
                cohortSizesMap[row.cohort_month] = (cohortSizesMap[row.cohort_month] || 0) + row.cohort_size;
            }
        } else {
            cohortSizesMap[row.cohort_month] = row.cohort_size;
        }
    });
    
    // Sum active customers by cohort_month and months_since_signup
    const activeMap = {};
    data.forEach(row => {
        const key = `${row.cohort_month}_${row.months_since_signup}`;
        activeMap[key] = (activeMap[key] || 0) + row.active_customers;
        months.add(row.months_since_signup);
    });
    
    const sortedMonths = Array.from(months).sort((a, b) => a - b);
    const table = document.getElementById("cohort-matrix-table");
    const thead = table.querySelector("thead");
    const tbody = table.querySelector("tbody");
    
    thead.innerHTML = "";
    tbody.innerHTML = "";
    
    const hr = document.createElement("tr");
    hr.innerHTML = `
        <th style="text-align: left;">Cohort Month</th>
        <th>Cohort Size</th>
    `;
    sortedMonths.forEach(m => {
        hr.innerHTML += `<th>Month ${m}</th>`;
    });
    thead.appendChild(hr);
    
    const sortedCohorts = [...new Set(data.map(r => r.cohort_month))].sort();
    
    sortedCohorts.forEach(cMonth => {
        const size = cohortSizesMap[cMonth] || 0;
        const tr = document.createElement("tr");
        
        tr.innerHTML = `
            <td class="cohort-header">${cMonth}</td>
            <td class="cohort-size">${formatNumber(size)} customers</td>
        `;
        
        sortedMonths.forEach(m => {
            const key = `${cMonth}_${m}`;
            const active = activeMap[key] || 0;
            const rate = size > 0 ? (active / size * 100) : 0;
            
            // Render color
            const opacity = (rate / 100).toFixed(2);
            const cellBg = `background-color: ${getPrimaryRGBA(opacity)};`;
            const cellTextColor = rate > 45 ? '#ffffff' : (localStorage.getItem("analytics_theme") === "light" ? '#1e293b' : '#cbd5e1');
            
            tr.innerHTML += `
                <td class="cohort-cell" style="${cellBg} color: ${cellTextColor};">
                    ${rate.toFixed(1)}%
                </td>
            `;
        });
        
        tbody.appendChild(tr);
    });
}

// Helper to trigger browser downloads of CSV files
function downloadCSV(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

function exportRestaurantsCSV() {
    let filteredRest = ANALYTICS_DATA.top_restaurants;
    if (currentCityFilter !== "All") {
        filteredRest = filteredRest.filter(row => row.city === currentCityFilter);
    }
    
    // Construct CSV Header
    let csv = "Restaurant Name,Cuisine,City,Completed Orders,Sales GMV,Rating\n";
    filteredRest.forEach(row => {
        csv += `"${row.restaurant_name}","${row.cuisine_type}","${row.city}",${row.total_orders},${row.total_sales},${row.rating}\n`;
    });
    
    downloadCSV(csv, `top_restaurants_${currentCityFilter.toLowerCase().replace(' ', '_')}.csv`);
}

function exportTiersCSV() {
    let filteredTiers = [];
    const city = currentCityFilter;
    if (city === "All") {
        const tiers = ['Free', 'Premium'];
        tiers.forEach(tier => {
            const rows = ANALYTICS_DATA.tier_comparison.filter(r => r.customer_tier === tier);
            const sumCustomers = rows.reduce((a, b) => a + b.total_customers, 0);
            const sumOrders = rows.reduce((a, b) => a + b.total_orders, 0);
            const sumGmv = rows.reduce((a, b) => a + b.total_gmv, 0);
            const totalSubtotal = rows.reduce((a, b) => a + (b.avg_subtotal * b.total_orders), 0);
            const avgSubtotal = sumOrders > 0 ? totalSubtotal / sumOrders : 0;
            const totalDelivery = rows.reduce((a, b) => a + (b.avg_delivery_fee * b.total_orders), 0);
            const avgDelivery = sumOrders > 0 ? totalDelivery / sumOrders : 0;
            const sumDiscounts = rows.reduce((a, b) => a + b.total_discounts, 0);
            filteredTiers.push({
                customer_tier: tier,
                total_customers: sumCustomers,
                total_orders: sumOrders,
                total_gmv: sumGmv,
                avg_subtotal: avgSubtotal,
                avg_delivery_fee: avgDelivery,
                total_discounts: sumDiscounts
            });
        });
    } else {
        filteredTiers = ANALYTICS_DATA.tier_comparison.filter(row => row.city === city);
    }
    
    let csv = "Customer Tier,Active Customers,Total Orders,Total GMV,Avg Subtotal,Avg Delivery Fee,Total Discounts\n";
    filteredTiers.forEach(row => {
        csv += `"${row.customer_tier}",${row.total_customers},${row.total_orders},${row.total_gmv},${row.avg_subtotal},${row.avg_delivery_fee},${row.total_discounts}\n`;
    });
    
    downloadCSV(csv, `customer_tiers_${city.toLowerCase().replace(' ', '_')}.csv`);
}
