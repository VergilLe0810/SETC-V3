import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  getDoc, 
  deleteDoc, 
  updateDoc, 
  addDoc, 
  onSnapshot, 
  getDocFromServer 
} from 'firebase/firestore';
import { db, auth } from './googleAuth';
import { Course, CourseSession, Member, Task } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

/**
 * Custom error handler to supply detailed JSON debugging contexts during Firestore failures
 */
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error Details:', JSON.stringify(errInfo, null, 2));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Validate connection on boot
 */
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Please check your Firebase configuration or internet connection.");
    }
    return false;
  }
}

// ==========================================
// COURSES SYNC
// ==========================================
export async function dbGetCourses(): Promise<Course[]> {
  const path = 'courses';
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Course));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function dbSaveCourse(course: Course): Promise<void> {
  const path = `courses/${course.id}`;
  try {
    await setDoc(doc(db, 'courses', course.id), course);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function dbDeleteCourse(courseId: string): Promise<void> {
  const path = `courses/${courseId}`;
  try {
    await deleteDoc(doc(db, 'courses', courseId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ==========================================
// SESSIONS SYNC
// ==========================================
export async function dbGetSessions(): Promise<CourseSession[]> {
  const path = 'sessions';
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as CourseSession));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function dbSaveSession(session: CourseSession): Promise<void> {
  const path = `sessions/${session.id}`;
  try {
    await setDoc(doc(db, 'sessions', session.id), session);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function dbDeleteSession(sessionId: string): Promise<void> {
  const path = `sessions/${sessionId}`;
  try {
    await deleteDoc(doc(db, 'sessions', sessionId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ==========================================
// MEMBERS SYNC
// ==========================================
export async function dbGetMembers(): Promise<Member[]> {
  const path = 'members';
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Member));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function dbSaveMember(member: Member): Promise<void> {
  const path = `members/${member.id}`;
  try {
    await setDoc(doc(db, 'members', member.id), member);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function dbDeleteMember(memberId: string): Promise<void> {
  const path = `members/${memberId}`;
  try {
    await deleteDoc(doc(db, 'members', memberId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ==========================================
// TASKS SYNC
// ==========================================
export async function dbGetTasks(): Promise<Task[]> {
  const path = 'tasks';
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Task));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function dbSaveTask(task: Task): Promise<void> {
  const path = `tasks/${task.id}`;
  try {
    await setDoc(doc(db, 'tasks', task.id), task);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function dbDeleteTask(taskId: string): Promise<void> {
  const path = `tasks/${taskId}`;
  try {
    await deleteDoc(doc(db, 'tasks', taskId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Real-time synchronization hooks helper
export function syncCollection<T>(
  path: string, 
  onData: (data: T[]) => void, 
  onError: (error: any) => void
) {
  return onSnapshot(
    collection(db, path), 
    (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as unknown as T));
      onData(items);
    },
    (err) => {
      onError(err);
    }
  );
}
