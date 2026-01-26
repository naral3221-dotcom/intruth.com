/**
 * AttendanceCheckPage
 * 출석 체크 페이지
 */
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Save, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import {
  useCells,
  useAttendanceCheck,
  AttendanceCheckGrid,
  QuickSelectButtons,
  MEETING_TYPE_LABELS,
} from '@/features/attendance';
import type { MeetingType } from '@/features/attendance';
import { cn } from '@/lib/utils';

export function AttendanceCheckPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCellId = searchParams.get('cellId');

  const { myCells, cells, loading: cellsLoading } = useCells();
  const {
    attendanceInfo,
    loading,
    submitting,
    error,
    checkList,
    fetchAttendance,
    setMemberStatus,
    setMemberNote,
    setAllStatus,
    submitAttendance,
  } = useAttendanceCheck();

  // 선택된 상태
  const [selectedCellId, setSelectedCellId] = useState<string>(initialCellId || '');
  const [selectedDate, setSelectedDate] = useState<string>(getToday());
  const [selectedMeetingType, setSelectedMeetingType] = useState<MeetingType>('SUNDAY_SERVICE');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // 사용 가능한 셀 목록 (내 셀이 있으면 내 셀만, 없으면 전체)
  const availableCells = myCells.length > 0 ? myCells : cells;

  // 셀 ID가 바뀌면 URL 업데이트
  useEffect(() => {
    if (selectedCellId) {
      setSearchParams({ cellId: selectedCellId });
    }
  }, [selectedCellId, setSearchParams]);

  // 셀/날짜/모임유형이 바뀌면 데이터 로드
  useEffect(() => {
    if (selectedCellId && selectedDate && selectedMeetingType) {
      fetchAttendance(selectedCellId, selectedDate, selectedMeetingType);
      setSubmitSuccess(false);
    }
  }, [selectedCellId, selectedDate, selectedMeetingType, fetchAttendance]);

  // 날짜 변경
  const changeDate = (days: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(formatDate(date));
  };

  // 제출 핸들러
  const handleSubmit = async () => {
    try {
      await submitAttendance();
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch (err) {
      // 에러는 hook에서 처리됨
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">출석 체크</h1>
        <p className="text-gray-500">셀 구성원의 출석 상태를 체크하세요</p>
      </div>

      {/* 선택 영역 */}
      <div className="bg-white rounded-lg border p-4 space-y-4">
        {/* 셀 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">셀 선택</label>
          <select
            value={selectedCellId}
            onChange={(e) => setSelectedCellId(e.target.value)}
            disabled={cellsLoading}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">셀을 선택하세요</option>
            {availableCells.map((cell) => (
              <option key={cell.id} value={cell.id}>
                {cell.name}
              </option>
            ))}
          </select>
        </div>

        {/* 날짜 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">날짜</label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => changeDate(-7)}
              className="p-2 rounded-lg border hover:bg-gray-50"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex-1 relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => changeDate(7)}
              className="p-2 rounded-lg border hover:bg-gray-50"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 모임 유형 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">모임 유형</label>
          <div className="flex gap-2">
            {(['SUNDAY_SERVICE', 'CELL_MEETING'] as MeetingType[]).map((type) => (
              <button
                key={type}
                onClick={() => setSelectedMeetingType(type)}
                className={cn(
                  'flex-1 py-2 px-4 rounded-lg border transition-colors',
                  selectedMeetingType === type
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                )}
              >
                {MEETING_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 로딩 */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          <p className="mt-2 text-gray-500">출석 정보를 불러오는 중...</p>
        </div>
      )}

      {/* 에러 */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error.message}
        </div>
      )}

      {/* 출석 체크 영역 */}
      {!loading && attendanceInfo && (
        <div className="space-y-4">
          {/* 요약 */}
          <div className="bg-white rounded-lg border p-4 flex items-center justify-between">
            <div>
              <span className="font-semibold">{attendanceInfo.cellName}</span>
              <span className="text-gray-500 ml-2">
                {new Date(attendanceInfo.attendDate).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'short',
                })}
              </span>
            </div>
            <div className="text-sm text-gray-500">
              {attendanceInfo.summary.checked}/{attendanceInfo.summary.total}명 체크됨
            </div>
          </div>

          {/* 빠른 선택 */}
          <div className="flex items-center justify-between bg-white rounded-lg border p-4">
            <QuickSelectButtons onSelectAll={setAllStatus} disabled={submitting} />
          </div>

          {/* 출석 그리드 */}
          <AttendanceCheckGrid
            items={checkList}
            onStatusChange={setMemberStatus}
            onNoteChange={setMemberNote}
            disabled={submitting}
          />

          {/* 제출 버튼 */}
          <div className="flex justify-end gap-3">
            {submitSuccess && (
              <div className="flex items-center gap-2 text-green-600">
                <Check className="w-5 h-5" />
                <span>저장되었습니다!</span>
              </div>
            )}
            <button
              onClick={handleSubmit}
              disabled={submitting || checkList.every((item) => item.status === null)}
              className={cn(
                'flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors',
                'bg-blue-600 text-white hover:bg-blue-700',
                'disabled:bg-gray-300 disabled:cursor-not-allowed'
              )}
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  저장 중...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  출석 저장
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 셀 미선택 */}
      {!loading && !selectedCellId && (
        <div className="text-center py-12 bg-white rounded-lg border">
          <Calendar className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">셀을 선택하면 출석 체크를 시작할 수 있습니다.</p>
        </div>
      )}
    </motion.div>
  );
}

// 헬퍼 함수
function getToday(): string {
  return formatDate(new Date());
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export default AttendanceCheckPage;
