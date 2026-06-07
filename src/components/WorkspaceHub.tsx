import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Cloud, 
  Database, 
  FileSpreadsheet, 
  Grid, 
  Check, 
  AlertCircle, 
  RefreshCw, 
  Trash2, 
  ExternalLink, 
  Upload, 
  FolderPlus, 
  Folder, 
  File, 
  Download, 
  HelpCircle,
  Clock,
  ArrowUpRight,
  Sparkles,
  Info,
  Layers,
  Users,
  CheckCircle2,
  Lock,
  FileText,
  FilePlus
} from 'lucide-react';
import { Course, CourseSession, Member, Task } from '../types';
import { formatDate } from '../utils/date';
import { googleSignIn, googleLogout, getAccessToken, initAuth } from '../utils/googleAuth';
import { User } from 'firebase/auth';

interface WorkspaceHubProps {
  courses: Course[];
  sessions: CourseSession[];
  members: Member[];
  tasks: Task[];
  onSetCourses: React.Dispatch<React.SetStateAction<Course[]>>;
  onSetSessions: React.Dispatch<React.SetStateAction<CourseSession[]>>;
}

export default function WorkspaceHub({
  courses,
  sessions,
  members,
  tasks,
  onSetCourses,
  onSetSessions
}: WorkspaceHubProps) {
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Workspace State
  const [backupFolderId, setBackupFolderId] = useState<string | null>(null);
  const [backupFolderName, setBackupFolderName] = useState<string>('SETC Core Portal Backups');
  const [isFolderSearching, setIsFolderSearching] = useState(false);
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [isFilesLoading, setIsFilesLoading] = useState(false);
  
  // File Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sheets Sync State
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(() => {
    return localStorage.getItem('se_backup_spreadsheet_id');
  });
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string | null>(() => {
    return localStorage.getItem('se_backup_spreadsheet_url');
  });
  const [isExporting, setIsExporting] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => {
    return localStorage.getItem('se_last_sync_time');
  });

  // Notifications/Alerts
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showFeedback = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => {
      setFeedback(null);
    }, 4500);
  };

  // Sub-tab Navigation
  const [activeSubTab, setActiveSubTab] = useState<'storage' | 'docs'>('storage');

  // Google Docs Generation State
  const [docTemplate, setDocTemplate] = useState<'syllabus' | 'certificate' | 'task'>('syllabus');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [customDocNotes, setCustomDocNotes] = useState<string>('');
  const [isDocGenerating, setIsDocGenerating] = useState<boolean>(false);
  const [docGenStatus, setDocGenStatus] = useState<string | null>(null);

  useEffect(() => {
    if (courses.length > 0 && !selectedCourseId) {
      setSelectedCourseId(courses[0].id);
    }
  }, [courses, selectedCourseId]);

  useEffect(() => {
    if (members.length > 0 && !selectedMemberId) {
      setSelectedMemberId(members[0].id);
    }
  }, [members, selectedMemberId]);

  useEffect(() => {
    if (tasks.length > 0 && !selectedTaskId) {
      setSelectedTaskId(tasks[0].id);
    }
  }, [tasks, selectedTaskId]);

  const handleCreateGoogleDoc = async () => {
    if (!token) {
      showFeedback('Please connect your Google Workspace credentials first.', 'error');
      return;
    }

    setIsDocGenerating(true);
    setDocGenStatus('Initializing document setup...');
    try {
      let docTitle = 'HSE Document';
      let docText = '';

      if (docTemplate === 'syllabus') {
        const course = courses.find(c => c.id === selectedCourseId) || courses[0];
        if (!course) throw new Error('No course selected or available.');
        
        docTitle = `SETC Course Syllabus: ${course.title} (${course.code})`;
        setDocGenStatus('Generating course syllabus metadata...');
        docText = `========================================================================
PETROVIETNAM SAFETY & ENVIRONMENT TRAINING CENTRE (SETC)
========================================================================

OFFICIAL COURSE SYLLABUS BRIEFING
Generated on: ${formatDate(new Date())}

1. GENERAL COURSE METADATA
------------------------------------------------------------------------
Course Title:     ${course.title}
Course Code:      ${course.code}
Category:         ${course.category}
Training Level:   ${course.level}
Duration:         ${course.durationDays} Days
Technical Domain: ${course.domain || 'Health, Safety & Environment'}
Certification:    ${course.certificationEarned}

2. DETAILED SYLLABUS MODULES
------------------------------------------------------------------------
The following regulatory curriculum blocks are defined:
${course.syllabus ? course.syllabus.map((item, idx) => `  * Module ${idx + 1}: ${item}`).join('\n') : '  * Module 1: Comprehensive Safety Procedures\n  * Module 2: Simulator Practical and Emergency Scenarios'}

3. ADMINISTRATIVE NOTES & DISPUTES
------------------------------------------------------------------------
${customDocNotes || 'No custom administrative overrides provided for this curriculum.'}

This document is certified compliant under standard Petrovietnam educational guidelines.

------------------------------------------------------------------------
Authorized Signature: Petrovietnam SETC Board
Digital Seal ID: SIGN-SETC-${course.code}-${Date.now().toString().slice(-4)}
========================================================================`;
      } else if (docTemplate === 'certificate') {
        const member = members.find(m => m.id === selectedMemberId) || members[0];
        if (!member) throw new Error('No organizational member selected.');

        const course = courses[0];
        const courseIdText = course ? `${course.title} (${course.code})` : 'HSE On-Site Compliance & Rescue';

        docTitle = `HSE Certification: ${member.name} - ${member.id}`;
        setDocGenStatus('Generating certificate credentials...');
        docText = `========================================================================
PETROVIETNAM SAFETY & ENVIRONMENT TRAINING CENTRE (SETC)
========================================================================

CERTIFICATE OF PROFESSIONAL TRAINING COMPLETION
Generated on: ${formatDate(new Date())}

This document officially certifies that the HSE specialist:
  Full Name:       ${member.name}
  Administrative:  ${member.position}
  Member ID:       ${member.id}
  Official Email:  ${member.email}

Has successfully completed safety engineering exercises and verified clearance:
  Syllabus Group:  ${courseIdText}
  Clearance Level: ${member.authorizedLevel || 'Level 1 Personnel'}

This certificate remains valid for 3 continuous years henceforth.

3. SPECIAL WORKPLACE DIRECTIVES
------------------------------------------------------------------------
${customDocNotes || 'Personnel is cleared for high-containment operations.'}

------------------------------------------------------------------------
Issued by Authority:
Petrovietnam SETC General Director
Registration Code: CERT-${member.id}-${Date.now().toString().slice(-4)}
========================================================================`;
      } else if (docTemplate === 'task') {
        const task = tasks.find(t => t.id === selectedTaskId) || tasks[0];
        if (!task) throw new Error('No compliance directive task available.');

        docTitle = `HSE Corrective Action Directive: ${task.title}`;
        setDocGenStatus('Compiling corrective HSE directive details...');
        docText = `========================================================================
PETROVIETNAM SAFETY & ENVIRONMENT TRAINING CENTRE (SETC)
========================================================================

CORRECTIVE ACTION COMPLIANCE BRIEF
Generated on: ${formatDate(new Date())}

We hereby issue an official administrative directive requiring immediate corrective action:

1. COMPLIANCE DIRECTIVE METADATA
------------------------------------------------------------------------
Action Title:    ${task.title}
Coordinator:     ${task.assignedBy}
Assigned Officer:${task.assignedTo}
Target Due Date: ${formatDate(task.dueDate)}
Directive State: ${task.status}
Registered At:   ${formatDate(task.createdAt)}

2. DESCRIPTION OF ACTIONABLE CORRECTIVE BRIEF
------------------------------------------------------------------------
The assigned safety specialist is strictly ordered to assess on-site safety
parameters and execute standard protective procedures to resolve the identified
issues before the due date.

3. WORKPLACE COORDINATOR INSTRUCTIONS
------------------------------------------------------------------------
${customDocNotes || 'Verify fire suppression loops, hazardous elements storage, and ensure active personnel is fully notified.'}

SETC Compliance Officer Seal
========================================================================`;
      }

      setDocGenStatus('Provisioning cloud document on Google Docs...');
      const createRes = await fetch('https://docs.googleapis.com/v1/documents', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title: docTitle })
      });

      const docData = await createRes.json();
      if (!createRes.ok || !docData.documentId) {
        throw new Error(docData.error?.message || 'Failed to create document');
      }

      const docId = docData.documentId;

      setDocGenStatus('Writing professional formatted template content...');
      const updateRes = await fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: [
            {
              insertText: {
                text: docText,
                location: { index: 1 }
              }
            }
          ]
        })
      });

      if (!updateRes.ok) {
        throw new Error('Failed to update newly created document body lines.');
      }

      if (backupFolderId) {
        setDocGenStatus('Organizing document into Portal Backups folder...');
        await fetch(`https://www.googleapis.com/drive/v3/files/${docId}?addParents=${backupFolderId}&removeParents=root`, {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }

      showFeedback(`Successfully generated Google Doc: "${docTitle}"!`, 'success');
      setCustomDocNotes('');

      if (backupFolderId) {
        fetchFolderFiles(backupFolderId, token);
      }
    } catch (error: any) {
      console.error(error);
      showFeedback(`Docs Generation failed: ${error.message}`, 'error');
    } finally {
      setIsDocGenerating(false);
      setDocGenStatus(null);
    }
  };

  // 1. Initial Authentication Binding
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, retrievedToken) => {
        setGoogleUser(user);
        setToken(retrievedToken);
        setIsLoadingAuth(false);
        // Automatically scan for Drive backups folder once connected
        scanForBackupFolder(retrievedToken);
      },
      () => {
        setGoogleUser(null);
        setToken(null);
        setIsLoadingAuth(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setGoogleUser(result.user);
        setToken(result.accessToken);
        showFeedback('Google Workspace channel connected successfully!', 'success');
        scanForBackupFolder(result.accessToken);
      }
    } catch (err: any) {
      console.error('Google authorization failed:', err);
      showFeedback(err.message || 'Connection failed. Please configure Cloud permissions.', 'error');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    const confirmDisconnect = window.confirm('Disconnect Google Workspace? Google Drive and sheets operations will be locked.');
    if (!confirmDisconnect) return;

    try {
      await googleLogout();
      setGoogleUser(null);
      setToken(null);
      setBackupFolderId(null);
      setDriveFiles([]);
      showFeedback('Disconnected Google Workspace.', 'info');
    } catch (err) {
      showFeedback('Disconnection error.', 'error');
    }
  };

  // 2. Google Drive Core REST Actions
  const scanForBackupFolder = async (accessToken: string) => {
    if (!accessToken) return;
    setIsFolderSearching(true);
    try {
      const query = encodeURIComponent(`name = '${backupFolderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
      const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id, name)`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const data = await response.json();
      
      if (data.files && data.files.length > 0) {
        const folder = data.files[0];
        setBackupFolderId(folder.id);
        fetchFolderFiles(folder.id, accessToken);
      } else {
        setBackupFolderId(null);
      }
    } catch (error) {
      console.error('Error finding Drive folder:', error);
    } finally {
      setIsFolderSearching(false);
    }
  };

  const createBackupFolder = async () => {
    if (!token) return;
    setIsFolderSearching(true);
    try {
      const response = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: backupFolderName,
          mimeType: 'application/vnd.google-apps.folder'
        })
      });
      const data = await response.json();
      if (data.id) {
        setBackupFolderId(data.id);
        showFeedback(`Created folder: "${backupFolderName}" in Google Drive.`, 'success');
        fetchFolderFiles(data.id, token);
      } else {
        throw new Error('Folder creation API error');
      }
    } catch (error: any) {
      showFeedback(`Failed to create Google Drive folder: ${error.message}`, 'error');
    } finally {
      setIsFolderSearching(false);
    }
  };

  const fetchFolderFiles = async (folderId: string, accessToken: string) => {
    if (!accessToken) return;
    setIsFilesLoading(true);
    try {
      const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
      const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id, name, mimeType, size, createdTime, webViewLink, iconLink)&orderBy=name`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const data = await response.json();
      if (data.files) {
        setDriveFiles(data.files);
      }
    } catch (error) {
      console.error('Error listing files:', error);
    } finally {
      setIsFilesLoading(false);
    }
  };

  // Drag and Drop Uplink Check
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!token || !backupFolderId) {
      showFeedback('Please connect Google Drive first & create a folder.', 'error');
      return;
    }

    setIsUploading(true);
    setUploadPercent(10);
    try {
      const metadata = {
        name: file.name,
        parents: [backupFolderId]
      };
      
      const formData = new FormData();
      formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      formData.append('file', file);
      
      setUploadPercent(40);
      const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      setUploadPercent(80);
      const data = await res.json();
      if (data.id) {
        showFeedback(`Uploaded "${file.name}" to Google Drive folder!`, 'success');
        fetchFolderFiles(backupFolderId, token);
      } else {
        throw new Error('Upload request failed.');
      }
    } catch (error: any) {
      showFeedback(`Upload failed: ${error.message}`, 'error');
    } finally {
      setIsUploading(false);
      setUploadPercent(null);
    }
  };

  const handleDeleteFile = async (fileId: string, fileName: string) => {
    // Guidelines direct confirmation for Destructive Operations:
    const confirmed = window.confirm(`Permanently delete "${fileName}" from your Google Drive backup folder? This action cannot be undone.`);
    if (!confirmed) return;

    if (!token) return;
    try {
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 204 || response.ok) {
        showFeedback('File backup deleted successfully!', 'success');
        if (backupFolderId) {
          fetchFolderFiles(backupFolderId, token);
        }
      } else {
        throw new Error('Google Drive API deletion failure');
      }
    } catch (error: any) {
      showFeedback(`Deletion failed: ${error.message}`, 'error');
    }
  };

  // 3. Google Sheets Exporting System
  const handleExportToSheets = async () => {
    if (!token) {
      showFeedback('Connect to PV College Workspace channel first.', 'error');
      return;
    }

    setIsExporting(true);
    setSyncStatus('Initiating PV College spreadsheet creation...');
    try {
      // 1. Create Spreadsheet
      const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          properties: {
            title: 'PV College Safety & Environment Training Records'
          },
          sheets: [
            { properties: { title: 'Courses Database' } },
            { properties: { title: 'Sessions Schedule' } },
            { properties: { title: 'Members Registry' } },
            { properties: { title: 'HSE Directives' } }
          ]
        })
      });

      const spreadsheet = await createResponse.json();
      if (!spreadsheet.spreadsheetId) {
        throw new Error('Could not provision spreadsheet structure on server.');
      }

      const freshSpreadsheetId = spreadsheet.spreadsheetId;
      const freshUrl = spreadsheet.spreadsheetUrl;

      // 2. Prepare Rows for Courses
      setSyncStatus('Pushing Course data matrices...');
      const courseRows = [
        ['Course Code', 'Title', 'Category', 'Level', 'Duration (Days)', 'Certification Earned', 'Technical Domain']
      ];
      courses.forEach(c => {
        courseRows.push([
          c.code,
          c.title,
          c.category,
          c.level,
          String(c.durationDays),
          c.certificationEarned,
          c.domain || 'N/A'
        ]);
      });

      // 3. Prepare Rows for Sessions
      setSyncStatus('Formatting Class timing matrices...');
      const sessionRows = [
        ['Session ID', 'Course Code', 'Start Date', 'End Date', 'Timings', 'Instructor name', 'Classroom Resource', 'Enrolled Size']
      ];
      sessions.forEach(s => {
        const course = courses.find(c => c.id === s.courseId);
        sessionRows.push([
          s.id,
          course ? course.code : 'UNKNOWN',
          s.startDate,
          s.endDate,
          `${s.startTime} - ${s.endTime}`,
          s.instructor,
          s.classroom,
          String(s.enrolledIds.length)
        ]);
      });

      // 4. Prepare Rows for Members
      setSyncStatus('Organizing organizational roles...');
      const memberRows = [
        ['ID', 'Name', 'Date of Birth', 'Administrative Position', 'Official Email', 'Authorized clearances']
      ];
      members.forEach(m => {
        memberRows.push([
          m.id,
          m.name,
          m.dob,
          m.position,
          m.email,
          m.authorizedLevel || 'level 1'
        ]);
      });

      // 5. Prepare Rows for Tasks
      setSyncStatus('Compiling active corrective HSE directives...');
      const taskRows = [
        ['Task Title', 'Assigned Coordinator', 'Assigned Official', 'Target Due Date', 'Status Flag', 'Registration Time']
      ];
      tasks.forEach(t => {
        taskRows.push([
          t.title,
          t.assignedBy,
          t.assignedTo,
          t.dueDate,
          t.status,
          t.createdAt
        ]);
      });

      // 6. Write values batch updates
      setSyncStatus('Syncing values securely with Google Sheets...');
      const batchUpdateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${freshSpreadsheetId}/values:batchUpdate`;
      
      const payload = {
        valueInputOption: 'RAW',
        data: [
          { range: "'Courses Database'!A1", values: courseRows },
          { range: "'Sessions Schedule'!A1", values: sessionRows },
          { range: "'Members Registry'!A1", values: memberRows },
          { range: "'HSE Directives'!A1", values: taskRows }
        ]
      };

      const updateResponse = await fetch(batchUpdateUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!updateResponse.ok) {
        throw new Error('Spreadsheet batch write failed.');
      }

      // Check if we can apply basic formatting style (e.g. bold header column colors)
      setSyncStatus('Applying Petrovietnam visual styling limits...');
      const stylePayload = {
        requests: [
          // Bold headers and colored backgrounds for Courses Database
          {
            repeatCell: {
              range: { sheetId: spreadsheet.sheets[0].properties.sheetId, startRowIndex: 0, endRowIndex: 1 },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.329, green: 0.607, blue: 0.549 }, // #549b8c
                  textFormat: { bold: true, color: { red: 1.0, green: 1.0, blue: 1.0 } }
                }
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat)'
            }
          },
          // Bold headers and colored backgrounds for Sessions
          {
            repeatCell: {
              range: { sheetId: spreadsheet.sheets[1].properties.sheetId, startRowIndex: 0, endRowIndex: 1 },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.329, green: 0.607, blue: 0.549 },
                  textFormat: { bold: true, color: { red: 1.0, green: 1.0, blue: 1.0 } }
                }
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat)'
            }
          },
          // Auto-resize columns request for perfect scannability!
          {
            autoResizeDimensions: {
              dimensions: {
                sheetId: spreadsheet.sheets[0].properties.sheetId,
                dimension: 'COLUMNS',
                startIndex: 0,
                endIndex: 7
              }
            }
          },
          {
            autoResizeDimensions: {
              dimensions: {
                sheetId: spreadsheet.sheets[1].properties.sheetId,
                dimension: 'COLUMNS',
                startIndex: 0,
                endIndex: 8
              }
            }
          }
        ]
      };

      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${freshSpreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(stylePayload)
      });

      // Move spreadsheet to Google Drive backup folder if folder exists
      if (backupFolderId) {
        setSyncStatus('Linking spreadsheet to Drive backup folder...');
        await fetch(`https://www.googleapis.com/drive/v3/files/${freshSpreadsheetId}?addParents=${backupFolderId}&removeParents=root`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }

      const nowStr = new Date().toLocaleString();
      setSpreadsheetId(freshSpreadsheetId);
      setSpreadsheetUrl(freshUrl);
      setLastSyncTime(nowStr);
      
      localStorage.setItem('se_backup_spreadsheet_id', freshSpreadsheetId);
      localStorage.setItem('se_backup_spreadsheet_url', freshUrl);
      localStorage.setItem('se_last_sync_time', nowStr);

      showFeedback('Synchronized Courses, Sessions, Members, and Tasks database successfully!', 'success');
      
      // Refresh list to view our newly created spreadsheet backup!
      if (backupFolderId) {
        fetchFolderFiles(backupFolderId, token);
      }
    } catch (err: any) {
      console.error(err);
      showFeedback(`Database link failed: ${err.message}`, 'error');
    } finally {
      setIsExporting(false);
      setSyncStatus(null);
    }
  };

  const handleImportSheet = async () => {
    if (!token) return;
    const providedId = window.prompt("To import dynamic courses, enter the Google Spreadsheet ID containing 'Courses Database' worksheet tab:");
    if (!providedId) return;

    setIsExporting(true);
    setSyncStatus('Importing Courses data matrix...');
    try {
      const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${providedId}/values/'Courses Database'!A2:G100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        throw new Error('Spreadsheet not found or missing target worksheet tab.');
      }
      const data = await response.json();
      if (!data.values || data.values.length === 0) {
        throw new Error('No dataset lines discovered in target worksheet range.');
      }

      const parsedCourses: Course[] = data.values.map((row: any, i: number) => ({
        id: `imported-${Date.now()}-${i}`,
        code: row[0] || 'IMPORT',
        title: row[1] || 'Syllabus Course Title',
        category: (row[2] as any) || 'Safety',
        level: (row[3] as any) || 'Basic',
        durationDays: parseInt(row[4], 10) || 3,
        certificationEarned: row[5] || 'Certification Description',
        domain: (row[6] as any) || 'HSE',
        syllabus: ['Integrated HSE requirements review', 'Practical simulator training']
      }));

      onSetCourses(parsedCourses);
      showFeedback(`Successfully imported ${parsedCourses.length} customized Course syllabi into physical memory!`, 'success');
    } catch (error: any) {
      showFeedback(`Import Error: ${error.message}`, 'error');
    } finally {
      setIsExporting(false);
      setSyncStatus(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Hero Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
          <Cloud className="w-40 h-40 text-emerald-800" />
        </div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-emerald-50 text-[#549B8C] rounded-xl border border-emerald-100">
                <Cloud className="w-6 h-6" />
              </span>
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Google Workspace Link</h2>
                <p className="text-xs text-slate-500 font-semibold italic">PV College Sync System & Safety Records Drive Backup Hub</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 max-w-xl leading-relaxed pt-2">
              Sync administrative databases directly into official cloud files. Maintain classroom spreadsheets, member logs, HSE tasks, and upload course documents into a centralized, auto-created folder in Google Drive.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            {googleUser ? (
              <div className="flex flex-col items-end gap-1.5 bg-slate-50 border border-slate-100 p-3 rounded-xl shadow-3xs">
                <div className="flex items-center gap-2.5">
                  <div className="text-right">
                    <p className="text-[10px] font-extrabold uppercase text-slate-400">Connected Coordinator</p>
                    <p className="text-xs font-bold text-slate-800">{googleUser.displayName || 'HSE Admin'}</p>
                  </div>
                  <img 
                    src={googleUser.photoURL || undefined} 
                    alt="" 
                    className="w-8 h-8 rounded-full border border-[#549B8C]" 
                    referrerPolicy="no-referrer"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="mt-1.5 px-3 py-1 bg-slate-200 hover:bg-rose-50 hover:text-rose-700 text-slate-700 text-[10px] font-extrabold rounded-lg transition-colors cursor-pointer"
                >
                  Disconnect channel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleConnect}
                disabled={isConnecting}
                className="gsi-material-button w-full sm:w-auto shadow-md border border-slate-200 rounded-xl hover:shadow-lg transition-all"
              >
                <div className="gsi-material-button-state"></div>
                <div className="gsi-material-button-content-wrapper p-3 px-4 flex items-center gap-3">
                  <div className="gsi-material-button-icon">
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block', width: '20px', height: '20px' }}>
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                      <path fill="none" d="M0 0h48v48H0z"></path>
                    </svg>
                  </div>
                  <span className="gsi-material-button-contents text-xs font-bold text-slate-700">Connect Google Workspace</span>
                </div>
              </button>
            )}
          </div>
        </div>

        {feedback && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`mt-4 p-3.5 border rounded-xl flex items-start gap-2.5 text-xs font-semibold shadow-3xs ${
              feedback.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
              feedback.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' :
              'bg-blue-50 border-blue-200 text-blue-800'
            }`}
          >
            {feedback.type === 'success' ? <CheckCircle2 className="w-4.5 h-4.5 shrink-0 text-emerald-600 mt-0.5" /> : <AlertCircle className="w-4.5 h-4.5 shrink-0 text-rose-500 mt-0.5" />}
            <span>{feedback.message}</span>
          </motion.div>
        )}
      </div>

      {!googleUser && (
        <div id="unauthorized-placeholder" className="bg-slate-50 border border-slate-200 border-dashed rounded-2xl p-12 text-center text-slate-500 flex flex-col items-center justify-center space-y-4">
          <Lock className="w-12 h-12 text-slate-400" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-800">Workspace Authorization Required</h3>
            <p className="text-xs max-w-sm">Connect your Google Workspace in the hero section above to access backups, upload files, and export schedules seamlessly.</p>
          </div>
        </div>
      )}

      {googleUser && (
        <div className="space-y-6">
          {/* Sub-tab Switcher Banner */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 border border-slate-200/60 p-2.5 rounded-2xl shadow-3xs">
            <div className="flex items-center gap-1.5 p-1 bg-slate-200/55 rounded-xl shrink-0">
              <button
                type="button"
                onClick={() => setActiveSubTab('storage')}
                className={`py-1.5 px-4 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  activeSubTab === 'storage'
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200/40'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Cloud className="w-3.5 h-3.5 text-[#549B8C]" />
                Storage & Sheets Sync
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('docs')}
                className={`py-1.5 px-4 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  activeSubTab === 'docs'
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200/40'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
                HSE Compliance Docs
              </button>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 mr-2">
              <Sparkles className="w-4 h-4 text-blue-500" />
              <span>Full Google Workspace API Access Enabled</span>
            </div>
          </div>

          {activeSubTab === 'storage' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* LEFT: Google Sheets Database synchronization */}
              <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5">
                <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                    <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider">Sheets Database Link</h3>
                  </div>
                  <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-1.5 py-0.5 rounded-md">Live</span>
                </div>

                <div className="space-y-4 text-xs">
                  <p className="text-slate-600 leading-relaxed font-medium">
                    Pushes all courses, members databases, sessions, and checklists dynamically to dynamic worksheets. Sheets can be loaded in back-office.
                  </p>

                  {spreadsheetId ? (
                    <div className="bg-slate-50 p-4 border border-slate-200/60 rounded-xl space-y-3">
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold block">Link Status</span>
                        <span className="text-slate-800 font-bold flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-500 font-bold" />
                          Connected Sheet records
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold block">Spreadsheet ID</span>
                        <code className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1 py-0.5 rounded block truncate select-all">{spreadsheetId}</code>
                      </div>
                      {lastSyncTime && (
                        <div>
                          <span className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold block">Last Synchronized</span>
                          <span className="text-[10.5px] font-semibold text-slate-600 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {lastSyncTime}
                          </span>
                        </div>
                      )}

                      <a 
                        href={spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}`}
                        target="_blank" 
                        rel="noreferrer"
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-150 border border-emerald-200 text-[#549B8C] font-bold text-[11px] rounded-lg transition-colors"
                      >
                        Open Google Sheet
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ) : (
                    <div className="bg-slate-50/60 p-4 border border-slate-150 border-dashed rounded-xl text-center py-7">
                      <Grid className="w-6 h-6 text-slate-350 mx-auto mb-2" />
                      <span className="text-[11px] font-semibold text-slate-450 block">No sheets synchronized in this session</span>
                    </div>
                  )}

                  <div className="space-y-2 pt-2">
                    <button
                      type="button"
                      onClick={handleExportToSheets}
                      disabled={isExporting}
                      className="w-full h-11 bg-[#549B8C] hover:bg-[#437C70] disabled:bg-[#437C70]/50 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isExporting ? 'animate-spin' : ''}`} />
                      {isExporting ? 'Synchronizing Recs...' : 'Export Portal DB to Sheet'}
                    </button>

                    <button
                      type="button"
                      onClick={handleImportSheet}
                      disabled={isExporting}
                      className="w-full h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Import Courses from Sheet
                    </button>
                  </div>

                  {isExporting && syncStatus && (
                    <div className="flex items-center gap-2 bg-amber-50 p-3 rounded-xl border border-amber-100 text-amber-850 animate-pulse">
                      <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                      <span className="text-[10px] font-bold tracking-wide">{syncStatus}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT: Google Drive File Explorer and Media backup */}
              <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-6">
                <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Folder className="w-5 h-5 text-emerald-600" />
                    <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider">Drive File backups</h3>
                  </div>
                  
                  {backupFolderId ? (
                    <div className="flex items-center gap-1.5 text-[10px] font-extrabold bg-blue-50 text-blue-800 px-2 py-0.5 rounded-md">
                      <Check className="w-3 h-3 text-blue-600" />
                      Folder Connected
                    </div>
                  ) : (
                    <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded-md">Pending Setup</span>
                  )}
                </div>

                <div className="space-y-5">
                  {/* Folder check banner */}
                  {!backupFolderId ? (
                    <div className="bg-amber-50/60 p-5 rounded-2xl border border-amber-200/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <h4 className="text-xs font-extrabold text-amber-900 flex items-center gap-1.5">
                          <FolderPlus className="w-4" />
                          Create Backup Folder
                        </h4>
                        <p className="text-[11px] text-amber-800 leading-relaxed font-semibold">
                          Establish a dedicated secure backup directory named "{backupFolderName}" under your Google Drive root directory.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={createBackupFolder}
                        disabled={isFolderSearching}
                        className="shrink-0 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                      >
                        Setup Folder Now
                      </button>
                    </div>
                  ) : (
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/60 flex items-center justify-between flex-wrap gap-2 text-xs">
                      <div className="flex items-center gap-2.5">
                        <Folder className="w-5 h-5 text-amber-500 fill-amber-300" />
                        <div>
                          <p className="text-[10px] text-slate-400 font-semibold uppercase">Active Backup Directory</p>
                          <span className="font-extrabold text-[#549B8C] font-mono">My Drive / {backupFolderName}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => scanForBackupFolder(token || '')}
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-white rounded border border-slate-200 shrink-0"
                        title="List files again"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Upload Drag Box */}
                  {backupFolderId && (
                    <div 
                      className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                        dragActive ? 'border-[#549B8C] bg-emerald-50/20' : 'border-slate-200 hover:border-slate-300'
                      }`}
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                    >
                      <input 
                        type="file" 
                        id="drive-uploader-input"
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        className="hidden" 
                      />
                      
                      <div className="flex flex-col items-center justify-center space-y-3.5">
                        <div className="w-11 h-11 bg-emerald-50 rounded-full flex items-center justify-center text-[#549B8C] border border-emerald-100">
                          <Upload className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-700">
                            Drag & drop a file here, or{' '}
                            <button 
                              type="button" 
                              onClick={() => fileInputRef.current?.click()}
                              className="text-[#549B8C] hover:text-[#437C70] font-bold underline cursor-pointer"
                            >
                              browse your device
                            </button>
                          </p>
                          <p className="text-[9.5px] text-slate-400 mt-1 font-medium">Upload technical manuals, hazard sheets, compliance certificates directly to Drive.</p>
                        </div>

                        {isUploading && (
                          <div className="w-full max-w-xs bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200">
                            <div 
                              className="bg-[#549B8C] h-full transition-all duration-300"
                              style={{ width: `${uploadPercent || 15}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Files Table List */}
                  {backupFolderId && (
                    <div className="space-y-3">
                      <h4 className="text-[10.5px] font-black uppercase text-slate-400 tracking-wider">Document Listings ({driveFiles.length})</h4>
                      
                      {isFilesLoading ? (
                        <div className="text-center py-10 space-y-2">
                          <RefreshCw className="w-5 h-5 animate-spin text-slate-450 mx-auto" />
                          <p className="text-xs text-slate-450 font-bold italic">Polling files...</p>
                        </div>
                      ) : driveFiles.length === 0 ? (
                        <div className="bg-slate-50/50 p-8 border border-slate-150 border-dashed rounded-xl text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
                          <File className="w-6 h-6 text-slate-350" />
                          <p className="text-xs font-semibold">No files uploaded in backup directory yet.</p>
                        </div>
                      ) : (
                        <div className="border border-slate-200/80 rounded-xl overflow-hidden divide-y divide-slate-100">
                          {driveFiles.map((f) => {
                            const isSpreadsheet = f.mimeType === 'application/vnd.google-apps.spreadsheet';
                            const isFolder = f.mimeType === 'application/vnd.google-apps.folder';
                            const isDoc = f.mimeType === 'application/vnd.google-apps.document';
                            const fileWeightKB = f.size ? `${(parseInt(f.size, 10)/1024).toFixed(1)} KB` : 'N/A';
                            
                            return (
                              <div 
                                key={f.id} 
                                id={`drive-file-${f.id}`} 
                                className="bg-white hover:bg-slate-50/30 p-3.5 flex items-center justify-between gap-4 text-xs group"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <span className="p-2 bg-slate-50 text-slate-500 rounded-lg group-hover:bg-white border border-slate-100 shrink-0">
                                    {isSpreadsheet ? (
                                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                                    ) : isFolder ? (
                                      <Folder className="w-4 h-4 text-amber-500" />
                                    ) : isDoc ? (
                                      <FileText className="w-4 h-4 text-blue-500" />
                                    ) : (
                                      <File className="w-4 h-4 text-[#549B8C]" />
                                    )}
                                  </span>
                                  <div className="min-w-0">
                                    <h5 className="font-extrabold text-slate-800 truncate leading-normal" title={f.name}>{f.name}</h5>
                                    <div className="flex items-center gap-2 mt-0.5 flex-wrap font-medium">
                                      <span className="text-[10px] text-slate-400">{fileWeightKB}</span>
                                      <span className="text-slate-300">•</span>
                                      <span className="text-[10px] text-slate-400 font-mono">
                                        {(f.createdTime || '').split('T')[0] || 'Today'}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2.5 shrink-0">
                                  <a 
                                    href={f.webViewLink} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="px-2.5 py-1.5 bg-slate-50 hover:bg-white text-slate-700 hover:text-[#549B8C] border border-slate-200/95 rounded-lg flex items-center gap-1 font-bold text-[10px] transition-all cursor-pointer"
                                  >
                                    View
                                    <ArrowUpRight className="w-3 h-3" />
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteFile(f.id, f.name)}
                                    className="p-1.5 hover:bg-rose-50 border border-slate-100 hover:border-rose-100 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                                    title="Delete file"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Sub-Tab 2: Google Docs Compliance generator */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* LEFT COLUMN: Controls & Creator */}
              <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5">
                <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <FilePlus className="w-5 h-5 text-blue-600" />
                    <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider">HSE Document Suite</h3>
                  </div>
                  <span className="text-[10px] bg-blue-50 text-blue-800 font-bold px-1.5 py-0.5 rounded-md">Docs API</span>
                </div>

                <div className="space-y-4 text-xs">
                  <p className="text-slate-600 leading-relaxed font-medium">
                    Generate officially formatted safety, syllabus and corrective action directives instantly using Google Docs templates. Prepared files are linked directly to your organization backups.
                  </p>

                  {/* Template selector */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Select Document Template</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setDocTemplate('syllabus')}
                        className={`p-3 rounded-xl border-2 text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer min-h-[90px] ${
                          docTemplate === 'syllabus'
                            ? 'border-emerald-500 bg-emerald-50/20 text-emerald-950 font-bold'
                            : 'border-slate-100 hover:border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <FileSpreadsheet className="w-5 h-5 text-emerald-600 mb-1" />
                        <span className="text-[10px] uppercase font-extrabold tracking-tight">Syllabus</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDocTemplate('certificate')}
                        className={`p-3 rounded-xl border-2 text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer min-h-[90px] ${
                          docTemplate === 'certificate'
                            ? 'border-blue-500 bg-blue-50/20 text-blue-950 font-bold'
                            : 'border-slate-100 hover:border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Users className="w-5 h-5 text-blue-600 mb-1" />
                        <span className="text-[10px] uppercase font-extrabold tracking-tight">Certificate</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDocTemplate('task')}
                        className={`p-3 rounded-xl border-2 text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer min-h-[90px] ${
                          docTemplate === 'task'
                            ? 'border-rose-500 bg-rose-50/20 text-rose-950 font-bold'
                            : 'border-slate-100 hover:border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <FileText className="w-5 h-5 text-rose-600 mb-1" />
                        <span className="text-[10px] uppercase font-extrabold tracking-tight">Action Brief</span>
                      </button>
                    </div>
                  </div>

                  {/* Dynamic Dropdown Selectors */}
                  {docTemplate === 'syllabus' && (
                    <div className="space-y-1.5 focus-within:text-[#549B8C]">
                      <label className="text-[10.5px] font-bold uppercase text-slate-500">Pick Course Syllabus</label>
                      <select
                        value={selectedCourseId}
                        onChange={(e) => setSelectedCourseId(e.target.value)}
                        className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-[#549B8C] transition-all text-xs"
                      >
                        {courses.map(c => (
                          <option key={c.id} value={c.id}>{c.code} - {c.title}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {docTemplate === 'certificate' && (
                    <div className="space-y-1.5 focus-within:text-blue-600">
                      <label className="text-[10.5px] font-bold uppercase text-slate-500">Select Member to Certify</label>
                      <select
                        value={selectedMemberId}
                        onChange={(e) => setSelectedMemberId(e.target.value)}
                        className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 transition-all text-xs"
                      >
                        {members.filter(m => m.email.toLowerCase() !== 'setcadmin' && m.email.toLowerCase() !== 'setcadmin@safetycentre.org').map(m => (
                          <option key={m.id} value={m.id}>{m.name} ({m.position})</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {docTemplate === 'task' && (
                    <div className="space-y-1.5 focus-within:text-rose-600">
                      <label className="text-[10.5px] font-bold uppercase text-slate-500">Select Corrective Task Directive</label>
                      <select
                        value={selectedTaskId}
                        onChange={(e) => setSelectedTaskId(e.target.value)}
                        className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-rose-500 transition-all text-xs"
                      >
                        {tasks.map(t => (
                          <option key={t.id} value={t.id}>{t.title} ({t.assignedTo})</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Overrides and custom administrative notes */}
                  <div className="space-y-1.5 focus-within:text-slate-800">
                    <label className="text-[10.5px] font-bold uppercase text-slate-500">Custom Directives / Special Notes</label>
                    <textarea
                      value={customDocNotes}
                      onChange={(e) => setCustomDocNotes(e.target.value)}
                      placeholder={
                        docTemplate === 'syllabus' ? "e.g., Include practical simulator safety instructions or fire guidelines..." :
                        docTemplate === 'certificate' ? "e.g., Earned score: 100%. Approved for immediate site containment work..." :
                        "e.g., Mandate full hazard checklist inspection before starting repair..."
                      }
                      rows={3}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-slate-400 transition-all text-xs resize-none"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="button"
                    onClick={handleCreateGoogleDoc}
                    disabled={isDocGenerating}
                    className="w-full h-11 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-850/65 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                  >
                    <FilePlus className="w-4 h-4" />
                    {isDocGenerating ? 'Generating Google Doc...' : 'Compile Document to Google Docs'}
                  </button>

                  {isDocGenerating && docGenStatus && (
                    <div className="flex items-center gap-2 bg-blue-50 p-3 rounded-xl border border-blue-100 text-blue-850 animate-pulse">
                      <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="text-[10px] font-bold tracking-wide">{docGenStatus}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN: Docs listings */}
              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-6">
                <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider">HSE Compliance Documents Directory</h3>
                  </div>
                  <span className="text-[10px] font-extrabold bg-blue-50 text-blue-800 px-2 py-0.5 rounded-md">
                    Total: {driveFiles.filter(f => f.mimeType === 'application/vnd.google-apps.document').length}
                  </span>
                </div>

                <div className="space-y-4">
                  <p className="text-slate-600 text-xs leading-relaxed font-semibold">
                    The files listed below are official Google Docs created in your cloud storage. Open them to review styling, and add signatures or collaborative revisions.
                  </p>

                  <div className="space-y-3">
                    {isFilesLoading ? (
                      <div className="text-center py-10 space-y-2">
                        <RefreshCw className="w-5 h-5 animate-spin text-slate-450 mx-auto" strokeWidth={2.5} />
                        <p className="text-xs text-slate-450 font-bold italic">Polling reports directory...</p>
                      </div>
                    ) : driveFiles.filter(f => f.mimeType === 'application/vnd.google-apps.document').length === 0 ? (
                      <div className="bg-slate-50/50 p-12 border border-slate-150 border-dashed rounded-xl text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
                        <FileText className="w-7 h-7 text-slate-350" />
                        <p className="text-[11.5px] font-bold text-slate-800">No safety documents built in cloud directory yet.</p>
                        <p className="text-[9.5px] text-slate-400">Use the Left Form generator panel to construct your first report.</p>
                      </div>
                    ) : (
                      <div className="border border-slate-200/80 rounded-xl overflow-hidden divide-y divide-slate-100 shadow-3xs bg-white">
                        {driveFiles
                          .filter(f => f.mimeType === 'application/vnd.google-apps.document')
                          .map((f) => (
                            <div
                              key={f.id}
                              id={`gdoc-item-${f.id}`}
                              className="bg-white hover:bg-slate-50/30 p-3.5 flex items-center justify-between gap-4 text-xs group"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="p-2.5 bg-blue-50/50 text-blue-600 rounded-lg group-hover:bg-white border border-blue-100/50 shrink-0">
                                  <FileText className="w-4.5 h-4.5" />
                                </span>
                                <div className="min-w-0">
                                  <h5 className="font-extrabold text-slate-800 truncate leading-normal" title={f.name}>
                                    {f.name}
                                  </h5>
                                  <div className="flex items-center gap-2 mt-0.5 font-medium text-[10px] text-slate-400">
                                    <span>Google Doc file</span>
                                    <span>•</span>
                                    <span>Created: {(f.createdTime || '').split('T')[0] || 'Today'}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2.5 shrink-0">
                                <a
                                  href={f.webViewLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-3 py-1.5 bg-slate-50 hover:bg-white text-slate-700 hover:text-blue-600 border border-slate-200 rounded-lg flex items-center gap-1 font-extrabold text-[10px] transition-all cursor-pointer shadow-3xs"
                                >
                                  Open Google Doc
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteFile(f.id, f.name)}
                                  className="p-1.5 hover:bg-rose-50 border border-slate-100 hover:border-rose-100 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                                  title="Delete Document"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
