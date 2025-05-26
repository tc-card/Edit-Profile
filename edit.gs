/**
 * Handles GET requests for profile updates
 * @param {Object} e - Event parameter containing URL parameters
 */
function doGet(e) {
  try {
    // Validate basic request structure
    validateRequest(e);
    
    // Extract and decode parameters
    const { action, token, email, data } = e.parameter;
    let response;
    
    // Parse the data parameter from JSON string to object
    let parsedData = {};
    if (data) {
      try {
        parsedData = JSON.parse(decodeURIComponent(data));
      } catch (parseError) {
        throw new Error('Invalid data format - must be valid URL-encoded JSON');
      }
    }
    
    // Route requests based on action
    switch (action) {
      case 'update_profile':
        response = handleProfileUpdate(token, email, parsedData);
        break;
      default:
        throw new Error('Invalid action parameter');
    }
    
    // Return successful response
    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    // Enhanced error logging
    console.error(`Error in ${e.parameter.action}:`, {
      message: error.message,
      stack: error.stack,
      parameters: e.parameter
    });
    
    // Return error response
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: sanitizeErrorMessage(error.message),
      code: error.code || 'UNKNOWN_ERROR'
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handles profile updates in Google Sheet
 * @param {string} token - Session token
 * @param {string} email - User email
 * @param {Object} updateData - Data to update
 */
function handleProfileUpdate(token, email, updateData) {
  // Verify session first
  const session = verifySession(token);
  if (!session || session.email.toLowerCase() !== email.toLowerCase()) {
    throw new Error('Invalid session');
  }

  // Validate update data structure and content
  validateUpdateData(updateData);

  // Get sheet and data
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Form');
  const data = sheet.getDataRange().getValues();
  
  // Dynamically map columns from headers
  const headers = data[0].map(h => h.toString().trim().toLowerCase());
  const COLUMNS = {
    EMAIL: headers.indexOf('email'),
    NAME: headers.indexOf('name'),
    TAGLINE: headers.indexOf('tagline'),
    PHONE: headers.indexOf('phone'),
    ADDRESS: headers.indexOf('address'),
    SOCIAL_LINKS: headers.indexOf('social links'),
    PROFILE_PIC: headers.indexOf('profile picture') !== -1 ? 
                 headers.indexOf('profile picture') : 
                 headers.indexOf('profile pic'),
    TIMESTAMP: headers.indexOf('timestamp')
  };

  // Validate required columns exist
  if (COLUMNS.EMAIL === -1) throw new Error('Email column not found in sheet');
  
  // Find user's row by email (case-insensitive)
  const normalizedEmail = email.trim().toLowerCase();
  const rowIndex = data.findIndex((row, index) => 
    index > 0 && row[COLUMNS.EMAIL] && 
    row[COLUMNS.EMAIL].toString().trim().toLowerCase() === normalizedEmail
  );

  if (rowIndex === -1) {
    console.error('Profile not found for:', email);
    throw new Error('Profile not found');
  }
  
  const row = rowIndex + 1; // Convert to 1-based index

  // Prepare updates with sanitized data
  const updates = {};
  if (updateData.name !== undefined && COLUMNS.NAME !== -1) {
    updates[COLUMNS.NAME] = sanitizeInput(updateData.name);
  }
  if (updateData.tagline !== undefined && COLUMNS.TAGLINE !== -1) {
    updates[COLUMNS.TAGLINE] = sanitizeInput(updateData.tagline);
  }
  if (updateData.phone !== undefined && COLUMNS.PHONE !== -1) {
    updates[COLUMNS.PHONE] = sanitizeInput(updateData.phone);
  }
  if (updateData.address !== undefined && COLUMNS.ADDRESS !== -1) {
    updates[COLUMNS.ADDRESS] = sanitizeInput(updateData.address);
  }
  if (updateData.profilePic !== undefined && COLUMNS.PROFILE_PIC !== -1) {
    updates[COLUMNS.PROFILE_PIC] = sanitizeInput(updateData.profilePic);
  }
  if (updateData.socialLinks !== undefined && COLUMNS.SOCIAL_LINKS !== -1) {
    updates[COLUMNS.SOCIAL_LINKS] = Array.isArray(updateData.socialLinks) ? 
      updateData.socialLinks.map(link => sanitizeInput(link)).join('\n') : 
      sanitizeInput(updateData.socialLinks);
  }
  if (COLUMNS.TIMESTAMP !== -1) {
    updates[COLUMNS.TIMESTAMP] = new Date().toISOString();
  }

  // Apply all updates in a single batch operation
  const rowData = sheet.getRange(row, 1, 1, headers.length).getValues()[0];
  Object.entries(updates).forEach(([col, value]) => {
    rowData[col] = value;
  });
  sheet.getRange(row, 1, 1, headers.length).setValues([rowData]);

  return {
    status: 'success',
    message: 'Profile updated successfully',
    timestamp: updates[COLUMNS.TIMESTAMP] || null,
    updatedFields: Object.keys(updateData)
  };
}

/** Validates basic request structure */
function validateRequest(e) {
  if (!e.parameter.action) {
    throw new Error('Missing action parameter');
  }
}

/** Validates update data structure and content */
function validateUpdateData(updateData) {
  if (!updateData || typeof updateData !== 'object' || Array.isArray(updateData)) {
    throw new Error('Update data must be a non-array object');
  }
  
  // Check for restricted fields
  const restrictedFields = ['email', 'link', 'status'];
  restrictedFields.forEach(field => {
    if (field in updateData) {
      throw new Error(`Cannot update restricted field: ${field}`);
    }
  });
  
  // Validate individual fields
  if (updateData.name !== undefined && !updateData.name?.trim()) {
    throw new Error('Name cannot be empty');
  }
  
  if (updateData.socialLinks !== undefined && !Array.isArray(updateData.socialLinks)) {
    throw new Error('Social links must be an array');
  }
}

/** Verifies session token validity */
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

/** Sanitizes input to prevent XSS */
function sanitizeInput(value) {
  if (value === null || value === undefined) return value;
  return value.toString()
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Sanitizes error messages for client display */
function sanitizeErrorMessage(message) {
  return message.replace(/[\n\r]/g, ' ').substring(0, 200);
}