import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Course, 
  CourseCategory, 
  CourseLevel, 
  CourseDomain,
  Member 
} from '../types';
import { 
  Pencil, 
  Trash2, 
  Plus, 
  Search, 
  BookOpen, 
  Award, 
  Clock, 
  Layers, 
  Lock, 
  Check, 
  X,
  AlertCircle,
  Hash,
  FileText
} from 'lucide-react';

interface CourseListProps {
  courses: Course[];
  onAddCourse: (course: Course) => void;
  onUpdateCourse: (course: Course) => void;
  onRemoveCourse: (id: string) => void;
  currentUserEmail: string;
  authorizedEmail: string;
  members: Member[];
}

export default function CourseList({
  courses,
  onAddCourse,
  onUpdateCourse,
  onRemoveCourse,
  currentUserEmail,
  authorizedEmail,
  members
}: CourseListProps) {
  // Determine current logged-in user's clearance Level
  const loggedInMember = members.find(m => m.email.toLowerCase() === currentUserEmail.toLowerCase());
  const currentUserLevel = loggedInMember?.authorizedLevel || (currentUserEmail.toLowerCase() === authorizedEmail.toLowerCase() ? 'level 4' : 'level 1');
  const hasLevel4Access = currentUserLevel.toLowerCase() === 'level 4';

  // Search filter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<'All' | CourseCategory>('All');
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<'All' | CourseLevel>('All');

  // Editing and deletion states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form states
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<CourseCategory>('Safety');
  const [level, setLevel] = useState<CourseLevel>('Basic');
  const [description, setDescription] = useState('');
  const [durationDays, setDurationDays] = useState<number>(3);
  const [certificationEarned, setCertificationEarned] = useState('');
  const [domain, setDomain] = useState<CourseDomain>('HSE');
  
  // Syllabus state (entered line by line)
  const [syllabusInput, setSyllabusInput] = useState('');
  const [syllabusList, setSyllabusList] = useState<string[]>([]);

  // Validation & Feedback
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Handle syllabus adding
  const addSyllabusTopic = () => {
    if (!syllabusInput.trim()) return;
    setSyllabusList(prev => [...prev, syllabusInput.trim()]);
    setSyllabusInput('');
  };

  const removeSyllabusTopic = (index: number) => {
    setSyllabusList(prev => prev.filter((_, idx) => idx !== index));
  };

  // Populate form for editing
  const startEdit = (course: Course) => {
    setEditingId(course.id);
    setCode(course.code);
    setTitle(course.title);
    setCategory(course.category);
    setLevel(course.level);
    setDescription(course.description);
    setDurationDays(course.durationDays);
    setCertificationEarned(course.certificationEarned);
    setSyllabusList(course.syllabus || []);
    setSyllabusInput('');
    setDomain(course.domain || 'HSE');
    setError(null);
    setSuccess(false);
    setIsAddModalOpen(true);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setCode('');
    setTitle('');
    setCategory('Safety');
    setLevel('Basic');
    setDescription('');
    setDurationDays(3);
    setCertificationEarned('');
    setSyllabusList([]);
    setSyllabusInput('');
    setDomain('HSE');
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Permission check
    if (!hasLevel4Access) {
      setError('You must have Auth Level 4 Clearance to register or update training courses.');
      return;
    }

    // Validation
    if (!code.trim() || !title.trim()) {
      setError('Course ID and Course Name are required.');
      return;
    }

    if (durationDays <= 0) {
      setError('Duration in days must be a positive integer.');
      return;
    }

    const finalCategory = category || 'Safety';
    const finalLevel = level || 'Basic';
    const finalDescription = description.trim() || `Comprehensive curriculum details for the ${title.trim()} program, aligning with current safety standards and operating procedures.`;
    const finalCertificationEarned = certificationEarned.trim() || `${title.trim()} Completion Certificate`;
    const finalSyllabus = syllabusList.length > 0 ? syllabusList : ['Module 1: Introduction and Core Overview', 'Module 2: Practical Exercises and Direct Assessment', 'Module 3: Certification Review and Validation'];

    if (editingId) {
      // Find original course to keep existing quiz questions if modify is requested
      const originalCourse = courses.find(c => c.id === editingId);
      const updatedCourse: Course = {
        id: editingId,
        code: code.trim().toUpperCase(),
        title: title.trim(),
        category: finalCategory,
        level: finalLevel,
        description: finalDescription,
        durationDays,
        certificationEarned: finalCertificationEarned,
        syllabus: finalSyllabus,
        domain,
        quizQuestions: originalCourse?.quizQuestions || []
      };

      onUpdateCourse(updatedCourse);
      setSuccessMessage(`Successfully updated course ${updatedCourse.code} in catalog.`);
      setSuccess(true);
      cancelEdit();
      setIsAddModalOpen(false);
    } else {
      // Check duplicate code
      const isDuplicate = courses.some(c => c.code.toLowerCase() === code.trim().toLowerCase());
      if (isDuplicate) {
        setError(`A course program with program code "${code.trim().toUpperCase()}" is already registered.`);
        return;
      }

      const newCourse: Course = {
        id: `course-${Date.now()}`,
        code: code.trim().toUpperCase(),
        title: title.trim(),
        category: finalCategory,
        level: finalLevel,
        description: finalDescription,
        durationDays,
        certificationEarned: finalCertificationEarned,
        syllabus: finalSyllabus,
        domain,
        quizQuestions: [
          {
            id: `q-${Date.now()}-1`,
            question: `What is the primary objective of the ${code.trim().toUpperCase()} training program?`,
            options: [
              'Ensuring full regulatory compliance and operational safety standardizations',
              'Speeding up facility delivery ignoring checklists',
              'Decreasing safety budgets to baseline levels',
              'None of the above'
            ],
            correctAnswerIndex: 0
          }
        ]
      };

      onAddCourse(newCourse);
      setSuccessMessage(`Successfully registered ${newCourse.code} program into database.`);
      setSuccess(true);
      cancelEdit();
      setIsAddModalOpen(false);
    }

    // Auto dismiss success state
    setTimeout(() => {
      setSuccess(false);
    }, 4000);
  };

  // Filtered courses list
  const filteredCourses = courses.filter(c => {
    const term = searchTerm.toLowerCase();
    const matchSearch = c.code.toLowerCase().includes(term) || 
                        c.title.toLowerCase().includes(term) ||
                        c.description.toLowerCase().includes(term) ||
                        c.certificationEarned.toLowerCase().includes(term);
    const matchCat = selectedCategoryFilter === 'All' || c.category === selectedCategoryFilter;
    const matchLvl = selectedLevelFilter === 'All' || c.level === selectedLevelFilter;
    return matchSearch && matchCat && matchLvl;
  });

  // Grouped courses reactively
  const opitoCourses = filteredCourses.filter(c => c.domain === 'OPITO/GWO');
  const hseCourses = filteredCourses.filter(c => c.domain === 'HSE' || !c.domain);
  const decreeCourses = filteredCourses.filter(c => c.domain === 'Decree' || c.domain?.toLowerCase() === 'decree');

  // Custom Category Styling Helpers
  const getCategoryStyles = (cat: CourseCategory) => {
    switch (cat) {
      case 'Safety':
        return { bg: 'bg-emerald-50 text-emerald-700 border-emerald-250', tag: 'bg-emerald-100 text-emerald-800' };
      case 'Emergency':
        return { bg: 'bg-amber-50 text-amber-700 border-amber-250', tag: 'bg-amber-150 text-amber-900' };
      case 'Environment':
        return { bg: 'bg-sky-50 text-sky-700 border-sky-250', tag: 'bg-sky-100 text-sky-800' };
      case 'Health':
        return { bg: 'bg-indigo-50 text-indigo-700 border-indigo-250', tag: 'bg-indigo-100 text-indigo-800' };
      case 'Compliance':
        return { bg: 'bg-purple-50 text-purple-700 border-purple-250', tag: 'bg-purple-100 text-purple-855' };
      default:
        return { bg: 'bg-slate-50 text-slate-700 border-slate-250', tag: 'bg-slate-100 text-slate-800' };
    }
  };

  const renderDomainTable = (domainCourses: Course[], domainName: string) => {
    if (domainCourses.length === 0) {
      return (
        <div id={`empty-state-${domainName.replace('/', '-').toLowerCase()}`} className="py-6 px-4 bg-slate-50/50 border border-slate-200 border-dashed rounded-xl text-center">
          <p className="text-[11px] text-slate-400 font-medium italic">No courses registered matching your filters.</p>
        </div>
      );
    }

    return (
      <div id={`table-container-${domainName.replace('/', '-').toLowerCase()}`} className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-3xs">
        <table className="w-full text-left border-collapse table-auto">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[9.5px] font-black uppercase text-slate-500 tracking-wider font-mono">
              <th className="px-4 py-2.5 w-[20%]">Course ID</th>
              <th className="px-4 py-2.5 w-[50%]">Course Name</th>
              <th className="px-4 py-2.5 w-[15%] text-center">Duration</th>
              <th className="px-4 py-2.5 text-center w-[15%]">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-150 font-sans text-xs">
            {domainCourses.map((c) => {
              const isSelectedEditing = editingId === c.id;

              return (
                <tr 
                  id={`course-row-${c.id}`}
                  key={c.id}
                  className={`hover:bg-slate-50/55 transition-all text-slate-705 ${
                    isSelectedEditing ? 'bg-emerald-50/10' : ''
                  }`}
                >
                  {/* 1. Course ID */}
                  <td className="px-4 py-3.5 font-bold text-sky-900 tracking-wide font-mono">
                    {c.code}
                  </td>

                  {/* 2. Course Name */}
                  <td className="px-4 py-3.5 font-bold text-slate-900 leading-snug">
                    {c.title}
                  </td>

                  {/* 3. Duration */}
                  <td className="px-4 py-3.5 text-center">
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-50 border border-slate-200 text-[10px] font-bold rounded-md text-slate-705">
                      <Clock className="h-3 w-3 text-slate-400 shrink-0" />
                      <span>{c.durationDays} Days</span>
                    </div>
                  </td>

                  {/* 4. Action column */}
                  <td className="px-4 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {hasLevel4Access ? (
                        <button
                          id={`btn-edit-course-${c.id}`}
                          type="button"
                          onClick={() => startEdit(c)}
                          className={`p-1.5 rounded-lg border transition-all inline-flex items-center justify-center cursor-pointer ${
                            isSelectedEditing 
                              ? 'bg-emerald-600 border-emerald-650 text-white shadow-xs' 
                              : 'bg-white border-slate-200 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200'
                          }`}
                          title="Update Program Specification"
                        >
                          <Pencil className="h-3 w-3 shrink-0" />
                        </button>
                      ) : (
                        <button
                          disabled
                          className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed inline-flex items-center justify-center"
                          title="Update requires Level 4 Clearance"
                        >
                          <Lock className="h-3 w-3 shrink-0" />
                        </button>
                      )}

                      {hasLevel4Access ? (
                        <button
                          id={`btn-delete-course-${c.id}`}
                          type="button"
                          onClick={() => setCourseToDelete(c)}
                          className="p-1.5 bg-white text-rose-600 border border-slate-200 hover:border-rose-200 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-all inline-flex items-center justify-center cursor-pointer"
                          title="Delete Course Program"
                        >
                          <Trash2 className="h-3 w-3 shrink-0" />
                        </button>
                      ) : (
                        <button
                          disabled
                          className="p-1.5 rounded-lg border border-slate-205 bg-slate-50 text-slate-400 cursor-not-allowed inline-flex items-center justify-center"
                          title="Delete requires Level 4 Clearance"
                        >
                          <Lock className="h-3 w-3 shrink-0" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div id="course-database-container" className="w-full max-w-7xl mx-auto space-y-6">
      
      {/* Top Banner Success message */}
      <AnimatePresence>
        {success && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 flex items-start gap-2.5 relative z-10"
          >
            <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <span className="font-medium">{successMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Course Directory List layout (Takes entire grid area now) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] overflow-hidden">
        
        {/* Header Row */}
        <div className="p-5 border-b border-slate-150 bg-slate-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 id="course-directory-title" className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2 uppercase font-mono">
              <Layers className="h-4 w-4 text-emerald-600" />
              <span>courses list</span>
            </h2>
          </div>

          {/* Action buttons on the right of header */}
          <div className="flex items-center gap-3">
            {hasLevel4Access ? (
              <button
                id="btn-add-course"
                type="button"
                onClick={() => {
                  cancelEdit();
                  setIsAddModalOpen(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer border-none font-sans"
              >
                <Plus className="h-4 w-4 shrink-0" />
                <span>Add Course</span>
              </button>
            ) : (
              <button
                id="btn-add-course-disabled"
                type="button"
                disabled
                className="bg-slate-100 border border-slate-200 text-slate-400 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 cursor-not-allowed font-sans"
                title="Adding courses requires Level 4 clearance"
              >
                <Lock className="h-4 w-4 shrink-0" />
                <span>Add Course</span>
              </button>
            )}
          </div>
        </div>

        {/* Partitioned Directory Content containing 3 Tables by Domain */}
        <div className="p-5 space-y-8">
          
          {/* 1. OPITO / GWO Section */}
          <div id="domain-section-opito" className="space-y-3 text-left">
            <div className="flex items-center justify-between border-b border-slate-205 pb-1.5">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 bg-emerald-600 rounded-full" />
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider font-mono">
                  OPITO / GWO Courses
                </h3>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-150 font-bold font-mono">
                  {opitoCourses.length} Registered
                </span>
              </div>
            </div>
            {renderDomainTable(opitoCourses, 'OPITO/GWO')}
          </div>

          {/* 2. HSE Section */}
          <div id="domain-section-hse" className="space-y-3 text-left">
            <div className="flex items-center justify-between border-b border-slate-205 pb-1.5">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 bg-sky-600 rounded-full" />
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider font-mono">
                  HSE Courses
                </h3>
                <span className="text-[10px] bg-sky-50 text-sky-700 px-2 py-0.5 rounded-full border border-sky-150 font-bold font-mono">
                  {hseCourses.length} Registered
                </span>
              </div>
            </div>
            {renderDomainTable(hseCourses, 'HSE')}
          </div>

          {/* 3. DECREE Section */}
          <div id="domain-section-decree" className="space-y-3 text-left">
            <div className="flex items-center justify-between border-b border-slate-205 pb-1.5">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 bg-indigo-600 rounded-full" />
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider font-mono">
                  DECREE Courses
                </h3>
                <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-150 font-bold font-mono">
                  {decreeCourses.length} Registered
                </span>
              </div>
            </div>
            {renderDomainTable(decreeCourses, 'DECREE')}
          </div>

        </div>

      </div>

      {/* 4. Pop-up Form Modal window for Adding / Editing Course */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div id="modal-add-course-window" className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                cancelEdit();
                setIsAddModalOpen(false);
              }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            />

            {/* Modal content box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="bg-white rounded-2xl border border-slate-205 shadow-2xl overflow-hidden w-full max-w-lg relative z-10 max-h-[85vh] flex flex-col"
            >
              {/* Header */}
              <div className="p-4 border-b border-slate-150 bg-slate-50/80 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4.5 w-4.5 text-emerald-600" />
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider font-mono">
                    {editingId ? 'Update Program Details' : 'Add Course Entry'}
                  </h3>
                </div>
                <button 
                  type="button" 
                  onClick={() => {
                    cancelEdit();
                    setIsAddModalOpen(false);
                  }}
                  className="text-slate-400 hover:text-slate-650 p-1 hover:bg-slate-100 rounded-lg transition-all border-none cursor-pointer"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              {/* Scrollable Form body */}
              <form onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-4 flex-1 text-left">
                {error && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-800 flex items-start gap-2.5 animate-in fade-in duration-150">
                    <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                    <span className="font-semibold">{error}</span>
                  </div>
                )}

                {/* Course ID and Duration row */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  {/* Course ID (Code) */}
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1 font-mono">
                      <Hash className="h-3 w-3" />
                      <span>Course ID (Code)</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. OSHA-30, GWO-FA"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-lg px-2.5 py-2 outline-none transition-all font-mono font-bold text-slate-800"
                    />
                  </div>

                  {/* Duration days */}
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1 font-mono">
                      <Clock className="h-3 w-3" />
                      <span>Duration (Days)</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={durationDays || ''}
                      onChange={(e) => setDurationDays(Number(e.target.value))}
                      className="w-full text-xs bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-lg px-2.5 py-2 outline-none transition-all font-bold text-slate-800"
                    />
                  </div>
                </div>

                {/* Course Name (Title) */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1 font-mono">
                    <FileText className="h-3 w-3" />
                    <span>Course Name</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. OSHA 30-Hour General Industry Certificate"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-lg px-2.5 py-2 outline-none transition-all font-semibold text-slate-800"
                  />
                </div>

                {/* Domain group selection */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider font-mono">Domain Group</label>
                  <select
                    value={domain}
                    onChange={(e) => setDomain(e.target.value as CourseDomain)}
                    className="w-full text-xs bg-slate-50 border border-slate-250 rounded-lg p-2 outline-none cursor-pointer focus:border-emerald-500 font-bold text-slate-800"
                  >
                    <option value="OPITO/GWO">OPITO/GWO</option>
                    <option value="HSE">HSE</option>
                    <option value="Decree">Decree</option>
                  </select>
                </div>

                {/* Pop Up Action buttons */}
                <div className="border-t border-slate-150 pt-4 flex gap-2.5 justify-end shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      cancelEdit();
                      setIsAddModalOpen(false);
                    }}
                    className="px-4 py-2 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer font-sans bg-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer border-none font-sans"
                  >
                    <Check className="h-4 w-4" />
                    <span>{editingId ? 'Save Changes' : 'Register Program'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. Delete Confirmation Pop-up Window Modal */}
      <AnimatePresence>
        {courseToDelete && (
          <div id="modal-delete-course-window" className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCourseToDelete(null)}
              className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden w-full max-w-sm relative z-10"
            >
              <div className="p-5 space-y-4 text-left">
                <div className="flex gap-3 items-start">
                  <div className="p-2 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 shrink-0">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-xs font-extrabold text-slate-950 uppercase tracking-wider font-mono">Confirm Delete</h3>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                      Are you sure you want to permanently delete program <span className="font-extrabold text-slate-800">{courseToDelete.code}</span>?
                    </p>
                    <p className="text-[10px] text-rose-600 bg-rose-50/55 border border-rose-100 p-2 rounded-lg font-semibold leading-tight">
                      This action is irreversible and will purge curriculum records.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setCourseToDelete(null)}
                    className="px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-850 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-all cursor-pointer font-sans"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onRemoveCourse(courseToDelete.id);
                      if (editingId === courseToDelete.id) {
                        cancelEdit();
                      }
                      setCourseToDelete(null);
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
