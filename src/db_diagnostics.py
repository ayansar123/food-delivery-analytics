import sqlite3
import os
import json

def run_diagnostics():
    db_path = os.path.join('data', 'food_delivery.db')
    
    if not os.path.exists(db_path):
        return {
            "status": "Error",
            "message": f"Database file {db_path} not found."
        }
        
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 1. File Metadata
    db_size_kb = round(os.path.getsize(db_path) / 1024, 2)
    
    # 2. Integrity Check
    cursor.execute("PRAGMA integrity_check;")
    integrity = cursor.fetchone()[0]
    
    # 3. Tables list
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
    tables = [row[0] for row in cursor.fetchall()]
    
    schema_info = {}
    total_rows = 0
    
    for table in tables:
        # Row count
        cursor.execute(f"SELECT COUNT(*) FROM {table};")
        row_count = cursor.fetchone()[0]
        total_rows += row_count
        
        # Column Info
        cursor.execute(f"PRAGMA table_info({table});")
        columns = []
        for col in cursor.fetchall():
            columns.append({
                "cid": col[0],
                "name": col[1],
                "type": col[2],
                "notnull": col[3],
                "dflt_value": col[4],
                "pk": col[5]
            })
            
        # Foreign Keys
        cursor.execute(f"PRAGMA foreign_key_list({table});")
        foreign_keys = []
        for fk in cursor.fetchall():
            foreign_keys.append({
                "id": fk[0],
                "seq": fk[1],
                "table": fk[2],
                "from": fk[3],
                "to": fk[4],
                "on_update": fk[5],
                "on_delete": fk[6],
                "match": fk[7]
            })
            
        schema_info[table] = {
            "rows": row_count,
            "columns": columns,
            "foreign_keys": foreign_keys
        }
        
    conn.close()
    
    return {
        "status": "Success",
        "file_size_kb": db_size_kb,
        "integrity_check": integrity,
        "total_tables": len(tables),
        "total_rows": total_rows,
        "tables": schema_info
    }

if __name__ == '__main__':
    diag = run_diagnostics()
    print(json.dumps(diag, indent=2))
