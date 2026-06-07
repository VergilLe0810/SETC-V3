import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Member, Course } from '../types';
import { formatDate } from '../utils/date';
import { CLASSROOMS } from '../data';
import CourseList from './CourseList';
import { 
  Users, 
  UserPlus, 
  Lock, 
  Trash2, 
  Search, 
  Sparkles, 
  UserCheck, 
  Calendar, 
  Briefcase, 
  Mail, 
  Phone,
  Shield,
  X,
  Pencil,
  AlertCircle,
  Copy,
  Check,
  Cake,
  Gift,
  Heart,
  ChevronRight
} from 'lucide-react';

interface MembershipInformationProps {
  members: Member[];
  onAddMember: (member: Omit<Member, 'id' | 'createdAt'>) => void;
  onRemoveMember: (id: string) => void;
  onUpdateMember?: (member: Member) => void;
  onSetMembers?: (members: Member[]) => void;
  currentUserEmail: string;
  authorizedEmail: string;
  referenceDateStr?: string;
  courses?: Course[];
  onAddCourse?: (course: Course) => void;
  onUpdateCourse?: (course: Course) => void;
  onRemoveCourse?: (id: string) => void;
}

// Helper to format YYYY-MM-DD string to DD/MM/YYYY for input prefill
const toInputFormat = (dateStr: string): string => {
  if (!dateStr) return '';
  if (dateStr.includes('/')) return dateStr;
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

// Helper to parse DD/MM/YYYY input string to standard YYYY-MM-DD
const toStandardFormat = (inputVal: string): string => {
  if (!inputVal) return '';
  const parts = inputVal.split('/');
  if (parts.length === 3) {
    const dd = parts[0].padStart(2, '0');
    const mm = parts[1].padStart(2, '0');
    const yyyy = parts[2];
    if (yyyy.length === 4) {
      return `${yyyy}-${mm}-${dd}`;
    }
  }
  return inputVal;
};

// Helper to validation dob input
const isValidInputDateFormat = (inputVal: string): boolean => {
  const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  if (!regex.test(inputVal)) return false;
  
  const match = inputVal.match(regex);
  if (!match) return false;
  
  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);
  
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (year < 1900 || year > 2100) return false;
  
  return true;
};

export default function MembershipInformation({
  members,
  onAddMember,
  onRemoveMember,
  onUpdateMember,
  onSetMembers,
  currentUserEmail,
  authorizedEmail,
  referenceDateStr = '2026-06-04',
  courses = [],
  onAddCourse = () => {},
  onUpdateCourse = () => {},
  onRemoveCourse = () => {}
}: MembershipInformationProps) {
  const isAuthorized = currentUserEmail.toLowerCase() === authorizedEmail.toLowerCase() || 
                       currentUserEmail.toLowerCase() === 'setcadmin' || 
                       currentUserEmail.toLowerCase() === 'setcadmin@safetycentre.org';

  const [activeSection, setActiveSection] = useState<'membership' | 'courses' | 'classrooms'>('membership');
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);

  // Tabs: 'registry' | 'birthdays'
  const [activeSubTab, setActiveSubTab] = useState<'registry' | 'birthdays'>('registry');

  // Determine current logged-in user's clearance Level (treating authorized admin email as level 4 by default)
  const loggedInMember = members.find(m => m.email.toLowerCase() === currentUserEmail.toLowerCase());
  const currentUserLevel = loggedInMember?.authorizedLevel || 
    (currentUserEmail.toLowerCase() === authorizedEmail.toLowerCase() || 
     currentUserEmail.toLowerCase() === 'setcadmin' || 
     currentUserEmail.toLowerCase() === 'setcadmin@safetycentre.org' ? 'level 4' : 'level 1');
  const hasLevel4Access = currentUserLevel.toLowerCase() === 'level 4';

  // Search filters
  const [registrySearch, setRegistrySearch] = useState('');
  const [birthdaySearch, setBirthdaySearch] = useState('');

  // Clipboard copy state helper
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  // Pop-up registration window state
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Editing mode
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [position, setPosition] = useState('');
  const [customPosition, setCustomPosition] = useState('');
  const [customPositions, setCustomPositions] = useState<string[]>([]);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [authorizedLevel, setAuthorizedLevel] = useState<string>('level 1');
  
  // Validation and Feedback
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const startEdit = (member: Member) => {
    setEditingId(member.id);
    setName(member.name);
    setDob(toInputFormat(member.dob));
    
    const defaultPositions = [
      "Manager", "Deputy Manager", "Admin Team Leader", "Training Team Leader", 
      "Maintenance Team Leader", "Instructor", "Admin Staff", "Maintenance Staff", "Support Staff"
    ];
    if (defaultPositions.includes(member.position)) {
      setPosition(member.position);
      setCustomPosition('');
    } else {
      setPosition('__custom__');
      setCustomPosition(member.position);
    }
    
    setEmail(member.email);
    setPhone(member.phone || '');
    setAuthorizedLevel(member.authorizedLevel || 'level 1');
    setPassword(member.password || '');
    setError(null);
    setSuccess(false);

    // Open pop-up window
    setIsModalOpen(true);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setName('');
    setDob('');
    setPosition('');
    setCustomPosition('');
    setEmail('');
    setPhone('');
    setPassword('');
    setAuthorizedLevel('level 1');
    setError(null);
    setSuccess(false);
    setIsModalOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const isSelf = editingId && (members.find(m => m.id === editingId)?.email.toLowerCase() === currentUserEmail.toLowerCase());

    if (!isAuthorized && !isSelf) {
      setError('Operation Denied: You do not have permissions to manage other memberships.');
      return;
    }

    const finalPosition = position === '__custom__' ? customPosition : position;

    // Validation
    if (!name.trim()) return setError('Full Name is required.');
    if (!dob.trim()) return setError('Date of Birth is required.');
    if (!isValidInputDateFormat(dob.trim())) {
      return setError('Please enter a valid Date of Birth in DD/MM/YYYY format.');
    }
    if (!finalPosition.trim()) return setError('Position/Role is required.');
    if (!email.trim()) return setError('E-mail address is required.');
    if (!email.includes('@') || email.length < 5) {
      return setError('Please enter a valid e-mail address.');
    }
    if (!phone.trim()) return setError('Phone Number is required.');

    const standardDbDate = toStandardFormat(dob.trim());

    // Password security check
    const isCreatorAdmin = currentUserEmail.toLowerCase() === 'setcadmin' || currentUserEmail.toLowerCase() === 'setcadmin@safetycentre.org';
    const canUpdatePassword = isCreatorAdmin || isSelf;

    let finalAuthorizedLevel = authorizedLevel;
    let finalPositionValue = finalPosition;

    if (editingId && !hasLevel4Access) {
      const existingMember = members.find(m => m.id === editingId);
      if (existingMember) {
        finalAuthorizedLevel = existingMember.authorizedLevel || 'level 1';
        finalPositionValue = existingMember.position;
      }
    }

    if (editingId) {
      // Edit verification duplicate
      if (members.some(m => m.id !== editingId && m.email.toLowerCase() === email.trim().toLowerCase())) {
        return setError('A member with this e-mail address is already registered.');
      }

      const existingMember = members.find(m => m.id === editingId);
      const finalPassword = canUpdatePassword ? password : (existingMember?.password || 'abc123');

      if (onUpdateMember) {
        onUpdateMember({
          id: editingId,
          name: name.trim(),
          dob: standardDbDate,
          position: finalPositionValue.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          authorizedLevel: finalAuthorizedLevel,
          password: finalPassword,
          createdAt: existingMember?.createdAt || new Date().toISOString()
        });
      }
      
      setSuccessMessage('Membership details updated successfully!');
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setSuccessMessage('');
        setEditingId(null);
        setIsModalOpen(false);
        // Reset Form
        setName('');
        setDob('');
        setPosition('');
        setCustomPosition('');
        setEmail('');
        setPhone('');
        setPassword('');
        setAuthorizedLevel('level 1');
      }, 1000);
    } else {
      // Prevent duplicate email registration
      if (members.some(m => m.email.toLowerCase() === email.trim().toLowerCase())) {
        return setError('A member with this e-mail address is already registered.');
      }

      const finalPasswordForNew = isCreatorAdmin ? (password || 'abc123') : 'abc123';

      // Add member
      onAddMember({
        name: name.trim(),
        dob: standardDbDate,
        position: finalPosition.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        authorizedLevel,
        password: finalPasswordForNew
      });

      setSuccessMessage('Membership registered successfully!');
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setSuccessMessage('');
        setIsModalOpen(false);
        // Reset Form
        setName('');
        setDob('');
        setPosition('');
        setCustomPosition('');
        setEmail('');
        setPhone('');
        setPassword('');
        setAuthorizedLevel('level 1');
      }, 1000);
    }

    // Add to selectable custom positions if entered
    if (position === '__custom__' && customPosition.trim() && !customPositions.includes(customPosition.trim())) {
      setCustomPositions(prev => [...prev, customPosition.trim()]);
    }
  };

  const filteredMembers = members.filter(m => {
    // Exclude SETC Creator Admin from the Personnel Directory listing
    const isCreator = m.id === 'mem-creator' || 
                      m.email.toLowerCase() === 'setcadmin' || 
                      m.email.toLowerCase() === 'setcadmin@safetycentre.org';
    if (isCreator) return false;

    return m.name.toLowerCase().includes(registrySearch.toLowerCase()) ||
      m.email.toLowerCase().includes(registrySearch.toLowerCase()) ||
      m.position.toLowerCase().includes(registrySearch.toLowerCase()) ||
      (m.phone || '').toLowerCase().includes(registrySearch.toLowerCase()) ||
      (m.authorizedLevel || '').toLowerCase().includes(registrySearch.toLowerCase());
  });

  // Birthday listing calculations
  const birthdayList = useMemo(() => {
    const today = new Date(referenceDateStr);
    
    return members
      .filter(m => m.email.toLowerCase() !== 'setcadmin' && m.email.toLowerCase() !== 'setcadmin@safetycentre.org')
      .map(m => {
      const birthDate = new Date(m.dob);
      if (isNaN(birthDate.getTime())) {
        return {
          member: m,
          age: 0,
          nextBdayStr: 'N/A',
          daysRemaining: 999,
          isToday: false,
          isSoon: false,
          nextAge: 0,
        };
      }

      // Calculate current age
      let age = today.getFullYear() - birthDate.getFullYear();
      const mDiff = today.getMonth() - birthDate.getMonth();
      const dDiff = today.getDate() - birthDate.getDate();
      if (mDiff < 0 || (mDiff === 0 && dDiff < 0)) {
        age--;
      }

      // Calculate next birthday occurrence
      let nextYear = today.getFullYear();
      let nextBday = new Date(nextYear, birthDate.getMonth(), birthDate.getDate());
      
      // If the birthday is earlier in the year than today's date, it will occur next year
      if (nextBday < today) {
        nextYear += 1;
        nextBday = new Date(nextYear, birthDate.getMonth(), birthDate.getDate());
      }

      // Calculate exact difference in days
      const t1 = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
      const t2 = new Date(nextBday.getFullYear(), nextBday.getMonth(), nextBday.getDate()).getTime();
      const daysRemaining = Math.round((t2 - t1) / (1000 * 60 * 60 * 24));

      const isToday = daysRemaining === 0;
      const isSoon = daysRemaining <= 30 && daysRemaining > 0;
      const nextAge = age + (isToday ? 0 : 1);

      return {
        member: m,
        age,
        nextAge,
        nextBdayStr: formatDate(nextBday),
        daysRemaining,
        isToday,
        isSoon,
      };
    }).sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [members, referenceDateStr]);

  // Apply birthday search filtering
  const filteredBirthdays = useMemo(() => {
    if (!birthdaySearch.trim()) return birthdayList;
    const query = birthdaySearch.toLowerCase();
    return birthdayList.filter(item => 
      item.member.name.toLowerCase().includes(query) ||
      item.member.position.toLowerCase().includes(query)
    );
  }, [birthdayList, birthdaySearch]);

  const todayBirthdays = filteredBirthdays.filter(b => b.isToday);
  const soonBirthdays = filteredBirthdays.filter(b => b.isSoon);

  return (
    <div id="membership-info-container" className="space-y-6 w-full max-w-7xl mx-auto">
      
      {/* Sub-tab Switcher Header bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-3xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-[#549B8C]/15 text-[#549B8C] p-2 rounded-xl">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">General Information</h2>
            <p className="text-[11px] text-slate-500">
              {activeSection === 'classrooms' && 'Monitor and manage academy classrooms and lab resources'}
            </p>
          </div>
        </div>

        {/* Selection box on the right of the block */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-1 shrink-0">
          <div className="relative">
            <select
              id="general-info-view-select"
              value={activeSection}
              onChange={(e) => setActiveSection(e.target.value as 'membership' | 'courses' | 'classrooms')}
              className="pl-3 pr-8 py-1.5 text-xs font-bold bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-md text-slate-800 focus:ring-1 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden transition-all cursor-pointer appearance-none min-w-[210px]"
            >
              <option value="membership">👥 Membership</option>
              <option value="courses">📚 Courses</option>
              <option value="classrooms">🏢 Classroom</option>
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <ChevronRight className="h-3 w-3 rotate-90" />
            </div>
          </div>
        </div>
      </div>

      {activeSection === 'membership' && (
        /* PERSONNEL REGISTRY VIEW */
        <div className="w-full space-y-6 animate-in fade-in duration-200">

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-50/50">
              <div>
                <h3 className="text-xs font-extrabold text-slate-900 flex items-center gap-2">
                  Personnel Directory List
                  <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200/40 font-mono">
                    {filteredMembers.length} Registered
                  </span>
                </h3>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                <div className="relative w-full sm:w-56">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={registrySearch}
                    onChange={(e) => setRegistrySearch(e.target.value)}
                    placeholder="Search personnel..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:border-emerald-500/80 outline-hidden text-slate-800 placeholder:text-slate-400"
                  />
                </div>

                {hasLevel4Access ? (
                  <button
                    type="button"
                    onClick={() => {
                      cancelEdit();
                      setIsModalOpen(true);
                    }}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-[#549B8C] hover:bg-[#437C70] rounded-lg transition-all cursor-pointer shadow-3xs"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>Register</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 text-xs font-bold text-slate-400 bg-slate-100 border border-slate-200 rounded-lg cursor-not-allowed opacity-60"
                    title="Clearance level-4 restricted"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    <span>Register</span>
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              {filteredMembers.length === 0 ? (
                <div className="p-12 text-center text-slate-400 italic">No matches found.</div>
              ) : (
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase bg-slate-50/20">
                      <th className="px-4 py-2.5">Full Name</th>
                      <th className="px-4 py-2.5">DOB</th>
                      <th className="px-4 py-2.5">Email Address</th>
                      <th className="px-4 py-2.5">Phone number</th>
                      <th className="px-4 py-2.5 text-center">Auth Level</th>
                      <th className="px-4 py-2.5">Position</th>
                      <th className="px-4 py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredMembers.map((member) => {
                      const isSystemAuthAdmin = member.email.toLowerCase() === authorizedEmail.toLowerCase() || member.email.toLowerCase() === 'setcadmin' || member.email.toLowerCase() === 'setcadmin@safetycentre.org';
                      const colorMap: Record<string, string> = {
                        'level 4': 'bg-blue-50 text-blue-700 border-blue-200/50',
                        'level 3': 'bg-amber-50 text-amber-700 border-amber-200/50',
                        'level 2': 'bg-teal-50 text-teal-700 border-teal-200/50',
                        'level 1': 'bg-slate-100 text-slate-600 border-slate-200/50',
                      };
                      const levelClass = colorMap[member.authorizedLevel || 'level 1'] || 'bg-slate-100 text-slate-600 border-slate-200/50';

                      return (
                        <tr key={member.id} className={`text-xs hover:bg-slate-55/20 transition-colors ${isSystemAuthAdmin ? 'bg-emerald-50/15' : ''}`}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-6.5 h-6.5 rounded-full flex items-center justify-center font-bold text-[9px] bg-slate-150 text-slate-750 overflow-hidden shrink-0">
                                {member.avatar ? (
                                  <img src={member.avatar} className="w-full h-full object-cover" alt="" />
                                ) : (
                                  member.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                                )}
                              </div>
                              <span className="font-bold text-slate-900">{member.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-600">{formatDate(member.dob)}</td>
                          <td className="px-4 py-3 font-mono text-slate-500">
                            <div className="flex items-center gap-1 group">
                              <span className="break-all">{member.email}</span>
                              <button
                                type="button"
                                onClick={() => handleCopy(member.email, `${member.id}-email`)}
                                className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-slate-100 rounded text-slate-400 hover:text-emerald-600 transition"
                              >
                                {copiedKey === `${member.id}-email` ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-600">
                            {member.phone ? (
                              <div className="flex items-center gap-1 group">
                                <span>{member.phone}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(member.phone || '', `${member.id}-phone`)}
                                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-slate-100 rounded text-slate-400 hover:text-emerald-600 transition"
                                >
                                  {copiedKey === `${member.id}-phone` ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                                </button>
                              </div>
                            ) : '-'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-block px-1.5 py-0.5 rounded-full text-[8.5px] font-bold border uppercase ${levelClass}`}>
                              {member.authorizedLevel || 'level 1'}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-600">{member.position}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="inline-flex gap-2 justify-end">
                              {(hasLevel4Access || member.email.toLowerCase() === currentUserEmail.toLowerCase()) && (
                                <button
                                  type="button"
                                  onClick={() => startEdit(member)}
                                  className="p-1.5 text-slate-500 hover:text-[#549B8C] hover:bg-emerald-50 rounded-lg transition-colors border border-transparent hover:border-emerald-100 cursor-pointer"
                                  title="Update Personnel details"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                              )}
                              {hasLevel4Access && (
                                isSystemAuthAdmin ? (
                                  <button
                                    type="button"
                                    disabled
                                    className="p-1.5 text-slate-300 bg-slate-50 border border-slate-100 rounded-lg cursor-not-allowed"
                                    title="System Reserved Primary Account (Cannot delete)"
                                  >
                                    <Lock className="h-4 w-4" />
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setMemberToDelete(member)}
                                    className="p-1.5 text-slate-550 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100 cursor-pointer"
                                    title="Delete Personnel record"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {activeSection === 'courses' && (
        <div className="w-full space-y-6 animate-in fade-in duration-200">
          <CourseList 
            courses={courses}
            onAddCourse={onAddCourse}
            onUpdateCourse={onUpdateCourse}
            onRemoveCourse={onRemoveCourse}
            currentUserEmail={currentUserEmail}
            authorizedEmail={authorizedEmail}
            members={members}
          />
        </div>
      )}

      {activeSection === 'classrooms' && (
        <div className="w-full space-y-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-50/50">
              <div>
                <h3 className="text-xs font-extrabold text-slate-900 flex items-center gap-2">
                  Training Academy Classroom Assets
                  <span className="bg-[#549B8C]/15 text-[#549B8C] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#549B8C]/30 font-mono">
                    {CLASSROOMS.length} Facilities
                  </span>
                </h3>
                <p className="text-[10px] text-slate-400">Inventory of active simulated labs, classrooms, and practical yards</p>
              </div>
            </div>

            {/* Grid of Classrooms */}
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {CLASSROOMS.map((room) => {
                // Determine layout styles/facilities based on room id
                let facilities: string[] = [];
                let colorTheme = 'emerald';
                let iconText = '🏢';
                
                if (room.id === 'room-101') {
                  facilities = ['Safety Harnesses', 'High-Angle Rigging Platforms', 'HSE Audits Board', 'Audio System'];
                  colorTheme = 'emerald';
                  iconText = '🧪';
                } else if (room.id === 'room-102') {
                  facilities = ['Sensors Grid', 'Acoustics Barriers', 'Digital Interactive Whiteboard', 'Climate Simulator'];
                  colorTheme = 'indigo';
                  iconText = '🌡️';
                } else if (room.id === 'room-ex') {
                  facilities = ['Controlled Fire Igniters', 'Hydrant Network', 'Dry Powder Extinguishers', 'Gas Mask Rack'];
                  colorTheme = 'rose';
                  iconText = '🔥';
                } else if (room.id === 'room-conf') {
                  facilities = ['Steel Entry Portals', 'O2 Gas Monitors', 'Retrieval Davit Arm & Winch', 'Emergency Lighting'];
                  colorTheme = 'amber';
                  iconText = '⚓';
                } else {
                  facilities = ['Soil & Liquid Spectrometers', 'Water Quality Analyzers', 'Digital Microscopes', 'Draft Shield Scales'];
                  colorTheme = 'teal';
                  iconText = '🌿';
                }

                return (
                  <div key={room.id} className="bg-white border border-slate-150 rounded-xl p-4.5 hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col justify-between">
                    <div>
                      {/* Icon and Stats header */}
                      <div className="flex items-center justify-between mb-3.5">
                        <span className="text-2xl">{iconText}</span>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                          colorTheme === 'rose' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                          colorTheme === 'indigo' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                          colorTheme === 'amber' ? 'bg-amber-50 text-amber-500 border border-amber-200' :
                          colorTheme === 'teal' ? 'bg-teal-50 text-teal-700 border border-teal-200' :
                          'bg-emerald-50 text-emerald-700 border border-emerald-250'
                        }`}>
                          {room.building.split(' ')[0]}
                        </span>
                      </div>

                      <h4 className="text-xs font-extrabold text-slate-850 truncate">{room.name}</h4>
                      <p className="text-[10px] text-slate-450 mt-0.5 flex items-center gap-1">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-300"></span>
                        {room.building}
                      </p>

                      <div className="mt-4 space-y-1.5">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Facilities & Gear:</span>
                        <div className="flex flex-wrap gap-1">
                          {facilities.map((fac, idx) => (
                            <span key={idx} className="bg-slate-50 border border-slate-150 text-slate-600 text-[9px] px-1.5 py-0.5 rounded font-medium">
                              {fac}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[8px] text-slate-400 uppercase font-black">Capacity Limit</span>
                        <span className="text-xs font-black text-slate-850 font-mono">{room.capacity} students</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/50">
                          Active Lab Asset
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Pop-up Window Modal for Register/Update */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={cancelEdit}
              className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs"
            />

            {/* Modal Dialog Content Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden w-full max-w-md relative z-10"
            >
              {/* Modal Header */}
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/40 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <UserPlus className="h-4.5 w-4.5 text-slate-600" />
                  <h3 className="text-xs font-bold text-slate-950">
                    {editingId ? 'Update Membership Entry' : 'Register New Member'}
                  </h3>
                </div>
                <button 
                  type="button"
                  onClick={cancelEdit}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  title="Close Window"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                {editingId && (
                  <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-xl text-[11px] text-amber-800 flex items-center justify-between">
                    <span className="font-semibold">Currently editing existing member</span>
                    <button 
                      type="button" 
                      onClick={cancelEdit} 
                      className="text-[10px] bg-white border border-amber-250 hover:bg-slate-50 px-2 py-0.5 rounded-md font-bold transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {error && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200/80 rounded-xl text-[11px] text-rose-700 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
                    <span>{error}</span>
                  </div>
                )}

                {success && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-250 rounded-xl text-[11px] text-emerald-800 flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-emerald-600" />
                    <span>{successMessage}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-550 uppercase tracking-wider block">Full Name</label>
                  <div className="relative">
                    <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Nguyen Van A"
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 outline-hidden transition-all placeholder:text-slate-400 font-medium text-slate-900"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-550 uppercase tracking-wider block flex justify-between">
                    <span>Date of Birth</span>
                    <span className="text-emerald-700 font-mono italic text-[9px]">dd/mm/yyyy</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      placeholder="e.g. 15/05/1990"
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 outline-hidden transition-all text-slate-700 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-550 uppercase tracking-wider block">E-mail Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. officer@center.com"
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 outline-hidden transition-all placeholder:text-slate-400 text-slate-950"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-550 uppercase tracking-wider block">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. +84 912 345 678"
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 outline-hidden transition-all placeholder:text-slate-400 font-mono text-slate-900"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-slate-550 uppercase tracking-wider block">Access Password</label>
                    {!(currentUserEmail.toLowerCase() === 'setcadmin' || currentUserEmail.toLowerCase() === 'setcadmin@safetycentre.org') && !(editingId && members.find(m => m.id === editingId)?.email.toLowerCase() === currentUserEmail.toLowerCase()) && (
                      <span className="text-[9px] text-amber-600 font-bold italic bg-amber-50 px-1.5 py-0.5 rounded">Creator Admin / Owner Only</span>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      disabled={!(currentUserEmail.toLowerCase() === 'setcadmin' || currentUserEmail.toLowerCase() === 'setcadmin@safetycentre.org') && !(editingId && members.find(m => m.id === editingId)?.email.toLowerCase() === currentUserEmail.toLowerCase())}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={!(currentUserEmail.toLowerCase() === 'setcadmin' || currentUserEmail.toLowerCase() === 'setcadmin@safetycentre.org') && !(editingId && members.find(m => m.id === editingId)?.email.toLowerCase() === currentUserEmail.toLowerCase()) ? "••••••••" : "e.g. securePass123"}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 outline-hidden transition-all placeholder:text-slate-400 font-mono text-slate-900 disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-100 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-550 uppercase tracking-wider block">Authorized Level</label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <select
                      value={authorizedLevel}
                      onChange={(e) => setAuthorizedLevel(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 outline-hidden bg-white text-slate-800 transition-all font-semibold cursor-pointer"
                    >
                      <option value="level 1">Level 1</option>
                      <option value="level 2">Level 2</option>
                      <option value="level 3">Level 3</option>
                      <option value="level 4">Level 4</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-550 uppercase tracking-wider block">Position / Role</label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <select
                      value={position}
                      required
                      onChange={(e) => setPosition(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 outline-hidden bg-white text-slate-800 transition-all cursor-pointer font-semibold"
                    >
                      <option value="">Select a position...</option>
                      <option value="Manager">Manager</option>
                      <option value="Deputy Manager">Deputy Manager</option>
                      <option value="Admin Team Leader">Admin Team Leader</option>
                      <option value="Training Team Leader">Training Team Leader</option>
                      <option value="Maintenance Team Leader">Maintenance Team Leader</option>
                      <option value="Instructor">Instructor</option>
                      <option value="Admin Staff">Admin Staff</option>
                      <option value="Maintenance Staff">Maintenance Staff</option>
                      <option value="Support Staff">Support Staff</option>
                      {customPositions.map(pos => (
                        <option key={pos} value={pos}>{pos}</option>
                      ))}
                      <option value="__custom__">+ Add Custom Position...</option>
                    </select>
                  </div>
                </div>

                {position === '__custom__' && (
                  <div className="space-y-1.5 animate-in fade-in duration-200">
                    <label className="text-[9.5px] font-bold text-emerald-600 uppercase tracking-wider block">Custom Position</label>
                    <input
                      type="text"
                      required
                      value={customPosition}
                      onChange={(e) => setCustomPosition(e.target.value)}
                      placeholder="e.g. Lead HSE Coordinator"
                      className="w-full px-3 py-2 text-xs border border-emerald-250 rounded-xl focus:border-emerald-500 outline-hidden"
                    />
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="px-4 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-[#549B8C] hover:bg-[#437C70] rounded-lg transition-all cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>{editingId ? 'Update' : 'Register'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {memberToDelete && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMemberToDelete(null)}
              className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden w-full max-w-sm relative z-10"
            >
              <div className="p-5 space-y-4">
                <div className="flex gap-3 items-start">
                  <div className="p-2 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 shrink-0">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-xs font-extrabold text-slate-950 uppercase tracking-wider">Confirm Delete</h3>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                      Are you sure you want to permanently delete and decommission the membership registry entry for <span className="font-extrabold text-slate-800">{memberToDelete.name}</span>?
                    </p>
                    <p className="text-[10px] text-rose-600 bg-rose-50/55 border border-rose-100 p-2 rounded-lg font-semibold leading-tight">
                      This action is irreversible and will revoke safety compliance registries.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setMemberToDelete(null)}
                    className="px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-850 bg-slate-55 hover:bg-slate-100 rounded-lg transition-all cursor-pointer font-sans"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onRemoveMember(memberToDelete.id);
                      if (editingId === memberToDelete.id) cancelEdit();
                      setMemberToDelete(null);
                    }}
                    className="px-5 py-2 text-xs font-black uppercase tracking-wider text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 font-sans border-none shadow-md shadow-rose-205 ring-2 ring-rose-500 ring-offset-2 animate-pulse hover:animate-none scale-102 hover:scale-105"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Confirm Delete</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
