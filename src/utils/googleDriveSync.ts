import { Member } from '../types';

export const FOLDER_ID = '1AMfHdZrdeQlmMXR5gw6lGZmg74TEcCkw';
export const SHEET_NAME = 'Personnel Directory List';
export const JSON_NAME = 'Personnel Directory List.json';

export interface DriveFileStatus {
  sheetId: string | null;
  jsonId: string | null;
  folderFound: boolean;
  error?: string;
}

/**
 * Searches for 'Personnel Directory List' (Spreadsheet) and 'Personnel Directory List.json' in the specified folder.
 */
export async function getDatabaseStatus(accessToken: string): Promise<DriveFileStatus> {
  try {
    // First, verify we can access the folder (optional check, query files with parent)
    const query = `'${FOLDER_ID}' in parents and trashed = false`;
    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType)`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized');
      }
      const errText = await response.text();
      console.error('Failed to list files in folder:', errText);
      return { sheetId: null, jsonId: null, folderFound: false, error: `API Error: ${response.status}` };
    }

    const data = await response.json();
    const files = data.files || [];

    let sheetId: string | null = null;
    let jsonId: string | null = null;

    for (const file of files) {
      if (file.name === SHEET_NAME && file.mimeType === 'application/vnd.google-apps.spreadsheet') {
        sheetId = file.id;
      } else if (file.name === JSON_NAME) {
        jsonId = file.id;
      }
    }

    return {
      sheetId,
      jsonId,
      folderFound: true
    };
  } catch (error: any) {
    console.error('Error getting Drive database status:', error);
    return {
      sheetId: null,
      jsonId: null,
      folderFound: false,
      error: error.message || 'Unknown network error'
    };
  }
}

/**
 * Creates a Google Spreadsheet named 'Personnel Directory List' in the target folder
 * and initializes it with the current local members list.
 */
export async function createDatabaseSheet(accessToken: string, members: Member[]): Promise<string> {
  // 1. Create file metadata in Drive
  const metadataUrl = 'https://www.googleapis.com/drive/v3/files';
  const metadataBody = {
    name: SHEET_NAME,
    mimeType: 'application/vnd.google-apps.spreadsheet',
    parents: [FOLDER_ID]
  };

  const response = await fetch(metadataUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(metadataBody)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to create spreadsheet file: ${errText}`);
  }

  const fileData = await response.json();
  const spreadsheetId = fileData.id;

  // 2. Populate the sheet with headers and data
  await writeMembersToSheet(accessToken, spreadsheetId, members);

  return spreadsheetId;
}

/**
 * Overwrites/writes the member data to an existing Google Spreadsheet.
 */
export async function writeMembersToSheet(accessToken: string, spreadsheetId: string, members: Member[]): Promise<void> {
  const headers = [
    'ID', 
    'Name', 
    'Date of Birth', 
    'Position', 
    'Email', 
    'Phone', 
    'Authorized Level', 
    'Password', 
    'Created At', 
    'Avatar'
  ];

  // We write to Sheet1!A1. We clear any existing large range first to prevent stale row residue.
  try {
    const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:Z500:clear`;
    await fetch(clearUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
  } catch (e) {
    console.warn('Could not clear sheet values first:', e);
  }

  const values = [
    headers,
    ...members.map(m => [
      m.id,
      m.name,
      m.dob,
      m.position,
      m.email,
      m.phone || '',
      m.authorizedLevel || 'level 1',
      m.password || 'abc123',
      m.createdAt || new Date().toISOString(),
      m.avatar || ''
    ])
  ];

  // Use Sheet1!A1 as range or just A1 to let Sheets select the default tab
  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1?valueInputOption=RAW`;
  const body = {
    range: 'A1',
    majorDimension: 'ROWS',
    values
  };

  const response = await fetch(updateUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to write values to sheet: ${errText}`);
  }
}

/**
 * Creates 'Personnel Directory List.json' with current members list inside the folder 1AMfHdZrdeQlmMXR5gw6lGZmg74TEcCkw.
 */
export async function createDatabaseJson(accessToken: string, members: Member[]): Promise<string> {
  // 1. Create file metadata in Drive
  const metadataUrl = 'https://www.googleapis.com/drive/v3/files';
  const metadataBody = {
    name: JSON_NAME,
    mimeType: 'application/json',
    parents: [FOLDER_ID]
  };

  const response = await fetch(metadataUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(metadataBody)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to create JSON file metadata: ${errText}`);
  }

  const fileData = await response.json();
  const fileId = fileData.id;

  // 2. Upload/write JSON payload contents
  await writeMembersToJson(accessToken, fileId, members);

  return fileId;
}

/**
 * Overwrites the content of the specified JSON database file in Drive.
 */
export async function writeMembersToJson(accessToken: string, fileId: string, members: Member[]): Promise<void> {
  const uploadUrl = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
  
  const response = await fetch(uploadUrl, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(members, null, 2)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to upload content to JSON file: ${errText}`);
  }
}

/**
 * Sync logic: Downloads data from Drive and parses it.
 * It prioritizes JSON as it holds objects precisely, but can fallback to Sheets.
 */
export async function fetchDatabaseMembers(accessToken: string, sheetId: string | null, jsonId: string | null): Promise<Member[]> {
  // Attempt JSON file fetching first as it preserves types and all schema objects cleanly
  if (jsonId) {
    try {
      const url = `https://www.googleapis.com/drive/v3/files/${jsonId}?alt=media`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      if (response.ok) {
        const loadedData = await response.json();
        if (Array.isArray(loadedData)) {
          return loadedData as Member[];
        }
      } else {
        console.warn('JSON file fetch alt=media response was not ok, falling back to sheet');
      }
    } catch (e) {
      console.error('Error fetching JSON, trying spreadsheet fallback:', e);
    }
  }

  // Fallback to Sheet if JSON is unavailable or errored
  if (sheetId) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A1:J500`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      const values = data.values as string[][];
      if (values && values.length > 1) {
        const headers = values[0];
        const rows = values.slice(1);

        // Map column indices to Member properties
        // ID, Name, Date of Birth, Position, Email, Phone, Authorized Level, Password, Created At, Avatar
        const mappedMembers: Member[] = rows.map((row, idx) => {
          return {
            id: row[0] || `mem-${Date.now()}-${idx}`,
            name: row[1] || 'Unnamed User',
            dob: row[2] || '1990-01-01',
            position: row[3] || 'Staff',
            email: row[4] || '',
            phone: row[5] || '',
            authorizedLevel: row[6] || 'level 1',
            password: row[7] || 'abc123',
            createdAt: row[8] || new Date().toISOString(),
            avatar: row[9] || ''
          };
        }).filter(m => m.email); // filter out empty values

        return mappedMembers;
      }
    } else {
      const text = await response.text();
      throw new Error(`Sheets fetch error: ${response.status} - ${text}`);
    }
  }

  throw new Error('No valid database sources found to fetch from');
}
