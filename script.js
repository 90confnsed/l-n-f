const DB_NAME = 'SSSC_LOST_DATA_FINAL';

window.onload = () => {
    const user = localStorage.getItem('USER_EMAIL');
    const loginPage = document.getElementById('loginPage');
    const mainPage = document.getElementById('mainPage');

    if (user) {
        loginPage.style.display = 'none';
        mainPage.style.display = 'block';
        displayData();
    } else {
        loginPage.style.display = 'flex';
        mainPage.style.display = 'none';
    }
};

function handleLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    if (email.includes('@')) {
        localStorage.setItem('USER_EMAIL', email.toLowerCase());
        location.reload(); // รีโหลดเพื่อสลับหน้าแบบคลีนๆ
    } else {
        alert("ใส่อีเมลให้ถูกต้องนะ");
    }
}

function handleLogout() {
    localStorage.removeItem('USER_EMAIL');
    location.reload();
}

function updateFileName() {
    const f = document.getElementById('itemImage').files[0];
    document.getElementById('fileName').innerText = f ? f.name : "เลือกรูปภาพ";
}

function showConfirmModal() {
    const n = document.getElementById('itemName').value;
    const l = document.getElementById('itemLocation').value;
    const f = document.getElementById('itemImage').files[0];
    if(!n || !l || !f) return alert("กรอกข้อมูลและเลือกรูปด้วยครับ");
    
    document.getElementById('confirmDetails').innerText = `บันทึก: ${n} ที่ ${l}`;
    document.getElementById('confirmModal').style.display = 'block';
}

function closeModal() { document.getElementById('confirmModal').style.display = 'none'; }

function saveData() {
    const reader = new FileReader();
    reader.onload = (e) => {
        const list = JSON.parse(localStorage.getItem(DB_NAME) || '[]');
        list.push({
            id: Date.now(),
            owner: localStorage.getItem('USER_EMAIL'),
            name: document.getElementById('itemName').value,
            loc: document.getElementById('itemLocation').value,
            time: new Date().toLocaleString('th-TH'),
            img: e.target.result
        });
        localStorage.setItem(DB_NAME, JSON.stringify(list));
        location.reload(); // บันทึกเสร็จรีโหลดเพื่ออัปเดตตารางและล้างฟอร์ม
    };
    reader.readAsDataURL(document.getElementById('itemImage').files[0]);
}

function displayData() {
    const list = JSON.parse(localStorage.getItem(DB_NAME) || '[]');
    const area = document.getElementById('displayArea');
    area.innerHTML = list.reverse().map(i => `
        <tr>
            <td>${i.time}</td>
            <td>${i.owner}</td>
            <td><b>${i.name}</b><br>📍 ${i.loc}</td>
            <td><img src="${i.img}" class="thumb-img"></td>
            <td><button onclick="deleteItem(${i.id})" style="background:red; color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer;">ลบ</button></td>
        </tr>
    `).join('');
}

function deleteItem(id) {
    if(confirm("ลบรายการนี้ใช่ไหม? (ทุกคนลบได้)")) {
        let list = JSON.parse(localStorage.getItem(DB_NAME) || '[]');
        list = list.filter(item => item.id !== id);
        localStorage.setItem(DB_NAME, JSON.stringify(list));
        displayData();
    }
}