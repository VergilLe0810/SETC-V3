/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Award, CheckCircle2, UserCheck, AlertTriangle, Printer, GraduationCap } from 'lucide-react';
import { Course, CourseSession } from '../types';
import { getSessionStatus } from '../data';
import { formatDate } from '../utils/date';

interface CourseDetailsDrawerProps {
  course: Course;
  session: CourseSession;
  onClose: () => void;
  onEnroll: (sessionId: string, studentName: string) => void;
  userEmail: string;
}

export default function CourseDetailsDrawer({ course, session, onClose, onEnroll, userEmail }: CourseDetailsDrawerProps) {
  // If no session, display only syllabus mode
  const [registrantName, setRegistrantName] = useState('');
  const [isSubmittingEnroll, setIsSubmittingEnroll] = useState(false);
  const [enrollSuccess, setEnrollSuccess] = useState(false);

  // Quiz states
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [quizPassed, setQuizPassed] = useState(false);

  // Certificate printing state
  const [showCertificate, setShowCertificate] = useState(false);
  const certificateRef = useRef<HTMLDivElement>(null);

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const sessionStatus = session ? getSessionStatus(session.startDate, session.endDate, todayStr) : 'N/A';

  const hasQuiz = course.quizQuestions && course.quizQuestions.length > 0;
  const questions = course.quizQuestions || [];

  const handleEnrollSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!registrantName.trim()) return;

    setIsSubmittingEnroll(true);
    setTimeout(() => {
      onEnroll(session.id, registrantName.trim());
      setIsSubmittingEnroll(false);
      setEnrollSuccess(true);
      setRegistrantName('');
    }, 800);
  };

  const handleAnswerClick = (index: number) => {
    if (selectedAnswer !== null) return; // Answer locked
    setSelectedAnswer(index);

    if (index === questions[currentQuestionIdx].correctAnswerIndex) {
      setScore(prev => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    setSelectedAnswer(null);
    if (currentQuestionIdx + 1 < questions.length) {
      setCurrentQuestionIdx(prev => prev + 1);
    } else {
      setQuizFinished(true);
      const passed = score + (selectedAnswer === questions[currentQuestionIdx].correctAnswerIndex ? 1 : 0) === questions.length;
      setQuizPassed(passed);
    }
  };

  const handlePrintCertificate = () => {
    const printContent = certificateRef.current?.innerHTML;

    if (printContent) {
      const windowPrint = window.open('', '', 'width=900,height=650');
      if (windowPrint) {
        windowPrint.document.write(`
          <html>
            <head>
              <title>In Chứng nhận Đủ năng lực</title>
              <style>
                body { font-family: 'Times New Roman', serif; background-color: #f8fafc; padding: 40px; margin: 0; }
                .cert-box { border: 12px double #14532d; background: #ffffff; padding: 50px; text-align: center; border-radius: 8px; position: relative; }
                .cert-head { text-transform: uppercase; letter-spacing: 2px; color: #14532d; font-size: 16px; font-weight: bold; }
                .cert-title { font-size: 32px; font-weight: 800; color: #1e293b; margin: 20px 0; }
                .cert-for { font-size: 14px; text-transform: uppercase; color: #64748b; letter-spacing: 1px; }
                .cert-name { font-size: 28px; font-weight: bold; color: #166534; text-decoration: underline; margin: 15px 0; }
                .cert-desc { font-size: 14px; line-height: 1.6; color: #475569; max-width: 600px; margin: 0 auto; }
                .cert-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 50px; padding-top: 30px; border-t: 1px solid #e2e8f0; }
                .cert-sig { text-align: left; }
                .cert-stamp { border: 4px solid #b45309; border-radius: 50%; width: 90px; height: 90px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; color: #b45309; text-transform: uppercase; transform: rotate(-10deg); }
              </style>
            </head>
            <body>
              ${printContent}
              <script>window.print(); window.close();</script>
            </body>
          </html>
        `);
        windowPrint.document.close();
      }
    }
  };

  const isFull = session && session.enrolledIds.length >= session.maxCapacity;

  return (
    <div id="drawer-backdrop" className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end">
      {/* Slide pane */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col overflow-y-auto"
      >
        {/* Header Drawer banner */}
        <div className="bg-slate-900 text-white p-6 sticky top-0 z-10 flex items-start justify-between border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-600 font-mono tracking-wide uppercase">
                Lĩnh vực {course.category}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                {course.code}
              </span>
              {session && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                  sessionStatus === 'ON-GOING' ? 'bg-amber-500 text-slate-950' :
                  sessionStatus === 'UP-COMING' ? 'bg-sky-500 text-slate-950' : 'bg-slate-600 text-slate-100'
                }`}>
                  {sessionStatus === 'ON-GOING' ? 'LỚP ĐANG HOẠT ĐỘNG' : sessionStatus === 'UP-COMING' ? 'SẮP DIỄN RA' : 'ĐÃ HOÀN THÀNH'}
                </span>
              )}
            </div>
            <h1 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
              {course.title}
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Cấp độ An toàn: <span className="text-sky-400 font-semibold">{course.level}</span> | Đào tạo tập trung có Giảng viên
            </p>
          </div>
          <button 
            id="btn-close-drawer"
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content body container */}
        <div className="p-6 space-y-6 flex-1">
          {/* Main Course Info card */}
          <div>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Đề cương Đào tạo Tổng quát</h2>
            <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 border border-slate-100 p-3.5 rounded-xl">
              {course.description}
            </p>
          </div>

          {/* Curriculum Checklist */}
          <div>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Danh mục học phần Bài giảng</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700 text-xs">
              {course.syllabus.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2 bg-slate-50 border border-slate-100 p-2.5 rounded-lg">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="leading-tight font-medium">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Schedule specifics (Only visible if session info exists) */}
          {session ? (
            <div className="border-t border-slate-150 pt-5 space-y-5">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Thông số Lớp học đã Lên lịch</h2>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-white grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="text-xs space-y-2 col-span-1">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Thời gian Khóa học</span>
                    <strong className="text-slate-100 font-mono text-xs">{formatDate(session.startDate)} đến {formatDate(session.endDate)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Giờ Đào tạo</span>
                    <strong className="text-slate-100 font-mono text-xs">{session.startTime} - {session.endTime} (Mỗi ngày)</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Chứng nhận Đạt được</span>
                    <span className="text-emerald-400 text-xs font-semibold block leading-tight">{course.certificationEarned}</span>
                  </div>
                </div>

                <div className="text-xs space-y-2 col-span-1">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Phòng học Chỉ định</span>
                    <strong className="text-slate-100 text-xs block">{session.classroom}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Giảng viên Ủy quyền</span>
                    <strong className="text-sky-300 text-xs block">{session.instructor}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Tình trạng Sĩ số Lớp</span>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
                        <div 
                          className={`h-full rounded-full ${isFull ? 'bg-rose-500' : 'bg-emerald-500'}`}
                          style={{ width: `${(session.enrolledIds.length / session.maxCapacity) * 100}%` }}
                        ></div>
                      </div>
                      <span className="font-mono text-[10px] font-bold text-slate-300">
                        {session.enrolledIds.length}/{session.maxCapacity}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {session.notes && (
                <div id="session-directives-panel" className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 text-xs leading-relaxed text-amber-950 font-medium">
                  <div className="text-[10px] font-black text-amber-900 uppercase tracking-wider mb-1">
                    📋 Chỉ thị & Ghi chú của Giảng viên
                  </div>
                  <p className="italic font-semibold text-slate-800">
                    "{session.notes}"
                  </p>
                </div>
              )}

              {/* Trainee Enrollment Form */}
              {sessionStatus !== 'COMPLETED' && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <UserCheck className="h-4 w-4 text-emerald-600" />
                    Đăng ký Lớp học Mô phỏng
                  </h3>
                  <p className="text-[11px] text-slate-500 mb-3 text-left">
                    Gửi biểu mẫu nhanh để đăng ký học viên. Giới hạn sĩ số lớp học sẽ tự động tính toán lại.
                  </p>

                  {enrollSuccess ? (
                    <div className="bg-emerald-50 border border-white p-3 rounded-lg flex items-center gap-2 text-emerald-900 text-xs font-medium mb-1">
                      <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
                      <div className="text-left">
                        Đăng ký học viên thành công! Số ghế đã cập nhật thành <span className="font-bold">{session.enrolledIds.length} / {session.maxCapacity}</span>.
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleEnrollSubmit} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Họ và tên học viên (ví dụ: Trần Minh Hoàng)"
                        value={registrantName}
                        onChange={(e) => setRegistrantName(e.target.value)}
                        required
                        disabled={isSubmittingEnroll || isFull}
                        className="flex-1 text-xs px-3 py-2 bg-white rounded-lg border border-slate-200 outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
                      />
                      <button
                        type="submit"
                        disabled={isSubmittingEnroll || isFull}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-all font-sans cursor-pointer disabled:bg-slate-300"
                      >
                        {isSubmittingEnroll ? 'Đang đăng ký...' : isFull ? 'Lớp đầy' : 'Đăng ký học viên'}
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* Competency quiz check module (Enabled for ongoing or simulated completed courses or for previewing) */}
              {hasQuiz && (
                <div className="bg-gradient-to-br from-indigo-50/50 to-indigo-100/40 border border-indigo-200/50 rounded-xl p-5 shadow-xs">
                  <div className="flex items-start justify-between gap-3 mb-3 border-b border-indigo-200/30 pb-3">
                    <div className="text-left">
                      <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                        <GraduationCap className="h-4.5 w-4.5 text-indigo-700" />
                        Bài trắc nghiệm Đánh giá Năng lực
                      </h3>
                      <p className="text-[11px] text-indigo-700/80 mt-0.5">
                        Bộ câu hỏi khảo sát năng lực để được cấp chứng nhận cho {registrantName || 'học viên'} sau khi hoàn thành 3 câu trắc nghiệm.
                      </p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-200/50 text-indigo-900 font-mono rounded">
                      {questions.length} câu hỏi
                    </span>
                  </div>

                  {!quizStarted ? (
                    <div className="text-center py-4">
                      <p className="text-xs text-slate-600 mb-3 font-serif">
                        Học viên phải trả lời chính xác 100% để đủ điều kiện cấp chứng chỉ ngay lập tức cho khóa {course.code}.
                      </p>
                      <button
                        onClick={() => {
                          setQuizStarted(true);
                          setCurrentQuestionIdx(0);
                          setSelectedAnswer(null);
                          setScore(0);
                          setQuizFinished(false);
                          setShowCertificate(false);
                        }}
                        className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors pointer-events-auto cursor-pointer"
                      >
                        Bắt đầu Bài Đánh giá
                      </button>
                    </div>
                  ) : quizFinished ? (
                    <div className="text-center py-4 space-y-3">
                      {quizPassed ? (
                        <>
                          <div className="inline-flex bg-green-100 p-2.5 rounded-full text-green-600 mb-1">
                            <Award className="h-8 w-8" />
                          </div>
                          <h4 className="text-sm font-extrabold text-slate-800">Đạt 100% Điểm! Đã hoàn thành Đánh giá</h4>
                          <p className="text-xs text-slate-600 font-serif">
                            Học viên đã vượt qua xuất sắc bài đánh giá năng lực của khóa <strong>{course.code}</strong>. Chứng nhận được cấp thành công.
                          </p>

                          <div className="pt-2 flex justify-center gap-3">
                            <button
                              onClick={() => {
                                setQuizStarted(false);
                                setQuizFinished(false);
                              }}
                              className="px-3 py-1.5 bg-slate-205 text-slate-700 font-semibold rounded-lg text-xs hover:bg-slate-300 transition-colors"
                            >
                              Làm lại từ đầu
                            </button>
                            <button
                              onClick={() => setShowCertificate(true)}
                              className="px-3 py-1.5 bg-indigo-600 text-white font-semibold rounded-lg text-xs flex items-center gap-1 hover:bg-indigo-700 transition-colors cursor-pointer"
                            >
                              Hiển thị Chứng nhận
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="inline-flex bg-rose-100 p-2.5 rounded-full text-rose-600 mb-1">
                            <AlertTriangle className="h-8 w-8 animate-bounce" />
                          </div>
                          <h4 className="text-sm font-bold text-slate-800">Cần Ôn tập lại</h4>
                          <p className="text-xs text-slate-600 font-serif">
                            Trả lời đúng {score} / {questions.length} câu. Tiêu chuẩn OSHA và An toàn yêu cầu trả lời chính xác tất cả các câu để đủ điều kiện cấp chứng chỉ.
                          </p>
                          <button
                            onClick={() => {
                              setCurrentQuestionIdx(0);
                              setSelectedAnswer(null);
                              setScore(0);
                              setQuizFinished(false);
                            }}
                            className="px-4 py-1.5 bg-rose-600 text-white hover:bg-rose-700 font-semibold rounded-lg text-xs cursor-pointer"
                          >
                            Làm lại Bài đánh giá
                          </button>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Active Question panel */}
                      <div className="bg-white border border-indigo-100 rounded-lg p-4 text-left">
                        <span className="text-[9px] uppercase font-bold text-indigo-500 font-mono">
                          Câu {currentQuestionIdx + 1} / {questions.length}
                        </span>
                        <h4 className="text-xs font-bold text-slate-800 mt-1 mb-3">
                          {questions[currentQuestionIdx].question}
                        </h4>

                        <div className="space-y-2">
                          {questions[currentQuestionIdx].options.map((opt, oIdx) => {
                            const isCorrect = oIdx === questions[currentQuestionIdx].correctAnswerIndex;
                            const isSelected = selectedAnswer === oIdx;

                            let btnStyle = "bg-slate-50 border-slate-200 hover:bg-indigo-50 hover:border-indigo-300 text-slate-700";
                            if (selectedAnswer !== null) {
                              if (isCorrect) {
                                btnStyle = "bg-green-50 border-green-400 text-green-900";
                              } else if (isSelected) {
                                btnStyle = "bg-rose-50 border-rose-400 text-rose-900";
                              } else {
                                btnStyle = "bg-slate-100 border-slate-200 opacity-60 text-slate-500";
                              }
                            }

                            return (
                              <button
                                key={oIdx}
                                type="button"
                                disabled={selectedAnswer !== null}
                                onClick={() => handleAnswerClick(oIdx)}
                                className={`w-full text-left text-xs p-2.5 rounded-lg border transition-all ${btnStyle}`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Controls */}
                      {selectedAnswer !== null && (
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={handleNextQuestion}
                            className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 cursor-pointer"
                          >
                            {currentQuestionIdx + 1 === questions.length ? 'Nộp bài khảo sát' : 'Câu tiếp theo'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Certificate Layout Overlay if passed */}
              <AnimatePresence>
                {showCertificate && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-stone-50 border-2 border-amber-700/60 rounded-xl p-6 relative shadow-md flex flex-col justify-between"
                  >
                    <button
                      onClick={() => setShowCertificate(false)}
                      className="absolute top-3 right-3 text-amber-900/60 hover:text-amber-950 p-1 bg-amber-100/50 hover:bg-amber-200/55 rounded-full cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>

                    {/* PDF Wrapper */}
                    <div ref={certificateRef} className="border-4 double border-amber-700/80 p-5 bg-white text-center rounded-lg relative overflow-hidden">
                      {/* Technical graphics behind */}
                      <div className="absolute inset-0 bg-radial from-slate-50/10 to-transparent pointer-events-none" />

                      <p className="text-[10px] font-sans font-extrabold text-amber-800 tracking-widest uppercase mb-1">
                        Trung tâm Đào tạo An toàn & Môi trường
                      </p>
                      <h3 className="text-xl font-serif font-black text-slate-800 mb-4 border-b border-amber-200 pb-2">
                        CHỨNG CHỈ NĂNG LỰC CHUYÊN MÔN
                      </h3>

                      <p className="text-[9px] text-slate-400 uppercase tracking-wider italic">
                        Văn bản này chứng nhận học viên dưới đây đạt tiêu chuẩn đánh giá an toàn
                      </p>

                      <p className="text-lg font-bold text-green-800 font-serif my-3 py-1 bg-green-50/40 rounded italic underline">
                        {registrantName || 'Học viên Ưu tú'}
                      </p>

                      <p className="text-[10px] text-slate-500 leading-snug max-w-sm mx-auto mb-4">
                        đã hoàn thành xuất sắc giáo trình học thuật chuyên ngành, tham gia thực tế tại cơ sở sản xuất, vượt qua các tiêu chuẩn khắt khe và các chương trình đánh giá của môn học:
                      </p>

                      <p className="text-xs font-black text-slate-900 border border-slate-200 px-3 py-2 bg-slate-55 rounded font-mono mb-4">
                        {course.code}: {course.title}
                      </p>

                      {/* Footer signatures */}
                      <div className="flex justify-between items-end mt-6 text-[8px] text-slate-500 border-t border-slate-100 pt-4">
                        <div className="text-left">
                          <span className="block border-b border-slate-300 w-24 mb-1"></span>
                          <span className="font-bold">Chữ ký Giám khảo</span>
                          <span className="block text-[7px] text-slate-400">Sarah Jenkins (OSHA Core)</span>
                        </div>
                        <div className="bg-amber-100/40 border border-amber-400/50 rounded-full w-14 h-14 flex flex-col items-center justify-center text-[7px] font-bold text-amber-800 tracking-tighter">
                          <span>SE TC</span>
                          <span>SEAL</span>
                          <span>2026</span>
                        </div>
                        <div className="text-right">
                          <span className="block border-b border-slate-300 w-24 mb-1"></span>
                          <span className="font-bold">Ngày cấp: {formatDate('2026-06-04')}</span>
                          <span className="block text-[7px] font-mono text-slate-400">Cert ID: SE-26-{Math.floor(1000 + Math.random() * 9000)}-C</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handlePrintCertificate}
                      className="w-full mt-4 text-xs font-bold py-2 bg-amber-700 text-white rounded-lg flex items-center justify-center gap-1.5 hover:bg-amber-800 transition-colors cursor-pointer"
                    >
                      <Printer className="h-4 w-4" />
                      In Chứng chỉ (Kết xuất PDF)
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="border-t border-slate-150 pt-5 text-center">
              <p className="text-xs text-slate-500 italic">Chưa chọn buổi đào tạo nào. Hiện tại chỉ xem đề cương hướng dẫn chung.</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
