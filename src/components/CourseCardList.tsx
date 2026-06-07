import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  BookOpen, 
  Clock, 
  ShieldAlert, 
  X, 
  Check, 
  AlertCircle,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import { Course, CourseSession, CourseDomain, CourseCategory } from '../types';

interface CourseCardListProps {
  courses: Course[];
  sessions: CourseSession[];
  onSelectCourse: (course: Course, session: CourseSession) => void;
  onAddCourse: (course: Course) => void;
  currentUserEmail: string;
  members: any[];
}

export default function CourseCardList({ 
  courses, 
  sessions, 
  onSelectCourse, 
  onAddCourse,
  currentUserEmail,
  members
}: CourseCardListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states for adding course
  const [courseCode, setCourseCode] = useState('');
  const [courseName, setCourseName] = useState('');
  const [durationDays, setDurationDays] = useState<number>(3);
  const [selectedDomain, setSelectedDomain] = useState<CourseDomain>('OPITO/GWO');
  const [error, setError] = useState<string | null>(null);

  // Auth level check
  const currentMember = members.find(m => m.email.toLowerCase() === currentUserEmail.toLowerCase());
  const hasLevel4Access = currentUserEmail.toLowerCase() === 'vuongle0810@gmail.com' || 
                          currentUserEmail.toLowerCase() === 'setcadmin' ||
                          currentUserEmail.toLowerCase() === 'setcadmin@safetycentre.org' ||
                          currentMember?.authorizedLevel?.toLowerCase() === 'level 4';

  // Helper to resolve/fallback course domain
  const getCourseDomain = (course: Course): CourseDomain => {
    if (course.domain === 'OPITO/GWO' || course.domain === 'HSE' || course.domain === 'Decree') {
      return course.domain;
    }
    
    // Custom fallbacks based on code/category
    const code = course.code.toUpperCase();
    const category = course.category;
    
    if (code.includes('OSHA') || code.includes('HAZ') || code.includes('CHEM') || 
        category === 'Environment' || category === 'Health') {
      return 'HSE';
    }
    if (code.includes('ISO') || category === 'Compliance') {
      return 'Decree';
    }
    return 'OPITO/GWO';
  };

  // Handle adding course
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!courseCode.trim()) {
      setError('Course code is required.');
      return;
    }
    if (!courseName.trim()) {
      setError('Course name is required.');
      return;
    }
    if (durationDays <= 0) {
      setError('Duration must be at least 1 day.');
      return;
    }

    // Check pre-existing code
    const isDuplicate = courses.some(
      c => c.code.trim().toUpperCase() === courseCode.trim().toUpperCase()
    );
    if (isDuplicate) {
      setError(`A course with code "${courseCode.trim().toUpperCase()}" already exists.`);
      return;
    }

    // Map domain to default category
    let defaultCategory: CourseCategory = 'Safety';
    if (selectedDomain === 'HSE') {
      defaultCategory = 'Environment';
    } else if (selectedDomain === 'Decree') {
      defaultCategory = 'Compliance';
    } else {
      defaultCategory = 'Emergency';
    }

    const newCourse: Course = {
      id: `course-${Date.now()}`,
      code: courseCode.trim().toUpperCase(),
      title: courseName.trim(),
      category: defaultCategory,
      level: 'Intermediate',
      description: `Regulatory curriculum for ${courseName.trim()} qualifications.`,
      durationDays: Number(durationDays),
      certificationEarned: `${courseName.trim()} Competency Certification`,
      syllabus: [
        'Module 1: Fundamental Safety Standardizations & Directives',
        'Module 2: Practical Exercises, Case Reviews & Avoidance Control',
        'Module 3: Verification Checklists, Final Examinations & Evaluations'
      ],
      domain: selectedDomain,
      quizQuestions: [
        {
          id: `q-${Date.now()}-1`,
          question: `What is the primary compliance focus of the ${courseCode.trim().toUpperCase()} program?`,
          options: [
            'Professional competence development and strict industrial hazard mitigation',
            'Skipping inspections to rush facility delivery checklists',
            'Minimizing safety equipment spendings to flat zero',
            'None of the above'
          ],
          correctAnswerIndex: 0
        }
      ]
    };

    onAddCourse(newCourse);
    
    // Clear & close
    setCourseCode('');
    setCourseName('');
    setDurationDays(3);
    setSelectedDomain('OPITO/GWO');
    setIsModalOpen(false);
  };

  // Grouped of domains
  const domains: CourseDomain[] = ['OPITO/GWO', 'HSE', 'Decree'];

  // Filter courses by search term
  const filteredCourses = courses.filter(c => {
    const term = searchTerm.toLowerCase();
    return c.code.toLowerCase().includes(term) || 
           c.title.toLowerCase().includes(term) ||
           getCourseDomain(c).toLowerCase().includes(term);
  });

  return (
    <div id="courses-list-view" className="space-y-6">
      {/* Search and Header panel */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.02)] flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1 w-full md:w-auto">
          <h2 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-emerald-600" />
            <span>Course Catalog Directory</span>
          </h2>
          <p className="text-xs text-slate-500">
            Search, list and discover HSE, OPITO/GWO and Decree training programs.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
          {/* Subtle search box */}
          <div className="relative flex-1 md:w-64">
            <input
              type="text"
              placeholder="Search code or title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-xs rounded-lg pl-9 pr-3 py-2 outline-none focus:bg-white focus:border-emerald-500 transition-all font-mono"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          </div>

          {/* Add Course trigger (Auth Level 4 visible only) */}
          {hasLevel4Access && (
            <button
              onClick={() => {
                setError(null);
                setIsModalOpen(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-lg inline-flex items-center gap-1.5 transition-all shadow-sm shrink-0 border-none cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Add Course</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Lists categorized by Domain */}
      <div className="space-y-8">
        {domains.map(domain => {
          // Filter matching courses for this specific domain
          const domainCourses = filteredCourses.filter(c => getCourseDomain(c) === domain);

          // Get custom color attributes for domain header
          let domainColorStyle = "bg-sky-50 text-sky-900 border-sky-100";
          let domainBadgeStyle = "bg-sky-100 text-sky-800";
          if (domain === 'HSE') {
            domainColorStyle = "bg-emerald-50 text-emerald-900 border-emerald-100";
            domainBadgeStyle = "bg-emerald-100 text-emerald-805";
          } else if (domain === 'Decree') {
            domainColorStyle = "bg-purple-50 text-purple-900 border-purple-100";
            domainBadgeStyle = "bg-purple-100 text-purple-800";
          }

          return (
            <div key={domain} className="bg-white border border-slate-200 rounded-2xl shadow-3xs overflow-hidden">
              {/* Domain Header Card */}
              <div className={`p-4 border-b border-slate-150 ${domainColorStyle} flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-black uppercase font-mono px-2.5 py-0.5 rounded-md ${domainBadgeStyle}`}>
                    DOMAIN
                  </span>
                  <h3 className="font-extrabold text-sm tracking-tight">{domain} Programs</h3>
                </div>
                <div className="text-[11px] font-semibold opacity-75 font-mono">
                  {domainCourses.length} Registered
                </div>
              </div>

              {/* Table List of courses */}
              <div className="overflow-x-auto">
                {domainCourses.length === 0 ? (
                  <div className="p-6 text-center text-slate-450 text-xs italic">
                    No courses registered in {domain} domain matching lookups.
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse table-auto">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500 tracking-wider font-mono">
                        <th className="px-4 py-2.5 text-center w-[10%]">No.</th>
                        <th className="px-4 py-2.5 w-[20%]">Course Code</th>
                        <th className="px-4 py-2.5 w-[55%]">Course Name</th>
                        <th className="px-4 py-2.5 w-[15%] text-center">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-sans text-slate-700">
                      {domainCourses.map((course, idx) => {
                        // Find potential scheduled sessions
                        const courseSessions = sessions.filter(s => s.courseId === course.id);
                        const nextSession = courseSessions[0] || null;

                        return (
                          <tr 
                            key={course.id} 
                            onClick={() => onSelectCourse(course, nextSession as any)}
                            className="hover:bg-slate-50/70 transition-all cursor-pointer group"
                            title="Click to view detailed syllabus & sessions"
                          >
                            {/* Ordinal Number */}
                            <td className="px-4 py-3.5 text-center font-mono font-bold text-slate-400 group-hover:text-emerald-700 transition-colors">
                              {idx + 1}
                            </td>

                            {/* Course Code */}
                            <td className="px-4 py-3.5 font-bold tracking-wider font-mono text-slate-800 group-hover:text-emerald-700 transition-colors">
                              {course.code}
                            </td>

                            {/* Course Name */}
                            <td className="px-4 py-3.5">
                              <div className="space-y-0.5">
                                <div className="font-bold text-slate-900 group-hover:text-emerald-800 transition-colors flex items-center gap-1.5">
                                  <span>{course.title}</span>
                                  <ExternalLink className="h-3 w-3 text-slate-350 opacity-0 group-hover:opacity-100 transition-all" />
                                </div>
                                {course.description && (
                                  <p className="text-[10.5px] text-slate-500 font-normal line-clamp-1 max-w-2xl leading-tight">
                                    {course.description}
                                  </p>
                                )}
                              </div>
                            </td>

                            {/* Duration */}
                            <td className="px-4 py-3.5 text-center">
                              <span className="inline-flex items-center gap-1.2 px-2 py-0.8 bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold rounded-md font-mono">
                                <Clock className="h-3 w-3 text-slate-400" />
                                <span>{course.durationDays} Days</span>
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pop-up Window Modal for adding courses */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 animate-in fade-in duration-200">
          {/* Close Backdrop click click */}
          <div className="absolute inset-0" onClick={() => setIsModalOpen(false)}></div>

          {/* Modal Container */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative z-55 m-4 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-150 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4.5 w-4.5 text-emerald-600" />
                <h3 className="text-xs font-black uppercase font-mono text-slate-800 tracking-wider">
                  Create Course Entry
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1 rounded-lg transition-all border-none outline-none cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Error dialog */}
            {error && (
              <div className="m-4 mb-0 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-850 text-xs flex items-start gap-2 animate-shake">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Modal Body / Form */}
            <form onSubmit={handleFormSubmit} className="p-5 space-y-4 text-xs">
              
              {/* Course Code input */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider font-mono">
                  Course Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. OSHA-30, GWO-FA, DECREE-44"
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:bg-white focus:border-emerald-500 transition-colors uppercase font-mono font-bold"
                />
              </div>

              {/* Course Name input */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider font-mono">
                  Course Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Basic Safety Offshore Course"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:bg-white focus:border-emerald-500 transition-colors font-medium text-slate-850"
                />
              </div>

              {/* Grid 2x1 for duration and domain */}
              <div className="grid grid-cols-2 gap-3.5">
                {/* Duration Days */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider font-mono">
                    Duration (Days) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={durationDays}
                    onChange={(e) => setDurationDays(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:bg-white focus:border-emerald-500 transition-colors font-mono font-bold"
                  />
                </div>

                {/* Domain selector */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider font-mono">
                    Training Domain <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedDomain}
                    onChange={(e) => setSelectedDomain(e.target.value as CourseDomain)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 outline-none font-sans font-bold cursor-pointer hover:bg-slate-100 transition-all text-slate-700"
                  >
                    <option value="OPITO/GWO">OPITO/GWO</option>
                    <option value="HSE">HSE</option>
                    <option value="Decree">Decree</option>
                  </select>
                </div>
              </div>



              {/* Action buttons */}
              <div className="pt-3 border-t border-slate-100 flex gap-2.5 justify-end">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-250 hover:bg-slate-50 text-slate-700 font-bold rounded-lg transition-all text-xs cursor-pointer bg-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-all shadow-sm text-xs cursor-pointer border-none flex items-center gap-1"
                >
                  <Check className="h-4 w-4" />
                  <span>Register Course</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
