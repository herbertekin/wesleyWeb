let allProducts = [];
let categoryFilter = 'all';

// --- SMART API CONFIG ---
// This checks if you are on your computer or the live site
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000/api/products'
    : 'https://wesleyweb-production.up.railway.app/api/products';

const IMAGE_ROOT = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000'
    : 'https://wesleyweb-production.up.railway.app';

// --- DATA SYNC ---
async function fetchProducts() {
    try {
        const response = await fetch(API_BASE);
        const data = await response.json();

        if (Array.isArray(data)) {
            allProducts = data;
            render();
        } else {
            console.error("❌ Server sent an error instead of data:", data);
            allProducts = []; 
            render();
        }
    } catch (err) {
        console.error("❌ Network error connecting to API:", err);
        allProducts = []; 
        render();
    }
}

// Initial Load
fetchProducts();

// --- AUTHENTICATION ---
window.attemptAdminLogin = function() {
    const pass = prompt("Wesley Stores Admin Password:");
    if (pass === "Nm643PpQ") {
        document.getElementById('public-nav').style.display = 'none';
        document.getElementById('admin-nav').style.display = 'flex';
        showSection('admin');
    } else if (pass !== null) { 
        alert("Access Denied."); 
    }
};

window.adminLogout = () => location.reload();

window.showSection = (s) => {
    document.getElementById('shop-section').style.display = s === 'shop' ? 'block' : 'none';
    document.getElementById('admin-section').style.display = s === 'admin' ? 'block' : 'none';
};

// --- UPLOAD LOGIC ---
document.getElementById('addForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submit-btn');
    const fileInput = document.getElementById('p-image');
    
    const formData = new FormData();
    formData.append('image', fileInput.files[0]);
    formData.append('name', document.getElementById('p-name').value);
    formData.append('category', document.getElementById('p-category').value);
    formData.append('condition', document.getElementById('p-condition').value);
    formData.append('price', document.getElementById('p-price').value);
    formData.append('desc', document.getElementById('p-desc').value);

    btn.disabled = true; 
    btn.innerText = "Processing...";

    try {
        const res = await fetch(API_BASE, { method: 'POST', body: formData });
        if (res.ok) {
            alert("Item successfully listed!");
            e.target.reset();
            fetchProducts();
        } else {
            const errorData = await res.json();
            alert("Upload failed: " + (errorData.error || "Unknown error"));
        }
    } catch (err) { 
        alert("Network error during upload."); 
    }
    btn.disabled = false; 
    btn.innerText = "Post to Showroom";
});

window.deleteItem = async (id) => {
    if(confirm("Delete this item?")) {
        try {
            const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
            if (res.ok) fetchProducts();
        } catch (err) {
            alert("Could not delete item.");
        }
    }
};

// --- RENDER ---
function render() {
    const grid = document.getElementById('product-grid');
    const adminGrid = document.getElementById('admin-list');
    const searchInput = document.getElementById('search-input');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : "";
    
    if (!grid || !adminGrid) return; 

    grid.innerHTML = ''; 
    adminGrid.innerHTML = '';

    const filtered = (allProducts || []).filter(p => {
        const matchCat = categoryFilter === 'all' || p.category === categoryFilter;
        const matchSearch = p.name.toLowerCase().includes(searchTerm);
        return matchCat && matchSearch;
    });

    if (filtered.length === 0) {
        grid.innerHTML = '<p style="text-align:center; grid-column: 1/-1;">No products found.</p>';
    }

    filtered.forEach(p => {
        const msg = encodeURIComponent(`Hi Wesley, I'm interested in ${p.name}`);
        // Ensure image URL is absolute
        const fullImageUrl = p.image_url.startsWith('http') ? p.image_url : `${IMAGE_ROOT}${p.image_url}`;
        
        grid.innerHTML += `
            <div class="card">
                <div class="badge">${p.p_condition}</div>
                <img src="${fullImageUrl}" loading="lazy" onerror="this.src='https://via.placeholder.com/150'">
                <div class="card-body">
                    <small style="color:#eab308; font-weight:bold">${p.category}</small>
                    <h3>${p.name}</h3>
                    <div class="card-price">Ksh ${Number(p.price).toLocaleString()}</div>
                    <a href="https://wa.me/254740475314?text=${msg}" target="_blank" class="wa-link">Buy on WhatsApp</a>
                </div>
            </div>`;

        adminGrid.innerHTML += `
            <div class="admin-item" style="display:flex; align-items:center; border-bottom:1px solid #ddd; padding:10px;">
                <img src="${fullImageUrl}" width="50" height="50" style="object-fit:cover;">
                <div style="flex:1; margin-left:10px;"><b>${p.name}</b></div>
                <button onclick="deleteItem(${p.id})" style="background:#ef4444; color:white; border:none; padding:5px 10px; cursor:pointer;">Delete</button>
            </div>`;
    });
}

// Filters
const searchBar = document.getElementById('search-input');
if (searchBar) searchBar.addEventListener('input', render);

document.querySelectorAll('.tab').forEach(t => {
    t.addEventListener('click', (e) => {
        document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        categoryFilter = e.target.dataset.cat;
        render();
    });
});