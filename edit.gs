function doGet(e) {
  try {
    const { action, token, email, data } = e.parameter;

    // Session verification endpoint
    if (action === 'verify_session') {
      const session = verifySession(token);
      return ContentService.createTextOutput(JSON.stringify({
        valid: !!session,
        email: session?.email,
        expiry: session?.expiry
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Profile update endpoint
    if (action === 'update_profile') {
      const session = verifySession(token);
      if (!session || session.email.toLowerCase() !== email.toLowerCase()) {
        throw new Error('SESSION_EXPIRED');
      }

      let parsedData;
      try {
        parsedData = JSON.parse(decodeURIComponent(data));
      } catch (error) {
        throw new Error('INVALID_DATA_FORMAT');
      }

      const result = handleProfileUpdate(email, parsedData);
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    throw new Error('INVALID_ACTION');
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function verifySession(token) {
  if (!token) return null;
  
  const cacheKey = `session_${token}`;
  const cached = CacheService.getScriptCache().get(cacheKey);
  if (!cached) return null;
  
  try {
    const session = JSON.parse(cached);
    if (Date.now() > session.expiry) {
      CacheService.getScriptCache().remove(cacheKey);
      return null;
    }
    return session;
  } catch (e) {
    return null;
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