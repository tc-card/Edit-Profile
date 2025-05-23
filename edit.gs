function doGet(e) {
  try {
    validateRequest(e);
    
    const { action, token, email, data } = e.parameter;
    let response;
    
    switch (action) {
      case 'update_profile':
        response = handleProfileUpdate(token, email, data);
        break;
        
      default:
        throw new Error('Invalid action parameter');
    }
    
    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error(`Error processing ${e.parameter.action}:`, error.message);
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: sanitizeErrorMessage(error.message)
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function handleProfileUpdate(token, email, jsonData) {
  // Verify session first
  const session = verifySession(token);
  if (!session || session.email.toLowerCase() !== email.toLowerCase()) {
    throw new Error('Invalid session');
  }

  // Parse and validate update data
  const updateData = JSON.parse(jsonData);
  validateUpdateData(updateData);

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  
  // Find row (skip header if exists)
  const startRow = data[0][0] === 'Timestamp' ? 1 : 0;
  const rowIndex = data.findIndex((row, index) => 
    index >= startRow && row[COLUMNS.EMAIL]?.toString().toLowerCase() === email.toLowerCase()
  );

  if (rowIndex === -1) throw new Error('Profile not found');
  const row = rowIndex + 1; // Convert to 1-based index

  // Only allow updating specific fields
  const updates = [];
  if (updateData.name !== undefined) {
    updates.push({ col: COLUMNS.NAME, value: updateData.name });
  }
  if (updateData.tagline !== undefined) {
    updates.push({ col: COLUMNS.TAGLINE, value: updateData.tagline });
  }
  if (updateData.phone !== undefined) {
    updates.push({ col: COLUMNS.PHONE, value: updateData.phone });
  }
  if (updateData.address !== undefined) {
    updates.push({ col: COLUMNS.ADDRESS, value: updateData.address });
  }
  if (updateData.profilePic !== undefined) {
    updates.push({ col: COLUMNS.PROFILE_PIC, value: updateData.profilePic });
  }
  if (updateData.socialLinks !== undefined) {
    updates.push({ 
      col: COLUMNS.SOCIAL_LINKS, 
      value: Array.isArray(updateData.socialLinks) 
        ? updateData.socialLinks.join(',\n') 
        : updateData.socialLinks
    });
  }

  // Apply updates
  if (updates.length > 0) {
    updates.forEach(update => {
      sheet.getRange(row, update.col).setValue(update.value);
    });
  }

  return {
    status: 'success',
    profile: getProfileData(email)
  };
}

function validateRequest(e) {
  if (!e.parameter.action) {
    throw new Error('Missing action parameter');
  }
}

function validateUpdateData(updateData) {
  if (!updateData || typeof updateData !== 'object') {
    throw new Error('Invalid update data');
  }
  
  // Prevent updating restricted fields
  if (updateData.email || updateData.link || updateData.status) {
    throw new Error('Cannot update email, link, or status fields');
  }
  
  if (updateData.name !== undefined && (!updateData.name || typeof updateData.name !== 'string')) {
    throw new Error('Invalid name value');
  }
  
  if (updateData.socialLinks !== undefined && !Array.isArray(updateData.socialLinks)) {
    throw new Error('Social links must be an array');
  }
}

function verifySession(token) {
  if (!token) throw new Error('Missing session token');
  
  const cacheKey = `session_${token}`;
  const cached = CacheService.getScriptCache().get(cacheKey);
  if (!cached) throw new Error('Invalid or expired session');
  
  const session = JSON.parse(cached);
  if (Date.now() > session.expiry) {
    throw new Error('Session expired');
  }
  
  return session;
}

function getProfileData(email) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  
  for (const row of data) {
    if (row[COLUMNS.EMAIL]?.toString().toLowerCase() === email.toLowerCase()) {
      return {
        name: row[COLUMNS.NAME] || '',
        email: row[COLUMNS.EMAIL] || '',
        link: row[COLUMNS.LINK] || '',
        tagline: row[COLUMNS.TAGLINE] || '',
        phone: row[COLUMNS.PHONE] || '',
        address: row[COLUMNS.ADDRESS] || '',
        socialLinks: row[COLUMNS.SOCIAL_LINKS] ? 
          row[COLUMNS.SOCIAL_LINKS].toString().split(/[,\n]/).filter(Boolean) : [],
        profilePic: row[COLUMNS.PROFILE_PIC] || '',
        style: row[COLUMNS.STYLE] || 'default',
        status: row[COLUMNS.STATUS] || 'active'
      };
    }
  }
  throw new Error('Profile not found');
}

function sanitizeErrorMessage(message) {
  return message.replace(/[\n\r]/g, ' ').substring(0, 200);
}

// Configuration
const CONFIG = {
  SHEET_NAME: 'Form'
};

// Column indexes (0-based)
const COLUMNS = {
  TIMESTAMP: 0,    // First column - (auto)
  NAME: 1,         // Second column
  EMAIL: 2,        // Third column (immutable)
  LINK: 3,         // Fourth column (immutable)
  TAGLINE: 4,      // Fifth column
  PHONE: 5,        // Sixth column
  ADDRESS: 6,      // Seventh column
  SOCIAL_LINKS: 7, // Eighth column
  PROFILE_PIC: 8,  // Ninth column
  STYLE: 9,        // Tenth column
  FORMEMAIL: 10,   // Column K (readonly)
  ID: 11,          // Column L (readonly)
  STATUS: 12       // Eleventh column (immutable)
};