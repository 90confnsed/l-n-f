// Google Apps Script Backend

function doGet() {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('Lost & Found')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// Function to include external files (CSS/JS) into index.html for Apps Script
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Handle User Registration
 */
function registerUser(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Users");
  
  if (!sheet) {
    sheet = ss.insertSheet("Users");
    sheet.appendRow(["Email", "Name", "Surname", "Level", "Room", "No", "Student ID", "Password", "Return ID"]);
  }

  const values = sheet.getDataRange().getValues();
  // Check duplicates (Email or Student ID)
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === data.email || values[i][6] === data.studentId) {
      return "DUPLICATE";
    }
  }

  // Generate a simple Return ID
  const returnId = "RF-" + Math.floor(1000 + Math.random() * 9000);
  
  sheet.appendRow([
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

/**
 * Handle Login
 */
function loginUser(loginInput, password) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Users");
  if (!sheet) return { success: false, message: "No users found" };

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    // Check Email or Student ID
    if ((data[i][0] === loginInput || data[i][6] === loginInput) && data[i][7] === password) {
      return {
        success: true,
        user: {
          name: data[i][1],
          email: data[i][0]
        }
      };
    }
  }
  return { success: false, message: "Invalid credentials" };
}

/**
 * Save Lost Item Data
 */
function saveData(obj) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("lost_item");
  
  if (!sheet) {
    sheet = ss.insertSheet("lost_item");
    sheet.appendRow(["Timestamp", "Reporter", "Info", "Place", "Image URL", "Found Status", "ID"]);
  }

  const timestamp = new Date();
  const id = "ITEM-" + Date.now();
  let imageUrl = "";

  // If there's an image, you would normally save it to Google Drive here
  // For now, if provided as base64, we'll just note it (requires more complex Drive API logic to actually save/get link)
  if (obj.base64) {
    // Placeholder for actual image saving logic to Drive
    imageUrl = "data:" + obj.mimeType + ";base64," + obj.base64;
  }

  sheet.appendRow([
    timestamp,
    obj.reporter,
    obj.info,
    obj.place,
    imageUrl,
    "F", // Found Status: F = False/Pending, T = True/Found
    id
  ]);

  return true;
}

/**
 * Get All Lost Items
 */
function getAllData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("lost_item");
  if (!sheet) return JSON.stringify([]);

  const data = sheet.getDataRange().getValues();
  // Remove header and return as JSON string
  data.shift();
  return JSON.stringify(data);
}
