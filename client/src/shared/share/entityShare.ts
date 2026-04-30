import type { Meeting, Project, Task } from '@/types';
import { shareKakaoText, type ShareResult } from './kakaoShare';
import { createShareUrl } from './shareConfig';

const taskStatusLabel: Record<Task['status'], string> = {
  TODO: '대기중',
  IN_PROGRESS: '진행중',
  REVIEW: '검토중',
  DONE: '완료',
};

const taskPriorityLabel: Record<Task['priority'], string> = {
  LOW: '낮음',
  MEDIUM: '보통',
  HIGH: '높음',
  URGENT: '긴급',
};

function stripHtml(value?: string) {
  if (!value) return '';
  const element = document.createElement('div');
  element.innerHTML = value;
  return (element.textContent || element.innerText || '').trim();
}

function formatDate(value?: string) {
  if (!value) return '';
  return new Date(value).toLocaleString('ko-KR', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function compact(value: string, maxLength = 120) {
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 3)}...` : normalized;
}

function resultPath(result: ShareResult) {
  return result;
}

export async function shareTask(task: Task) {
  const dueText = task.dueDate ? `마감: ${formatDate(task.dueDate)}` : '마감일 없음';
  const projectText = task.project?.name ? `프로젝트: ${task.project.name}` : '프로젝트 미지정';
  const assigneeText = task.assignees?.length
    ? `담당: ${task.assignees.map((member) => member.name).join(', ')}`
    : task.assignee?.name
      ? `담당: ${task.assignee.name}`
      : '담당자 없음';
  const url = createShareUrl(`/tasks?taskId=${task.id}`);

  return resultPath(
    await shareKakaoText({
      title: task.title,
      text: [
        `[업무] ${task.title}`,
        projectText,
        assigneeText,
        `상태: ${taskStatusLabel[task.status]} · 우선순위: ${taskPriorityLabel[task.priority]}`,
        dueText,
      ].join('\n'),
      url,
      buttonTitle: '업무 보기',
      serverCallbackArgs: {
        type: 'task',
        id: task.id,
      },
    })
  );
}

export async function shareProject(project: Project) {
  const description = compact(stripHtml(project.description) || '프로젝트 내용을 확인해주세요.');
  const taskCount = project._count?.tasks ?? 0;
  const ownerText = project.owner?.name ? `담당: ${project.owner.name}` : '담당자 미지정';
  const url = createShareUrl(`/projects?projectId=${project.id}`);

  return resultPath(
    await shareKakaoText({
      title: project.name,
      text: [
        `[프로젝트] ${project.name}`,
        ownerText,
        `업무 ${taskCount}개 · 상태 ${project.status}`,
        description,
      ].join('\n'),
      url,
      buttonTitle: '프로젝트 보기',
      serverCallbackArgs: {
        type: 'project',
        id: project.id,
      },
    })
  );
}

export async function shareMeeting(meeting: Meeting) {
  const when = formatDate(meeting.meetingDate);
  const attendees = meeting.attendees?.map((attendee) => attendee.member?.name).filter(Boolean).join(', ');
  const url = createShareUrl(`/meetings?meetingId=${meeting.id}`);
  const summary = compact(stripHtml(meeting.summary || meeting.content) || '회의자료를 확인해주세요.');

  return resultPath(
    await shareKakaoText({
      title: meeting.title,
      text: `[회의] ${meeting.title}\n${when}${meeting.location ? ` · ${meeting.location}` : ''}\n${attendees ? `참석: ${attendees}\n` : ''}${summary}`,
      url,
      buttonTitle: '회의 보기',
      serverCallbackArgs: {
        type: 'meeting',
        id: String(meeting.id),
      },
    })
  );
}
