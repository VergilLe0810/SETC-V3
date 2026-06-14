import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Member, Course, Classroom } from '../types';
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
  ChevronRight,
  Plus
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
  classrooms?: Classroom[];
  onAddClassroom?: (classroom: Classroom) => void;
  onUpdateClassroom?: (classroom: Classroom) => void;
  onRemoveClassroom?: (id: string) => void;
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
  onRemoveCourse = () => {},
  classrooms = [],
  onAddClassroom = () => {},
  onUpdateClassroom = () => {},
  onRemoveClassroom = () => {}
}: MembershipInformationProps) {
  const isAuthorized = currentUserEmail.toLowerCase() === authorizedEmail.toLowerCase() || 
                       currentUserEmail.toLowerCase() === 'setcadmin' || 
                       currentUserEmail.toLowerCase() === 'setcadmin@safetycentre.org';

  const [activeSection, setActiveSection] = useState<'membership' | 'courses' | 'classrooms'>('membership');

  // Dynamic Classroom States
  const activeClassrooms = classrooms.length > 0 ? classrooms : CLASSROOMS;
  const [isClassroomModalOpen, setIsClassroomModalOpen] = useState(false);
  const [editingClassroomId, setEditingClassroomId] = useState<string | null>(null);
  const [roomName, setRoomName] = useState('');
  const [roomCapacity, setRoomCapacity] = useState<number>(20);
  const [roomBuilding, setRoomBuilding] = useState('');
  const [classroomToDelete, setClassroomToDelete] = useState<Classroom | null>(null);

  const handleClassroomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim() || !roomBuilding.trim()) return;

    if (editingClassroomId) {
      onUpdateClassroom({
        id: editingClassroomId,
        name: roomName.trim(),
        capacity: roomCapacity,
        building: roomBuilding.trim()
      });
    } else {
      onAddClassroom({
        id: `room-${Date.now()}`,
        name: roomName.trim(),
        capacity: roomCapacity,
        building: roomBuilding.trim()
      });
    }

    setIsClassroomModalOpen(false);
    setEditingClassroomId(null);
    setRoomName('');
    setRoomCapacity(20);
    setRoomBuilding('');
  };

  const startEditClassroom = (room: Classroom) => {
    setEditingClassroomId(room.id);
    setRoomName(room.name);
    setRoomCapacity(room.capacity);
    setRoomBuilding(room.building);
    setIsClassroomModalOpen(true);
  };

  const startAddClassroom = () => {
    setEditingClassroomId(null);
    setRoomName('');
    setRoomCapacity(20);
    setRoomBuilding('');
    setIsClassroomModalOpen(true);
  };
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);

  // Determine current logged-in user's clearance Level (treating authorized admin email as level 4 by default)
  const loggedInMember = members.find(m => m.email.toLowerCase() === currentUserEmail.toLowerCase());
  const currentUserLevel = loggedInMember?.authorizedLevel || 
    (currentUserEmail.toLowerCase() === authorizedEmail.toLowerCase() || 
     currentUserEmail.toLowerCase() === 'setcadmin' || 
     currentUserEmail.toLowerCase() === 'setcadmin@safetycentre.org' ? 'level 4' : 'level 1');
  const hasLevel4Access = currentUserLevel.toLowerCase() === 'level 4';

  // Search filters
  const [registrySearch, setRegistrySearch] = useState('');

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
      "Quản lý", "Phó Quản lý", "Trưởng nhóm Trực ban", "Trưởng nhóm Đào tạo", 
      "Trưởng nhóm Bảo trì", "Giảng viên", "Nhân viên Hành chính", "Nhân viên Bảo trì", "Nhân viên Hỗ trợ"
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
      setError('Hành động bị từ chối: Bạn không có đủ quyền hạn để quản lý hồ sơ thành viên khác.');
      return;
    }

    const finalPosition = position === '__custom__' ? customPosition : position;

    // Validation
    if (!name.trim()) return setError('Họ và Tên không được để trống.');
    if (!dob.trim()) return setError('Ngày sinh không được để trống.');
    if (!isValidInputDateFormat(dob.trim())) {
      return setError('Vui lòng nhập Ngày sinh chính xác theo định dạng DD/MM/YYYY.');
    }
    if (!finalPosition.trim()) return setError('Chức vụ / Vai trò không được để trống.');
    if (!email.trim()) return setError('Địa chỉ Email không được để trống.');
    if (!email.includes('@') || email.length < 5) {
      return setError('Vui lòng nhập địa chỉ Email hợp lệ.');
    }
    if (!phone.trim()) return setError('Số điện thoại không được để trống.');

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
        return setError('Email này đã được sử dụng bởi một thành viên khác.');
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
      
      setSuccessMessage('Hồ sơ thành viên đã được cập nhật thành công!');
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
        return setError('Thành viên với địa chỉ Email này đã được đăng ký.');
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

      setSuccessMessage('Đăng ký thành viên mới thành công!');
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

  return (
    <div id="membership-info-container" className="space-y-6 w-full max-w-7xl mx-auto">
      
      {/* Sub-tab Switcher Header bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-3xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-left">
          <div className="bg-[#549B8C]/15 text-[#549B8C] p-2 rounded-xl">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">Thông tin Hệ thống</h2>
            <p className="text-[11px] text-slate-500">
              {activeSection === 'classrooms' ? 'Giám sát và quản lý phòng học và tài nguyên phòng thực hành' : activeSection === 'courses' ? 'Danh sách tài liệu giảng dạy và quản lý chương trình đào tạo' : 'Quản lý danh sách nhân viên và thành viên học viện'}
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
              className="pl-3 pr-8 py-1.5 text-xs font-bold bg-white hover:bg-slate-55 border border-slate-200 hover:border-slate-300 rounded-md text-slate-800 focus:ring-1 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden transition-all cursor-pointer appearance-none min-w-[210px]"
            >
              <option value="membership">👥 Thành viên & Nhân viên</option>
              <option value="courses">📚 Khóa học & Chương trình</option>
              <option value="classrooms">🏢 Sơ đồ Phòng đào tạo</option>
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
              <div className="text-left">
                <h3 className="text-xs font-extrabold text-slate-900 flex items-center gap-2">
                  Danh bạ Nhân sự & Thành viên
                  <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200/40 font-mono">
                    {filteredMembers.length} Đã đăng ký
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
                    placeholder="Tìm kiếm nhân sự..."
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
                    <span>Thêm thành viên</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 text-xs font-bold text-slate-400 bg-slate-100 border border-slate-200 rounded-lg cursor-not-allowed opacity-60"
                    title="Bị hạn chế - Yêu cầu Quyền cấp độ 4"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    <span>Thêm thành viên</span>
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto text-left">
              {filteredMembers.length === 0 ? (
                <div className="p-12 text-center text-slate-400 italic font-serif">Không tìm thấy thành viên nào phù hợp.</div>
              ) : (
                <>
                  {/* Desktop view */}
                  <table className="hidden md:table w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase bg-slate-50/20">
                        <th className="px-4 py-2.5">Họ và Tên</th>
                        <th className="px-4 py-2.5">Ngày sinh</th>
                        <th className="px-4 py-2.5">Địa chỉ Email</th>
                        <th className="px-4 py-2.5">Số điện thoại</th>
                        <th className="px-4 py-2.5 text-center">Cấp độ</th>
                        <th className="px-4 py-2.5">Chức vụ</th>
                        <th className="px-4 py-2.5 text-right">Thao tác</th>
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
                                    <img src={member.avatar} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
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
                                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-slate-100 rounded text-slate-400 hover:text-emerald-600 transition cursor-pointer"
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
                                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-slate-100 rounded text-slate-400 hover:text-emerald-600 transition cursor-pointer"
                                  >
                                    {copiedKey === `${member.id}-phone` ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                                  </button>
                                </div>
                              ) : '-'}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-block px-1.5 py-0.5 rounded-full text-[8.5px] font-bold border uppercase ${levelClass}`}>
                                {member.authorizedLevel || 'Cấp 1'}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-600">{member.position}</td>
                            <td className="px-4 py-3 text-right">
                              <div className="inline-flex gap-2 justify-end">
                                {(hasLevel4Access || member.email.toLowerCase() === currentUserEmail.toLowerCase()) && (
                                  <button
                                    type="button"
                                    onClick={() => startEdit(member)}
                                    className="p-1.5 text-slate-550 hover:text-[#549B8C] hover:bg-emerald-50 rounded-lg transition-colors border border-transparent hover:border-emerald-100 cursor-pointer"
                                    title="Cập nhật Thông tin Thành viên"
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
                                      title="Tài khoản Hệ thống Dự phòng (Không thể xóa)"
                                    >
                                      <Lock className="h-4 w-4" />
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setMemberToDelete(member)}
                                      className="p-1.5 text-slate-550 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100 cursor-pointer"
                                      title="Xóa Thông tin Thành viên"
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

                  {/* Mobile responsive view */}
                  <div className="md:hidden space-y-3.5">
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
                        <div 
                          key={member.id} 
                          className={`bg-white border text-left border-slate-200 rounded-xl p-4 shadow-3xs space-y-3 hover:shadow-2xs transition-all duration-150 ${isSystemAuthAdmin ? 'ring-1 ring-emerald-400/50 bg-emerald-50/15' : ''}`}
                        >
                          <div className="flex items-center justify-between gap-2 border-b border-slate-105 pb-2">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs bg-slate-150 text-slate-750 overflow-hidden shrink-0">
                                {member.avatar ? (
                                  <img src={member.avatar} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                                ) : (
                                  member.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                                )}
                              </div>
                              <div className="text-left">
                                <span className="font-bold text-slate-900 block text-xs">{member.name}</span>
                                <span className="text-[10.5px] font-semibold text-slate-500">{member.position}</span>
                              </div>
                            </div>

                            <span className={`inline-block px-1.5 py-0.5 rounded-full text-[8.5px] font-bold border uppercase leading-none ${levelClass}`}>
                              {member.authorizedLevel || 'Cấp 1'}
                            </span>
                          </div>

                          <div className="space-y-2 text-xs text-slate-600">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-slate-400 font-semibold text-[10.5px]">Ngày sinh:</span>
                              <span className="font-mono text-slate-850 font-bold">{formatDate(member.dob)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-slate-400 font-semibold text-[10.5px]">Email:</span>
                              <div className="flex items-center gap-1 group">
                                <span className="break-all font-mono text-[11px] text-slate-800">{member.email}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(member.email, `${member.id}-email-mb`)}
                                  className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-emerald-600 transition cursor-pointer"
                                >
                                  {copiedKey === `${member.id}-email-mb` ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                                </button>
                              </div>
                            </div>
                            {member.phone && (
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-slate-400 font-semibold text-[10.5px]">Điện thoại:</span>
                                <div className="flex items-center gap-1 group">
                                  <span className="font-mono text-[11px] text-slate-800">{member.phone}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(member.phone || '', `${member.id}-phone-mb`)}
                                    className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-emerald-600 transition cursor-pointer"
                                  >
                                    {copiedKey === `${member.id}-phone-mb` ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Quick management action block */}
                          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-2.5">
                            {(hasLevel4Access || member.email.toLowerCase() === currentUserEmail.toLowerCase()) && (
                              <button
                                type="button"
                                onClick={() => startEdit(member)}
                                className="inline-flex items-center gap-1 px-3 py-1 text-[11px] font-bold text-slate-705 hover:text-[#549B8C] hover:bg-emerald-50 rounded-lg transition-colors border border-slate-200 hover:border-emerald-200 cursor-pointer"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                <span>Chỉnh sửa</span>
                              </button>
                            )}
                            {hasLevel4Access && (
                              isSystemAuthAdmin ? (
                                <button
                                  type="button"
                                  disabled
                                  className="inline-flex items-center gap-1 px-3 py-1 text-[11px] font-bold text-slate-300 bg-slate-50 border border-slate-100 rounded-lg cursor-not-allowed"
                                >
                                  <Lock className="h-3.5 w-3.5" />
                                  <span>Hệ thống</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setMemberToDelete(member)}
                                  className="inline-flex items-center gap-1 px-3 py-1 text-[11px] font-bold text-rose-700 hover:text-rose-800 hover:bg-rose-50 border border-transparent hover:border-rose-250 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  <span>Xóa</span>
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
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
            <div className="px-5 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-50/50 text-left">
              <div>
                <h3 className="text-xs font-extrabold text-[#549B8C] flex items-center gap-2">
                  Hệ thống Phòng học & Khu thực hành
                  <span className="bg-[#549B8C]/15 text-[#549B8C] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#549B8C]/30 font-mono">
                    {activeClassrooms.length} Cơ sở
                  </span>
                </h3>
                <p className="text-[10px] text-slate-450 font-medium">Danh sách các phòng thí nghiệm, phòng học mô phỏng và bãi thực hành đang hoạt động (Đồng bộ Firebase)</p>
              </div>
              {isAuthorized && (
                <button
                  type="button"
                  onClick={startAddClassroom}
                  className="inline-flex items-center gap-1.5 bg-[#549B8C] hover:bg-[#437d71] text-white text-[11px] font-bold px-3 py-2 rounded-xl shadow-xs transition-colors cursor-pointer animate-in fade-in duration-200"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Đăng ký phòng học
                </button>
              )}
            </div>

            {/* Grid of Classrooms */}
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
              {activeClassrooms.map((room) => {
                // Determine layout styles/facilities based on room id
                let facilities: string[] = [];
                let colorTheme = 'emerald';
                let iconText = '🏢';
                
                if (room.id === 'room-101') {
                  facilities = ['Dây đai An toàn', 'Giàn giáo Tiếp cận Trên cao', 'Bảng Quy chuẩn HSE', 'Hệ thống Âm thanh'];
                  colorTheme = 'emerald';
                  iconText = '🧪';
                } else if (room.id === 'room-102') {
                  facilities = ['Mạng Cảm biến Rủi ro', 'Rào cản Tiếng ồn', 'Bảng trắng Tương tác Kỹ thuật số', 'Giả lập Điều kiện Khí hậu'];
                  colorTheme = 'indigo';
                  iconText = '🌡️';
                } else if (room.id === 'room-ex') {
                  facilities = ['Hệ thống Đánh lửa Thử nghiệm', 'Mạng lưới Họng nước cứu hỏa', 'Bình chữa cháy Bột khô', 'Kệ mặt nạ Phòng khí độc'];
                  colorTheme = 'rose';
                  iconText = '🔥';
                } else if (room.id === 'room-conf') {
                  facilities = ['Cửa thép Kín khí Khẩn cấp', 'Thiết bị Đo Khí O2', 'Móc treo Davit & Winch', 'Hệ thống Đèn cứu nạn'];
                  colorTheme = 'amber';
                  iconText = '⚓';
                } else if (room.id === 'room-eco') {
                  facilities = ['Máy đo quang phổ Đất & Chất lỏng', 'Phân tích Chất lượng Nước sạch', 'Kính hiển vi Kỹ thuật số', 'Cân phân tích Độ chia Nhỏ'];
                  colorTheme = 'teal';
                  iconText = '🌿';
                } else {
                  facilities = ['Trang thiết bị đào tạo tự chọn', 'Bảng Quy chuẩn HSE', 'Hệ thống hỗ trợ giảng dạy'];
                  colorTheme = 'emerald';
                  iconText = '🏫';
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
                          colorTheme === 'amber' ? 'bg-amber-50 text-amber-555 border border-amber-200' :
                          colorTheme === 'teal' ? 'bg-teal-50 text-teal-700 border border-teal-200' :
                          'bg-emerald-50 text-emerald-700 border border-emerald-250'
                        }`}>
                          {room.building}
                        </span>
                      </div>

                      <h4 className="text-xs font-extrabold text-slate-850 truncate">{room.name}</h4>
                      <p className="text-[10px] text-slate-450 mt-0.5 flex items-center gap-1 flex-row">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-300 shrink-0"></span>
                        <span className="truncate">{room.building}</span>
                      </p>

                      <div className="mt-4 space-y-1.5">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Trang thiết bị & Vật tư:</span>
                        <div className="flex flex-wrap gap-1">
                          {facilities.map((fac, idx) => (
                            <span key={idx} className="bg-slate-55 border border-slate-150 text-slate-600 text-[9px] px-1.5 py-0.5 rounded font-medium">
                              {fac}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between flex-row">
                      <div className="flex flex-col">
                        <span className="text-[8px] text-slate-450 uppercase font-black">Giới hạn Sức chứa</span>
                        <span className="text-xs font-black text-slate-850 font-mono">{room.capacity} học viên</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-row">
                        {isAuthorized && (
                          <div className="flex items-center gap-1.5 mr-1 text-[#549B8C]">
                            <button
                              type="button"
                              onClick={() => startEditClassroom(room)}
                              className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-[#549B8C] transition-colors cursor-pointer"
                              title="Sửa phòng học"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setClassroomToDelete(room)}
                              className="p-1 hover:bg-rose-50 rounded text-slate-450 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Xóa phòng học"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                        <span className="text-[10px] text-emerald-850 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/50">
                          Hoạt động
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
              className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden w-full max-w-md relative z-10 text-left"
            >
              {/* Modal Header */}
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/40 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <UserPlus className="h-4.5 w-4.5 text-slate-600" />
                  <h3 className="text-xs font-bold text-slate-950">
                    {editingId ? 'Cập nhật Thông tin Thành viên' : 'Đăng ký Thành viên Mới'}
                  </h3>
                </div>
                <button 
                  type="button"
                  onClick={cancelEdit}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  title="Đóng Cửa sổ"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                {editingId && (
                  <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-xl text-[11px] text-amber-800 flex items-center justify-between flex-row">
                    <span className="font-semibold">Đang chỉnh sửa thành viên hiện hữu</span>
                    <button 
                      type="button" 
                      onClick={cancelEdit} 
                      className="text-[10px] bg-white border border-amber-250 hover:bg-slate-50 px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer"
                    >
                      Hủy bỏ
                    </button>
                  </div>
                )}

                {error && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200/80 rounded-xl text-[11px] text-rose-700 flex items-start gap-2 text-left">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
                    <span>{error}</span>
                  </div>
                )}

                {success && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-250 rounded-xl text-[11px] text-emerald-800 flex items-center gap-2 text-left">
                    <UserCheck className="h-4 w-4 text-emerald-600" />
                    <span>{successMessage}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-550 uppercase tracking-wider block">Họ và Tên</label>
                  <div className="relative">
                    <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nguyen Van A"
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 outline-hidden transition-all placeholder:text-slate-400 font-medium text-slate-900"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-550 uppercase tracking-wider block flex justify-between">
                    <span>Ngày sinh</span>
                    <span className="text-emerald-700 font-mono italic text-[9px]">ngày/tháng/năm</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      placeholder="Ví dụ: 15/05/1990"
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 outline-hidden transition-all text-slate-700 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-550 uppercase tracking-wider block">Địa chỉ Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="example@safetycentre.org"
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 outline-hidden transition-all placeholder:text-slate-400 text-slate-950 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-550 uppercase tracking-wider block">Số điện thoại</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0912 345 678"
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 outline-hidden transition-all placeholder:text-slate-400 font-mono text-slate-900"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-slate-550 uppercase tracking-wider block">Mật khẩu Truy cập</label>
                    {!(currentUserEmail.toLowerCase() === 'setcadmin' || currentUserEmail.toLowerCase() === 'setcadmin@safetycentre.org') && !(editingId && members.find(m => m.id === editingId)?.email.toLowerCase() === currentUserEmail.toLowerCase()) && (
                      <span className="text-[9px] text-amber-600 font-bold italic bg-amber-50 px-1.5 py-0.5 rounded">Chỉ Admin hệ thống</span>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      disabled={!(currentUserEmail.toLowerCase() === 'setcadmin' || currentUserEmail.toLowerCase() === 'setcadmin@safetycentre.org') && !(editingId && members.find(m => m.id === editingId)?.email.toLowerCase() === currentUserEmail.toLowerCase())}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={!(currentUserEmail.toLowerCase() === 'setcadmin' || currentUserEmail.toLowerCase() === 'setcadmin@safetycentre.org') && !(editingId && members.find(m => m.id === editingId)?.email.toLowerCase() === currentUserEmail.toLowerCase()) ? "••••••••" : "Nhập mật khẩu mới"}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 outline-hidden transition-all placeholder:text-slate-400 font-mono text-slate-900 disabled:bg-slate-55 disabled:text-slate-400 disabled:border-slate-100 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-550 uppercase tracking-wider block">Cấp Trách nhiệm / Phân quyền</label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <select
                      value={authorizedLevel}
                      onChange={(e) => setAuthorizedLevel(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 outline-hidden bg-white text-slate-800 transition-all font-semibold cursor-pointer"
                    >
                      <option value="level 1">Cấp độ 1 (Học viên)</option>
                      <option value="level 2">Cấp độ 2 (Hành chính / Thư ký)</option>
                      <option value="level 3">Cấp độ 3 (Giảng viên / Giám sát)</option>
                      <option value="level 4">Cấp độ 4 (Phó Giám đốc / Giám đốc)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-550 uppercase tracking-wider block">Chức vụ / Vai trò</label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <select
                      value={position}
                      required
                      onChange={(e) => setPosition(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 outline-hidden bg-white text-slate-800 transition-all cursor-pointer font-semibold"
                    >
                      <option value="">Chọn chức danh...</option>
                      <option value="Quản lý">Quản lý</option>
                      <option value="Phó Quản lý">Phó Quản lý</option>
                      <option value="Trưởng nhóm Trực ban">Trưởng nhóm Trực ban</option>
                      <option value="Trưởng nhóm Đào tạo">Trưởng nhóm Đào tạo</option>
                      <option value="Trưởng nhóm Bảo trì">Trưởng nhóm Bảo trì</option>
                      <option value="Giảng viên">Giảng viên</option>
                      <option value="Nhân viên Hành chính">Nhân viên Hành chính</option>
                      <option value="Nhân viên Bảo trì">Nhân viên Bảo trì</option>
                      <option value="Nhân viên Hỗ trợ">Nhân viên Hỗ trợ</option>
                      {customPositions.map(pos => (
                        <option key={pos} value={pos}>{pos}</option>
                      ))}
                      <option value="__custom__">+ Thêm Chức vụ Khác...</option>
                    </select>
                  </div>
                </div>

                {position === '__custom__' && (
                  <div className="space-y-1.5 animate-in fade-in duration-200">
                    <label className="text-[9.5px] font-bold text-emerald-600 uppercase tracking-wider block">Chức vụ tự chọn</label>
                    <input
                      type="text"
                      required
                      value={customPosition}
                      onChange={(e) => setCustomPosition(e.target.value)}
                      placeholder="Ví dụ: Giám sát HSE Cấp cao"
                      className="w-full px-3 py-2 text-xs border border-emerald-250 rounded-xl focus:border-emerald-500 outline-hidden text-slate-900"
                    />
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 flex-row">
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="px-4 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-[#549B8C] hover:bg-[#437C70] rounded-lg transition-all cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>{editingId ? 'Cập nhật' : 'Đăng ký'}</span>
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
              className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden w-full max-w-sm relative z-10 text-left scale-100"
            >
              <div className="p-5 space-y-4">
                <div className="flex gap-3 items-start text-left flex-row">
                  <div className="p-2 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 shrink-0">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-xs font-extrabold text-slate-950 uppercase tracking-wider">Xác nhận Xóa</h3>
                    <p className="text-[11px] text-slate-550 leading-relaxed font-semibold">
                      Bạn có chắc chắn muốn xóa vĩnh viễn và chấm dứt hồ sơ đăng ký thành viên của <span className="font-extrabold text-slate-800">{memberToDelete.name}</span> ra khỏi hệ thống?
                    </p>
                    <p className="text-[10px] text-rose-650 bg-rose-50/55 border border-rose-100 p-2 rounded-lg font-semibold leading-tight">
                      Hành động này không thể được thu hồi và các chứng chỉ an toàn đi kèm sẽ mất hiệu lực.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2 flex-row">
                  <button
                    type="button"
                    onClick={() => setMemberToDelete(null)}
                    className="px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-850 bg-slate-55 hover:bg-slate-100 rounded-lg transition-all cursor-pointer font-sans"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onRemoveMember(memberToDelete.id);
                      if (editingId === memberToDelete.id) cancelEdit();
                      setMemberToDelete(null);
                    }}
                    className="px-5 py-2 text-xs font-black uppercase tracking-wider text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 font-sans border-none shadow-md"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Xác nhận Xóa</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Pop-up Modal for Classrooms */}
      <AnimatePresence>
        {isClassroomModalOpen && (
          <div className="fixed inset-0 z-55 overflow-y-auto flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsClassroomModalOpen(false)}
              className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden w-full max-w-md relative z-10 text-left animate-in fade-in zoom-in duration-200"
            >
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/40 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Briefcase className="h-4.5 w-4.5 text-slate-600" />
                  <h3 className="text-xs font-bold text-slate-950">
                    {editingClassroomId ? 'Cập nhật Phòng học (Firebase)' : 'Thêm Phòng học Mới (Firebase)'}
                  </h3>
                </div>
                <button 
                  type="button"
                  onClick={() => setIsClassroomModalOpen(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-450 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleClassroomSubmit} className="p-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-550 uppercase tracking-wider block">Tên Phòng Học / Cơ Sở</label>
                  <input
                    type="text"
                    required
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder="Ví dụ: Phòng Thực Hành An Toàn 101"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-[#549B8C] focus:ring-1 focus:ring-[#549B8C]/30 outline-none transition-all text-slate-950 font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-550 uppercase tracking-wider block">Sức Chứa (Capacity)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={200}
                    value={roomCapacity}
                    onChange={(e) => setRoomCapacity(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-[#549B8C] focus:ring-1 focus:ring-[#549B8C]/30 outline-none transition-all text-slate-950 font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-550 uppercase tracking-wider block">Tòa Nhà / Vị Trí (Building)</label>
                  <input
                    type="text"
                    required
                    value={roomBuilding}
                    onChange={(e) => setRoomBuilding(e.target.value)}
                    placeholder="Ví dụ: Nhà A (Trụ sở Đào tạo An toàn)"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-[#549B8C] focus:ring-1 focus:ring-[#549B8C]/30 outline-none transition-all text-slate-950 font-medium"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsClassroomModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-[11px] font-bold rounded-xl text-slate-700 transition-colors cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#549B8C] hover:bg-[#437d71] text-white text-[11px] font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    {editingClassroomId ? 'Lưu Thay đổi' : 'Thêm Mới'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Classroom Delete Confirmation Modal */}
      <AnimatePresence>
        {classroomToDelete && (
          <div className="fixed inset-0 z-55 overflow-y-auto flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setClassroomToDelete(null)}
              className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden w-full max-w-sm relative z-10 text-left p-5 text-slate-900"
            >
              <h3 className="text-xs font-bold text-slate-950 mb-2 flex items-center gap-1.5 text-rose-600">
                <AlertCircle className="h-4.5 w-4.5" />
                Xác nhận Xóa Phòng học
              </h3>
              <p className="text-[11px] text-slate-500 leading-relaxed mb-4">
                Bạn có chắc chắn muốn xóa phòng học <strong>{classroomToDelete.name}</strong>? Thao tác này sẽ xóa vĩnh viễn khỏi hệ thống Firebase và không thể hoàn tác.
              </p>
              <div className="flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setClassroomToDelete(null)}
                  className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-[11px] font-bold rounded-lg text-slate-700 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onRemoveClassroom(classroomToDelete.id);
                    setClassroomToDelete(null);
                  }}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Xác nhận Xóa
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
