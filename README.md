# 🍕 Food Delivery Analytics Dashboard

A full-stack **executive analytics platform** for a simulated multi-city food delivery business. Built with Python (SQLite + Pandas), vanilla HTML/CSS/JavaScript, and Chart.js — no frameworks required.

---

## 🚀 Live Features

| Tab | What it shows |
|---|---|
| **Overview** | GMV, orders, revenue, AOV KPIs + monthly growth & cuisine breakdown |
| **Cohort & Retention** | Month-over-month customer retention heatmap + tier comparison |
| **Operations** | Live canvas dispatch map, hourly peaks, vehicle performance |
| **Schema Explorer** | Live SQLite table structure, row counts, foreign keys |
| **Predictive Models** | OLS linear regression Q3 forecast + 95% CI + DelivAI chatbot |
| **SQL Sandbox** | 8 pre-seeded queries with live table output |
| **Settings** | Accent themes, avatar profiles, light/dark mode |

---

## 📊 Dataset Summary

- **25,000+** simulated orders across 5 US cities (Chicago, Houston, Los Angeles, Miami, New York)
- **400** customers across Free & Premium membership tiers
- **6 relational tables**: `customers`, `restaurants`, `drivers`, `orders`, `deliveries`, `order_items`
- Date range: **Jan 2026 – Jun 2026**

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Data Generation | Python 3, SQLite, Faker |
| Analytics Queries | SQL (8 modular analytical queries) |
| Visualization | Chart.js, HTML5 Canvas |
| Frontend | Vanilla HTML, CSS (custom design system), JavaScript |
| AI Assistant | DelivAI (keyword-based NLP chatbot) |
| Forecasting | OLS Linear Regression (browser-native JS) |

---

## ⚡ Quick Start

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/food-delivery-analytics.git
cd food-delivery-analytics
```

### 2. Set up Python virtual environment
```bash
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

pip install -r requirements.txt
```

### 3. Generate the database & compile dashboard data
```bash
python src/data_generator.py
python src/run_queries.py
```

### 4. Launch the dashboard
```bash
python -m http.server 8000 --directory dashboard
```
Then open **http://localhost:8000** in your browser.

> **Login credentials:** `admin` / `admin`

---

## 📁 Project Structure

```
food-delivery-analytics/
├── dashboard/
│   ├── index.html          # Main dashboard shell
│   ├── styles.css          # Full design system (dark/light themes)
│   ├── app.js              # Dashboard engine, charts, filters
│   ├── map.js              # Live canvas dispatch map simulator
│   ├── forecaster.js       # ML forecasting + DelivAI chatbot
│   └── data.js             # Pre-compiled SQL output (auto-generated)
├── src/
│   ├── data_generator.py   # Simulated relational database generator
│   ├── run_queries.py      # SQL query runner + data.js exporter
│   ├── analytics_queries.sql
│   └── db_diagnostics.py
├── data/                   # SQLite database (auto-generated)
├── .gitignore
├── requirements.txt
└── README.md
```

---

## 📸 Screenshots

> Login → Executive Overview → Predictive Models → DelivAI Chatbot → Operations Map

---

## 📈 Key Analytical Insights

- **Asian cuisine** leads GMV at **$101,498** across all cities
- **Late-night cancellations** spike to **13.2%** at 10 PM due to driver shortages
- **Bicycles** average **21.4 mins** delivery vs Cars at **12.3 mins**
- **Premium members** pay avg **$0.69** delivery fee vs **$4.49** for free tier
- Q3 forecast projects **~$325,000 GMV** with R² = 0.94 model accuracy

---

## 📄 License

MIT License — feel free to fork and build on this project!
