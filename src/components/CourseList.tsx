import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Course, 
  CourseCategory, 
  CourseLevel, 
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
  Shield, 
  Check, 
  X,
  AlertCircle,
  Hash,
  FileText,
  ListPlus
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

  // Editing mode
  const [editingId, setEditingId] = useState<string | null>(null);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);

  // Form states
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<CourseCategory>('Safety');
  const [level, setLevel] = useState<CourseLevel>('Basic');
  const [description, setDescription] = useState('');
  const [durationDays, setDurationDays] = useState<number>(3);
  const [certificationEarned, setCertificationEarned] = useState('');
  
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
    setError(null);
    setSuccess(false);

    // Smooth scroll to form container
    document.getElementById('course-panel-form-card')?.scrollIntoView({ behavior: 'smooth' });
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
    if (!code.trim() || !title.trim() || !description.trim() || !certificationEarned.trim()) {
      setError('All standard descriptive fields are required to establish high-fidelity training registry.');
      return;
    }

    if (durationDays <= 0) {
      setError('Duration in days must be a positive integer.');
      return;
    }

    if (syllabusList.length === 0) {
      setError('Please add at least one syllabus topic outline representing course competencies.');
      return;
    }

    if (editingId) {
      // Find original course to keep existing quiz questions if modify is requested
      const originalCourse = courses.find(c => c.id === editingId);
      const updatedCourse: Course = {
        id: editingId,
        code: code.trim().toUpperCase(),
        title: title.trim(),
        category,
        level,
        description: description.trim(),
        durationDays,
        certificationEarned: certificationEarned.trim(),
        syllabus: syllabusList,
        quizQuestions: originalCourse?.quizQuestions || []
      };

      onUpdateCourse(updatedCourse);
      setSuccessMessage(`Successfully updated course ${updatedCourse.code} in catalog.`);
      setSuccess(true);
      cancelEdit();
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
        category,
        level,
        description: description.trim(),
        durationDays,
        certificationEarned: certificationEarned.trim(),
        syllabus: syllabusList,
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
      
      // Clear form
      cancelEdit();
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

  // Custom Category Styling Helpers
  const getCategoryStyles = (cat: CourseCategory) => {
    switch (cat) {
      case 'Safety':
        return { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', tag: 'bg-emerald-100 text-emerald-800' };
      case 'Emergency':
        return { bg: 'bg-amber-50 text-amber-700 border-amber-200', tag: 'bg-amber-150 text-amber-900' };
      case 'Environment':
        return { bg: 'bg-sky-50 text-sky-700 border-sky-200', tag: 'bg-sky-100 text-sky-800' };
      case 'Health':
        return { bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', tag: 'bg-indigo-100 text-indigo-800' };
      case 'Compliance':
        return { bg: 'bg-purple-50 text-purple-700 border-purple-200', tag: 'bg-purple-100 text-purple-850' };
      default:
        return { bg: 'bg-slate-50 text-slate-700 border-slate-200', tag: 'bg-slate-100 text-slate-800' };
    }
  };

  return (
    <div id="course-database-container" className="grid grid-cols-1 xl:grid-cols-12 gap-6 w-full max-w-7xl mx-auto">
      
      {/* Left Column: Register Course Form (Compressed Column) */}
      <div className="xl:col-span-3 space-y-6">
        
        {/* Security Summary Badge */}
        <div className={`p-4 rounded-2xl border flex items-start gap-3.5 transition-all ${
          hasLevel4Access 
            ? 'bg-emerald-50/40 border-emerald-200/80' 
            : 'bg-amber-50/40 border-amber-200/80'
        }`}>
          <div className={`p-2 rounded-xl border ${
            hasLevel4Access ? 'bg-emerald-100/50 border-emerald-200 text-emerald-700' : 'bg-amber-100/50 border-amber-200 text-amber-700'
          }`}>
            <Shield className="h-4 w-4" />
          </div>
          <div className="space-y-0.5">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono">AUTHORIZED ACCESS ONLY</h4>
            <p className="text-[11px] text-slate-600 leading-tight">
              {hasLevel4Access ? (
                <>Logged in with <span className="font-bold text-emerald-700 uppercase">Auth Level 4</span> clearance. Full management access unlocked.</>
              ) : (
                <>Database locked to read-only mode. Adding and modifying programs requires <span className="font-bold text-amber-700">Auth Level 4</span> clearance.</>
              )}
            </p>
          </div>
        </div>

        {/* Form panel card */}
        <div id="course-panel-form-card" className="bg-white rounded-2xl border border-slate-200 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-emerald-650" />
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider font-mono">
                {editingId ? 'Update Program Details' : 'Add Course Entry'}
              </h3>
            </div>
            {editingId && (
              <button 
                type="button" 
                onClick={cancelEdit}
                className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-150 rounded-lg transition-all"
                title="Cancel Edit"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            )}
          </div>

          {success && (
            <div className="m-4 mb-0 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 flex items-start gap-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
              <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {error && (
            <div className="m-4 mb-0 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-800 flex items-start gap-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {editingId && !hasLevel4Access ? (
            /* Update blocked if not level 4 */
            <div className="p-6 text-center space-y-4 animate-in fade-in duration-200">
              <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto text-rose-600 border border-rose-100">
                <Lock className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-900">Update Entry Access Blocked</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed max-w-xs mx-auto">
                  The <span className="font-semibold text-slate-800">Update Training Database</span> form is exclusively visible to users with <span className="font-bold text-amber-600 uppercase">Auth Level 4</span> clearance.
                </p>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-left space-y-2">
                <div className="text-[11px] text-slate-600 flex justify-between">
                  <span>Your email address:</span>
                  <span className="font-mono text-[10px] font-semibold">{currentUserEmail}</span>
                </div>
                <div className="text-[11px] text-slate-600 flex justify-between">
                  <span>Your clearance level:</span>
                  <span className="font-bold uppercase text-slate-800 text-[10px] bg-slate-100 px-1.5 py-0.5 rounded-sm border border-slate-200">{currentUserLevel}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={cancelEdit}
                className="w-full text-xs font-bold bg-slate-100 hover:bg-slate-150 text-slate-705 py-2 rounded-xl transition-all border-none outline-none cursor-pointer"
              >
                Return to Directory
              </button>
            </div>
          ) : !hasLevel4Access ? (
            /* Locked View for unauthorized users */
            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto text-slate-400 border border-slate-150">
                <Lock className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-800">Addition Locked</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed max-w-xs mx-auto">
                  Adding new training specifications to the curriculum is restricted to administrators holding <span className="font-bold text-indigo-700">Auth Level 4</span> clearance.
                </p>
              </div>
              <div className="bg-slate-100/50 p-3.5 rounded-xl border border-slate-150 text-left space-y-1 text-[11px] text-slate-550">
                <p className="font-medium text-slate-700">Read-Only Capabilities:</p>
                <p>• Clean real-time lookup & search</p>
                <p>• Filter courses by level and domain</p>
                <p>• Inspect module syllabus guides</p>
              </div>
            </div>
          ) : (
            /* Active verified administrator form */
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {/* Code */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-450 tracking-wider flex items-center gap-1 font-mono">
                  <Hash className="h-3 w-3" />
                  <span>Program Code</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. OSHA-30, HAZWOPER-40"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-lg px-2.5 py-1.5 outline-none transition-all"
                />
              </div>

              {/* Title */}
              <div className="space-y-1 flex-1">
                <label className="text-[10px] font-black uppercase text-slate-450 tracking-wider flex items-center gap-1 font-mono">
                  <FileText className="h-3 w-3" />
                  <span>Program Title</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. OSHA General Industry Cert"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-lg px-2.5 py-1.5 outline-none transition-all"
                />
              </div>

              {/* Grid 2x2 for Category & Level */}
              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-450 tracking-wider font-mono">Domain Area</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as CourseCategory)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 outline-none cursor-pointer focus:border-emerald-500"
                  >
                    <option value="Safety">Safety</option>
                    <option value="Environment">Environment</option>
                    <option value="Emergency">Emergency</option>
                    <option value="Health">Health</option>
                    <option value="Compliance">Compliance</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-450 tracking-wider font-mono">Competency Level</label>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value as CourseLevel)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 outline-none cursor-pointer focus:border-emerald-500"
                  >
                    <option value="Basic">Basic</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
              </div>

              {/* Duration and Certification */}
              <div className="grid grid-cols-5 gap-3.5">
                <div className="space-y-1 col-span-2">
                  <label className="text-[10px] font-black uppercase text-slate-450 tracking-wider font-mono">Days</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={durationDays || ''}
                    onChange={(e) => setDurationDays(Number(e.target.value))}
                    className="w-full text-xs bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-lg px-2.5 py-1.5 outline-none transition-all"
                  />
                </div>

                <div className="space-y-1 col-span-3">
                  <label className="text-[10px] font-black uppercase text-slate-450 tracking-wider font-mono">Award/Cert Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. EPA License Card"
                    value={certificationEarned}
                    onChange={(e) => setCertificationEarned(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-lg px-2.5 py-1.5 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-450 tracking-wider font-mono">Program Description</label>
                <textarea
                  required
                  rows={2}
                  maxLength={160}
                  placeholder="Summary overview of training materials, competencies..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-lg px-2.5 py-1.5 outline-none transition-all resize-none"
                />
              </div>

              {/* Syllabus Topic Accumulator */}
              <div className="space-y-2 border-t border-slate-100 pt-3.5">
                <label className="text-[10px] font-black uppercase text-slate-450 tracking-wider flex items-center gap-1 font-mono">
                  <ListPlus className="h-3 w-3" />
                  <span>Syllabus Topics Outline</span>
                </label>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add topic..."
                    value={syllabusInput}
                    onChange={(e) => setSyllabusInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addSyllabusTopic();
                      }
                    }}
                    className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={addSyllabusTopic}
                    className="px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all inline-flex items-center justify-center border-none text-xs font-bold cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                {/* Displayed Accumulator list */}
                {syllabusList.length === 0 ? (
                  <p className="text-[10px] text-slate-400 italic">No curriculum topics registered yet. Add at least one.</p>
                ) : (
                  <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1 border border-slate-100 bg-slate-50/20 p-2 rounded-lg">
                    {syllabusList.map((topic, i) => (
                      <div key={i} className="flex items-center justify-between gap-1.5 bg-white border border-slate-150 p-1.5 rounded-md shadow-3xs animate-in zoom-in-95 duration-150 text-[11px] text-slate-700">
                        <span className="truncate flex-1 font-medium">{topic}</span>
                        <button
                          type="button"
                          onClick={() => removeSyllabusTopic(i)}
                          className="text-slate-400 hover:text-rose-600 p-0.5 rounded-md hover:bg-rose-50 cursor-pointer border-none"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-slate-100 pt-4 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-850 text-white text-xs font-bold py-2 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer border-none"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>{editingId ? 'Save Changes' : 'Register Program'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Right Column: Dynamic Course Directory List (Widened Column) */}
      <div className="xl:col-span-9 space-y-6">
        
        {/* Directory Card with filters */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] overflow-hidden">
          
          {/* Header Row */}
          <div className="p-5 border-b border-slate-150 bg-slate-50/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            <div className="space-y-1">
              <h2 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Layers className="h-4 w-4 text-emerald-600" />
                <span>Course Program Administration Directory</span>
              </h2>
              <p className="text-[11px] text-slate-500">
                Manage, search, and update high-fidelity regulatory curriculum parameters in real time.
              </p>
            </div>

            {/* Direct counter stats metric */}
            <div className="flex items-center gap-3">
              <div className="bg-slate-100 hover:bg-slate-150 p-2 border border-slate-200 rounded-xl text-center select-none transition-all">
                <p className="text-[9px] font-black uppercase text-slate-400 font-mono">Count</p>
                <p className="text-xs font-bold text-slate-800">{filteredCourses.length} Registered</p>
              </div>
            </div>

          </div>

          {/* Filters Row */}
          <div className="p-4 border-b border-slate-150 bg-slate-50/20 flex flex-col sm:flex-row gap-3">
            
            {/* Search Box */}
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Lookup programs by code, title, description, reward credentials..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs bg-white border border-slate-200 h-9 pl-9 pr-4 rounded-lg outline-none transition-all placeholder:text-slate-400 focus:border-slate-350 focus:shadow-3xs"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            </div>

            {/* Custom Domain area Filter Dropdown */}
            <div className="relative w-full sm:w-44">
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value as any)}
                className="w-full text-xs bg-white border border-slate-200 h-9 px-3 pr-8 rounded-lg outline-none cursor-pointer appearance-none text-slate-705 font-bold hover:bg-slate-50 transition-all font-mono"
              >
                <option value="All">All Domains</option>
                <option value="Safety">Safety</option>
                <option value="Environment">Environment</option>
                <option value="Emergency">Emergency</option>
                <option value="Health">Health</option>
                <option value="Compliance">Compliance</option>
              </select>
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none">▼</span>
            </div>

            {/* Custom Level area Filter Dropdown */}
            <div className="relative w-full sm:w-44">
              <select
                value={selectedLevelFilter}
                onChange={(e) => setSelectedLevelFilter(e.target.value as any)}
                className="w-full text-xs bg-white border border-slate-200 h-9 px-3 pr-8 rounded-lg outline-none cursor-pointer appearance-none text-slate-750 font-bold hover:bg-slate-50 transition-all font-mono"
              >
                <option value="All">All Levels</option>
                <option value="Basic">Basic</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none">▼</span>
            </div>

          </div>

          {/* Directory Listings Table style */}
          <div className="overflow-x-auto">
            {filteredCourses.length === 0 ? (
              <div className="py-12 p-6 text-center space-y-3">
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center mx-auto text-slate-400 border border-slate-205">
                  <Search className="h-4.5 w-4.5" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-slate-800">No Program Specifications Discovered</h4>
                  <p className="text-[11px] text-slate-550 max-w-sm mx-auto leading-relaxed">
                    We couldn't discover any curriculum specifications corresponding with your keyword filter parameters. Modify your search bounds.
                  </p>
                </div>
              </div>
            ) : (
              <table className="w-full text-left border-collapse table-auto">
                <thead>
                  <tr className="bg-slate-100/50 border-b border-slate-150 text-[10px] font-black uppercase text-slate-500 tracking-wider font-mono">
                    <th className="px-4 py-3 text-center w-[7%]">ID</th>
                    <th className="px-4 py-3 w-[15%]">Code</th>
                    <th className="px-4 py-3 w-[25%]">Program Title</th>
                    <th className="px-4 py-3 w-[15%]">Domain Domain</th>
                    <th className="px-4 py-3 w-[12%] text-center">Duration</th>
                    <th className="px-4 py-3 w-[15%]">Associated Award</th>
                    <th className="px-4 py-3 text-center w-[11%]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 font-sans text-xs">
                  {filteredCourses.map((c) => {
                    const style = getCategoryStyles(c.category);
                    const isSelectedEditing = editingId === c.id;

                    return (
                      <tr 
                        key={c.id}
                        className={`hover:bg-slate-50/55 transition-all text-slate-705 ${
                          isSelectedEditing ? 'bg-emerald-50/10' : ''
                        }`}
                      >
                        {/* 1. ID */}
                        <td className="px-4 py-3 text-center font-mono text-[10px] text-slate-400">
                          {c.id.replace('course-', '')}
                        </td>

                        {/* 2. Code */}
                        <td className="px-4 py-3 font-semibold text-sky-850 tracking-wide font-mono">
                          {c.code}
                        </td>

                        {/* 3. Title & Description combined */}
                        <td className="px-4 py-3 space-y-1">
                          <p className="font-bold text-slate-850 leading-snug">{c.title}</p>
                          <p className="text-[10px] text-slate-500 leading-relaxed font-normal line-clamp-1" title={c.description}>
                            {c.description}
                          </p>
                          {/* Mini Syllabus Tags */}
                          {c.syllabus && c.syllabus.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              <span className="text-[9px] font-black font-mono text-slate-450 uppercase shrink-0">Topics:</span>
                              {c.syllabus.slice(0, 3).map((topic, index) => (
                                <span key={index} className="px-1.5 py-0.5 rounded-sm bg-slate-100 text-[9px] text-slate-550 border border-slate-200">
                                  {topic}
                                </span>
                              ))}
                              {c.syllabus.length > 3 && (
                                <span className="text-[9px] font-semibold text-slate-400 px-1 hover:text-emerald-700 transition-colors">
                                  +{c.syllabus.length - 3} more
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* 4. Category & Level Badges */}
                        <td className="px-4 py-3 space-y-1">
                          <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-bold rounded-sm border ${style.bg}`}>
                            {c.category}
                          </span>
                          <span className="block text-[10px] text-slate-500 font-semibold italic">
                            Level: <span className="text-slate-700 font-bold">{c.level}</span>
                          </span>
                        </td>

                        {/* 5. Duration */}
                        <td className="px-4 py-3 text-center">
                          <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-50 border border-slate-200 text-[10px] font-bold rounded-lg text-slate-700">
                            <Clock className="h-3 w-3 text-slate-400" />
                            <span>{c.durationDays} Days</span>
                          </div>
                        </td>

                        {/* 6. Certification Earned */}
                        <td className="px-4 py-3">
                          <div className="flex items-start gap-1.5 text-[11px] font-medium text-slate-650" title={c.certificationEarned}>
                            <Award className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                            <span className="line-clamp-2">{c.certificationEarned}</span>
                          </div>
                        </td>

                        {/* 7. Action column - Icon Only updates and deletes */}
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            {/* Update Program - Locked/Visible under Auth Level 4 */}
                            {hasLevel4Access ? (
                              <button
                                onClick={() => startEdit(c)}
                                className={`p-2 rounded-lg border transition-all inline-flex items-center justify-center cursor-pointer ${
                                  isSelectedEditing 
                                    ? 'bg-emerald-600 border-emerald-650 text-white shadow-xs' 
                                    : 'bg-white border-slate-200 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200'
                                }`}
                                title="Update Program Specification"
                              >
                                <Pencil className="h-3.5 w-3.5 shrink-0" />
                              </button>
                            ) : (
                              <button
                                disabled
                                className="p-2 rounded-lg border border-slate-205 bg-slate-50 text-slate-400 cursor-not-allowed inline-flex items-center justify-center"
                                title="Update requires Level 4 Clearance"
                              >
                                <Lock className="h-3.5 w-3.5 shrink-0" />
                              </button>
                            )}

                            {/* Delete Program - Locked/Visible to Level 4 */}
                            {hasLevel4Access ? (
                              <button
                                onClick={() => setCourseToDelete(c)}
                                className="p-2 bg-white text-rose-605 border border-slate-200 hover:border-rose-200 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-all inline-flex items-center justify-center cursor-pointer"
                                title="Delete Course Program"
                              >
                                <Trash2 className="h-3.5 w-3.5 shrink-0" />
                              </button>
                            ) : (
                              <button
                                disabled
                                className="p-2 rounded-lg border border-slate-205 bg-slate-50 text-slate-400 cursor-not-allowed inline-flex items-center justify-center"
                                title="Delete requires Level 4 Clearance"
                              >
                                <Lock className="h-3.5 w-3.5 shrink-0" />
                              </button>
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

      {/* Confirm Deletion Pop-up Window Modal */}
      <AnimatePresence>
        {courseToDelete && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
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
              <div className="p-5 space-y-4">
                <div className="flex gap-3 items-start">
                  <div className="p-2 bg-rose-50 border border-rose-200 rounded-xl text-rose-650 shrink-0">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-xs font-extrabold text-slate-950 uppercase tracking-wider">Confirm Delete</h3>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                      Are you sure you want to permanently delete and decommission standard training course <span className="font-extrabold text-slate-800">{courseToDelete.code}</span> ({courseToDelete.title})?
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
                    className="px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-850 bg-slate-55 hover:bg-slate-100 rounded-lg transition-all cursor-pointer font-sans"
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
                    className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-all cursor-pointer flex items-center gap-1 font-sans"
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
