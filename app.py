from flask import Flask, render_template, request, jsonify, redirect, url_for, flash, Response
import sqlite3
import os
import csv
import io
from datetime import datetime

app = Flask(__name__)
app.secret_key = 'inventory_management_secret_key_2024'

DATABASE = 'inventory.db'
LOW_STOCK_THRESHOLD = 10

def get_db_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            brand TEXT,
            category TEXT NOT NULL,
            subcategory TEXT,
            price REAL NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Add brand and subcategory columns if they don't exist (for existing databases)
    try:
        conn.execute('ALTER TABLE products ADD COLUMN brand TEXT')
    except sqlite3.OperationalError:
        pass  # Column already exists
    
    try:
        conn.execute('ALTER TABLE products ADD COLUMN subcategory TEXT')
    except sqlite3.OperationalError:
        pass  # Column already exists
    
    conn.execute('''
        CREATE TABLE IF NOT EXISTS stock_transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            transaction_type TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (product_id) REFERENCES products (id)
        )
    ''')
    
    # Check if products already exist
    existing_products = conn.execute('SELECT COUNT(*) as count FROM products').fetchone()['count']
    
    # Insert sample products if database is empty
    if existing_products == 0:
        sample_products = [
            ('Laptop Computer', 'Dell', 'Electronics', 'Computers', 899.99, 25),
            ('Wireless Mouse', 'Logitech', 'Electronics', 'Peripherals', 29.99, 8),
            ('USB Keyboard', 'Logitech', 'Electronics', 'Peripherals', 45.50, 15),
            ('Monitor 24 inch', 'Samsung', 'Electronics', 'Displays', 249.99, 12),
            ('Office Chair', 'Herman Miller', 'Furniture', 'Seating', 199.99, 5),
            ('Desk Lamp', 'IKEA', 'Furniture', 'Lighting', 34.99, 20),
            ('Filing Cabinet', 'HON', 'Furniture', 'Storage', 159.99, 7),
            ('Coffee Maker', 'Keurig', 'Appliances', 'Kitchen', 79.99, 18),
            ('Printer', 'HP', 'Electronics', 'Office Equipment', 179.99, 4),
            ('Paper A4', 'Hammermill', 'Office Supplies', 'Paper Products', 12.99, 50),
            ('Stapler', 'Swingline', 'Office Supplies', 'Desk Accessories', 8.99, 30),
            ('Pen Set', 'Pilot', 'Office Supplies', 'Writing Instruments', 15.99, 9),
            ('Notebook', 'Moleskine', 'Office Supplies', 'Paper Products', 6.99, 35),
            ('Desk Organizer', 'SimpleHouseware', 'Office Supplies', 'Desk Accessories', 24.99, 14),
            ('Headphones', 'Sony', 'Electronics', 'Audio', 89.99, 22),
            ('Webcam', 'Logitech', 'Electronics', 'Peripherals', 59.99, 11),
            ('Tablet Stand', 'Lamicall', 'Electronics', 'Accessories', 19.99, 6),
            ('Cable Organizer', 'J Channel', 'Electronics', 'Accessories', 14.99, 28),
            ('Whiteboard', 'Quartet', 'Office Supplies', 'Presentation', 39.99, 10),
            ('Marker Set', 'Expo', 'Office Supplies', 'Writing Instruments', 9.99, 3),
        ]
        
        conn.executemany(
            'INSERT INTO products (name, brand, category, subcategory, price, quantity) VALUES (?, ?, ?, ?, ?, ?)',
            sample_products
        )
        conn.commit()
    
    conn.close()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/products', methods=['GET'])
def get_products():
    conn = get_db_connection()
    search = request.args.get('search', '')
    category = request.args.get('category', '')
    subcategory = request.args.get('subcategory', '')
    brand = request.args.get('brand', '')
    
    query = 'SELECT * FROM products WHERE 1=1'
    params = []
    
    if search:
        query += ' AND (name LIKE ? OR brand LIKE ?)'
        params.append(f'%{search}%')
        params.append(f'%{search}%')
    
    if category:
        query += ' AND category = ?'
        params.append(category)
    
    if subcategory:
        query += ' AND subcategory = ?'
        params.append(subcategory)
    
    if brand:
        query += ' AND brand = ?'
        params.append(brand)
    
    query += ' ORDER BY brand, category, subcategory, name'
    products = conn.execute(query, params).fetchall()
    conn.close()
    
    return jsonify([dict(product) for product in products])

@app.route('/api/products', methods=['POST'])
def add_product():
    data = request.json
    name = data.get('name')
    brand = data.get('brand', '')
    category = data.get('category')
    subcategory = data.get('subcategory', '')
    price = data.get('price')
    quantity = data.get('quantity', 0)
    
    if not name or not category or not price:
        return jsonify({'error': 'Missing required fields'}), 400
    
    conn = get_db_connection()
    conn.execute(
        'INSERT INTO products (name, brand, category, subcategory, price, quantity) VALUES (?, ?, ?, ?, ?, ?)',
        (name, brand, category, subcategory, price, quantity)
    )
    conn.commit()
    conn.close()
    
    return jsonify({'success': True, 'message': 'Product added successfully'}), 201

@app.route('/api/products/<int:product_id>', methods=['PUT'])
def update_product(product_id):
    data = request.json
    name = data.get('name')
    brand = data.get('brand', '')
    category = data.get('category')
    subcategory = data.get('subcategory', '')
    price = data.get('price')
    
    conn = get_db_connection()
    conn.execute(
        'UPDATE products SET name = ?, brand = ?, category = ?, subcategory = ?, price = ? WHERE id = ?',
        (name, brand, category, subcategory, price, product_id)
    )
    conn.commit()
    conn.close()
    
    return jsonify({'success': True, 'message': 'Product updated successfully'})

@app.route('/api/products/<int:product_id>', methods=['DELETE'])
def delete_product(product_id):
    conn = get_db_connection()
    conn.execute('DELETE FROM products WHERE id = ?', (product_id,))
    conn.commit()
    conn.close()
    
    return jsonify({'success': True, 'message': 'Product deleted successfully'})

@app.route('/api/stock/in', methods=['POST'])
def stock_in():
    data = request.json
    product_id = data.get('product_id')
    quantity = data.get('quantity')
    notes = data.get('notes', '')
    
    if not product_id or not quantity or quantity <= 0:
        return jsonify({'error': 'Invalid stock in data'}), 400
    
    conn = get_db_connection()
    conn.execute(
        'UPDATE products SET quantity = quantity + ? WHERE id = ?',
        (quantity, product_id)
    )
    conn.execute(
        'INSERT INTO stock_transactions (product_id, transaction_type, quantity, notes) VALUES (?, ?, ?, ?)',
        (product_id, 'IN', quantity, notes)
    )
    conn.commit()
    conn.close()
    
    return jsonify({'success': True, 'message': 'Stock added successfully'})

@app.route('/api/stock/out', methods=['POST'])
def stock_out():
    data = request.json
    product_id = data.get('product_id')
    quantity = data.get('quantity')
    notes = data.get('notes', '')
    
    if not product_id or not quantity or quantity <= 0:
        return jsonify({'error': 'Invalid stock out data'}), 400
    
    conn = get_db_connection()
    product = conn.execute('SELECT quantity FROM products WHERE id = ?', (product_id,)).fetchone()
    
    if not product:
        return jsonify({'error': 'Product not found'}), 404
    
    current_quantity = product['quantity']
    if quantity > current_quantity:
        return jsonify({'error': 'Insufficient stock'}), 400
    
    conn.execute(
        'UPDATE products SET quantity = quantity - ? WHERE id = ?',
        (quantity, product_id)
    )
    conn.execute(
        'INSERT INTO stock_transactions (product_id, transaction_type, quantity, notes) VALUES (?, ?, ?, ?)',
        (product_id, 'OUT', quantity, notes)
    )
    conn.commit()
    conn.close()
    
    return jsonify({'success': True, 'message': 'Stock removed successfully'})

@app.route('/api/alerts', methods=['GET'])
def get_alerts():
    conn = get_db_connection()
    low_stock_products = conn.execute(
        'SELECT * FROM products WHERE quantity < ? ORDER BY quantity ASC',
        (LOW_STOCK_THRESHOLD,)
    ).fetchall()
    conn.close()
    
    return jsonify([dict(product) for product in low_stock_products])

@app.route('/api/categories', methods=['GET'])
def get_categories():
    conn = get_db_connection()
    categories = conn.execute('SELECT DISTINCT category FROM products WHERE category IS NOT NULL ORDER BY category').fetchall()
    conn.close()
    
    return jsonify([cat['category'] for cat in categories])

@app.route('/api/subcategories', methods=['GET'])
def get_subcategories():
    conn = get_db_connection()
    category = request.args.get('category', '')
    query = 'SELECT DISTINCT subcategory FROM products WHERE subcategory IS NOT NULL AND subcategory != ""'
    params = []
    
    if category:
        query += ' AND category = ?'
        params.append(category)
    
    query += ' ORDER BY subcategory'
    subcategories = conn.execute(query, params).fetchall()
    conn.close()
    
    return jsonify([sub['subcategory'] for sub in subcategories])

@app.route('/api/brands', methods=['GET'])
def get_brands():
    conn = get_db_connection()
    brands = conn.execute('SELECT DISTINCT brand FROM products WHERE brand IS NOT NULL AND brand != "" ORDER BY brand').fetchall()
    conn.close()
    
    return jsonify([brand['brand'] for brand in brands])

@app.route('/api/reports/summary', methods=['GET'])
def get_summary_report():
    conn = get_db_connection()
    
    total_products = conn.execute('SELECT COUNT(*) as count FROM products').fetchone()['count']
    total_value = conn.execute('SELECT SUM(price * quantity) as total FROM products').fetchone()['total'] or 0
    low_stock_count = conn.execute('SELECT COUNT(*) as count FROM products WHERE quantity < ?', (LOW_STOCK_THRESHOLD,)).fetchone()['count']
    
    category_stats = conn.execute('''
        SELECT category, COUNT(*) as count, SUM(quantity) as total_qty, SUM(price * quantity) as total_value
        FROM products
        GROUP BY category
        ORDER BY category
    ''').fetchall()
    
    recent_transactions = conn.execute('''
        SELECT st.*, p.name as product_name
        FROM stock_transactions st
        JOIN products p ON st.product_id = p.id
        ORDER BY st.created_at DESC
        LIMIT 10
    ''').fetchall()
    
    conn.close()
    
    return jsonify({
        'total_products': total_products,
        'total_value': round(total_value, 2),
        'low_stock_count': low_stock_count,
        'category_stats': [dict(stat) for stat in category_stats],
        'recent_transactions': [dict(trans) for trans in recent_transactions]
    })

@app.route('/api/reports/export-csv', methods=['GET'])
def export_csv():
    """Export inventory report as CSV"""
    conn = get_db_connection()
    
    # Get all products
    products = conn.execute('''
        SELECT id, name, brand, category, subcategory, price, quantity, 
               CASE WHEN quantity < ? THEN 'Low Stock' ELSE 'In Stock' END as status
        FROM products
        ORDER BY brand, category, subcategory, name
    ''', (LOW_STOCK_THRESHOLD,)).fetchall()
    
    # Create CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow(['ID', 'Product Name', 'Category', 'Price', 'Quantity', 'Status', 'Total Value'])
    
    # Write product data
    for product in products:
        total_value = product['price'] * product['quantity']
        writer.writerow([
            product['id'],
            product['name'],
            product['category'],
            f"{product['price']:.2f}",
            product['quantity'],
            product['status'],
            f"{total_value:.2f}"
        ])
    
    # Add summary section
    writer.writerow([])
    writer.writerow(['SUMMARY'])
    writer.writerow(['Total Products', conn.execute('SELECT COUNT(*) as count FROM products').fetchone()['count']])
    writer.writerow(['Total Inventory Value', f"{conn.execute('SELECT SUM(price * quantity) as total FROM products').fetchone()['total'] or 0:.2f}"])
    writer.writerow(['Low Stock Items', conn.execute('SELECT COUNT(*) as count FROM products WHERE quantity < ?', (LOW_STOCK_THRESHOLD,)).fetchone()['count']])
    
    # Add category breakdown
    writer.writerow([])
    writer.writerow(['CATEGORY BREAKDOWN'])
    writer.writerow(['Category', 'Product Count', 'Total Quantity', 'Total Value'])
    
    category_stats = conn.execute('''
        SELECT category, COUNT(*) as count, SUM(quantity) as total_qty, SUM(price * quantity) as total_value
        FROM products
        GROUP BY category
        ORDER BY category
    ''').fetchall()
    
    for stat in category_stats:
        writer.writerow([
            stat['category'],
            stat['count'],
            stat['total_qty'] or 0,
            f"{stat['total_value'] or 0:.2f}"
        ])
    
    conn.close()
    
    # Prepare response
    output.seek(0)
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f'inventory_report_{timestamp}.csv'
    
    return Response(
        output.getvalue(),
        mimetype='text/csv',
        headers={'Content-Disposition': f'attachment; filename={filename}'}
    )

@app.route('/api/cleanup-duplicates', methods=['POST'])
def cleanup_duplicates():
    """Remove duplicate products, keeping only the first occurrence of each product name"""
    conn = get_db_connection()
    
    try:
        # Get count before deletion
        before_count = conn.execute('SELECT COUNT(*) as count FROM products').fetchone()['count']
        
        # Delete duplicates, keeping the one with the lowest ID
        conn.execute('''
            DELETE FROM products
            WHERE id NOT IN (
                SELECT MIN(id)
                FROM products
                GROUP BY name
            )
        ''')
        conn.commit()
        
        # Get count after deletion
        after_count = conn.execute('SELECT COUNT(*) as count FROM products').fetchone()['count']
        deleted_count = before_count - after_count
        
        conn.close()
        return jsonify({'success': True, 'message': f'{deleted_count} duplicate products removed'})
    except Exception as e:
        conn.close()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/seed', methods=['POST'])
def seed_database():
    """Add sample products to database (only if database is empty)"""
    conn = get_db_connection()
    
    # Check if products already exist
    existing_count = conn.execute('SELECT COUNT(*) as count FROM products').fetchone()['count']
    
    if existing_count > 0:
        conn.close()
        return jsonify({'success': False, 'error': 'Products already exist in database. Please clear existing products first or add new ones manually.'}), 400
    
    sample_products = [
        ('Laptop Computer', 'Dell', 'Electronics', 'Computers', 899.99, 25),
        ('Wireless Mouse', 'Logitech', 'Electronics', 'Peripherals', 29.99, 8),
        ('USB Keyboard', 'Logitech', 'Electronics', 'Peripherals', 45.50, 15),
        ('Monitor 24 inch', 'Samsung', 'Electronics', 'Displays', 249.99, 12),
        ('Office Chair', 'Herman Miller', 'Furniture', 'Seating', 199.99, 5),
        ('Desk Lamp', 'IKEA', 'Furniture', 'Lighting', 34.99, 20),
        ('Filing Cabinet', 'HON', 'Furniture', 'Storage', 159.99, 7),
        ('Coffee Maker', 'Keurig', 'Appliances', 'Kitchen', 79.99, 18),
        ('Printer', 'HP', 'Electronics', 'Office Equipment', 179.99, 4),
        ('Paper A4', 'Hammermill', 'Office Supplies', 'Paper Products', 12.99, 50),
        ('Stapler', 'Swingline', 'Office Supplies', 'Desk Accessories', 8.99, 30),
        ('Pen Set', 'Pilot', 'Office Supplies', 'Writing Instruments', 15.99, 9),
        ('Notebook', 'Moleskine', 'Office Supplies', 'Paper Products', 6.99, 35),
        ('Desk Organizer', 'SimpleHouseware', 'Office Supplies', 'Desk Accessories', 24.99, 14),
        ('Headphones', 'Sony', 'Electronics', 'Audio', 89.99, 22),
        ('Webcam', 'Logitech', 'Electronics', 'Peripherals', 59.99, 11),
        ('Tablet Stand', 'Lamicall', 'Electronics', 'Accessories', 19.99, 6),
        ('Cable Organizer', 'J Channel', 'Electronics', 'Accessories', 14.99, 28),
        ('Whiteboard', 'Quartet', 'Office Supplies', 'Presentation', 39.99, 10),
        ('Marker Set', 'Expo', 'Office Supplies', 'Writing Instruments', 9.99, 3),
    ]
    
    try:
        conn.executemany(
            'INSERT INTO products (name, brand, category, subcategory, price, quantity) VALUES (?, ?, ?, ?, ?, ?)',
            sample_products
        )
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': f'{len(sample_products)} sample products added successfully'})
    except Exception as e:
        conn.close()
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    init_db()
    app.run(debug=True)

