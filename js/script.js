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
window.onload = function () {
    const savedUser = localStorage.getItem("currentUser");
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        document.getElementById('authContainer').classList.add('hidden');
        document.getElementById('mainPage').classList.remove('hidden');

        // Display user name with admin badge if applicable
        const userDisplayText = "สวัสดี, " + currentUser.name;
        const adminBadge = currentUser.isAdmin ? ' <span class="admin-badge">ADMIN</span>' : '';
        document.getElementById('userDisplay').innerHTML = userDisplayText + adminBadge;

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
        Swal.fire({
            icon: 'warning',
            title: 'กรุณากรอกข้อมูลให้ครบถ้วน',
            confirmButtonText: 'ตกลง'
        });
        return;
    }

    if (password !== confirmPassword) {
        Swal.fire({
            icon: 'error',
            title: 'รหัสผ่านไม่ตรงกัน',
            text: 'กรุณาตรวจสอบอีกครั้ง',
            confirmButtonText: 'ตกลง'
        });
        return;
    }

    // Password validation: at least 5 English characters and 1 number
    const engCharCount = (password.match(/[a-zA-Z]/g) || []).length;
    const hasNumber = /[0-9]/.test(password);

    if (engCharCount < 5 || !hasNumber) {
        Swal.fire({
            icon: 'warning',
            title: 'รหัสผ่านไม่ถูกต้อง',
            text: 'รหัสผ่านต้องมีตัวอักษรภาษาอังกฤษอย่างน้อย 5 ตัว และตัวเลขอย่างน้อย 1 ตัว',
            confirmButtonText: 'ตกลง'
        });
        return;
    }

    if (!email.endsWith("@gmail.com")) {
        Swal.fire({
            icon: 'warning',
            title: 'อีเมลไม่ถูกต้อง',
            text: 'กรุณาใช้อีเมล @gmail.com เท่านั้น',
            confirmButtonText: 'ตกลง'
        });
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
            Swal.fire({
                icon: 'error',
                title: 'ไม่สามารถลงทะเบียนได้',
                text: 'อีเมล หรือ รหัสนักเรียนนี้ ลงทะเบียนไปแล้ว',
                confirmButtonText: 'ตกลง'
            });
        } else {
            // Updated to show Success Card instead of Alert
            document.getElementById('registerCard').classList.add('hidden');
            document.getElementById('successCard').classList.remove('hidden');
            document.getElementById('displayReturnId').innerText = returnId;
        }
    }).catch(error => {
        toggleLoading(false);
        Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: error.toString(),
            confirmButtonText: 'ตกลง'
        });
    });
}

// Login Logic
function handleLogin() {
    const loginInput = document.getElementById('loginInput').value.trim();
    const password = document.getElementById('loginPassword').value.trim();

    if (!loginInput || !password) {
        Swal.fire({
            icon: 'warning',
            title: 'กรุณากรอกข้อมูลให้ครบ',
            confirmButtonText: 'ตกลง'
        });
        return;
    }

    toggleLoading(true);
    callApi("loginUser", { input: loginInput, password: password }).then(response => {
        toggleLoading(false);
        if (response.success) {
            currentUser = response.user;
            document.getElementById('authContainer').classList.add('hidden');
            document.getElementById('mainPage').classList.remove('hidden');

            // Display user name with admin badge if applicable
            const userDisplayText = "สวัสดี, " + currentUser.name;
            const adminBadge = currentUser.isAdmin ? ' <span class="admin-badge">ADMIN</span>' : '';
            document.getElementById('userDisplay').innerHTML = userDisplayText + adminBadge;

            // Check Remember Me
            const rememberMe = document.getElementById('rememberMe').checked;
            if (rememberMe) {
                localStorage.setItem("currentUser", JSON.stringify(currentUser));
            }

            loadItems(); // Load lost items
        } else {
            Swal.fire({
                icon: 'error',
                title: 'เข้าสู่ระบบไม่สำเร็จ',
                text: response.message,
                confirmButtonText: 'ตกลง'
            });
        }
    }).catch(error => {
        toggleLoading(false);
        Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: error.toString(),
            confirmButtonText: 'ตกลง'
        });
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
    if (!currentUser) {
        Swal.fire({
            icon: 'warning',
            title: 'กรุณาเข้าสู่ระบบก่อน',
            confirmButtonText: 'ตกลง'
        });
        return;
    }

    const info = document.getElementById('itemName').value;
    const place = document.getElementById('itemLocation').value;
    const foundTime = document.getElementById('itemFoundTime').value;
    const fileInput = document.getElementById('itemImage');
    const file = fileInput.files[0];

    // Construct owner name
    const ownerName = currentUser.name + " " + currentUser.surname;

    if (!info || !place) {
        Swal.fire({
            icon: 'warning',
            title: 'กรุณากรอกข้อมูลให้ครบถ้วน',
            text: 'กรุณากรอกรายละเอียดและสถานที่',
            confirmButtonText: 'ตกลง'
        });
        return;
    }

    // Show confirmation dialog to ask what type of report
    Swal.fire({
        title: 'เลือกประเภทการแจ้ง',
        text: 'คุณต้องการแจ้งอะไร?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: '🔍 แจ้งของหาย',
        cancelButtonText: '✋ แจ้งตามหาเจ้าของ',
        confirmButtonColor: '#e74c3c',
        cancelButtonColor: '#3085d6',
        reverseButtons: true
    }).then((result) => {
        let reportType = '';
        if (result.isConfirmed) {
            reportType = 'ยังไม่พบ'; // Lost item
        } else if (result.dismiss === Swal.DismissReason.cancel) {
            reportType = 'รอยืนยันเจ้าของ'; // Found item, waiting to confirm owner
        } else {
            return; // User closed the dialog
        }

        toggleLoading(true);

        // Check if image is selected
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                const base64 = e.target.result.split(',')[1];
                const obj = {
                    info: info,
                    place: place,
                    foundTime: foundTime ? new Date(foundTime).toLocaleString('th-TH') : '',
                    fileName: file.name,
                    mimeType: file.type,
                    base64: base64,
                    owner_name: ownerName,
                    userId: currentUser.userId,
                    reportType: reportType
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
                userId: currentUser.userId,
                reportType: reportType
            };
            sendDataToBackend(obj);
        }
    });
}

function sendDataToBackend(obj) {
    callApi("saveData", obj).then(() => {
        toggleLoading(false);
        Swal.fire({
            icon: 'success',
            title: 'สำเร็จ!',
            text: 'บันทึกข้อมูลเรียบร้อย',
            confirmButtonText: 'ตกลง',
            timer: 2000
        });
        document.getElementById('itemName').value = "";
        document.getElementById('itemLocation').value = "";
        document.getElementById('itemFoundTime').value = "";
        document.getElementById('fileName').innerText = "เลือกรูป";
        loadItems();
    }).catch(e => {
        toggleLoading(false);
        Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: 'Error: ' + e,
            confirmButtonText: 'ตกลง'
        });
    });
}

function loadItems() {
    toggleLoading(true);
    callApi("getAllData", {}).then(data => {
        toggleLoading(false);
        const itemGrid = document.getElementById('itemGrid');
        itemGrid.innerHTML = "";

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
                const date = new Date(row[1]).toLocaleDateString('th-TH');

                let imgHtml = row[5] ? `<img src="${row[5]}" class="item-image" onclick="openImageModal('${row[5]}')" style="cursor: pointer;">` : `<div class="no-image">ไม่มีรูปภาพ</div>`;

                // Only show update button if user is admin
                const updateButton = currentUser && currentUser.isAdmin ? `
                    <button onclick="openUpdateModal('${row[0]}', '${row[7] || ''}', '${row[4]}', '${row[8]}')" 
                            class="btn-update">
                        อัปเดต
                    </button>
                ` : '';

                card.innerHTML = `
                    ${imgHtml}
                    <div class="item-details">
                        <h3>${row[3]}</h3>
                        <p><strong>ผู้รายงาน:</strong> ${row[2]}</p>
                        <p><strong>สถานที่:</strong> ${row[4]}</p>
                        <p><strong>วันที่รายงาน:</strong> ${date}</p>
                        <p><strong>เห็นล่าสุด:</strong> ${row[7] || '-'}</p>
                        <p><strong>สถานะ:</strong> <span class="status-badge status-${row[8].replace(/\s+/g, '-')}">${row[8]}</span></p>
                        ${updateButton}
                    </div>
                `;
                itemGrid.appendChild(card);
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
        Swal.fire({
            icon: 'warning',
            title: 'กรุณาเลือกสถานะการคืน',
            confirmButtonText: 'ตกลง'
        });
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
            Swal.fire({
                icon: 'success',
                title: 'สำเร็จ!',
                text: 'อัปเดตข้อมูลสำเร็จ',
                confirmButtonText: 'ตกลง',
                timer: 2000
            });
            closeUpdateModal();
            loadItems(); // Refresh table
        } else {
            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด',
                text: response.message || 'ไม่สามารถอัปเดตได้',
                confirmButtonText: 'ตกลง'
            });
        }
    }).catch(error => {
        toggleLoading(false);
        Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: error.toString(),
            confirmButtonText: 'ตกลง'
        });
    });
}

// Image Modal Functions
function openImageModal(imageUrl) {
    const modal = document.getElementById('imageModal');
    const fullImage = document.getElementById('fullImage');
    modal.classList.remove('hidden');
    fullImage.src = imageUrl;
}

function closeImageModal() {
    const modal = document.getElementById('imageModal');
    modal.classList.add('hidden');
}

