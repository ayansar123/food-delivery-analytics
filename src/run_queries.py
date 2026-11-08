import sqlite3
import pandas as pd
import json
import os
import matplotlib.pyplot as plt
import seaborn as sns

def parse_sql_file(file_path):
    with open(file_path, 'r') as f:
        content = f.read()
    
    queries = {}
    current_name = None
    current_lines = []
    
    for line in content.split('\n'):
        if line.strip().startswith('-- name:'):
            if current_name:
                queries[current_name] = '\n'.join(current_lines).strip()
            current_name = line.split('-- name:')[1].strip()
            current_lines = []
        elif current_name:
            current_lines.append(line)
            
    if current_name and current_lines:
        queries[current_name] = '\n'.join(current_lines).strip()
        
    return queries

def execute_and_export():
    db_path = os.path.join('data', 'food_delivery.db')
    sql_path = os.path.join('src', 'analytics_queries.sql')
    
    if not os.path.exists(db_path):
        print(f"Error: Database {db_path} does not exist. Run data_generator.py first.")
        return
        
    queries = parse_sql_file(sql_path)
    conn = sqlite3.connect(db_path)
    
    results = {}
    
    print("\n" + "="*80)
    print("RUNNING SQL ANALYTICS QUERIES")
    print("="*80)
    
    for name, sql in queries.items():
        print(f"\nExecuting: {name}...")
        df = pd.read_sql_query(sql, conn)
        
        # Convert to dictionary (list of dicts)
        results[name] = df.to_dict(orient='records')
        
        # Print first few rows as markdown for user inspection
        print(df.to_markdown(index=False))
        
    # Append database diagnostics metadata
    try:
        from db_diagnostics import run_diagnostics
        results['db_diagnostics'] = run_diagnostics()
        print("\nDatabase diagnostics generated successfully.")
    except Exception as e:
        print(f"\nWarning: Could not generate database diagnostics: {e}")
        
    # Save to JS (resolves CORS issues in local file:// browser access)
    os.makedirs('dashboard', exist_ok=True)
    js_path = os.path.join('dashboard', 'data.js')
    with open(js_path, 'w') as f:
        f.write("const ANALYTICS_DATA = ")
        json.dump(results, f, indent=2)
        f.write(";\n")
        
    print(f"\nSuccessfully exported results to {js_path}")
    
    # Generate Visualizations
    generate_charts(results)
    
    conn.close()

def generate_charts(results):
    os.makedirs(os.path.join('dashboard', 'charts'), exist_ok=True)
    
    # Set styling (Charcoal Grey / Carbon Theme, completely blue-free)
    sns.set_theme(style="darkgrid")
    plt.rcParams.update({
        'font.family': 'sans-serif',
        'font.size': 10,
        'figure.facecolor': '#18181b',  # carbon-zinc grey
        'axes.facecolor': '#121214',    # deep charcoal
        'axes.labelcolor': '#f8fafc',   # slate-50
        'xtick.color': '#cbd5e1',       # slate-300
        'ytick.color': '#cbd5e1',       # slate-300
        'text.color': '#f8fafc',        # slate-50
        'axes.titlecolor': '#f8fafc'    # slate-50
    })
    
    # 1. Monthly Revenue & Orders Chart (Aggregated Globally)
    monthly_raw = pd.DataFrame(results['monthly_growth'])
    monthly_data = monthly_raw.groupby('month').agg({
        'total_gmv': 'sum',
        'total_orders': 'sum'
    }).reset_index()
    
    fig, ax1 = plt.subplots(figsize=(10, 5))
    
    color = '#a855f7' # purple accent
    ax1.set_xlabel('Month')
    ax1.set_ylabel('Total GMV ($)', color=color)
    bars = ax1.bar(monthly_data['month'], monthly_data['total_gmv'], color=color, alpha=0.6, label='Total GMV ($)')
    ax1.tick_params(axis='y', labelcolor=color)
    
    ax2 = ax1.twinx()
    color = '#10b981' # emerald-500
    ax2.set_ylabel('Total Orders', color=color)
    line = ax2.plot(monthly_data['month'], monthly_data['total_orders'], color=color, marker='o', linewidth=2, label='Total Orders')
    ax2.tick_params(axis='y', labelcolor=color)
    
    plt.title('Monthly Sales Performance & Order Volume', pad=20)
    fig.tight_layout()
    plt.savefig('dashboard/charts/monthly_growth.png', dpi=150, facecolor='#18181b')
    plt.close()
    
    # 2. Cuisine Popularity Chart (Aggregated Globally)
    cuisine_raw = pd.DataFrame(results['cuisine_analysis'])
    cuisine_data = cuisine_raw.groupby('cuisine_type').agg({
        'total_orders': 'sum',
        'total_gmv': 'sum'
    }).reset_index().sort_values('total_gmv', ascending=False)
    
    plt.figure(figsize=(8, 5))
    sns.barplot(x='total_gmv', y='cuisine_type', data=cuisine_data, palette='magma')
    plt.title('GMV Contribution by Cuisine Type', pad=15)
    plt.xlabel('Gross Merchandise Value ($)')
    plt.ylabel('Cuisine Type')
    plt.tight_layout()
    plt.savefig('dashboard/charts/cuisine_contribution.png', dpi=150, facecolor='#18181b')
    plt.close()
    
    # 3. Peak Hours Chart (Aggregated Globally)
    hourly_raw = pd.DataFrame(results['hourly_peaks'])
    hourly_data = hourly_raw.groupby('hour').agg({
        'total_orders': 'sum',
        'total_gmv': 'sum'
    }).reset_index()
    
    plt.figure(figsize=(10, 5))
    plt.plot(hourly_data['hour'], hourly_data['total_orders'], color='#f59e0b', marker='s', linewidth=2) # amber-500
    plt.fill_between(hourly_data['hour'], hourly_data['total_orders'], color='#f59e0b', alpha=0.2)
    plt.title('Order Distribution by Hour of the Day (Peak Analysis)', pad=15)
    plt.xlabel('Hour of the Day')
    plt.ylabel('Order Count')
    plt.xticks(hourly_data['hour'])
    plt.grid(True, alpha=0.1)
    plt.tight_layout()
    plt.savefig('dashboard/charts/hourly_peaks.png', dpi=150, facecolor='#18181b')
    plt.close()

    # 4. Cohort Retention Heatmap (Aggregated Globally)
    cohort_raw = pd.DataFrame(results['cohort_retention'])
    cohort_global = cohort_raw.groupby(['cohort_month', 'months_since_signup']).agg({
        'cohort_size': 'sum',
        'active_customers': 'sum'
    }).reset_index()
    cohort_global['retention_rate'] = (cohort_global['active_customers'] / cohort_global['cohort_size'] * 100).round(1)
    cohort_pivot = cohort_global.pivot(index='cohort_month', columns='months_since_signup', values='retention_rate')
    
    plt.figure(figsize=(10, 6))
    sns.heatmap(cohort_pivot, annot=True, fmt=".1f", cmap="Purples", vmin=0, vmax=100, 
                cbar_kws={'label': 'Retention Rate (%)'}, linewidths=.5, annot_kws={"size": 9})
    plt.title('Customer Retention Cohorts (Month-over-Month %)', pad=15)
    plt.xlabel('Months Since Signup')
    plt.ylabel('Signup Cohort')
    plt.tight_layout()
    plt.savefig('dashboard/charts/cohort_retention.png', dpi=150, facecolor='#18181b')
    plt.close()
    
    # 5. Vehicle Performance Chart (Aggregated Globally)
    vehicle_raw = pd.DataFrame(results['vehicle_performance'])
    vehicle_data = vehicle_raw.groupby('vehicle_type').agg({
        'avg_delivery_duration_min': 'mean'
    }).reset_index()
    
    plt.figure(figsize=(8, 5))
    colors = ['#f43f5e', '#a855f7', '#f59e0b'] # rose, purple, amber
    sns.barplot(x='vehicle_type', y='avg_delivery_duration_min', data=vehicle_data, palette=colors)
    plt.title('Average Delivery Duration by Vehicle Type (Minutes)', pad=15)
    plt.xlabel('Vehicle Type')
    plt.ylabel('Duration (Mins)')
    plt.tight_layout()
    plt.savefig('dashboard/charts/vehicle_performance.png', dpi=150, facecolor='#18181b')
    plt.close()
    
    print("Static chart generation complete. Saved charts to dashboard/charts/")

if __name__ == '__main__':
    execute_and_export()
