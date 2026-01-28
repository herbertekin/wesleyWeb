let allProducts = [];
let categoryFilter = 'all';

async function fetchProducts() {
    try {
        const res = await fetch('/api/products');
        allProducts = await res.json();
        render();
    } catch (err) { console.error("Could not load products"); }
}

function render() {
    const grid = document.getElementById('product-grid');
    const adminGrid = document.getElementById('admin-list');
    const searchTerm = document.getElementById('search-input')?.value.toLowerCase() || "";

    grid.innerHTML = ''; adminGrid.innerHTML = '';

    const filtered = allProducts.filter(p => {
        const matchCat = categoryFilter === 'all' || p.category === categoryFilter;
        const matchSearch = p.name.toLowerCase().includes(searchTerm);
        return matchCat && matchSearch;
    });

    filtered.forEach(p => {
        const msg = encodeURIComponent(`Hi Wesley, I'm interested in ${p.name}`);
        const price = Number(p.price).toLocaleString();

        grid.innerHTML += `
            <div class="card">
                <img src="${p.image_url}" loading="lazy" onerror="this.src='https://via.placeholder.com/300?text=No+Image'">
                <div class="card-body">
                    <small style="color:var(--accent); font-weight:800">${p.category}</small>
                    <h3>${p.name}</h3>
                    <p><strong>Ksh ${price}</strong></p>
                    <a href="https://wa.me/254740475314?text=${msg}" target="_blank" class="wa-link">Buy on WhatsApp</a>
                </div>
            </div>`;

        adminGrid.innerHTML += `
            <div style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #ddd;">
                <span>${p.name}</span>
                <button onclick="deleteItem(${p.id})" style="color:red">Delete</button>
            </div>`;
    });
}

// Logic for Login/Logout/Filters
window.attemptAdminLogin = () => {
    if (prompt("Password:") === "Nm643PpQ") {
        document.getElementById('public-nav').style.display = 'none';
        document.getElementById('admin-nav').style.display = 'flex';
        showSection('admin');
    }
};

window.adminLogout = () => location.reload();
window.showSection = (s) => {
    document.getElementById('shop-section').style.display = s === 'shop' ? 'block' : 'none';
    document.getElementById('admin-section').style.display = s === 'admin' ? 'block' : 'none';
};

document.getElementById('addForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('image', document.getElementById('p-image').files[0]);
    fd.append('name', document.getElementById('p-name').value);
    fd.append('category', document.getElementById('p-category').value);
    fd.append('condition', document.getElementById('p-condition').value);
    fd.append('price', document.getElementById('p-price').value);
    fd.append('desc', document.getElementById('p-desc').value);

    await fetch('/api/products', { method: 'POST', body: fd });
    e.target.reset();
    fetchProducts();
    showSection('shop');
});

window.deleteItem = async (id) => {
    if(confirm("Delete?")) {
        await fetch(`/api/products/${id}`, { method: 'DELETE' });
        fetchProducts();
    }
};

document.getElementById('search-input')?.addEventListener('input', render);
document.querySelectorAll('.tab').forEach(t => {
    t.addEventListener('click', (e) => {
        document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        categoryFilter = e.target.dataset.cat;
        render();
    });
});

fetchProducts();