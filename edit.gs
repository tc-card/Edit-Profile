function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  try {
    let parameters;
    
    if (e.postData) {
      parameters = JSON.parse(e.postData.contents);
    } else {
      parameters = e.parameter;
    }

    const { action, token, email, data } = parameters;
    
    switch (action) {
      case 'verify_session':
        return createJsonResponse(verifySession(token));
        
      case 'update_profile':
        const session = verifySession(token);
        if (!session || session.email.toLowerCase() !== email.toLowerCase()) {
          throw new Error('SESSION_EXPIRED');
        }
        
        let parsedData;
        try {
          parsedData = typeof data === 'string' ? JSON.parse(decodeURIComponent(data)) : data;
        } catch (error) {
          throw new Error('INVALID_DATA_FORMAT');
        }
        
        validateUpdateData(parsedData);
        const result = handleProfileUpdate(email, parsedData);
        return createJsonResponse(result);
        
      default:
        throw new Error('INVALID_ACTION');
    }
  } catch (error) {
    console.error('Request error:', error.message, error.stack);
    return createJsonResponse({
      status: 'error',
      message: error.message,
      code: error.message.startsWith('SESSION_') ? error.message : 'SERVER_ERROR'
    }, error.message === 'SESSION_EXPIRED' ? 401 : 400);
  }
}

function createJsonResponse(data, statusCode = 200) {
  const output = ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
    
  if (statusCode !== 200) {
    output.setStatusCode(statusCode);
  }
  
  return output;
}

function verifySession(token) {
  if (!token) {
    return { valid: false, code: 'MISSING_TOKEN' };
  }
  
  const cacheKey = `session_${token}`;
  const cached = CacheService.getScriptCache().get(cacheKey);
  if (!cached) {
    return { valid: false, code: 'INVALID_TOKEN' };
  }
  
  try {
    const session = JSON.parse(cached);
    
    if (Date.now() > session.expiry) {
      CacheService.getScriptCache().remove(cacheKey);
      return { valid: false, code: 'SESSION_EXPIRED' };
    }
    
    // Auto-extend session
    session.expiry = Date.now() + (30 * 60 * 1000);
    CacheService.getScriptCache().put(cacheKey, JSON.stringify(session), 21600);
    
    return { 
      valid: true,
      email: session.email,
      expiry: session.expiry
    };
  } catch (e) {
    console.error('Session parse error:', e);
    return { valid: false, code: 'SESSION_PARSE_ERROR' };
  }
}

function validateUpdateData(updateData) {
  if (!updateData || typeof updateData !== 'object') {
    throw new Error('INVALID_DATA');
  }
  
  if (updateData.name && !updateData.name.trim()) {
    throw new Error('INVALID_NAME');
  }
  
  if (updateData.socialLinks && !Array.isArray(updateData.socialLinks)) {
    throw new Error('INVALID_SOCIAL_LINKS');
  }
  
  if (updateData.profilePic && !isValidUrl(updateData.profilePic)) {
    throw new Error('INVALID_PROFILE_PIC_URL');
  }
}

function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

function handleProfileUpdate(email, updateData) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Form');
  const data = sheet.getDataRange().getValues();
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
  
  const normalizedEmail = email.trim().toLowerCase();
  const rowIndex = data.findIndex((row, idx) => 
    idx > 0 && row[COLUMNS.EMAIL] && 
    row[COLUMNS.EMAIL].toString().trim().toLowerCase() === normalizedEmail
  );
  
  if (rowIndex === -1) {
    throw new Error('PROFILE_NOT_FOUND');
  }
  
  const row = rowIndex + 1;
  
  const updates = {};
  if (updateData.name !== undefined && COLUMNS.NAME !== -1) {
    updates[COLUMNS.NAME] = updateData.name;
  }
  if (updateData.tagline !== undefined && COLUMNS.TAGLINE !== -1) {
    updates[COLUMNS.TAGLINE] = updateData.tagline;
  }
  if (updateData.phone !== undefined && COLUMNS.PHONE !== -1) {
    updates[COLUMNS.PHONE] = updateData.phone;
  }
  if (updateData.address !== undefined && COLUMNS.ADDRESS !== -1) {
    updates[COLUMNS.ADDRESS] = updateData.address;
  }
  if (updateData.profilePic !== undefined && COLUMNS.PROFILE_PIC !== -1) {
    updates[COLUMNS.PROFILE_PIC] = updateData.profilePic;
  }
  if (updateData.socialLinks !== undefined && COLUMNS.SOCIAL_LINKS !== -1) {
    updates[COLUMNS.SOCIAL_LINKS] = updateData.socialLinks.join('\n');
  }
  if (COLUMNS.TIMESTAMP !== -1) {
    updates[COLUMNS.TIMESTAMP] = new Date().toISOString();
  }

  const rowData = sheet.getRange(row, 1, 1, headers.length).getValues()[0];
  Object.entries(updates).forEach(([col, value]) => {
    rowData[col] = value;
  });
  sheet.getRange(row, 1, 1, headers.length).setValues([rowData]);

  return {
    status: 'success',
    message: 'Profile updated successfully',
    timestamp: updates[COLUMNS.TIMESTAMP],
    updatedFields: Object.keys(updateData)
  };
}