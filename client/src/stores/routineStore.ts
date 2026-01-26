import { create } from 'zustand';
import type { RoutineTask, CreateRoutineInput } from '@/types';
import { routineRepository } from '@/di/storeRepositories';
import { toast } from '@/stores/toastStore';

// 요일 필터 타입: 0-6 (일-토) 또는 'all' (전체)
export type DayFilter = number | 'all';

// 루틴이 특정 요일에 해당하는지 확인
function isRoutineForDay(routine: RoutineTask, dayOfWeek: number): boolean {
  // 비활성화된 루틴은 제외
  if (!routine.isActive) {
    return false;
  }

  // 매일 반복이면 모든 요일에 표시
  if (routine.repeatType === 'daily') {
    return true;
  }

  // weekly(평일) 또는 custom인 경우 repeatDays 배열 확인
  // repeatDays는 숫자 배열 [0, 1, 2, 3, 4, 5, 6] (일~토)
  return routine.repeatDays.includes(dayOfWeek);
}

// 요일별 루틴 필터링
function filterRoutinesByDay(routines: RoutineTask[], dayOfWeek: DayFilter): RoutineTask[] {
  // 전체 보기: 활성화된 루틴만 반환
  if (dayOfWeek === 'all') {
    return routines.filter(r => r.isActive);
  }
  // 특정 요일: 해당 요일에 해당하는 활성화된 루틴만 반환
  return routines.filter(r => isRoutineForDay(r, dayOfWeek));
}

interface RoutineState {
  // State
  todayRoutines: RoutineTask[];  // 오늘의 루틴 (오늘 요일에 해당하는 것만)
  allRoutines: RoutineTask[];    // 전체 루틴 목록 (캐시)
  projectRoutines: Map<string, RoutineTask[]>;  // 프로젝트별 루틴
  selectedDay: DayFilter;  // 선택된 요일 필터
  loading: boolean;
  error: string | null;

  // Actions
  fetchTodayRoutines: (personal?: boolean) => Promise<void>;
  fetchRoutinesByDay: (dayOfWeek: DayFilter, personal?: boolean) => Promise<void>;
  fetchAllRoutines: (personal?: boolean) => Promise<void>;
  fetchProjectRoutines: (projectId: string) => Promise<void>;
  setSelectedDay: (day: DayFilter) => void;
  createRoutine: (data: CreateRoutineInput) => Promise<RoutineTask>;
  updateRoutine: (id: string, data: Partial<CreateRoutineInput> & { isActive?: boolean }) => Promise<void>;
  deleteRoutine: (id: string) => Promise<void>;
  toggleComplete: (id: string) => Promise<void>;

  // Selectors (computed)
  getRoutineById: (id: string) => RoutineTask | undefined;
  getTodayCompletedCount: () => number;
  getTodayTotalCount: () => number;
  getFilteredRoutines: () => RoutineTask[];
  getFilteredCompletedCount: () => number;
  getFilteredTotalCount: () => number;
}

export const useRoutineStore = create<RoutineState>((set, get) => ({
  todayRoutines: [],
  allRoutines: [],
  projectRoutines: new Map(),
  selectedDay: new Date().getDay() as DayFilter,  // 기본값: 오늘 요일
  loading: false,
  error: null,

  // 오늘의 루틴 조회
  fetchTodayRoutines: async (personal?: boolean) => {
    set({ loading: true, error: null });
    try {
      const routines = await routineRepository.findToday({ personal });
      set({ todayRoutines: routines, loading: false });
    } catch (error) {
      const message = (error as Error).message;
      set({ error: message, loading: false });
      toast.error('루틴 로드 실패', message);
    }
  },

  // 요일별 루틴 조회 (전체 목록을 가져와서 클라이언트에서 필터링)
  fetchRoutinesByDay: async (dayOfWeek: DayFilter, personal?: boolean) => {
    set({ loading: true, error: null, selectedDay: dayOfWeek });
    try {
      // 항상 전체 루틴을 다시 가져옴 (최신 데이터 보장)
      const allRoutines = await routineRepository.findAll();

      // 오늘 요일 데이터도 갱신 (완료 상태 동기화를 위해)
      const todayRoutines = await routineRepository.findToday({ personal });

      // 전체 루틴의 완료 상태를 오늘 루틴 기준으로 업데이트
      const todayRoutineMap = new Map(todayRoutines.map(r => [r.id, r]));
      const updatedAllRoutines = allRoutines.map(r => {
        const todayVersion = todayRoutineMap.get(r.id);
        if (todayVersion) {
          return { ...r, isCompletedToday: todayVersion.isCompletedToday };
        }
        return r;
      });

      set({
        allRoutines: updatedAllRoutines,
        todayRoutines,
        loading: false
      });
    } catch (error) {
      const message = (error as Error).message;
      set({ error: message, loading: false });
      toast.error('루틴 로드 실패', message);
    }
  },

  // 전체 루틴 조회
  fetchAllRoutines: async (personal?: boolean) => {
    set({ loading: true, error: null });
    try {
      const routines = await routineRepository.findAll({ personal });
      set({ allRoutines: routines, loading: false });
    } catch (error) {
      const message = (error as Error).message;
      set({ error: message, loading: false });
      toast.error('루틴 로드 실패', message);
    }
  },

  // 프로젝트별 루틴 조회
  fetchProjectRoutines: async (projectId: string) => {
    set({ loading: true, error: null });
    try {
      const routines = await routineRepository.findByProject(projectId);
      set((state) => {
        const newProjectRoutines = new Map(state.projectRoutines);
        newProjectRoutines.set(projectId, routines);
        return { projectRoutines: newProjectRoutines, loading: false };
      });
    } catch (error) {
      const message = (error as Error).message;
      set({ error: message, loading: false });
      toast.error('루틴 로드 실패', message);
    }
  },

  // 선택된 요일 설정
  setSelectedDay: (day: DayFilter) => {
    set({ selectedDay: day });
  },

  // 루틴 생성
  createRoutine: async (data: CreateRoutineInput) => {
    set({ loading: true, error: null });
    try {
      const newRoutine = await routineRepository.create(data);

      // 오늘의 루틴에 추가 (오늘 요일에 해당하는 경우)
      const todayDow = new Date().getDay();
      if (data.repeatType === 'daily' || data.repeatDays.includes(todayDow)) {
        set((state) => ({
          todayRoutines: [...state.todayRoutines, newRoutine],
        }));
      }

      // 전체 루틴에 추가
      set((state) => ({
        allRoutines: [...state.allRoutines, newRoutine],
        loading: false,
      }));

      // 프로젝트 루틴에 추가
      if (data.projectId) {
        set((state) => {
          const newProjectRoutines = new Map(state.projectRoutines);
          const existing = newProjectRoutines.get(data.projectId!) || [];
          newProjectRoutines.set(data.projectId!, [...existing, newRoutine]);
          return { projectRoutines: newProjectRoutines };
        });
      }

      toast.success('루틴 생성 완료', `"${newRoutine.title}" 루틴이 생성되었습니다.`);
      return newRoutine;
    } catch (error) {
      const message = (error as Error).message;
      set({ error: message, loading: false });
      toast.error('루틴 생성 실패', message);
      throw error;
    }
  },

  // 루틴 수정
  updateRoutine: async (id: string, data: Partial<CreateRoutineInput> & { isActive?: boolean }) => {
    const previousTodayRoutines = get().todayRoutines;
    const previousAllRoutines = get().allRoutines;

    // Optimistic update
    const updateRoutineInList = (routines: RoutineTask[]) =>
      routines.map((r) => (r.id === id ? { ...r, ...data, updatedAt: new Date().toISOString() } : r));

    set((state) => ({
      todayRoutines: updateRoutineInList(state.todayRoutines),
      allRoutines: updateRoutineInList(state.allRoutines),
    }));

    try {
      const updated = await routineRepository.update(id, data);

      // 서버 응답으로 정확히 업데이트
      set((state) => ({
        todayRoutines: state.todayRoutines.map((r) => (r.id === id ? updated : r)),
        allRoutines: state.allRoutines.map((r) => (r.id === id ? updated : r)),
      }));

      toast.success('루틴 수정 완료', '루틴이 수정되었습니다.');
    } catch (error) {
      // Rollback
      set({
        todayRoutines: previousTodayRoutines,
        allRoutines: previousAllRoutines,
      });
      const message = (error as Error).message;
      toast.error('루틴 수정 실패', message);
      throw error;
    }
  },

  // 루틴 삭제
  deleteRoutine: async (id: string) => {
    const previousTodayRoutines = get().todayRoutines;
    const previousAllRoutines = get().allRoutines;

    // Optimistic update
    set((state) => ({
      todayRoutines: state.todayRoutines.filter((r) => r.id !== id),
      allRoutines: state.allRoutines.filter((r) => r.id !== id),
    }));

    try {
      await routineRepository.delete(id);
      toast.success('루틴 삭제 완료', '루틴이 삭제되었습니다.');
    } catch (error) {
      // Rollback
      set({
        todayRoutines: previousTodayRoutines,
        allRoutines: previousAllRoutines,
      });
      const message = (error as Error).message;
      toast.error('루틴 삭제 실패', message);
      throw error;
    }
  },

  // 완료 토글 (오늘 루틴만 가능)
  toggleComplete: async (id: string) => {
    const routine = get().todayRoutines.find((r) => r.id === id);
    if (!routine) return;

    const previousTodayRoutines = get().todayRoutines;
    const previousAllRoutines = get().allRoutines;

    // Optimistic update
    const updateComplete = (routines: RoutineTask[]) =>
      routines.map((r) => r.id === id ? { ...r, isCompletedToday: !r.isCompletedToday } : r);

    set((state) => ({
      todayRoutines: updateComplete(state.todayRoutines),
      allRoutines: updateComplete(state.allRoutines),
    }));

    try {
      if (routine.isCompletedToday) {
        await routineRepository.uncomplete(id);
      } else {
        await routineRepository.complete(id);
      }
    } catch (error) {
      // Rollback
      set({
        todayRoutines: previousTodayRoutines,
        allRoutines: previousAllRoutines,
      });
      const message = (error as Error).message;
      toast.error('완료 처리 실패', message);
    }
  },

  // Selectors
  getRoutineById: (id: string) => {
    return get().todayRoutines.find((r) => r.id === id)
      || get().allRoutines.find((r) => r.id === id);
  },

  getTodayCompletedCount: () => {
    return get().todayRoutines.filter((r) => r.isCompletedToday).length;
  },

  getTodayTotalCount: () => {
    return get().todayRoutines.length;
  },

  // 선택된 요일에 해당하는 루틴 목록 반환 (computed)
  getFilteredRoutines: () => {
    const { selectedDay, allRoutines, todayRoutines } = get();
    const today = new Date().getDay();

    // 모든 요일에 대해 allRoutines에서 필터링 (일관된 로직 적용)
    // allRoutines는 이미 완료 상태가 todayRoutines 기준으로 업데이트됨
    const filteredFromAll = filterRoutinesByDay(allRoutines, selectedDay);

    // 오늘 요일인 경우, todayRoutines의 완료 상태를 우선 적용
    if (selectedDay === today && todayRoutines.length > 0) {
      const todayRoutineMap = new Map(todayRoutines.map(r => [r.id, r]));
      return filteredFromAll.map(routine => {
        const todayVersion = todayRoutineMap.get(routine.id);
        if (todayVersion) {
          return { ...routine, isCompletedToday: todayVersion.isCompletedToday };
        }
        return routine;
      });
    }

    return filteredFromAll;
  },

  getFilteredCompletedCount: () => {
    return get().getFilteredRoutines().filter((r) => r.isCompletedToday).length;
  },

  getFilteredTotalCount: () => {
    return get().getFilteredRoutines().length;
  },
}));
