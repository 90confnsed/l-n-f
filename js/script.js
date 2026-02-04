// Global variables to store user session
let currentUser = null;
const API_URL = "https://script.google.com/macros/s/AKfycbzBolUcFz1APeymizFfYTprGGzzNPQMtxt8psc48m_u3E8n1llswMXdb_NEbluBct0T/exec";

async function callApi(action, payload) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: action, payload: payload })
        });
        const data = await response.json();
        return data; 
    } catch (error) {
        console.error("API Error:", error);
        throw error;
    }
}

// Auto Login on Load
window.onload = function() {
    const savedUser = localStorage.getItem("currentUser");
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        document.getElementById('authContainer').classList.add('hidden');
        document.getElementById('mainPage').classList.remove('hidden');
        document.getElementById('userDisplay').innerText = "สวัสดี, " + currentUser.name;
        loadItems();
    }
    
    // Initialize cursor effects
    initCursorEffects();
};

// Cursor Interaction Effects
function initCursorEffects() {
    const spotlight = document.getElementById('cursor-spotlight');
    const particles = document.querySelectorAll('.particle');
    let mouseX = 0;
    let mouseY = 0;
    
    // Track mouse movement
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        
        // Update spotlight position
        spotlight.style.left = mouseX + 'px';
        spotlight.style.top = mouseY + 'px';
        spotlight.style.opacity = '1';
        
        // Make particles react to cursor
        particles.forEach(particle => {
            const rect = particle.getBoundingClientRect();
            const particleX = rect.left + rect.width / 2;
            const particleY = rect.top + rect.height / 2;
            
            const distance = Math.sqrt(
                Math.pow(mouseX - particleX, 2) + 
                Math.pow(mouseY - particleY, 2)
            );
            
            // Push particles away from cursor
            if (distance < 150) {
                const angle = Math.atan2(particleY - mouseY, particleX - mouseX);
                const force = (150 - distance) / 5;
                const offsetX = Math.cos(angle) * force;
                const offsetY = Math.sin(angle) * force;
                
                particle.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${1 + force / 50})`;
            } else {
                particle.style.transform = '';
            }
        });
    });
    
    // Hide spotlight when mouse leaves window
    document.addEventListener('mouseleave', () => {
        spotlight.style.opacity = '0';
    });
}

// UI Toggles
function showRegister() {
    document.getElementById('loginCard').classList.add('hidden');
    document.getElementById('registerCard').classList.remove('hidden');
}

function showLogin() {
    document.getElementById('registerCard').classList.add('hidden');
    document.getElementById('successCard').classList.add('hidden'); // Ensure success card is hidden
    document.getElementById('loginCard').classList.remove('hidden');
}

function closeSuccessCard() {
    document.getElementById('successCard').classList.add('hidden');
    showLogin();
}

function toggleLoading(show) {
    const loader = document.getElementById('loading');
    if (show) loader.classList.remove('hidden');
    else loader.classList.add('hidden');
}

// Registration Logic
function handleRegister() {
    const email = document.getElementById('regEmail').value.trim();
    const name = document.getElementById('regName').value.trim();
    const surname = document.getElementById('regSurname').value.trim();
    const level = document.getElementById('regLevel').value.trim();
    const room = document.getElementById('regRoom').value.trim();
    const no = document.getElementById('regNo').value.trim();
    const studentId = document.getElementById('regStudentId').value.trim();
    const password = document.getElementById('regPassword').value.trim();
    const confirmPassword = document.getElementById('regConfirmPassword').value.trim();

    if (!email || !name || !surname || !studentId || !password || !confirmPassword) {
        alert("กรุณากรอกข้อมูลให้ครบถ้วน");
        return;
    }

    if (password !== confirmPassword) {
        alert("รหัสผ่านไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง");
        return;
    }

    // Password validation: at least 5 English characters and 1 number
    const engCharCount = (password.match(/[a-zA-Z]/g) || []).length;
    const hasNumber = /[0-9]/.test(password);

    if (engCharCount < 5 || !hasNumber) {
        alert("รหัสผ่านต้องมีตัวอักษรภาษาอังกฤษอย่างน้อย 5 ตัว และตัวเลขอย่างน้อย 1 ตัว");
        return;
    }

    if (!email.endsWith("@gmail.com")) {
        alert("กรุณาใช้อีเมล @gmail.com เท่านั้น");
        return;
    }

    const data = {
        email: email,
        name: name,
        surname: surname,
        level: level,
        room: room,
        no: no,
        studentId: studentId,
        password: password
    };

    toggleLoading(true);
    callApi("registerUser", data).then(returnId => {
        toggleLoading(false);
        if (returnId === "DUPLICATE") {
            alert("อีเมล หรือ รหัสนักเรียนนี้ ลงทะเบียนไปแล้ว");
        } else {
            // Updated to show Success Card instead of Alert
            document.getElementById('registerCard').classList.add('hidden');
            document.getElementById('successCard').classList.remove('hidden');
            document.getElementById('displayReturnId').innerText = returnId;
        }
    }).catch(error => {
        toggleLoading(false);
        alert("เกิดข้อผิดพลาด: " + error);
    });
}

// Login Logic
function handleLogin() {
    const loginInput = document.getElementById('loginInput').value.trim();
    const password = document.getElementById('loginPassword').value.trim();

    if (!loginInput || !password) {
        alert("กรุณากรอกข้อมูลให้ครบ");
        return;
    }

    toggleLoading(true);
    callApi("loginUser", { input: loginInput, password: password }).then(response => {
        toggleLoading(false);
        if (response.success) {
            currentUser = response.user;
            document.getElementById('authContainer').classList.add('hidden');
            document.getElementById('mainPage').classList.remove('hidden');
            document.getElementById('userDisplay').innerText = "สวัสดี, " + currentUser.name;
            
            // Check Remember Me
            const rememberMe = document.getElementById('rememberMe').checked;
            if (rememberMe) {
                localStorage.setItem("currentUser", JSON.stringify(currentUser));
            }
            
            loadItems(); // Load lost items
        } else {
            alert("เข้าสู่ระบบไม่สำเร็จ: " + response.message);
        }
    }).catch(error => {
        toggleLoading(false);
        alert("เกิดข้อผิดพลาด: " + error);
    });
}

function handleLogout() {
    currentUser = null;
    localStorage.removeItem("currentUser");
    document.getElementById('mainPage').classList.add('hidden');
    document.getElementById('authContainer').classList.remove('hidden');
    // Clear inputs
    document.getElementById('loginInput').value = "";
    document.getElementById('loginPassword').value = "";
}

// Data Handling (Lost Items)
function saveData() {
    if (!currentUser) { alert("กรุณาเข้าสู่ระบบก่อน"); return; }
    
    const info = document.getElementById('itemName').value;
    const place = document.getElementById('itemLocation').value;
    const foundTime = document.getElementById('itemFoundTime').value;
    const fileInput = document.getElementById('itemImage');
    const file = fileInput.files[0];
    
    // Construct owner name
    const ownerName = currentUser.name + " " + currentUser.surname;

    if (!info || !place) {
        alert("กรุณากรอกรายละเอียดและสถานที่");
        return;
    }

    toggleLoading(true);
    
    // Check if image is selected
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const base64 = e.target.result.split(',')[1];
            const obj = {
                info: info,
                place: place,
                foundTime: foundTime ? new Date(foundTime).toLocaleString('th-TH') : '',
                fileName: file.name,
                mimeType: file.type,
                base64: base64,
                owner_name: ownerName,
                userId: currentUser.userId
            };
            sendDataToBackend(obj);
        };
        reader.readAsDataURL(file);
    } else {
        const obj = {
            info: info,
            place: place,
            foundTime: foundTime ? new Date(foundTime).toLocaleString('th-TH') : '',
            owner_name: ownerName,
            userId: currentUser.userId
        };
        sendDataToBackend(obj);
    }
}

function sendDataToBackend(obj) {
    callApi("saveData", obj).then(response => {
        toggleLoading(false);
        if (response && response.error) {
             throw new Error(response.error);
        }
        alert("บันทึกข้อมูลเรียบร้อย");
        document.getElementById('itemName').value = "";
        document.getElementById('itemLocation').value = "";
        document.getElementById('itemFoundTime').value = "";
        document.getElementById('fileName').innerText = "เลือกรูป";
        loadItems();
    }).catch(e => {
        toggleLoading(false);
        alert("Error: " + e);
    });
}

function loadItems() {
    toggleLoading(true);
    callApi("getAllData", {}).then(data => {
        toggleLoading(false);
        const grid = document.getElementById('itemGrid');
        grid.innerHTML = "";
        
        // data is already an object (array) because callApi parses JSON
        
        // Reverse to show newest first
        if (Array.isArray(data)) {
            data.reverse().forEach(row => {
                // Backend Columns: 
                // 0: lost_id, 1: timestamp, 2: owner_name, 3: info, 4: place, 
                // 5: pic, 6: User_id, 7: Last_time_found, 8: found_status
                
                const card = document.createElement('div');
                card.className = 'item-card';
                
                // Format Date
                const date = new Date(row[1]).toLocaleDateString('th-TH', {
                    year: '2-digit', month: 'short', day: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                });
                
                // Image handling
                let imgHtml = row[5] 
                    ? `<img src="${row[5]}" class="card-img" referrerpolicy="no-referrer" loading="lazy" onclick="openImageModal('${row[5]}')">` 
                    : `<div class="card-no-img"><span>No Image</span></div>`;

                // Status Badge Color & Text
                let statusClass = 'status-lost'; // Default Red
                let statusText = row[8] === 'F' ? 'ยังไม่พบ' : row[8];

                if (statusText === 'คืนแล้ว') {
                    statusClass = 'status-returned';
                } else if (statusText === 'รอการคืน') {
                    statusClass = 'status-pending';
                } else if (statusText === 'ยังไม่พบ') {
                    statusClass = 'status-lost';
                }

                card.innerHTML = `
                    <div class="card-header">
                        <span class="card-date">${date}</span>
                        <span class="status-badge ${statusClass}">${statusText}</span>
                    </div>
                    <div class="card-image-container">
                        ${imgHtml}
                    </div>
                    <div class="card-body">
                        <h3 class="card-title">${row[3]}</h3>
                        <div class="card-info">
                            <p><strong>สถานที่ล่าสุด/ทำหาย:</strong> ${row[4]}</p>
                            <p><strong>ผู้แจ้ง:</strong> ${row[2]}</p>
                            <p><strong>เวลาที่เห็นล่าสุด:</strong> ${row[7] || '-'}</p>
                        </div>
                    </div>
                    <div class="card-footer">
                        <button class="btn-card-action" onclick="openUpdateModal('${row[0]}', '${row[7] || ''}', '${row[4]}', '${row[8]}')">
                            อัปเดตสถานะ
                        </button>
                    </div>
                `;
                grid.appendChild(card);
            });
        }
    }).catch(err => {
         toggleLoading(false);
         console.error(err);
    });
}

// Modal Functions for Update Found Info
function openUpdateModal(lostId, foundTime, foundPlace, foundStatus) {
    document.getElementById('updateLostId').value = lostId;
    document.getElementById('updateFoundPlace').value = foundPlace;
    document.getElementById('updateFoundStatus').value = foundStatus;
    
    // Convert foundTime to datetime-local format if it exists
    if (foundTime && foundTime !== '-') {
        const date = new Date(foundTime);
        if (!isNaN(date.getTime())) {
            // Format as YYYY-MM-DDTHH:mm for datetime-local input
            const formattedDate = date.toISOString().slice(0, 16);
            document.getElementById('updateFoundTime').value = formattedDate;
        }
    } else {
        document.getElementById('updateFoundTime').value = '';
    }
    
    document.getElementById('updateModal').classList.remove('hidden');
}

function closeUpdateModal() {
    document.getElementById('updateModal').classList.add('hidden');
    // Clear inputs
    document.getElementById('updateLostId').value = '';
    document.getElementById('updateFoundTime').value = '';
    document.getElementById('updateFoundPlace').value = '';
}

function submitFoundUpdate() {
    const lostId = document.getElementById('updateLostId').value;
    const foundTime = document.getElementById('updateFoundTime').value;
    const foundPlace = document.getElementById('updateFoundPlace').value;
    const foundStatus = document.getElementById('updateFoundStatus').value;
    
    if (!foundStatus) {
        alert('กรุณาเลือกสถานะการคืน');
        return;
    }
    
    toggleLoading(true);
    
    const data = {
        lostId: lostId,
        foundTime: foundTime ? new Date(foundTime).toLocaleString('th-TH') : '',
        foundPlace: foundPlace,
        foundStatus: foundStatus
    };
    
    callApi('updateFoundInfo', data).then(response => {
        toggleLoading(false);
        if (response.success) {
            alert('อัปเดตข้อมูลสำเร็จ');
            closeUpdateModal();
            loadItems(); // Refresh table
        } else {
            alert('เกิดข้อผิดพลาด: ' + (response.message || 'ไม่สามารถอัปเดตได้'));
        }
    }).catch(error => {
        toggleLoading(false);
        alert('เกิดข้อผิดพลาด: ' + error);
    });
}

// Image Modal Functions
function openImageModal(src) {
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('fullImage');
    modal.classList.remove('hidden');
    modalImg.src = src;
}

function closeImageModal() {
    document.getElementById('imageModal').classList.add('hidden');
}
