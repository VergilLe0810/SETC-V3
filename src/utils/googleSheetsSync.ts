/**
 * Google Sheets and Drive Sync utilities for Member data.
 */
import { Member } from '../types';

const SPREADSHEET_ID = '1bicHDAB574aSyl9Qeok4OFpwxwcpZQ4VpwTMDKMzzcM';
const SHEET_NAME = 'Membership';
const FILE_NAME = 'setc_membership_cloud_save.json';

/**
 * Ensures that the 'Membership' sheet exists inside the spreadsheet.
 */
async function ensureMembershipSheetExists(accessToken: string): Promise<void> {
  try {
    // Check sheet existence by doing a quick get metadata
    const getRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?fields=sheets.properties.title`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    if (!getRes.ok) {
      throw new Error(`Failed to fetch spreadsheet metadata: ${await getRes.text()}`);
    }
    
    const spreadsheet = await getRes.json();
    const sheetTitles: string[] = spreadsheet.sheets?.map((s: any) => s.properties.title) || [];
    
    if (!sheetTitles.includes(SHEET_NAME)) {
      // Create the sheet
      const createSheetRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: [
            {
              addSheet: {
                properties: {
                  title: SHEET_NAME
                }
              }
            }
          ]
        })
      });

      if (!createSheetRes.ok) {
        console.warn('Failed to create sheet:', await createSheetRes.text());
      }
    }
  } catch (error) {
    console.error('ensureMembershipSheetExists failed:', error);
  }
}

/**
 * Syncs the entire membership list to the Google Sheet 'Membership'.
 */
export async function syncMembersToGoogleSheet(members: Member[], accessToken: string): Promise<boolean> {
  try {
    await ensureMembershipSheetExists(accessToken);

    // 1. Clear existing range first to avoid leftover data
    const clearRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!A1:J1500:clear`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!clearRes.ok) {
      console.warn('Clear sheet returned non-ok status:', await clearRes.text());
    }

    // 2. Write headers and values
    const rows = [
      ['ID', 'Name', 'Email', 'Date of Birth', 'Position', 'Phone', 'Authorized Level', 'Created At', 'Password', 'Avatar'],
      ...members.map(m => [
        m.id,
        m.name || '',
        m.email || '',
        m.dob || '',
        m.position || '',
        m.phone || '',
        m.authorizedLevel || '',
        m.createdAt || '',
        m.password || '',
        m.avatar || ''
      ])
    ];

    const writeRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!A1?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        range: `${SHEET_NAME}!A1`,
        majorDimension: 'ROWS',
        values: rows
      })
    });

    if (!writeRes.ok) {
      throw new Error(`Failed to update google sheet: ${await writeRes.text()}`);
    }

    return true;
  } catch (error) {
    console.error('syncMembersToGoogleSheet failed:', error);
    return false;
  }
}

/**
 * Searches for a file in Google Drive by name.
 */
async function findCloudSaveFile(accessToken: string): Promise<string | null> {
  try {
    const q = encodeURIComponent(`name = '${FILE_NAME}' and trashed = false`);
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    if (!res.ok) {
      console.error('Failed to search Google Drive files:', await res.text());
      return null;
    }
    
    const data = await res.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
    return null;
  } catch (err) {
    console.error('findCloudSaveFile error:', err);
    return null;
  }
}

/**
 * Uploads/saves the members list to Google Drive as a JSON file.
 */
export async function saveMembersToGoogleDrive(members: Member[], accessToken: string): Promise<boolean> {
  try {
    let fileId = await findCloudSaveFile(accessToken);
    
    if (!fileId) {
      // Create new file metadata
      const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: FILE_NAME,
          mimeType: 'application/json'
        })
      });
      
      if (!createRes.ok) {
        throw new Error(`Failed to create cloud save metadata: ${await createRes.text()}`);
      }
      
      const fileData = await createRes.json();
      fileId = fileData.id;
    }
    
    if (!fileId) {
      return false;
    }

    // Now upload the media content
    const patchRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(members, null, 2)
    });
    
    if (!patchRes.ok) {
      throw new Error(`Failed to upload cloud save contents: ${await patchRes.text()}`);
    }
    
    return true;
  } catch (error) {
    console.error('saveMembersToGoogleDrive failed:', error);
    return false;
  }
}

/**
 * Loads/imports the members list from Google Drive cloud save file.
 */
export async function loadMembersFromGoogleDrive(accessToken: string): Promise<Member[] | null> {
  try {
    const fileId = await findCloudSaveFile(accessToken);
    if (!fileId) {
      return null; // File doesn't exist yet
    }
    
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    if (!res.ok) {
      throw new Error(`Failed to download cloud save contents: ${await res.text()}`);
    }
    
    const data = await res.json();
    if (Array.isArray(data)) {
      return data;
    }
    return null;
  } catch (error) {
    console.error('loadMembersFromGoogleDrive failed:', error);
    return null;
  }
}
