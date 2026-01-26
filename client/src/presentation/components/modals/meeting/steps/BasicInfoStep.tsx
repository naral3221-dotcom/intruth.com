/**
 * BasicInfoStep - 기본 정보 입력 스텝
 * 회의 제목, 일시, 장소, 프로젝트, 참석자
 */
import { Calendar, MapPin, Users, Check, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/core/utils/cn';
import type { Member, Project } from '@/types';

interface BasicInfoStepProps {
  formData: {
    title: string;
    meetingDate: string;
    location: string;
    projectId: string | number;
    attendeeIds: number[];
  };
  onChange: (field: string, value: unknown) => void;
  projects: Project[];
  members: Member[];
}

export function BasicInfoStep({ formData, onChange, projects, members }: BasicInfoStepProps) {
  const [showAttendeeDropdown, setShowAttendeeDropdown] = useState(false);

  const selectedAttendees = members.filter(m => formData.attendeeIds.includes(Number(m.id)));

  const toggleAttendee = (memberId: string) => {
    const numericId = Number(memberId);
    const newIds = formData.attendeeIds.includes(numericId)
      ? formData.attendeeIds.filter(id => id !== numericId)
      : [...formData.attendeeIds, numericId];
    onChange('attendeeIds', newIds);
  };

  const removeAttendee = (memberId: string) => {
    const numericId = Number(memberId);
    onChange('attendeeIds', formData.attendeeIds.filter(id => id !== numericId));
  };

  return (
    <div className="space-y-4">
      {/* 제목 */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          회의 제목 <span className="text-destructive">*</span>
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => onChange('title', e.target.value)}
          placeholder="회의 제목을 입력하세요"
          className="aboard-input"
          autoFocus
        />
      </div>

      {/* 일시 */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          회의 일시 <span className="text-destructive">*</span>
        </label>
        <div className="relative">
          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
          <input
            type="datetime-local"
            value={formData.meetingDate}
            onChange={(e) => onChange('meetingDate', e.target.value)}
            className="w-full py-2.5 pr-4 pl-12 border border-border rounded-lg bg-card focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
          />
        </div>
      </div>

      {/* 장소 */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">장소</label>
        <div className="relative">
          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={formData.location}
            onChange={(e) => onChange('location', e.target.value)}
            placeholder="예: 회의실 A, Zoom 등"
            className="w-full py-2.5 pr-4 pl-12 border border-border rounded-lg bg-card focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
          />
        </div>
      </div>

      {/* 프로젝트 */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">관련 프로젝트</label>
        <select
          value={formData.projectId}
          onChange={(e) => onChange('projectId', e.target.value)}
          className="aboard-input"
        >
          <option value="">프로젝트 선택 (선택사항)</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>

      {/* 참석자 */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">참석자</label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowAttendeeDropdown(!showAttendeeDropdown)}
            className="w-full px-4 py-3 bg-muted/30 border border-border rounded-lg text-left flex items-center justify-between focus:outline-none focus:border-primary/50 min-h-[48px]"
          >
            <span className="text-muted-foreground">
              {selectedAttendees.length > 0
                ? `${selectedAttendees.length}명 선택됨`
                : '참석자 선택'}
            </span>
            <Users className="w-5 h-5 text-muted-foreground" />
          </button>

          {showAttendeeDropdown && (
            <>
              {/* Backdrop for mobile */}
              <div
                className="fixed inset-0 z-10 md:hidden"
                onClick={() => setShowAttendeeDropdown(false)}
              />
              <div className="absolute z-20 w-full mt-2 py-2 bg-white dark:bg-slate-800 border border-border rounded-lg shadow-xl max-h-60 overflow-y-auto">
                {members.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => toggleAttendee(member.id)}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted transition-colors min-h-[48px]"
                  >
                    <div className={cn(
                      'w-5 h-5 rounded border flex items-center justify-center flex-shrink-0',
                      formData.attendeeIds.includes(Number(member.id))
                        ? 'bg-primary border-primary'
                        : 'border-border'
                    )}>
                      {formData.attendeeIds.includes(Number(member.id)) && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary flex-shrink-0">
                        {member.avatarUrl ? (
                          <img src={member.avatarUrl} alt={member.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          member.name.charAt(0)
                        )}
                      </div>
                      <div className="text-left min-w-0">
                        <p className="text-sm text-foreground truncate">{member.name}</p>
                        {member.position && (
                          <p className="text-xs text-muted-foreground truncate">{member.position}</p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* 선택된 참석자 표시 */}
        {selectedAttendees.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {selectedAttendees.map((attendee) => (
              <span
                key={attendee.id}
                className="inline-flex items-center gap-1 px-2 py-1.5 bg-primary/10 text-primary rounded text-sm min-h-[32px]"
              >
                {attendee.name}
                <button
                  type="button"
                  onClick={() => removeAttendee(attendee.id)}
                  className="hover:text-destructive p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
