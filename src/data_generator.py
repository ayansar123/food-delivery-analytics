import sqlite3
import os
import random
from datetime import datetime, timedelta

def create_database():
    os.makedirs('data', exist_ok=True)
    db_path = os.path.join('data', 'food_delivery.db')
    if os.path.exists(db_path):
        try:
            os.remove(db_path)
        except PermissionError:
            # If the database file is locked or open in another process, truncate it instead
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cursor.execute("PRAGMA writable_schema = 1;")
            cursor.execute("delete from sqlite_master where type in ('table', 'index', 'trigger');")
            cursor.execute("PRAGMA writable_schema = 0;")
            cursor.execute("VACUUM;")
            conn.commit()
            conn.close()
            
    # Connect and create tables
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 1. Customers Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS customers (
        customer_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        signup_date TEXT NOT NULL,
        city TEXT NOT NULL,
        customer_tier TEXT CHECK(customer_tier IN ('Free', 'Premium')) NOT NULL
    )
    ''')
    
    # 2. Restaurants Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS restaurants (
        restaurant_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        cuisine_type TEXT NOT NULL,
        city TEXT NOT NULL,
        rating REAL,
        joined_date TEXT NOT NULL
    )
    ''')
    
    # 3. Drivers Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS drivers (
        driver_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        vehicle_type TEXT CHECK(vehicle_type IN ('Bike', 'Scooter', 'Car')) NOT NULL,
        rating REAL,
        joined_date TEXT NOT NULL
    )
    ''')
    
    # 4. Orders Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS orders (
        order_id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER,
        restaurant_id INTEGER,
        order_time TEXT NOT NULL,
        status TEXT CHECK(status IN ('Completed', 'Cancelled', 'Refunded')) NOT NULL,
        subtotal REAL NOT NULL,
        delivery_fee REAL NOT NULL,
        discount_applied REAL NOT NULL,
        total_amount REAL NOT NULL,
        payment_method TEXT CHECK(payment_method IN ('Credit Card', 'PayPal', 'Cash')) NOT NULL,
        FOREIGN KEY (customer_id) REFERENCES customers (customer_id),
        FOREIGN KEY (restaurant_id) REFERENCES restaurants (restaurant_id)
    )
    ''')
    
    # 5. Deliveries Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS deliveries (
        delivery_id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER UNIQUE,
        driver_id INTEGER,
        pickup_time TEXT,
        delivery_time TEXT,
        distance_km REAL,
        driver_rating INTEGER CHECK(driver_rating BETWEEN 1 AND 5),
        FOREIGN KEY (order_id) REFERENCES orders (order_id),
        FOREIGN KEY (driver_id) REFERENCES drivers (driver_id)
    )
    ''')
    
    # 6. Order Items Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS order_items (
        item_id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER,
        item_name TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price REAL NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders (order_id)
    )
    ''')
    
    conn.commit()
    conn.close()
    print("Database tables created successfully.")

def populate_database():
    db_path = os.path.join('data', 'food_delivery.db')
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Reference parameters
    start_date = datetime(2026, 1, 1)
    end_date = datetime(2026, 6, 24)
    days_range = (end_date - start_date).days
    
    cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Miami']
    cuisines = ['Italian', 'Mexican', 'Asian', 'Indian', 'Burgers', 'Pizza', 'Healthy']
    
    first_names = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth',
                   'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen']
    last_names = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
                  'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin']
    
    menu_items = {
        'Italian': [('Margherita Pizza', 12.99), ('Lasagna', 15.99), ('Fettuccine Alfredo', 14.50), ('Garlic Bread', 5.99), ('Tiramisu', 7.50)],
        'Mexican': [('Tacos Combo', 10.99), ('Burrito Grande', 12.50), ('Quesadilla', 9.99), ('Chips & Guacamole', 6.50), ('Churros', 5.00)],
        'Asian': [('Sushi Roll Platter', 24.99), ('Pad Thai', 13.99), ('Ramen Bowl', 14.99), ('Spring Rolls', 5.99), ('Mochi Ice Cream', 6.00)],
        'Indian': [('Butter Chicken', 15.99), ('Chicken Tikka Masala', 16.50), ('Paneer Tikka', 13.99), ('Garlic Naan', 3.99), ('Gulab Jamun', 4.99)],
        'Burgers': [('Classic Cheeseburger', 11.99), ('Bacon BBQ Burger', 13.99), ('Veggie Burger', 12.50), ('French Fries', 3.99), ('Milkshake', 5.50)],
        'Pizza': [('Pepperoni Feast Pizza', 16.99), ('BBQ Chicken Pizza', 17.50), ('Veggie Supreme Pizza', 15.99), ('Mozzarella Sticks', 6.99), ('Soda Can', 1.99)],
        'Healthy': [('Quinoa Avocado Bowl', 13.50), ('Grilled Chicken Salad', 12.99), ('Acai Smoothie Bowl', 9.50), ('Hummus & Pita', 6.99), ('Fresh Green Juice', 5.99)]
    }

    # --- 1. Populate Customers ---
    customers_data = []
    for i in range(1, 401):
        name = f"{random.choice(first_names)} {random.choice(last_names)}"
        email = f"{name.lower().replace(' ', '_')}{i}@example.com"
        signup_dt = start_date + timedelta(days=random.randint(0, days_range - 30))
        signup_date_str = signup_dt.strftime('%Y-%m-%d')
        city = random.choice(cities)
        tier = 'Premium' if random.random() < 0.25 else 'Free'
        customers_data.append((name, email, signup_date_str, city, tier))
        
    cursor.executemany(
        "INSERT INTO customers (name, email, signup_date, city, customer_tier) VALUES (?, ?, ?, ?, ?)",
        customers_data
    )
    
    # --- 2. Populate Restaurants ---
    restaurants_data = []
    restaurant_names = {
        'Italian': ['Bella Italia', 'Trattoria Roma', 'Luigi\'s Kitchen', 'Pasta Palace'],
        'Mexican': ['Cantina El Sol', 'Taco Loco', 'La Hacienda', 'Burrito Express'],
        'Asian': ['Sakura Sushi', 'Wok & Roll', 'Golden Dragon', 'Lotus Blossom'],
        'Indian': ['Taj Mahal', 'Spice Route', 'Curry House', 'Bombay Bistro'],
        'Burgers': ['The Burger Joint', 'Smash & Go', 'Grill Master', 'Buns & Co'],
        'Pizza': ['Slice of Heaven', 'Pizza Plaza', 'Dough Boys', 'Stone Baked'],
        'Healthy': ['Green Leaf Cafe', 'Fit Foods', 'The Salad Bar', 'Vitality Kitchen']
    }
    
    rest_id_counter = 1
    restaurant_cuisine_map = {}
    for cuisine, names in restaurant_names.items():
        for name in names:
            city = random.choice(cities)
            rating = round(random.uniform(3.8, 4.9), 1)
            joined_dt = start_date - timedelta(days=random.randint(30, 365))
            joined_date_str = joined_dt.strftime('%Y-%m-%d')
            restaurants_data.append((name, cuisine, city, rating, joined_date_str))
            restaurant_cuisine_map[rest_id_counter] = cuisine
            rest_id_counter += 1
            
    cursor.executemany(
        "INSERT INTO restaurants (name, cuisine_type, city, rating, joined_date) VALUES (?, ?, ?, ?, ?)",
        restaurants_data
    )
    
    # --- 3. Populate Drivers ---
    drivers_data = []
    vehicles = ['Bike', 'Scooter', 'Car']
    for i in range(1, 61):
        name = f"Driver {first_names[random.randint(0, len(first_names)-1)]} {last_names[random.randint(0, len(last_names)-1)]}"
        vehicle = random.choice(vehicles)
        rating = round(random.uniform(4.0, 5.0), 1)
        joined_dt = start_date - timedelta(days=random.randint(30, 365))
        joined_date_str = joined_dt.strftime('%Y-%m-%d')
        drivers_data.append((name, vehicle, rating, joined_date_str))
        
    cursor.executemany(
        "INSERT INTO drivers (name, vehicle_type, rating, joined_date) VALUES (?, ?, ?, ?)",
        drivers_data
    )
    
    conn.commit()
    
    # --- 4. Populate Orders, Order Items, and Deliveries ---
    orders_batch = []
    deliveries_batch = []
    order_items_batch = []
    
    current_time = start_date
    order_id = 1
    
    hour_weights = [1] * 24
    for h in range(11, 14): hour_weights[h] = 8
    for h in range(17, 21): hour_weights[h] = 12
    for h in range(21, 23): hour_weights[h] = 5
    for h in range(0, 5): hour_weights[h] = 0.2
    
    day_weights = {0: 1.0, 1: 0.9, 2: 0.9, 3: 1.0, 4: 1.4, 5: 1.7, 6: 1.5}
    
    while current_time < end_date:
        day_of_week = current_time.weekday()
        hour = current_time.hour
        
        base_orders = random.uniform(0.6, 2.2) # slightly increased density
        num_orders = int(base_orders * hour_weights[hour] * day_weights[day_of_week])
        
        for _ in range(num_orders):
            cust_id = random.randint(1, 400)
            rest_id = random.randint(1, len(restaurants_data))
            
            cuisine = restaurant_cuisine_map[rest_id]
            menu = menu_items[cuisine]
            
            num_items = random.choices([1, 2, 3, 4], weights=[40, 40, 15, 5])[0]
            selected_items = random.sample(menu, num_items)
            
            subtotal = 0.0
            order_items_temp = []
            for item_name, price in selected_items:
                qty = random.choices([1, 2, 3], weights=[85, 12, 3])[0]
                subtotal += price * qty
                order_items_temp.append((order_id, item_name, qty, price))
            
            cursor.execute("SELECT customer_tier FROM customers WHERE customer_id = ?", (cust_id,))
            tier = cursor.fetchone()[0]
            
            base_delivery_fee = round(random.uniform(2.99, 5.99), 2)
            if tier == 'Premium':
                if subtotal >= 15.00:
                    delivery_fee = 0.0
                else:
                    delivery_fee = round(base_delivery_fee * 0.5, 2)
            else:
                delivery_fee = base_delivery_fee
                
            discount = 0.0
            if tier == 'Premium' and random.random() < 0.3:
                discount = round(subtotal * 0.1, 2)
            elif random.random() < 0.15:
                discount = round(subtotal * 0.15, 2)
                
            total_amount = round(subtotal + delivery_fee - discount, 2)
            if total_amount < 0: total_amount = 0.0
            
            minute = random.randint(0, 59)
            second = random.randint(0, 59)
            order_time = current_time.replace(minute=minute, second=second)
            order_time_str = order_time.strftime('%Y-%m-%d %H:%M:%S')
            
            cancel_chance = 0.04
            if hour in [12, 13, 18, 19, 20]:
                cancel_chance = 0.07
            elif hour >= 22 or hour < 5:
                cancel_chance = 0.12
                
            status_rand = random.random()
            if status_rand < cancel_chance:
                status = 'Cancelled'
            elif status_rand < cancel_chance + 0.015:
                status = 'Refunded'
            else:
                status = 'Completed'
                
            payment_method = random.choices(['Credit Card', 'PayPal', 'Cash'], weights=[70, 20, 10])[0]
            
            orders_batch.append((cust_id, rest_id, order_time_str, status, subtotal, delivery_fee, discount, total_amount, payment_method))
            
            for item in order_items_temp:
                order_items_batch.append(item)
                
            if status in ['Completed', 'Refunded']:
                driver_id = random.randint(1, 60)
                
                cursor.execute("SELECT vehicle_type FROM drivers WHERE driver_id = ?", (driver_id,))
                vehicle = cursor.fetchone()[0]
                
                prep_minutes = random.randint(10, 25)
                pickup_time = order_time + timedelta(minutes=prep_minutes)
                pickup_time_str = pickup_time.strftime('%Y-%m-%d %H:%M:%S')
                
                distance = round(random.uniform(0.8, 8.5), 2)
                
                if vehicle == 'Bike':
                    speed = random.uniform(10, 16)
                elif vehicle == 'Scooter':
                    speed = random.uniform(18, 26)
                else: # Car
                    if hour in [12, 13, 17, 18, 19]:
                        speed = random.uniform(14, 22)
                    else:
                        speed = random.uniform(28, 45)
                        
                delivery_travel_minutes = int((distance / speed) * 60)
                delivery_travel_minutes = max(5, delivery_travel_minutes)
                
                delivery_time = pickup_time + timedelta(minutes=delivery_travel_minutes)
                delivery_time_str = delivery_time.strftime('%Y-%m-%d %H:%M:%S')
                
                total_wait_time = prep_minutes + delivery_travel_minutes
                
                if total_wait_time < 22:
                    rating_weights = [1, 2, 5, 22, 70]
                elif total_wait_time < 35:
                    rating_weights = [2, 5, 15, 48, 30]
                elif total_wait_time < 48:
                    rating_weights = [10, 20, 40, 20, 10]
                else:
                    rating_weights = [55, 25, 15, 4, 1]
                    
                driver_rating = random.choices([1, 2, 3, 4, 5], weights=rating_weights)[0]
                
                deliveries_batch.append((order_id, driver_id, pickup_time_str, delivery_time_str, distance, driver_rating))
            
            order_id += 1
            
        current_time += timedelta(hours=1)
        
    cursor.executemany(
        "INSERT INTO orders (customer_id, restaurant_id, order_time, status, subtotal, delivery_fee, discount_applied, total_amount, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        orders_batch
    )
    cursor.executemany(
        "INSERT INTO order_items (order_id, item_name, quantity, unit_price) VALUES (?, ?, ?, ?)",
        order_items_batch
    )
    cursor.executemany(
        "INSERT INTO deliveries (order_id, driver_id, pickup_time, delivery_time, distance_km, driver_rating) VALUES (?, ?, ?, ?, ?, ?)",
        deliveries_batch
    )
    
    conn.commit()
    conn.close()
    print(f"Data generation complete: Generated {order_id-1} orders.")

if __name__ == '__main__':
    create_database()
    populate_database()
