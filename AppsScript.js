const SPREADSHEET_ID = "11AcvK__vnCwJ0vjv0BK552hL8awzRWR4qUO7emyFnaw";
const WAIT_SHEET_NAME = "User(Waitforconfirm)";

function doGet(e) {
  return ContentService.createTextOutput("Lost & Found API is active. Please use the local index.html to interact with this service.")
    .setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action;
    var result;

    if (action === "registerUser") {
      result = registerUser(data.payload);
    } else if (action === "loginUser") {
      result = loginUser(data.payload.input, data.payload.password);
    } else if (action === "saveData") {
      result = saveData(data.payload);
    } else if (action === "getAllData") {
      // getAllData returns a JSON string, we need to parse it to object so we can re-stringify it with standard response
      // OR just return it directly if we handle it carefully.
      // Let's modify getAllData to return object, or parse here.
      // Checking getAllData... it returns JSON.stringify(data).
      var jsonStr = getAllData();
      result = JSON.parse(jsonStr);
    } else if (action === "updateFoundInfo") {
      result = updateFoundInfo(data.payload);
    } else if (action === "requestReturn") {
      result = requestReturn(data.payload);
    } else if (action === "confirmReturn") {
      result = confirmReturn(data.payload);
    } else if (action === "cancelReturn") {
      result = cancelReturn(data.payload);
    } else {
      result = { error: "Invalid action" };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function registerUser(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(WAIT_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(WAIT_SHEET_NAME);
    sheet.appendRow(["User_id", "e-mail", "ชื่อ", "นามสกุล", "ชั้น", "ห้อง", "เลขที่", "student_id", "password", "return_id"]);
  }

  const values = sheet.getDataRange().getValues();

  // Check for duplicate Email or Student ID in the wait list
  // New Indices: 1=Email, 7=Student ID
  for (let i = 1; i < values.length; i++) {
    // Force string comparison for Student ID (index 7) to avoid Number vs String mismatch
    if (String(values[i][1]) === String(data.email) || String(values[i][7]) === String(data.studentId)) {
      return "DUPLICATE";
    }
  }

  // Also check in the main Users sheet if it exists
  const mainSheet = ss.getSheetByName("Users");
  if (mainSheet) {
    const mainValues = mainSheet.getDataRange().getValues();
    for (let i = 1; i < mainValues.length; i++) {
      if (String(mainValues[i][1]) === String(data.email) || String(mainValues[i][7]) === String(data.studentId)) {
        return "DUPLICATE";
      }
    }
  }

  const returnId = generateReturnId();
  const userId = Math.floor(10000000 + Math.random() * 90000000).toString(); // Random 8-digit User ID

  sheet.appendRow([
    userId,
    data.email,
    data.name,
    data.surname,
    data.level,
    data.room,
    data.no,
    data.studentId,
    data.password,
    returnId
  ]);

  return returnId;
}

function generateReturnId() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function loginUser(input, password) {
  // Simple login check across both sheets or just main sheet
  // For now, let's assume login only works for confirmed users in "Users" sheet
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const mainSheet = ss.getSheetByName("Users");

  // Admin credentials
  const ADMIN_STUDENT_ID = "10101010";
  const ADMIN_PASSWORD = "nimda_1111";

  // Check if this is admin login
  if (input === ADMIN_STUDENT_ID && password === ADMIN_PASSWORD) {
    return {
      success: true,
      user: {
        userId: "ADMIN",
        email: "admin@system",
        name: "Admin",
        surname: "System",
        studentId: ADMIN_STUDENT_ID,
        returnId: "000000",
        isAdmin: true
      }
    };
  }

  if (!mainSheet) return { success: false, message: "ไม่พบข้อมูลผู้ใช้ (หรือยังไม่ได้รับการยืนยัน)" };

  const values = mainSheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    // Indices: 1: Email, 7: Student ID, 8: Password
    // Force string comparison for input and stored values
    if ((String(values[i][1]) === String(input) || String(values[i][7]) === String(input)) && String(values[i][8]) === String(password)) {
      return {
        success: true,
        user: {
          userId: values[i][0], // User_id
          email: values[i][1],
          name: values[i][2],
          surname: values[i][3],
          studentId: values[i][7],
          returnId: values[i][9], // return_id
          isAdmin: false
        }
      };
    }
  }

  return { success: false, message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" };
}

function saveData(obj) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName("lost_item");
  if (!sheet) {
    sheet = ss.insertSheet("lost_item");
    sheet.appendRow(["lost_id", "timestamp", "owner_name", "info", "place", "pic", "User_id", "Last_time_found", "found_status", "type"]);
  }

  let imageUrl = "";
  if (obj.base64) {
    const folder = getFolder("LostAndFoundImages");
    const blob = Utilities.newBlob(Utilities.base64Decode(obj.base64), obj.mimeType, obj.fileName);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    imageUrl = "https://drive.google.com/thumbnail?id=" + file.getId() + "&sz=w1000";
  }

  const lostId = Utilities.getUuid();
  // Columns: lost_id, timestamp, owner_name, info, place, pic, User_id, Last_time_found, found_status, type
  sheet.appendRow([
    lostId,
    new Date(),
    obj.owner_name,
    obj.info,
    obj.place,
    imageUrl,
    obj.userId,
    obj.foundTime || "", // Last_time_found
    obj.reportType === 'found' ? 'รอยืนยันเจ้าของ' : 'ยังไม่พบ', // Default status based on type
    obj.type // 'lost' or 'found'
  ]);
  return true;
}

function getAllData() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName("lost_item");
  if (!sheet) return JSON.stringify([]);
  const data = sheet.getDataRange().getValues();
  data.shift(); // Remove header
  return JSON.stringify(data);
}

function getFolder(folderName) {
  const folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  } else {
    return DriveApp.createFolder(folderName);
  }
}

function updateFoundInfo(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName("lost_item");

  if (!sheet) {
    return { success: false, message: "ไม่พบข้อมูล" };
  }

  const values = sheet.getDataRange().getValues();

  // Find row by lost_id (column 0)
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(data.lostId)) {
      // Update: Column 7 = Last_time_found, Column 4 = place, Column 8 = found_status
      sheet.getRange(i + 1, 8).setValue(data.foundTime || ""); // Last_time_found
      sheet.getRange(i + 1, 5).setValue(data.foundPlace || values[i][4]); // place (if provided, otherwise keep original)
      sheet.getRange(i + 1, 9).setValue(data.foundStatus); // found_status

      return { success: true };
    }
  }

  return { success: false, message: "ไม่พบรายการที่ต้องการอัปเดต" };
}

function requestReturn(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName("lost_item");
  
  if (!sheet) {
    return { success: false, message: "ไม่พบข้อมูล" };
  }

  const values = sheet.getDataRange().getValues();
  // data: { lostId, userId }
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(data.lostId)) {
      // Check ownership (Column 6 is User_id)
      if (String(values[i][6]) !== String(data.userId)) {
         return { success: false, message: "ไม่ใช่เจ้าของรายการ" };
      }
      
      // Update status to "กำลังยืนยัน" (Using standard Thai string)
      sheet.getRange(i + 1, 9).setValue("กำลังยืนยัน");
      return { success: true };
    }
  }
  return { success: false, message: "ไม่พบรายการ" };
}

function confirmReturn(data) {
   const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
   const sheet = ss.getSheetByName("lost_item");
   
   if (!sheet) {
     return { success: false, message: "ไม่พบข้อมูล" };
   }

   const values = sheet.getDataRange().getValues();
   for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(data.lostId)) {
      sheet.getRange(i + 1, 9).setValue("คืนแล้ว");
      return { success: true };
    }
   }
   return { success: false, message: "ไม่พบรายการ" };
}

function cancelReturn(data) {
   const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
   const sheet = ss.getSheetByName("lost_item");
   
   if (!sheet) {
     return { success: false, message: "ไม่พบข้อมูล" };
   }

   const values = sheet.getDataRange().getValues();
   for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(data.lostId)) {
      sheet.getRange(i + 1, 9).setValue("รอการคืน");
      return { success: true };
    }
   }
   return { success: false, message: "ไม่พบรายการ" };
}

// Google Form Integration Logic

function syncLinkForms() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const lostItemSheet = ss.getSheetByName("lost_item");
  if (!lostItemSheet) return; // Should exist

  // 1. Process "แจ้งของหาย" (Report Lost) -> Status: "ยังไม่พบ"
  // Columns: Timestamp(0), รายละเอียด(1), สถานที่(2), วันที่(3), เวลา(4), รูป(5), ชื่อ(6)
  processSheet(ss, "แจ้งของหาย", lostItemSheet, "ยังไม่พบ", [0, 6, 1, 2, 5, 3, 4]);

  // 2. Process "แจ้งหาเจ้าofของ" (Report Found) -> Status: "รอการคืน"
  // Note: User prompt said "แจ้งหาเจ้าของ"
  // Columns: Timestamp(0), ชื่อ(1), รายละเอียด(2), สถานที่(3), วันที่(4), เวลา(5), รูป(6)
  processSheet(ss, "แจ้งหาเจ้าของ", lostItemSheet, "รอการคืน", [0, 1, 2, 3, 6, 4, 5]);
}

function processSheet(ss, sourceSheetName, targetSheet, defaultStatus, colMap) {
  const sourceSheet = ss.getSheetByName(sourceSheetName);
  if (!sourceSheet) return;

  const data = sourceSheet.getDataRange().getValues();
  if (data.length < 2) return; // No data

  // Check if "Processed" column exists, if not add it
  // We'll search for "Processed" header.
  let procCol = -1;
  for(let i=0; i<data[0].length; i++) {
      if(String(data[0][i]).toLowerCase() === "processed") {
          procCol = i;
          break;
      }
  }
  
  // If not found, create header
  if (procCol === -1) {
      procCol = data[0].length;
      sourceSheet.getRange(1, procCol + 1).setValue("Processed");
  }

  // Iterate rows (skip header)
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    // Check if processed (Handle various TRUE values)
    if (row[procCol] === true || String(row[procCol]).toUpperCase() === "TRUE") continue;

    // Map data
    // colMap: [Timestamp, OwnerName, Info, Place, Pic, Date, Time]
    const timestamp = row[colMap[0]];
    const ownerName = row[colMap[1]];
    const info = row[colMap[2]];
    const place = row[colMap[3]];
    const picUrlRaw = row[colMap[4]];
    const dateFound = row[colMap[5]];
    const timeFound = row[colMap[6]];

    // Format Date/Time for Last_time_found
    let lastTimeFound = "";
    try {
        if (dateFound) {
             const d = new Date(dateFound);
             // Verify date is valid
             if (!isNaN( d.getTime() )) {
                 const dateStr = d.toLocaleDateString("th-TH");
                 let timeStr = "";
                 if (timeFound) {
                    // timeFound might be a Date object (if collected via Time question) or string
                    if (timeFound instanceof Date) {
                        timeStr = timeFound.toLocaleTimeString("th-TH", {hour: '2-digit', minute:'2-digit'});
                    } else {
                        // Sometimes Time comes as "14:30" string
                        timeStr = String(timeFound);
                        // If it's a date string, extract time? Let's keep simple.
                    }
                 }
                 lastTimeFound = dateStr + " " + timeStr;
             } else {
                 lastTimeFound = String(dateFound); // Fallback
             }
        }
    } catch(e) {
        lastTimeFound = String(dateFound) + " " + String(timeFound);
    }

    // Process Image URL
    let picUrl = "";
    if (picUrlRaw) {
        const urlStr = String(picUrlRaw);
        const idMatch = urlStr.match(/id=([a-zA-Z0-9_-]+)/);
        if (idMatch && idMatch[1]) {
            picUrl = "https://drive.google.com/thumbnail?id=" + idMatch[1] + "&sz=w1000";
        } else if (urlStr.includes("drive.google.com")) {
             // Fallback for other drive links
             picUrl = urlStr;
        }
    }

    // Generate UUID
    const lostId = Utilities.getUuid();
    
    // Append to lost_item
    // Order: lost_id, timestamp, owner_name, info, place, pic, User_id, Last_time_found, found_status
    targetSheet.appendRow([
        lostId,
        timestamp || new Date(),
        ownerName,
        info,
        place,
        picUrl,
        "", // User_id (Empty for external form)
        lastTimeFound,
        defaultStatus
    ]);

    // Mark processed
    sourceSheet.getRange(i + 1, procCol + 1).setValue("TRUE");
  }
}
