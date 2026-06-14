/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { AnimatePresence } from 'motion/react';
import { 
  Shield, 
  Clock, 
  Calendar, 
  Activity, 
  BookOpen, 
  AlertCircle, 
  Settings, 
  FileSpreadsheet, 
  Lock, 
  Users, 
  UserCheck,
  ChevronDown,
  Info,
  User,
  Cake,
  Bell,
  LogOut
} from 'lucide-react';

import { Course, CourseSession, Member, Task } from './types';
import { INITIAL_COURSES, INITIAL_SESSIONS } from './data';
import { formatDate } from './utils/date';
import DashboardStats from './components/DashboardStats';
import TimelineView from './components/TimelineView';
import CalendarView from './components/CalendarView';
import CourseDetailsDrawer from './components/CourseDetailsDrawer';
import MembershipInformation from './components/MembershipInformation';
import CourseList from './components/CourseList';
import ProfileView from './components/ProfileView';
import DashboardMonthBirthdays from './components/DashboardMonthBirthdays';
import LoginPage from './components/LoginPage';
// @ts-ignore
import logoImg from './assets/images/regenerated_image_1780583890425.jpg';

// Firebase imports
import { db, auth, logoutUser, OperationType, handleFirestoreError } from './utils/firebase';
import { collection, onSnapshot, setDoc, doc, deleteDoc, writeBatch } from 'firebase/firestore';

const DEFAULT_TASKS: Task[] = [];

export default function App() {
  const [courses, setCourses] = useState<Course[]>(INITIAL_COURSES);
  const [sessions, setSessions] = useState<CourseSession[]>(INITIAL_SESSIONS);
  const [members, setMembers] = useState<Member[]>([]);
  const [tasks, setTasks] = useState<Task[]>(DEFAULT_TASKS);

  const [activeTab, setActiveTab] = useState<'timeline' | 'memberships' | 'profile' | 'courses'>('timeline');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedSession, setSelectedSession] = useState<CourseSession | null>(null);

  // Real authentication & candidate state management
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    localStorage.removeItem('se_is_logged_in');
    return sessionStorage.getItem('se_is_logged_in') === 'true';
  });
  const [userEmail, setUserEmail] = useState<string>(() => {
    return localStorage.getItem('se_user_email') || '';
  });

  const handleLogin = async (email: string) => {
    setUserEmail(email);
    setIsLoggedIn(true);
    localStorage.setItem('se_user_email', email);
    localStorage.setItem('se_latest_login_email', email);
    sessionStorage.setItem('se_is_logged_in', 'true');
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.error("Firebase logout failed:", err);
    }
    setIsLoggedIn(false);
    sessionStorage.setItem('se_is_logged_in', 'false');
  };

  const [showProfileTab, setShowProfileTab] = useState<boolean>(() => {
    return localStorage.getItem('se_show_profile_tab') === 'true';
  });
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState<boolean>(false);
  const [showCompletedTasksMode, setShowCompletedTasksMode] = useState<boolean>(false);
  const [isLogoMenuOpen, setIsLogoMenuOpen] = useState<boolean>(false);
  const [liveTime, setLiveTime] = useState('');

  const [activeMonth, setActiveMonth] = useState<string>(() => {
    const saved = localStorage.getItem('se_active_month');
    if (saved) return saved;
    const now = new Date();
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June', 
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[now.getMonth()] || 'June';
  });

  const [activeYear, setActiveYear] = useState<number>(() => {
    const saved = localStorage.getItem('se_active_year');
    return saved ? parseInt(saved, 10) : new Date().getFullYear();
  });

  const [activeDay, setActiveDay] = useState<number | 'all'>(() => {
    const saved = localStorage.getItem('se_active_day');
    if (saved && saved !== 'all') {
      return parseInt(saved, 10);
    }
    return 'all';
  });

  // Observe Members collection in real-time (always active so that users can log in from other devices/refreshed page)
  useEffect(() => {
    const unsubscribeMembers = onSnapshot(collection(db, 'members'), (snapshot) => {
      const list: Member[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as Member);
      });

      if (snapshot.empty) {
        const defaultCreator: Member = {
          id: 'mem-creator',
          name: 'SETC Creator Admin',
          dob: '1985-05-15',
          position: 'Director (Level 4)',
          email: 'setcadmin',
          createdAt: new Date().toISOString(),
          authorizedLevel: 'level 4',
          phone: '+84 90 123 4567',
          password: 'abc123'
        };

        const defaultDeveloper: Member = {
          id: 'mem-developer',
          name: 'Vuong Le (Developer)',
          dob: '1995-10-08',
          position: 'Lead System Developer',
          email: 'vuongle0810@gmail.com',
          createdAt: new Date().toISOString(),
          authorizedLevel: 'level 4',
          phone: '+84 99 999 9999',
          password: 'admin'
        };

        setDoc(doc(db, "members", "setcadmin"), defaultCreator);
        setDoc(doc(db, "members", "vuongle0810@gmail.com"), defaultDeveloper);
      } else {
        const uniqueList: Member[] = [];
        const seenIds = new Set<string>();
        list.forEach((m) => {
          let uniqueId = m.id;
          if (!uniqueId) {
            uniqueId = `mem-fallback-${m.email.replace(/[@.]/g, '_')}`;
          }
          if (seenIds.has(uniqueId)) {
            uniqueId = `${uniqueId}-${m.email.replace(/[@.]/g, '_')}`;
          }
          let counter = 1;
          let candidateId = uniqueId;
          while (seenIds.has(candidateId)) {
            candidateId = `${uniqueId}-${counter}`;
            counter++;
          }
          seenIds.add(candidateId);
          uniqueList.push({ ...m, id: candidateId });
        });
        setMembers(uniqueList);
      }
    }, (error) => {
      console.error("Members real-time snapshot subscription failed:", error);
    });

    return () => {
      unsubscribeMembers();
    };
  }, []);

  // Observe other collections in real-time when logged in
  useEffect(() => {
    if (!isLoggedIn) return;

    const unsubscribeCourses = onSnapshot(collection(db, 'courses'), (snapshot) => {
      const list: Course[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as Course);
      });
      if (snapshot.empty) {
        INITIAL_COURSES.forEach((course) => {
          setDoc(doc(db, "courses", course.id), course).catch((err) => console.error(err));
        });
      } else {
        setCourses(list);
      }
    }, (error) => {
      console.error("Courses subscription failed:", error);
    });

    const unsubscribeSessions = onSnapshot(collection(db, 'sessions'), (snapshot) => {
      const list: CourseSession[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as CourseSession);
      });
      if (snapshot.empty) {
        INITIAL_SESSIONS.forEach((session) => {
          setDoc(doc(db, "sessions", session.id), session).catch((err) => console.error(err));
        });
      } else {
        setSessions(list);
      }
    }, (error) => {
      console.error("Sessions subscription failed:", error);
    });

    const unsubscribeTasks = onSnapshot(collection(db, 'tasks'), (snapshot) => {
      const list: Task[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as Task);
      });
      setTasks(list);
    }, (error) => {
      console.error("Tasks subscription failed:", error);
    });

    return () => {
      unsubscribeCourses();
      unsubscribeSessions();
      unsubscribeTasks();
    };
  }, [isLoggedIn]);

  // Save transient calendar navigation states to localStorage
  useEffect(() => {
    localStorage.setItem('se_active_month', activeMonth);
  }, [activeMonth]);

  useEffect(() => {
    localStorage.setItem('se_active_year', String(activeYear));
  }, [activeYear]);

  useEffect(() => {
    localStorage.setItem('se_active_day', String(activeDay));
  }, [activeDay]);

  useEffect(() => {
    localStorage.setItem('se_show_profile_tab', String(showProfileTab));
  }, [showProfileTab]);

  // Live timer simulation with real-time seconds ticking in dd/mm/yyyy - hh:mm:ss format

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      setLiveTime(`${day}/${month}/${year} - ${hours}:${minutes}:${seconds}`);
    };
    
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTab === 'profile') {
      setActiveTab('timeline');
    }
    
    // Automatically reset timetable filters to the current real-time date when user navigates page to page, component to component
    const now = new Date();
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June', 
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const currentMonthName = months[now.getMonth()] || 'June';
    const currentYear = now.getFullYear();
    const currentDay = now.getDate();
    
    setActiveMonth(currentMonthName);
    setActiveYear(currentYear);
    setActiveDay(currentDay);
  }, [activeTab, userEmail]);



  /*
  const dummyIgnoreActiveMember = currentMember || members[0];
  const activeMember = dummyIgnoreActiveMember;
      const memberId = activeMember?.id || '';
      const memberName = activeMember?.name || '';
      const rawDob = activeMember?.dob || '';
      const memberPos = activeMember?.position || '';
      const memberEmail = activeMember?.email || '';
      
      const formattedDob = formatDate(rawDob);

      const responsibilities = [
        "Training Curriculum Evaluation and Course Design coordination at SETC",
        "On-site Safety Evaluation certifications and interactive Task assignations",
        "Training Center Membership registration, approvals, and credential indexing",
        "Standard HSE incident prevention and Emergency Safety Drill coordination",
        "Resource, classroom, and calendar planning to minimize training scheduler collisions"
      ];
      
      newWindow.document.write(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Member Information - ${memberName}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
          <style>
            body {
              font-family: 'Inter', sans-serif;
              background-color: #f8fafc;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          </style>
        </head>
        <body class="p-4 md:p-6 text-slate-800 flex flex-col items-center justify-center min-h-screen">
          <div id="main-frame" class="w-full max-w-xl bg-white border border-slate-200/90 rounded-2xl p-6 md:p-8 shadow-md relative space-y-6">
            
            <!-- Absolute Action Box: "Update Profile" in top right corner -->
            <div class="absolute top-6 right-6 flex items-center gap-2">
              <button id="btn-toggle-edit" onclick="toggleEditMode()" class="px-3.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100/90 hover:text-emerald-800 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border border-emerald-200/40 shadow-2xs">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
                <span>Update</span>
              </button>
            </div>

            <!-- VIEW MODE CONTAINER -->
            <div id="view-pane" class="space-y-6">
              <!-- Header section with profile avatar -->
              <div class="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-slate-100 pr-20">
                <div class="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center font-extrabold text-xl relative border border-emerald-500/15 shrink-0 shadow-2xs overflow-hidden">
                  <img id="view-avatar-img" class="w-full h-full object-cover ${activeMember.avatar ? '' : 'hidden'}" src="${activeMember.avatar || ''}" alt="" />
                  <span id="view-avatar" class="${activeMember.avatar ? 'hidden' : ''}">${memberName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}</span>
                  <span class="absolute bottom-1 right-1 h-3 w-3 rounded-full bg-emerald-500 border border-white"></span>
                </div>
                
                <div class="text-center sm:text-left space-y-1">
                  <div class="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <h2 id="view-name" class="text-xl font-extrabold text-slate-900 tracking-tight">${memberName}</h2>
                    <span id="view-badge" class="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200 uppercase tracking-wider font-semibold">
                      ${memberPos}
                    </span>
                  </div>
                  <p class="text-xs text-slate-500 font-semibold tracking-wide">SETC Authorized Administrative Officer</p>
                </div>
              </div>

              <!-- Key details -->
              <div class="grid grid-cols-1 gap-4">
                <div class="bg-slate-50 rounded-xl p-4 border border-slate-100/80">
                  <span class="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block mb-1">Full Name</span>
                  <span id="view-full-name" class="text-xs font-bold text-slate-800">${memberName}</span>
                </div>

                <div class="bg-slate-50 rounded-xl p-4 border border-slate-100/80">
                  <span class="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block mb-1">Date of Birth</span>
                  <span id="view-dob" class="text-xs font-bold text-slate-800">${formattedDob}</span>
                </div>

                <div class="bg-slate-50 rounded-xl p-4 border border-slate-100/80">
                  <span class="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block mb-1">Registered Email</span>
                  <span id="view-email" class="text-xs font-mono font-bold text-slate-800">${memberEmail}</span>
                </div>
              </div>
            </div>

            <!-- EDIT MODE CONTAINER (Initially Hidden) -->
            <div id="edit-pane" class="hidden space-y-5">
              <div class="pb-4 border-b border-slate-100">
                <h2 class="text-base font-extrabold text-slate-900">Update Profile Details</h2>
                <p class="text-[11px] text-slate-550 mt-0.5 font-medium leading-normal">Directly update your credential records database below.</p>
              </div>

              <div class="space-y-4">
                <!-- Choose Avatar Portion -->
                <div>
                  <label class="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block mb-2">Profile Avatar Picture</label>
                  <div class="flex items-center gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200/60 shadow-2xs">
                    <div class="relative w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center font-extrabold text-sm border border-emerald-500/15 shrink-0 overflow-hidden shadow-2xs">
                      <img id="edit-avatar-preview" class="w-full h-full object-cover ${activeMember.avatar ? '' : 'hidden'}" src="${activeMember.avatar || ''}" alt="" />
                      <span id="edit-avatar-placeholder" class="${activeMember.avatar ? 'hidden' : ''}">
                        ${memberName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div class="space-y-1">
                      <label class="inline-block px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-2xs">
                        Choose Avatar Image
                        <input type="file" id="input-avatar-file" accept="image/*" class="hidden" onchange="previewAvatar(event)" />
                      </label>
                      <button type="button" id="btn-remove-avatar" onclick="deleteAvatar()" class="ml-2 inline-block px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer transition-colors ${activeMember.avatar ? '' : 'hidden'}">
                        Remove
                      </button>
                      <p class="text-[9px] text-slate-400 font-semibold">Supported: JPG, PNG, WEBP (Max 2MB)</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label class="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block mb-1">Full Name</label>
                  <input type="text" id="input-name" class="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 rounded-xl p-3 outline-none transition-all" value="${memberName.replace(/"/g, '&quot;')}" />
                </div>

                <div>
                  <label class="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block mb-1">Date of Birth</label>
                  <input type="date" id="input-dob" class="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 rounded-xl p-3 outline-none transition-all" value="${rawDob}" />
                </div>

                <div>
                  <label class="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block mb-1">Registered Email</label>
                  <input type="email" id="input-email" class="w-full text-xs font-mono font-semibold text-slate-800 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 rounded-xl p-3 outline-none transition-all" value="${memberEmail.replace(/"/g, '&quot;')}" />
                </div>

                <div>
                  <label class="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block mb-1">Position / Role</label>
                  <input type="text" id="input-position" class="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 rounded-xl p-3 outline-none transition-all" value="${memberPos.replace(/"/g, '&quot;')}" />
                </div>
              </div>

              <!-- Error Alert Slot -->
              <div id="edit-error" class="hidden p-3 bg-red-50 border border-red-200/50 rounded-xl text-xs text-red-750 font-bold"></div>

              <div class="flex items-center gap-3 pt-2">
                <button onclick="saveProfileChanges()" class="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs">
                  Save Changes
                </button>
                <button onclick="toggleEditMode()" class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer">
                  Cancel
                </button>
              </div>
            </div>

            <!-- Responsibilities (Read-Only) -->
            <div class="space-y-3">
              <h3 class="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">List of Authorized Responsibilities (Locked)</h3>
              <div class="bg-amber-50/40 border border-amber-200/40 rounded-xl p-4 space-y-2.5">
                ${responsibilities.map((resp) => `
                  <div class="flex items-start gap-3">
                    <span class="text-emerald-600 font-bold mt-0.5">•</span>
                    <p class="text-xs text-slate-650 font-semibold leading-relaxed">${resp}</p>
                  </div>
                `).join('')}
              </div>
            </div>
            
            <div id="action-buttons-view" class="text-center pt-3 flex items-center justify-center gap-3">
              <button onclick="window.print()" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs">
                Print Credentials
              </button>
              <button onclick="window.close()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer">
                Close
              </button>
            </div>
          </div>

          <script>
            let isEditing = false;
            const memberId = "${memberId}";
            let currentAvatarBase64 = "${activeMember.avatar || ''}";

            function previewAvatar(event) {
              const file = event.target.files[0];
              if (!file) return;

              if (file.size > 2 * 1024 * 1024) {
                alert("Image size should not exceed 2MB.");
                return;
              }

              const reader = new FileReader();
              reader.onload = function(e) {
                currentAvatarBase64 = e.target.result;
                
                const previewImg = document.getElementById('edit-avatar-preview');
                const placeholder = document.getElementById('edit-avatar-placeholder');
                const btnRemove = document.getElementById('btn-remove-avatar');

                previewImg.src = currentAvatarBase64;
                previewImg.classList.remove('hidden');
                placeholder.classList.add('hidden');
                btnRemove.classList.remove('hidden');
              };
              reader.readAsDataURL(file);
            }

            function deleteAvatar() {
              currentAvatarBase64 = '';
              const previewImg = document.getElementById('edit-avatar-preview');
              const placeholder = document.getElementById('edit-avatar-placeholder');
              const btnRemove = document.getElementById('btn-remove-avatar');

              previewImg.src = '';
              previewImg.classList.add('hidden');
              placeholder.classList.remove('hidden');
              btnRemove.classList.add('hidden');
            }

            function toggleEditMode() {
              isEditing = !isEditing;
              const viewPane = document.getElementById('view-pane');
              const editPane = document.getElementById('edit-pane');
              const btnToggle = document.getElementById('btn-toggle-edit');
              const actionButtonsView = document.getElementById('action-buttons-view');
              const errorAlert = document.getElementById('edit-error');

              if (isEditing) {
                viewPane.classList.add('hidden');
                editPane.classList.remove('hidden');
                btnToggle.classList.add('hidden');
                if (actionButtonsView) actionButtonsView.classList.add('hidden');
              } else {
                viewPane.classList.remove('hidden');
                editPane.classList.add('hidden');
                btnToggle.classList.remove('hidden');
                if (actionButtonsView) actionButtonsView.classList.remove('hidden');
                if (errorAlert) errorAlert.classList.add('hidden');
              }
            }

            function saveProfileChanges() {
              const name = document.getElementById('input-name').value.trim();
              const dob = document.getElementById('input-dob').value.trim();
              const email = document.getElementById('input-email').value.trim();
              const position = document.getElementById('input-position').value.trim();
              const errorAlert = document.getElementById('edit-error');

              if (!name || !dob || !email || !position) {
                errorAlert.textContent = "All profile fields are strictly required.";
                errorAlert.classList.remove('hidden');
                return;
              }

              if (!email.includes('@') || email.length < 5) {
                errorAlert.textContent = "Please enter a valid email address.";
                errorAlert.classList.remove('hidden');
                return;
              }

              errorAlert.classList.add('hidden');

              // Dispatch updating callback to the parent window
              if (window.opener && window.opener.onProfileUpdate) {
                window.opener.onProfileUpdate(memberId, { name, dob, email, position, avatar: currentAvatarBase64 });
              }

              // Update the actual visual items directly inside popup in real-time
              document.getElementById('view-name').textContent = name;
              document.getElementById('view-full-name').textContent = name;
              document.getElementById('view-badge').textContent = position;
              document.getElementById('view-email').textContent = email;

              const viewImg = document.getElementById('view-avatar-img');
              const viewTxt = document.getElementById('view-avatar');
              if (currentAvatarBase64) {
                viewImg.src = currentAvatarBase64;
                viewImg.classList.remove('hidden');
                viewTxt.classList.add('hidden');
              } else {
                viewImg.src = '';
                viewImg.classList.add('hidden');
                viewTxt.textContent = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                viewTxt.classList.remove('hidden');
              }

              // Format date of birth to dd/mm/yyyy in view-pane
              const dateParts = dob.split('-');
              if (dateParts.length === 3) {
                document.getElementById('view-dob').textContent = dateParts[2] + '/' + dateParts[1] + '/' + dateParts[0];
              } else {
                document.getElementById('view-dob').textContent = dob;
              }

              // Flash a fast status update banner
              const feedback = document.createElement('div');
              feedback.className = "p-3.5 bg-emerald-50 border border-emerald-200/50 rounded-xl text-xs text-emerald-800 font-extrabold text-center mb-3 transition-all";
              feedback.textContent = "✓ Member State synced successfully";
              document.getElementById('view-pane').insertBefore(feedback, document.getElementById('view-pane').firstChild);
              
              setTimeout(() => {
                feedback.remove();
              }, 2500);

              toggleEditMode();
            }
          </script>
        </body>
        </html>
      `);
      newWindow.document.close();
    }
  };
  */

  // Register internal onProfileUpdate handler to sync changes made inside the popup view and persist them to Google Firebase
  useEffect(() => {
    (window as any).onProfileUpdate = async (id: string, updatedData: { name: string; dob: string; email: string; position: string; avatar?: string }) => {
      const matchingMember = members.find(m => m.id === id);
      if (matchingMember) {
        const updatedMember: Member = {
          ...matchingMember,
          name: updatedData.name,
          dob: updatedData.dob,
          email: updatedData.email,
          position: updatedData.position,
          avatar: updatedData.avatar
        };
        await handleUpdateMember(updatedMember);
      }

      setUserEmail(prev => {
        const matchingMember = members.find(m => m.id === id);
        if (matchingMember && matchingMember.email.toLowerCase() === prev.toLowerCase()) {
          return updatedData.email;
        }
        return prev;
      });
    };

    return () => {
      delete (window as any).onProfileUpdate;
    };
  }, [members]);
    // Set selected course/session for drawer view
  const handleSelectCourse = (course: Course, session: CourseSession) => {
    setSelectedCourse(course);
    setSelectedSession(session);
  };

  // Handle student enrollment registration
  const handleEnroll = async (sessionId: string, studentName: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;
    const nextEnrolled = [...session.enrolledIds, `student-${Date.now()}`];
    const updated = { ...session, enrolledIds: nextEnrolled };
    try {
      await setDoc(doc(db, "sessions", sessionId), updated);
      if (selectedSession && selectedSession.id === sessionId) {
        setSelectedSession(updated);
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `sessions/${sessionId}`);
    }
  };

  // Add virtual session from AdminPanel
  const handleAddSession = async (newSess: CourseSession) => {
    try {
      await setDoc(doc(db, "sessions", newSess.id), newSess);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `sessions/${newSess.id}`);
    }

    // Update parent's course domain with the chosen value if provided
    if (newSess.domain) {
      const course = courses.find(c => c.id === newSess.courseId);
      if (course) {
        await handleUpdateCourse({ ...course, domain: newSess.domain });
      }
    }

    // Automatically assign Tasks as system notifications to the assigned Member(s)
    const course = courses.find(c => c.id === newSess.courseId);
    const courseCode = course ? course.code : 'HSE';
    const courseTitle = course ? course.title : 'Course Session';

    const newTasks: Task[] = [];
    const timestamp = Date.now();
    const activeMember = members.find(m => m.email.toLowerCase() === userEmail.toLowerCase());
    const assignerName = activeMember ? activeMember.name : (userEmail === 'setcadmin' ? 'SETC Creator Admin' : userEmail.split('@')[0]);

    // 1. Notification/Task for Instructor
    const instructorName = newSess.instructor.includes(' (')
      ? newSess.instructor.split(' (')[0]
      : newSess.instructor;
    
    const instMember = members.find(m => m.name.trim().toLowerCase() === instructorName.trim().toLowerCase());
    if (instMember) {
      newTasks.push({
        id: `task-session-inst-${timestamp}`,
        assignedBy: assignerName,
        assignedTo: instMember.email,
        title: `Teach Course: ${courseCode} - ${courseTitle}`,
        description: `You have been assigned to teach standard course "${courseTitle}" in classroom "${newSess.classroom}" from ${newSess.startDate} to ${newSess.endDate} (${newSess.startTime} - ${newSess.endTime}). Notes: ${newSess.notes || 'None'}`,
        dueDate: newSess.startDate,
        status: 'Pending',
        createdAt: new Date().toISOString(),
        sessionId: newSess.id,
        courseName: courseTitle,
        assignedRole: 'Instructor',
        startDate: newSess.startDate,
        endDate: newSess.endDate,
        startTime: newSess.startTime,
        endTime: newSess.endTime,
        taOfficer: newSess.taOfficer || 'None Assigned',
        tgOfficer: newSess.tgOfficer,
        method: newSess.method,
        instructor: newSess.instructor
      });
    }

    // 2. Notification/Task for TA
    if (newSess.taOfficer) {
      const taList = newSess.taOfficer.split(/[,;]+/).map(t => t.trim()).filter(Boolean);
      taList.forEach((taName, index) => {
        const taMember = members.find(m => m.name.trim().toLowerCase() === taName.toLowerCase());
        if (taMember) {
          newTasks.push({
            id: `task-session-ta-${timestamp}-${index}`,
            assignedBy: assignerName,
            assignedTo: taMember.email,
            title: `TA Duty: ${courseCode} - ${courseTitle}`,
            description: `You have been assigned as Teaching Assistant (TA) for course "${courseTitle}" in classroom "${newSess.classroom}" from ${newSess.startDate} to ${newSess.endDate} (${newSess.startTime} - ${newSess.endTime}). Notes: ${newSess.notes || 'None'}`,
            dueDate: newSess.startDate,
            status: 'Pending',
            createdAt: new Date().toISOString(),
            sessionId: newSess.id,
            courseName: courseTitle,
            assignedRole: 'TA',
            startDate: newSess.startDate,
            endDate: newSess.endDate,
            startTime: newSess.startTime,
            endTime: newSess.endTime,
            taOfficer: newSess.taOfficer || 'None Assigned',
            tgOfficer: newSess.tgOfficer,
            method: newSess.method,
            instructor: newSess.instructor
          });
        }
      });
    }

    // 3. Notification/Task for TG
    if (newSess.tgOfficer) {
      const tgMember = members.find(m => m.name.trim().toLowerCase() === newSess.tgOfficer!.trim().toLowerCase());
      if (tgMember) {
        newTasks.push({
          id: `task-session-tg-${timestamp}`,
          assignedBy: assignerName,
          assignedTo: tgMember.email,
          title: `TG Duty: ${courseCode} - ${courseTitle}`,
          description: `You have been assigned as Teacher Assistant (TG) for course "${courseTitle}" in classroom "${newSess.classroom}" from ${newSess.startDate} to ${newSess.endDate} (${newSess.startTime} - ${newSess.endTime}). Notes: ${newSess.notes || 'None'}`,
          dueDate: newSess.startDate,
          status: 'Pending',
          createdAt: new Date().toISOString(),
          sessionId: newSess.id,
          courseName: courseTitle,
          assignedRole: 'TG',
          startDate: newSess.startDate,
          endDate: newSess.endDate,
          startTime: newSess.startTime,
          endTime: newSess.endTime,
          taOfficer: newSess.taOfficer || 'None Assigned',
          tgOfficer: newSess.tgOfficer,
          method: newSess.method,
          instructor: newSess.instructor
        });
      }
    }

    for (const task of newTasks) {
      try {
        await setDoc(doc(db, "tasks", task.id), task);
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `tasks/${task.id}`);
      }
    }
  };

  // Remove virtual session
  const handleRemoveSession = async (sessionId: string) => {
    try {
      await deleteDoc(doc(db, "sessions", sessionId));
      const associatedTasks = tasks.filter(t => t.sessionId === sessionId);
      for (const t of associatedTasks) {
        await deleteDoc(doc(db, "tasks", t.id));
      }
      if (selectedSession?.id === sessionId) {
        setSelectedCourse(null);
        setSelectedSession(null);
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `sessions/${sessionId}`);
    }
  };

  // Update virtual session
  const handleUpdateSession = async (updatedSess: CourseSession) => {
    try {
      await setDoc(doc(db, "sessions", updatedSess.id), updatedSess);
      if (selectedSession?.id === updatedSess.id) {
        setSelectedSession(updatedSess);
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `sessions/${updatedSess.id}`);
    }
  };

  // Add member to registry
  const handleAddMember = async (newMemData: Omit<Member, 'id' | 'createdAt'>) => {
    const emailKey = newMemData.email.trim().toLowerCase();
    const newMember: Member = {
      ...newMemData,
      id: `mem-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    try {
      await setDoc(doc(db, "members", emailKey), newMember);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `members/${emailKey}`);
    }
  };

  // Remove member from registry (cannot remove default administrator accounts by any means)
  const handleRemoveMember = async (id: string) => {
    const member = members.find(m => m.id === id);
    if (!member) return;

    const isUndeletable = member.id === 'mem-creator' || 
                         member.email.toLowerCase() === 'setcadmin' || 
                         member.email.toLowerCase() === 'setcadmin@safetycentre.org';
    if (isUndeletable) return;

    const emailKey = member.email.trim().toLowerCase();
    try {
      await deleteDoc(doc(db, "members", emailKey));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `members/${emailKey}`);
    }
  };

  // Update member in registry
  const handleUpdateMember = async (updatedMember: Member) => {
    const oldMember = members.find(m => m.id === updatedMember.id);
    const oldEmailKey = oldMember ? oldMember.email.trim().toLowerCase() : '';
    const emailKey = updatedMember.email.trim().toLowerCase();
    try {
      if (oldEmailKey && oldEmailKey !== emailKey) {
        await deleteDoc(doc(db, "members", oldEmailKey));
      }
      await setDoc(doc(db, "members", emailKey), updatedMember);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `members/${emailKey}`);
    }
  };

  // Course management handlers
  const handleAddCourse = async (newCourse: Course) => {
    try {
      await setDoc(doc(db, "courses", newCourse.id), newCourse);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `courses/${newCourse.id}`);
    }
  };

  const handleUpdateCourse = async (updatedCourse: Course) => {
    try {
      await setDoc(doc(db, "courses", updatedCourse.id), updatedCourse);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `courses/${updatedCourse.id}`);
    }
  };

  const handleRemoveCourse = async (id: string) => {
    try {
      await deleteDoc(doc(db, "courses", id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `courses/${id}`);
    }
  };

  const handleToggleTaskStatus = async (task: Task) => {
    const nextStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
    const updated = { ...task, status: nextStatus };
    try {
      await setDoc(doc(db, "tasks", task.id), updated);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `tasks/${task.id}`);
    }
  };

  const currentMember = members.find(m => m.email.toLowerCase() === userEmail.toLowerCase());
  const officerName = currentMember ? currentMember.name : (userEmail === 'setcadmin' ? 'SETC Creator Admin' : userEmail.split('@')[0]);

  // Find real-time today elements for notifications
  const realToday = new Date();
  const realTodayYear = realToday.getFullYear();
  const realTodayMonth = String(realToday.getMonth() + 1).padStart(2, '0');
  const realTodayDay = String(realToday.getDate()).padStart(2, '0');
  const realTodayStr = `${realTodayYear}-${realTodayMonth}-${realTodayDay}`;

  const getTaskCourseDetails = (task: Task) => {
    const courseName = task.courseName || task.title;
    
    let assignedRole = task.assignedRole || 'Specialist';
    if (!task.assignedRole) {
      if (task.title.toLowerCase().includes('teach') || task.title.toLowerCase().includes('instructor')) {
        assignedRole = 'Instructor';
      } else if (task.title.toLowerCase().includes('ta') || task.title.toLowerCase().includes('assistant')) {
        assignedRole = 'TA';
      }
    }
    
    const startDate = task.startDate || task.dueDate || realTodayStr;
    const endDate = task.endDate || task.dueDate || realTodayStr;
    const startTime = task.startTime || '09:00';
    const endTime = task.endTime || '17:00';
    const taOfficer = task.taOfficer || 'None Assigned';
    const instructor = task.instructor || task.assignedBy || 'Staff';

    return {
      courseName,
      assignedRole,
      startDate,
      endDate,
      startTime,
      endTime,
      taOfficer,
      instructor
    };
  };

  const todaySessions = sessions.filter(s => 
    s.startDate <= realTodayStr && 
    s.endDate >= realTodayStr &&
    (s.instructor.toLowerCase().includes(officerName.toLowerCase()) || 
     (s.taOfficer && s.taOfficer.toLowerCase().includes(officerName.toLowerCase())) ||
     (s.tgOfficer && s.tgOfficer.toLowerCase().includes(officerName.toLowerCase())))
  );

  const inDeadlineTasks = tasks.filter(t => 
    t.assignedTo.toLowerCase() === userEmail.toLowerCase() && 
    t.status !== 'Completed'
  );

  const totalNotificationsActive = inDeadlineTasks.length;

  if (!isLoggedIn) {
    return (
      <LoginPage 
        onLogin={handleLogin} 
        members={members} 
        logoSrc={logoImg} 
      />
    );
  }

  return (
    <div id="app-root-layout" className="min-h-screen bg-slate-50/70 font-sans text-slate-800 antialiased flex flex-col">
      {/* Premium Eco-Green Header bar with pristine shadows & minimal details */}
      <header className="bg-[#549B8C] border-b border-emerald-650/15 shrink-0 sticky top-0 z-40 shadow-[0_2px_12px_rgba(4,120,87,0.08)] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center">
            {/* Elegant Static Logo & Branding Area */}
            <div className="flex items-center gap-3.5 p-1 rounded-2xl select-none">
              {/* Petrovietnam PV College Logo Container */}
              <div className="relative shrink-0 w-14 h-14 bg-white border border-emerald-250/20 rounded-xl overflow-hidden p-1 flex items-center justify-center shadow-xs">
                <img 
                  src={logoImg} 
                  alt="Petrovietnam PV College Logo" 
                  referrerPolicy="no-referrer"
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const fallback = document.getElementById('svg-logo-fallback');
                    if (fallback) fallback.classList.remove('hidden');
                  }}
                />
                <div className="hidden w-full h-full flex flex-col items-center justify-center" id="svg-logo-fallback">
                  <svg viewBox="0 0 120 120" className="w-12 h-12">
                    {/* Styled Green Leaves of Petrovietnam Logo */}
                    <path d="M48,70 C48,55 38,40 46,30 C51,40 53,52 51,70 Z" fill="#16a34a" />
                    <path d="M55,70 C57,45 44,25 60,12 C64,28 67,48 59,70 Z" fill="#15803d" />
                    {/* Brand Text labels fully configured in green brand tones */}
                    <text x="60" y="85" textAnchor="middle" fontSize="9" fontWeight="810" fill="#15803d" fontFamily="sans-serif" letterSpacing="0.2">PETROVIETNAM</text>
                    <text x="60" y="100" textAnchor="middle" fontSize="8" fontWeight="810" fill="#16a34a" fontFamily="sans-serif" letterSpacing="0.2">PV COLLEGE</text>
                  </svg>
                </div>
              </div>
              <div>
                <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-white leading-normal">
                  Petrovietnam - Safety & Environment Training Centre
                </h1>
                <p className="text-xs text-emerald-100 font-semibold flex items-center gap-1.5 mt-0.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse"></span>
                  <span className="font-bold text-emerald-50 tracking-wide">
                    {activeTab === 'timeline' ? 'Dashboard' : 'General Information'}
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:items-end text-xs font-medium text-emerald-100 space-y-1">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-xs border border-white/20 px-3 py-1.5 rounded-lg shadow-3xs text-white">
              <span className="font-mono text-white font-bold">{liveTime || '04/06/2026 - Loading...'}</span>
            </div>
            <div className="flex items-center gap-2 mt-1 select-none text-slate-800">
              {/* Notification Box (Bell logo only) at the left side */}
              <div id="notification-bell-container" className="relative">
                <button
                  type="button"
                  id="notification-bell-btn"
                  onClick={() => setIsNotificationDropdownOpen(!isNotificationDropdownOpen)}
                  className={`h-9 w-9 rounded-xl border flex items-center justify-center relative cursor-pointer transition-all duration-150 shadow-[0_1px_2px_rgba(0,0,0,0.02)] ${
                    isNotificationDropdownOpen
                      ? 'bg-white border-white text-[#549B8C]'
                      : 'bg-white/10 hover:bg-white/15 border-white/20 hover:border-white/30 text-white'
                  }`}
                  title="HSE Notifications"
                >
                  <Bell className="h-4.5 w-4.5" />
                  {totalNotificationsActive > 0 && (
                    <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-orange-500 ring-2 ring-[#549B8C]"></span>
                  )}
                </button>

                {isNotificationDropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-45 cursor-default" 
                      onClick={() => setIsNotificationDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-80 rounded-xl bg-white border border-slate-200 shadow-xl z-50 overflow-hidden divide-y divide-slate-100 py-1 animate-in fade-in slide-in-from-top-1 duration-150">
                      <div className="px-3.5 py-2.5 bg-slate-50/55 flex flex-col gap-1.5 border-b border-slate-100">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
                            {showCompletedTasksMode ? 'Completed Tasks' : 'Your Tasks'}
                          </span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            showCompletedTasksMode ? 'bg-emerald-100 text-emerald-950 font-bold' : 'bg-purple-100 text-purple-950'
                          }`}>
                            {showCompletedTasksMode 
                              ? `${tasks.filter(t => t.assignedTo.toLowerCase() === userEmail.toLowerCase() && t.status === 'Completed').length} Solved`
                              : `${inDeadlineTasks.length} Active`
                            }
                          </span>
                        </div>
                        <div className="flex justify-between items-center pt-0.5">
                          <button
                            type="button"
                            onClick={() => setShowCompletedTasksMode(!showCompletedTasksMode)}
                            className="text-[10px] font-bold text-[#559b8c] hover:text-[#3f766a] hover:underline cursor-pointer transition-colors"
                          >
                            {showCompletedTasksMode ? 'View active tasks' : 'View completed tasks'}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (showCompletedTasksMode) {
                                const completedTasks = tasks.filter(t => t.assignedTo.toLowerCase() === userEmail.toLowerCase() && t.status === 'Completed');
                                completedTasks.forEach(async (t) => {
                                  try {
                                    await deleteDoc(doc(db, "tasks", t.id));
                                  } catch (err) {
                                    console.error("Failed to delete completed task:", err);
                                  }
                                });
                              } else {
                                inDeadlineTasks.forEach(async (t) => {
                                  try {
                                    await deleteDoc(doc(db, "tasks", t.id));
                                  } catch (err) {
                                    console.error("Failed to delete active task:", err);
                                  }
                                });
                              }
                            }}
                            className="text-[10px] font-black text-rose-600 hover:text-rose-800 hover:underline cursor-pointer transition-colors"
                          >
                            Delete all
                          </button>
                        </div>
                      </div>
                      <div className="p-3 bg-white space-y-2.5 max-h-96 overflow-y-auto scrollbar-thin">
                        {showCompletedTasksMode ? (
                          tasks.filter(t => t.assignedTo.toLowerCase() === userEmail.toLowerCase() && t.status === 'Completed').length === 0 ? (
                            <div id="no-notifications" className="text-center py-5 text-xs text-slate-400 font-semibold italic">
                              No completed tasks
                            </div>
                          ) : (
                            tasks.filter(t => t.assignedTo.toLowerCase() === userEmail.toLowerCase() && t.status === 'Completed').map((task) => {
                              const details = getTaskCourseDetails(task);
                              const isFinished = details.endDate < realTodayStr;
                              const isUpcoming = details.startDate > realTodayStr;
                              const isOngoing = details.startDate <= realTodayStr && details.endDate >= realTodayStr;

                              const badgeText = isUpcoming 
                                ? "Upcoming Task" 
                                : isOngoing 
                                  ? "On-going Task" 
                                  : "Completed Task";

                              const badgeColor = isUpcoming
                                ? "text-amber-800 bg-amber-100"
                                : isOngoing
                                  ? "text-blue-800 bg-blue-100"
                                  : "text-emerald-800 bg-emerald-100";

                              return (
                                <div 
                                  key={task.id} 
                                  id={`notification-task-${task.id}`}
                                  className="bg-emerald-50/40 border border-emerald-250 rounded-xl p-3 text-[11px] leading-normal text-emerald-950 shadow-3xs space-y-1.5"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className={`text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-md text-nowrap select-none ${badgeColor}`}>
                                      {badgeText}
                                    </span>
                                    <span className="text-[9px] font-bold bg-emerald-100/65 text-emerald-900 px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                                      {task.status}
                                    </span>
                                  </div>
                                  
                                  <div>
                                    <span className="font-extrabold text-emerald-950">Task Name:</span>{" "}
                                    <span className="text-slate-900 font-bold">"{details.courseName}"</span>
                                  </div>
                                  <div>
                                    <span className="font-extrabold text-emerald-950">Assigned Role:</span>{" "}
                                    <span className="text-slate-800 font-semibold">"{details.assignedRole}"</span>
                                  </div>
                                  <div>
                                    <span className="font-extrabold text-emerald-950">Time and Date:</span>{" "}
                                    <span className="text-slate-800 font-mono font-bold">
                                      "{details.startTime} - {details.endTime} ({formatDate(details.startDate)} to {formatDate(details.endDate)})"
                                    </span>
                                  </div>
                                  <div>
                                    <span className="font-extrabold text-emerald-950">Name of TA/TG:</span>{" "}
                                    <span className="text-slate-800 font-semibold">"{details.taOfficer}"</span>
                                  </div>
                                  <div>
                                    <span className="font-extrabold text-emerald-950">Name of Instructor:</span>{" "}
                                    <span className="text-slate-800 font-semibold">"{details.instructor}"</span>
                                  </div>

                                  <div className="pt-2 border-t border-emerald-100/90 flex items-center justify-between">
                                    <label className={`inline-flex items-center gap-1.5 cursor-pointer text-[10.5px] font-bold select-none ${
                                      !isFinished ? 'text-slate-400 cursor-not-allowed' : 'text-emerald-850'
                                    }`}>
                                      <input 
                                        type="checkbox"
                                        disabled={!isFinished}
                                        checked={task.status === 'Completed'}
                                        onChange={() => {
                                          if (isFinished) {
                                            handleToggleTaskStatus(task);
                                          }
                                        }}
                                        className="rounded border-slate-300 h-3.5 w-3.5 cursor-pointer disabled:cursor-not-allowed text-emerald-600 focus:ring-emerald-400 accent-emerald-600"
                                      />
                                      <span>Complete {!isFinished && <span className="text-[9px] font-medium text-amber-600">(Task not finished)</span>}</span>
                                    </label>
                                  </div>
                                </div>
                              );
                            })
                          )
                        ) : (
                          inDeadlineTasks.length === 0 ? (
                            <div id="no-notifications" className="text-center py-5 text-xs text-slate-400 font-semibold italic">
                              No active tasks
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {inDeadlineTasks.map((task) => {
                                const details = getTaskCourseDetails(task);
                                const isFinished = details.endDate < realTodayStr;
                                const isUpcoming = details.startDate > realTodayStr;
                                const isOngoing = details.startDate <= realTodayStr && details.endDate >= realTodayStr;

                                const badgeText = isUpcoming 
                                  ? "Upcoming Task" 
                                  : isOngoing 
                                    ? "On-going Task" 
                                    : "Active Task";

                                const badgeColor = isUpcoming
                                  ? "text-amber-800 bg-amber-100"
                                  : isOngoing
                                    ? "text-blue-800 bg-blue-100"
                                    : "text-slate-800 bg-slate-100";

                                return (
                                  <div 
                                    key={task.id} 
                                    id={`notification-task-${task.id}`}
                                    className={`border rounded-xl p-3 text-[11px] leading-normal shadow-3xs space-y-1.5 ${
                                      isUpcoming
                                        ? "bg-amber-50/40 border-amber-200 text-amber-950"
                                        : isOngoing
                                          ? "bg-blue-50/45 border-blue-200 text-blue-950"
                                          : "bg-sky-50 border border-sky-200 text-sky-950"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className={`text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-md text-nowrap select-none ${badgeColor}`}>
                                        {badgeText}
                                      </span>
                                      <span className="text-[9px] font-bold bg-white/75 border border-slate-200 text-slate-800 px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                                        {task.status}
                                      </span>
                                    </div>
                                    
                                    <div>
                                      <span className="font-extrabold text-slate-755">Task Name:</span>{" "}
                                      <span className="text-slate-900 font-bold">"{details.courseName}"</span>
                                    </div>
                                    <div>
                                      <span className="font-extrabold text-slate-755">Assigned Role:</span>{" "}
                                      <span className="text-slate-800 font-semibold">"{details.assignedRole}"</span>
                                    </div>
                                    <div>
                                      <span className="font-extrabold text-slate-755">Time and Date:</span>{" "}
                                      <span className="text-slate-850 font-mono font-bold">
                                        "{details.startTime} - {details.endTime} ({formatDate(details.startDate)} to {formatDate(details.endDate)})"
                                      </span>
                                    </div>
                                    <div>
                                      <span className="font-extrabold text-slate-755">Name of TA/TG:</span>{" "}
                                      <span className="text-slate-800 font-semibold">"{details.taOfficer}"</span>
                                    </div>
                                    <div>
                                      <span className="font-extrabold text-slate-755">Name of Instructor:</span>{" "}
                                      <span className="text-slate-800 font-semibold">"{details.instructor}"</span>
                                    </div>

                                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                                      <label className={`inline-flex items-center gap-1.5 cursor-pointer text-[10.5px] font-bold select-none ${
                                        !isFinished ? 'text-slate-400 cursor-not-allowed' : 'text-slate-800'
                                      }`}>
                                        <input 
                                          type="checkbox"
                                          disabled={!isFinished}
                                          checked={task.status === 'Completed'}
                                          onChange={() => {
                                            if (isFinished) {
                                              handleToggleTaskStatus(task);
                                            }
                                          }}
                                          className="rounded border-slate-300 h-3.5 w-3.5 cursor-pointer disabled:cursor-not-allowed text-sky-600 focus:ring-sky-400 accent-sky-600"
                                        />
                                        <span>Complete {!isFinished && <span className="text-[9px] font-medium text-amber-600">(Course not finished)</span>}</span>
                                      </label>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Le Minh Vuong - HSE Instructor Profile Box */}
              <div id="profile-container" className="select-none animate-in flex items-center gap-2">
                <div 
                  className="flex items-center gap-2.5 bg-white/15 border border-white/20 h-9 px-3.5 rounded-xl text-left shadow-[0_1px_2px_rgba(0,0,0,0.02)] text-white"
                >
                  <div className="w-6 h-6 rounded-full bg-white text-[#549B8C] font-extrabold text-[10px] flex items-center justify-center shadow-2xs overflow-hidden shrink-0">
                    {currentMember?.avatar ? (
                      <img src={currentMember.avatar} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                    ) : (
                      officerName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="flex flex-col leading-tight">
                    <div className="text-white font-extrabold text-xs flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
                      <span>{officerName}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center justify-center bg-white/10 hover:bg-rose-600 border border-white/20 hover:border-rose-500 h-9 w-9 rounded-xl transition-all text-white cursor-pointer select-none shrink-0"
                  title="Sign Out of Safety Portal"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container Workspace */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full space-y-6">
        {/* Integrated Module Box-Selection */}
        <div id="module-selector-box" className="bg-white border border-slate-200 rounded-xl p-2 px-4 shadow-[0_1px_4px_rgba(0,0,0,0.01)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-0.5">
            <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest font-mono">Section</h3>
          </div>
          <div className="relative w-full sm:w-64 shrink-0">
            <select
              id="app-component-select"
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as any)}
              className="w-full text-xs font-bold text-slate-800 bg-slate-50 hover:bg-slate-100/70 border border-slate-200/90 rounded-lg px-3 py-1.5 pr-8 cursor-pointer outline-none transition-all appearance-none shadow-3xs"
            >
              <option value="timeline">📊 Dashboard</option>
              <option value="memberships">👥 General Information</option>
            </select>
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
          </div>
        </div>

        {/* Tab content renderer router */}
        <div id="tab-content-portal" className="transition-all duration-300">
          {activeTab === 'timeline' && (
            <div className="space-y-6">
              <DashboardStats 
                courses={courses} 
                sessions={sessions} 
                activeMonth={activeMonth}
                setActiveMonth={(m) => {
                  setActiveMonth(m);
                  setActiveDay('all');
                }}
                activeDay={activeDay}
                setActiveDay={setActiveDay}
                activeYear={activeYear}
                setActiveYear={setActiveYear}
                members={members}
                tasks={tasks}
                setTasks={setTasks}
                currentUserEmail={userEmail}
              />
              <TimelineView 
                courses={courses} 
                sessions={sessions} 
                onSelectCourse={handleSelectCourse} 
                onAddSession={handleAddSession}
                onRemoveSession={handleRemoveSession}
                onUpdateSession={handleUpdateSession}
                currentUserEmail={userEmail}
                members={members}
              />
              <CalendarView 
                courses={courses} 
                sessions={sessions} 
                onSelectCourse={handleSelectCourse} 
                activeMonth={activeMonth}
                activeDay={activeDay}
                activeYear={activeYear}
                setActiveMonth={(m) => {
                  setActiveMonth(m);
                  setActiveDay('all');
                }}
                setActiveYear={setActiveYear}
              />
            </div>
          )}

          {activeTab === 'memberships' && (
            <MembershipInformation 
              members={members}
              onAddMember={handleAddMember}
              onRemoveMember={handleRemoveMember}
              onUpdateMember={handleUpdateMember}
              onSetMembers={setMembers}
              currentUserEmail={userEmail}
              authorizedEmail="setcadmin"
              referenceDateStr={`${activeYear}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`}
              courses={courses}
              onAddCourse={handleAddCourse}
              onUpdateCourse={handleUpdateCourse}
              onRemoveCourse={handleRemoveCourse}
            />
          )}


        </div>
      </main>

      {/* Slide drawer details inspector */}
      <AnimatePresence>
        {selectedCourse && selectedSession && (
          <CourseDetailsDrawer
            course={selectedCourse}
            session={selectedSession}
            onClose={() => {
              setSelectedCourse(null);
              setSelectedSession(null);
            }}
            onEnroll={handleEnroll}
            userEmail={userEmail}
          />
        )}
      </AnimatePresence>



      {/* Professional subtle footer line */}
      <footer className="bg-[#549B8C] text-white py-4 border-t border-emerald-650/15 text-[11px] text-center shrink-0 animate-in fade-in duration-100">
        <p className="font-semibold opacity-90">@{new Date().getFullYear()} Safety & Environment Training Centre</p>
      </footer>
    </div>
  );
}
