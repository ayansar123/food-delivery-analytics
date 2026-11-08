-- Food Delivery Analytics Queries (SQLite Dialect with City Partitioning)

-- 1. Executive Dashboard KPIs (UNION ALL for 'All' + individual cities)
-- =========================================================================================
-- name: executive_kpis
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
GROUP BY r.city;


-- 2. Monthly Revenue and Order Growth by City
-- =========================================================================================
-- name: monthly_growth
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
ORDER BY r.city, month;


-- 3. Cuisine Performance Analysis by City
-- =========================================================================================
-- name: cuisine_analysis
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
ORDER BY total_gmv DESC;


-- 4. Vehicle Delivery Performance by City
-- =========================================================================================
-- name: vehicle_performance
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
GROUP BY r.city, d.vehicle_type;


-- 5. Peak Hours of Day by City
-- =========================================================================================
-- name: hourly_peaks
SELECT
    r.city,
    strftime('%H', o.order_time) AS hour,
    COUNT(o.order_id) AS total_orders,
    ROUND(SUM(o.subtotal), 2) AS total_gmv,
    COUNT(CASE WHEN o.status = 'Cancelled' THEN 1 END) * 100.0 / COUNT(o.order_id) AS cancellation_rate
FROM orders o
JOIN restaurants r ON o.restaurant_id = r.restaurant_id
GROUP BY r.city, hour
ORDER BY r.city, hour;


-- 6. Cohort Retention Analysis by City
-- =========================================================================================
-- name: cohort_retention
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
ORDER BY cc.cohort_month, cc.city, ca.activity_month;


-- 7. Customer Tier Comparison by City (Free vs Premium)
-- =========================================================================================
-- name: tier_comparison
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
GROUP BY c.city, c.customer_tier;


-- 8. Restaurants by Sales (to be filtered in JS)
-- =========================================================================================
-- name: top_restaurants
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
ORDER BY total_sales DESC;
