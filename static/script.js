const LOW_STOCK_THRESHOLD = 10;
let currentEditProductId = null;

document.addEventListener('DOMContentLoaded', function() {
    loadProducts();
    loadCategories();
    loadBrands();
    setupTabs();
    setupModals();
});

function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(`${targetTab}-tab`).classList.add('active');
            
            if (targetTab === 'monitoring') {
                loadAlerts();
            } else if (targetTab === 'reports') {
                loadReports();
            } else if (targetTab === 'stock') {
                loadProductsForStock();
            }
        });
    });
}

function setupModals() {
    document.getElementById('add-product-form').addEventListener('submit', function(e) {
        e.preventDefault();
        addProduct();
    });

    document.getElementById('edit-product-form').addEventListener('submit', function(e) {
        e.preventDefault();
        updateProduct();
    });

    window.onclick = function(event) {
        const addModal = document.getElementById('add-product-modal');
        const editModal = document.getElementById('edit-product-modal');
        if (event.target === addModal) {
            closeAddProductModal();
        }
        if (event.target === editModal) {
            closeEditProductModal();
        }
    }
}

async function loadProducts() {
    try {
        const response = await fetch('/api/products');
        const products = await response.json();
        displayProducts(products);
        updateCategoryFilter(products);
        await loadBrands();
        loadSubcategories();
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

function displayProducts(products) {
    const tbody = document.getElementById('products-tbody');
    tbody.innerHTML = '';

    if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 30px;">No products found</td></tr>';
        return;
    }

    products.forEach(product => {
        const row = document.createElement('tr');
        const status = product.quantity < LOW_STOCK_THRESHOLD ? 'low' : 'ok';
        const statusText = product.quantity < LOW_STOCK_THRESHOLD ? 'Low Stock' : 'In Stock';
        const brand = product.brand || '-';
        const subcategory = product.subcategory || '-';
        
        // Escape single quotes for JavaScript
        const name = product.name.replace(/'/g, "\\'");
        const category = product.category.replace(/'/g, "\\'");
        const brandEscaped = (product.brand || '').replace(/'/g, "\\'");
        const subcategoryEscaped = (product.subcategory || '').replace(/'/g, "\\'");
        
        row.innerHTML = `
            <td>${product.id}</td>
            <td>${product.name}</td>
            <td>${brand}</td>
            <td>${product.category}</td>
            <td>${subcategory}</td>
            <td>$${parseFloat(product.price).toFixed(2)}</td>
            <td>${product.quantity}</td>
            <td><span class="status-badge status-${status}">${statusText}</span></td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="openEditProductModal(${product.id}, '${name}', '${brandEscaped}', '${category}', '${subcategoryEscaped}', ${product.price})">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteProduct(${product.id})">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function updateCategoryFilter(products) {
    const categories = [...new Set(products.map(p => p.category))];
    const filter = document.getElementById('category-filter');
    const currentValue = filter.value;
    
    filter.innerHTML = '<option value="">All Categories</option>';
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        filter.appendChild(option);
    });
    
    if (currentValue) {
        filter.value = currentValue;
    }
}

async function filterProducts() {
    const search = document.getElementById('search-input').value;
    const category = document.getElementById('category-filter').value;
    const subcategory = document.getElementById('subcategory-filter').value;
    const brand = document.getElementById('brand-filter').value;
    
    let url = '/api/products?';
    if (search) url += `search=${encodeURIComponent(search)}&`;
    if (category) url += `category=${encodeURIComponent(category)}&`;
    if (subcategory) url += `subcategory=${encodeURIComponent(subcategory)}&`;
    if (brand) url += `brand=${encodeURIComponent(brand)}&`;
    
    // Remove trailing &
    url = url.replace(/&$/, '');
    
    try {
        const response = await fetch(url);
        const products = await response.json();
        displayProducts(products);
    } catch (error) {
        console.error('Error filtering products:', error);
    }
}

function clearFilters() {
    document.getElementById('search-input').value = '';
    document.getElementById('brand-filter').value = '';
    document.getElementById('category-filter').value = '';
    document.getElementById('subcategory-filter').value = '';
    document.getElementById('subcategory-filter').innerHTML = '<option value="">All Subcategories</option>';
    filterProducts();
}

function openAddProductModal() {
    document.getElementById('add-product-modal').style.display = 'block';
    document.getElementById('add-product-form').reset();
}

function closeAddProductModal() {
    document.getElementById('add-product-modal').style.display = 'none';
}

function openEditProductModal(id, name, brand, category, subcategory, price) {
    currentEditProductId = id;
    document.getElementById('edit-product-id').value = id;
    document.getElementById('edit-product-name').value = name;
    document.getElementById('edit-product-brand').value = brand || '';
    document.getElementById('edit-product-category').value = category;
    document.getElementById('edit-product-subcategory').value = subcategory || '';
    document.getElementById('edit-product-price').value = price;
    document.getElementById('edit-product-modal').style.display = 'block';
}

function closeEditProductModal() {
    document.getElementById('edit-product-modal').style.display = 'none';
    currentEditProductId = null;
}

async function addProduct() {
    const name = document.getElementById('product-name').value;
    const brand = document.getElementById('product-brand').value;
    const category = document.getElementById('product-category').value;
    const subcategory = document.getElementById('product-subcategory').value;
    const price = parseFloat(document.getElementById('product-price').value);
    const quantity = parseInt(document.getElementById('product-quantity').value) || 0;

    try {
        const response = await fetch('/api/products', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, brand, category, subcategory, price, quantity })
        });

        if (response.ok) {
            closeAddProductModal();
            loadProducts();
            loadBrands();
            loadCategories();
            alert('Product added successfully!');
        } else {
            const error = await response.json();
            alert('Error: ' + error.error);
        }
    } catch (error) {
        console.error('Error adding product:', error);
        alert('Error adding product');
    }
}

async function updateProduct() {
    const id = document.getElementById('edit-product-id').value;
    const name = document.getElementById('edit-product-name').value;
    const brand = document.getElementById('edit-product-brand').value;
    const category = document.getElementById('edit-product-category').value;
    const subcategory = document.getElementById('edit-product-subcategory').value;
    const price = parseFloat(document.getElementById('edit-product-price').value);

    try {
        const response = await fetch(`/api/products/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, brand, category, subcategory, price })
        });

        if (response.ok) {
            closeEditProductModal();
            loadProducts();
            loadBrands();
            loadCategories();
            alert('Product updated successfully!');
        } else {
            const error = await response.json();
            alert('Error: ' + error.error);
        }
    } catch (error) {
        console.error('Error updating product:', error);
        alert('Error updating product');
    }
}

async function deleteProduct(id) {
    if (!confirm('Are you sure you want to delete this product?')) {
        return;
    }

    try {
        const response = await fetch(`/api/products/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            loadProducts();
            alert('Product deleted successfully!');
        } else {
            alert('Error deleting product');
        }
    } catch (error) {
        console.error('Error deleting product:', error);
        alert('Error deleting product');
    }
}

async function loadProductsForStock() {
    try {
        const response = await fetch('/api/products');
        const products = await response.json();
        
        const stockInSelect = document.getElementById('stock-in-product');
        const stockOutSelect = document.getElementById('stock-out-product');
        
        stockInSelect.innerHTML = '<option value="">Select Product</option>';
        stockOutSelect.innerHTML = '<option value="">Select Product</option>';
        
        products.forEach(product => {
            const option1 = document.createElement('option');
            option1.value = product.id;
            option1.textContent = `${product.name} (Qty: ${product.quantity})`;
            stockInSelect.appendChild(option1);
            
            const option2 = document.createElement('option');
            option2.value = product.id;
            option2.textContent = `${product.name} (Qty: ${product.quantity})`;
            stockOutSelect.appendChild(option2);
        });
    } catch (error) {
        console.error('Error loading products for stock:', error);
    }
}

async function stockIn() {
    const productId = document.getElementById('stock-in-product').value;
    const quantity = parseInt(document.getElementById('stock-in-quantity').value);
    const notes = document.getElementById('stock-in-notes').value;

    if (!productId || !quantity || quantity <= 0) {
        alert('Please select a product and enter a valid quantity');
        return;
    }

    try {
        const response = await fetch('/api/stock/in', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ product_id: parseInt(productId), quantity, notes })
        });

        if (response.ok) {
            document.getElementById('stock-in-quantity').value = '';
            document.getElementById('stock-in-notes').value = '';
            loadProductsForStock();
            alert('Stock added successfully!');
        } else {
            const error = await response.json();
            alert('Error: ' + error.error);
        }
    } catch (error) {
        console.error('Error adding stock:', error);
        alert('Error adding stock');
    }
}

async function stockOut() {
    const productId = document.getElementById('stock-out-product').value;
    const quantity = parseInt(document.getElementById('stock-out-quantity').value);
    const notes = document.getElementById('stock-out-notes').value;

    if (!productId || !quantity || quantity <= 0) {
        alert('Please select a product and enter a valid quantity');
        return;
    }

    try {
        const response = await fetch('/api/stock/out', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ product_id: parseInt(productId), quantity, notes })
        });

        if (response.ok) {
            document.getElementById('stock-out-quantity').value = '';
            document.getElementById('stock-out-notes').value = '';
            loadProductsForStock();
            alert('Stock removed successfully!');
        } else {
            const error = await response.json();
            alert('Error: ' + error.error);
        }
    } catch (error) {
        console.error('Error removing stock:', error);
        alert('Error removing stock');
    }
}

async function loadAlerts() {
    try {
        const response = await fetch('/api/alerts');
        const alerts = await response.json();
        displayAlerts(alerts);
    } catch (error) {
        console.error('Error loading alerts:', error);
    }
}

function displayAlerts(alerts) {
    const container = document.getElementById('alerts-list');
    
    if (alerts.length === 0) {
        container.innerHTML = '<p style="color: #64748b; padding: 20px;">No low stock alerts. All products are well stocked!</p>';
        return;
    }

    container.innerHTML = '';
    alerts.forEach(product => {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert-item';
        alertDiv.innerHTML = `
            <div>
                <strong>${product.name}</strong> - ${product.category}<br>
                <small>Current Stock: ${product.quantity} units (Threshold: ${LOW_STOCK_THRESHOLD})</small>
            </div>
            <div>
                <span style="color: #d97706; font-weight: 600;">$${parseFloat(product.price).toFixed(2)}</span>
            </div>
        `;
        container.appendChild(alertDiv);
    });
}

async function refreshAlerts(event) {
    try {
        // Show loading state only if called from button click
        const refreshBtn = event?.target || document.getElementById('refresh-alerts-btn');
        let originalText = '';
        
        if (refreshBtn && event) {
            originalText = refreshBtn.innerHTML;
            refreshBtn.disabled = true;
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
        }
        
        const response = await fetch('/api/alerts');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const alerts = await response.json();
        displayAlerts(alerts);
        
        // Restore button state
        if (refreshBtn && event) {
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = originalText;
        }
    } catch (error) {
        console.error('Error loading alerts:', error);
        alert('Error loading alerts: ' + error.message);
        
        // Restore button state
        const refreshBtn = document.getElementById('refresh-alerts-btn');
        if (refreshBtn) {
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
        }
    }
}

async function loadReports(event) {
    try {
        // Show loading state only if called from button click
        const refreshBtn = event?.target || document.getElementById('refresh-reports-btn');
        let originalText = '';
        
        if (refreshBtn && event) {
            originalText = refreshBtn.innerHTML;
            refreshBtn.disabled = true;
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
        }
        
        const response = await fetch('/api/reports/summary');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        displayReports(data);
        
        // Restore button state
        if (refreshBtn && event) {
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = originalText;
        }
    } catch (error) {
        console.error('Error loading reports:', error);
        alert('Error loading reports: ' + error.message);
        
        // Restore button state
        const refreshBtn = document.getElementById('refresh-reports-btn');
        if (refreshBtn) {
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
        }
    }
}

function displayReports(data) {
    document.getElementById('total-products').textContent = data.total_products;
    document.getElementById('total-value').textContent = `$${data.total_value.toFixed(2)}`;
    document.getElementById('low-stock-count').textContent = data.low_stock_count;

    const categoryTbody = document.getElementById('category-tbody');
    categoryTbody.innerHTML = '';

    if (data.category_stats.length === 0) {
        categoryTbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;">No category data available</td></tr>';
    } else {
        data.category_stats.forEach(stat => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${stat.category}</td>
                <td>${stat.count}</td>
                <td>${stat.total_qty || 0}</td>
                <td>$${parseFloat(stat.total_value || 0).toFixed(2)}</td>
            `;
            categoryTbody.appendChild(row);
        });
    }

    const transactionsList = document.getElementById('transactions-list');
    transactionsList.innerHTML = '';

    if (data.recent_transactions.length === 0) {
        transactionsList.innerHTML = '<p style="color: #64748b; padding: 20px;">No transactions yet</p>';
    } else {
        data.recent_transactions.forEach(trans => {
            const transDiv = document.createElement('div');
            transDiv.className = `transaction-item transaction-${trans.transaction_type.toLowerCase()}`;
            const typeIcon = trans.transaction_type === 'IN' ? 'fa-arrow-down' : 'fa-arrow-up';
            const typeText = trans.transaction_type === 'IN' ? 'Stock In' : 'Stock Out';
            transDiv.innerHTML = `
                <div>
                    <strong>${trans.product_name}</strong><br>
                    <small>${typeText} - ${trans.quantity} units</small>
                    ${trans.notes ? `<br><small style="color: #64748b;">${trans.notes}</small>` : ''}
                </div>
                <div>
                    <i class="fas ${typeIcon}"></i>
                    <small style="color: #64748b;">${new Date(trans.created_at).toLocaleString()}</small>
                </div>
            `;
            transactionsList.appendChild(transDiv);
        });
    }
}

async function loadCategories() {
    try {
        const response = await fetch('/api/categories');
        const categories = await response.json();
        const filter = document.getElementById('category-filter');
        if (!filter) return;
        
        const currentValue = filter.value;
        filter.innerHTML = '<option value="">All Categories</option>';
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            filter.appendChild(option);
        });
        
        if (currentValue) {
            filter.value = currentValue;
        }
        
        loadSubcategories();
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

async function loadBrands() {
    try {
        const response = await fetch('/api/brands');
        const brands = await response.json();
        const filter = document.getElementById('brand-filter');
        if (!filter) return;
        
        const currentValue = filter.value;
        filter.innerHTML = '<option value="">All Brands</option>';
        
        if (brands && brands.length > 0) {
            brands.forEach(brand => {
                if (brand && brand.trim()) {
                    const option = document.createElement('option');
                    option.value = brand;
                    option.textContent = brand;
                    filter.appendChild(option);
                }
            });
        }
        
        if (currentValue) {
            filter.value = currentValue;
        }
    } catch (error) {
        console.error('Error loading brands:', error);
    }
}

async function loadSubcategories() {
    const categoryFilter = document.getElementById('category-filter');
    if (!categoryFilter) return;
    
    const category = categoryFilter.value;
    try {
        let url = '/api/subcategories';
        if (category) {
            url += `?category=${encodeURIComponent(category)}`;
        }
        const response = await fetch(url);
        const subcategories = await response.json();
        const filter = document.getElementById('subcategory-filter');
        if (!filter) return;
        
        const currentValue = filter.value;
        filter.innerHTML = '<option value="">All Subcategories</option>';
        
        if (subcategories && subcategories.length > 0) {
            subcategories.forEach(sub => {
                if (sub && sub.trim()) {
                    const option = document.createElement('option');
                    option.value = sub;
                    option.textContent = sub;
                    filter.appendChild(option);
                }
            });
        }
        
        if (currentValue) {
            filter.value = currentValue;
        }
    } catch (error) {
        console.error('Error loading subcategories:', error);
    }
}

async function seedDatabase() {
    if (!confirm('This will add 20 sample products to the database only if it is empty. Continue?')) {
        return;
    }

    try {
        const response = await fetch('/api/seed', {
            method: 'POST'
        });

        const result = await response.json();
        
        if (result.success) {
            alert(result.message);
            // Reload everything to update filters
            await loadProducts();
            await loadBrands();
            await loadCategories();
            loadSubcategories();
        } else {
            alert('Error: ' + (result.error || 'Failed to seed database'));
        }
    } catch (error) {
        console.error('Error seeding database:', error);
        alert('Error loading sample products');
    }
}

async function cleanupDuplicates() {
    if (!confirm('This will remove duplicate products (keeping the first occurrence of each product name). Continue?')) {
        return;
    }

    try {
        const response = await fetch('/api/cleanup-duplicates', {
            method: 'POST'
        });

        const result = await response.json();
        
        if (result.success) {
            alert(result.message);
            loadProducts();
        } else {
            alert('Error: ' + (result.error || 'Failed to cleanup duplicates'));
        }
    } catch (error) {
        console.error('Error cleaning up duplicates:', error);
        alert('Error removing duplicates');
    }
}

async function clearAllProducts() {
    if (!confirm('WARNING: This will delete ALL products and transactions from the database. This action cannot be undone. Are you sure you want to continue?')) {
        return;
    }

    try {
        const response = await fetch('/api/clear-all-products', {
            method: 'POST'
        });

        const result = await response.json();
        
        if (result.success) {
            alert(result.message);
            // Reload everything to clear filters and product list
            await loadProducts();
            await loadBrands();
            await loadCategories();
            loadSubcategories();
        } else {
            alert('Error: ' + (result.error || 'Failed to clear products'));
        }
    } catch (error) {
        console.error('Error clearing products:', error);
        alert('Error clearing products');
    }
}

function exportCSV() {
    // Create a link element and trigger download
    const link = document.createElement('a');
    link.href = '/api/reports/export-csv';
    link.download = 'inventory_report.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

