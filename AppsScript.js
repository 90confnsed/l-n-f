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
    if (values[i][1] === data.email || values[i][7] === data.studentId) {
      return "DUPLICATE";
    }
  }

  // Also check in the main Users sheet if it exists
  const mainSheet = ss.getSheetByName("Users");
  if (mainSheet) {
    const mainValues = mainSheet.getDataRange().getValues();
    for (let i = 1; i < mainValues.length; i++) {
      if (mainValues[i][1] === data.email || mainValues[i][7] === data.studentId) {
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
  
  if (!mainSheet) return { success: false, message: "ไม่พบข้อมูลผู้ใช้ (หรือยังไม่ได้รับการยืนยัน)" };
  
  const values = mainSheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    // Indices: 1: Email, 7: Student ID, 8: Password
    if ((values[i][1] === input || values[i][7] === input) && values[i][8] === password) {
      return {
        success: true,
        user: {
          userId: values[i][0], // User_id
          email: values[i][1],
          name: values[i][2],
          surname: values[i][3],
          studentId: values[i][7],
          returnId: values[i][9] // return_id
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
    sheet.appendRow(["lost_id", "timestamp", "owner_name", "info", "place", "pic", "User_id", "Last_time_found", "found_status"]);
  }
  
  let imageUrl = "";
  if (obj.base64) {
    const folder = getFolder("LostAndFoundImages");
    const blob = Utilities.newBlob(Utilities.base64Decode(obj.base64), obj.mimeType, obj.fileName);
    const file = folder.createFile(blob);
    file.setSharing(SpreadsheetApp.Access.ANYONE_WITH_LINK, SpreadsheetApp.Permission.VIEW);
    imageUrl = "https://drive.google.com/uc?export=view&id=" + file.getId();
  }
  
  const lostId = Utilities.getUuid();
  // Columns: lost_id, timestamp, owner_name, info, place, pic, User_id, Last_time_found, found_status
  sheet.appendRow([
    lostId,
    new Date(),
    obj.owner_name,
    obj.info,
    obj.place,
    imageUrl,
    obj.userId,
    obj.foundTime || "", // Last_time_found
    "รอการคืน" // found_status (default)
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
    if (values[i][0] === data.lostId) {
      // Update: Column 7 = Last_time_found, Column 4 = place, Column 8 = found_status
      sheet.getRange(i + 1, 8).setValue(data.foundTime || ""); // Last_time_found
      sheet.getRange(i + 1, 5).setValue(data.foundPlace || values[i][4]); // place (if provided, otherwise keep original)
      sheet.getRange(i + 1, 9).setValue(data.foundStatus); // found_status
      
      return { success: true };
    }
  }
  
  return { success: false, message: "ไม่พบรายการที่ต้องการอัปเดต" };
}
