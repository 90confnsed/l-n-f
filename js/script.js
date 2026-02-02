// Global variables to store user session
let currentUser = null;

// UI Toggles
function showRegister() {
    document.getElementById('loginCard').classList.add('hidden');
    document.getElementById('registerCard').classList.remove('hidden');
}

function showLogin() {
    document.getElementById('registerCard').classList.add('hidden');
    document.getElementById('loginCard').classList.remove('hidden');
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
    google.script.run.withSuccessHandler(function(returnId) {
        toggleLoading(false);
        if (returnId === "DUPLICATE") {
            alert("อีเมล หรือ รหัสนักเรียนนี้ ลงทะเบียนไปแล้ว");
        } else {
            alert("ลงทะเบียนสำเร็จ! \nรหัสรับของคืนของคุณคือ: " + returnId + "\nจำรหัสนี้ไว้เพื่อรับของคืน");
            showLogin();
        }
    }).withFailureHandler(function(error) {
        toggleLoading(false);
        alert("เกิดข้อผิดพลาด: " + error);
    }).registerUser(data);
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
    google.script.run.withSuccessHandler(function(response) {
        toggleLoading(false);
        if (response.success) {
            currentUser = response.user;
            document.getElementById('authContainer').classList.add('hidden');
            document.getElementById('mainPage').classList.remove('hidden');
            document.getElementById('userDisplay').innerText = "สวัสดี, " + currentUser.name;
            loadItems(); // Load lost items
        } else {
            alert("เข้าสู่ระบบไม่สำเร็จ: " + response.message);
        }
    }).withFailureHandler(function(error) {
        toggleLoading(false);
        alert("เกิดข้อผิดพลาด: " + error);
    }).loginUser(loginInput, password);
}

function handleLogout() {
    currentUser = null;
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
    const fileInput = document.getElementById('itemImage');
    const file = fileInput.files[0];

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
                fileName: file.name,
                mimeType: file.type,
                base64: base64,
                reporter: currentUser.name // Save who reported
            };
            sendDataToBackend(obj);
        };
        reader.readAsDataURL(file);
    } else {
        const obj = {
            info: info,
            place: place,
            reporter: currentUser.name
        };
        sendDataToBackend(obj);
    }
}

function sendDataToBackend(obj) {
    google.script.run.withSuccessHandler(function() {
        toggleLoading(false);
        alert("บันทึกข้อมูลเรียบร้อย");
        document.getElementById('itemName').value = "";
        document.getElementById('itemLocation').value = "";
        document.getElementById('fileName').innerText = "เลือกรูป";
        loadItems();
    }).withFailureHandler(function(e) {
        toggleLoading(false);
        alert("Error: " + e);
    }).saveData(obj);
}

function loadItems() {
    toggleLoading(true);
    google.script.run.withSuccessHandler(function(dataString) {
        toggleLoading(false);
        const tbody = document.getElementById('displayArea');
        tbody.innerHTML = "";
        
        // dataString should be JSON string
        const data = JSON.parse(dataString); 
        
        // Reverse to show newest first
        data.reverse().forEach(row => {
            // [Timestamp, Reporter, Info, Place, ImageURL, FoundStatus, ID]
            // Assuming row structure matches backend
            const tr = document.createElement('tr');
            
            // Format Date
            const date = new Date(row[0]).toLocaleDateString('th-TH');
            
            let imgHtml = row[4] ? `<img src="${row[4]}" class="thumb-img">` : "-";
            
            tr.innerHTML = `
                <td>${date}</td>
                <td>${row[1]}</td> <!-- User who found/reported -->
                <td>${row[2]}</td>
                <td>${row[3]}</td>
                <td>${imgHtml}</td>
                <td>
                    <button onclick="markFound('${row[6]}')">รับคืนแล้ว</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }).getAllData();
}
