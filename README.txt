INVENTORY MANAGEMENT SYSTEM
============================

OVERVIEW
--------
The Inventory Management System is a web-based application designed to help businesses maintain accurate records of products and stock levels. The system eliminates manual stock tracking and reduces errors by automating inventory updates whenever items are added or removed.

FEATURES
--------
- Product Management: Add, edit, and delete products with details like name, category, price, and quantity
- Stock In/Out: Record stock purchases and sales with automatic quantity updates
- Low Stock Alerts: Automatic alerts when product quantities fall below the threshold (10 units)
- Search and Filter: Quickly find products by name or category
- Reports: View summary statistics, category breakdowns, and recent transactions

TECHNOLOGY STACK
----------------
- Backend: Python Flask
- Database: SQLite
- Frontend: HTML, CSS, JavaScript
- Icons: Font Awesome

INSTALLATION
------------
1. Make sure Python 3.7 or higher is installed on your system
2. Install required packages by running:
   pip install -r requirements.txt

RUNNING THE APPLICATION
-----------------------
1. Open a terminal/command prompt in the project directory
2. Run the application:
   python app.py
3. Open your web browser and navigate to:
   http://localhost:5000

DATABASE
--------
The application uses SQLite database (inventory.db) which is automatically created when you first run the application. The database contains two main tables:
- products: Stores product information
- stock_transactions: Records all stock in/out transactions

USAGE
-----
1. PRODUCT MANAGEMENT TAB
   - Click "Add Product" to create new products
   - Use search box to find products by name
   - Use category filter to filter by category
   - Click "Edit" to modify product details
   - Click "Delete" to remove products

2. STOCK MANAGEMENT TAB
   - Select a product from the dropdown
   - Enter quantity and optional notes
   - Click "Add Stock" for stock in transactions
   - Click "Remove Stock" for stock out transactions

3. MONITORING TAB
   - View all products with low stock levels
   - Products with quantity below 10 units are highlighted

4. REPORTS TAB
   - View total number of products
   - View total inventory value
   - View low stock count
   - See category-wise statistics
   - View recent stock transactions

MODULES
-------
1. Product Management Module
   - CRUD operations for products
   - Category management
   - Price tracking

2. Stock In / Stock Out Module
   - Record stock purchases
   - Record stock sales
   - Automatic quantity updates
   - Transaction history

3. Inventory Monitoring Module
   - Low stock alerts
   - Real-time stock status
   - Threshold monitoring

4. Reporting Module
   - Summary statistics
   - Category analysis
   - Transaction history
   - Inventory valuation

LEARNING OUTCOMES
----------------
- Database design and normalization
- CRUD operations implementation
- Business logic for inventory management
- RESTful API design
- Frontend-backend integration
- Real-time data updates

USE CASES
---------
- Retail stores tracking merchandise
- Warehouses managing inventory
- Small businesses monitoring stock levels
- Distribution centers tracking products

NOTES
-----
- Low stock threshold is set to 10 units (can be modified in app.py)
- All prices are stored in decimal format
- Stock out operations validate available quantity before processing
- Transaction history is maintained for audit purposes

SUPPORT
-------
For issues or questions, refer to the code comments or Flask documentation.

