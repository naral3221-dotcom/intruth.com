import { useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Bot,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  MessageCircle,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { useUIStore } from "@/stores/uiStore";
import { useTaskStore } from "@/stores/taskStore";
import {
  approveAiAgentAction,
  askAiAssistant,
  createAiTaskDraftAction,
  listAiAgentActions,
  rejectAiAgentAction,
} from "@/shared/ai/assistantApi";
import type { AiAgentAction } from "@/types";

type AgentMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  actions?: AiAgentAction[];
};

const commandSuggestions = [
  "새 업무 열어줘",
  "회의 페이지로 이동",
  "AI 승인 대기 보여줘",
  "프로젝트 업무 초안 만들어줘",
];

const routeCommands = [
  { path: "/", label: "홈", keywords: ["홈", "대시보드", "처음"] },
  { path: "/my-tasks", label: "내 할 일", keywords: ["내 할 일", "내 업무", "나의 업무"] },
  { path: "/tasks", label: "칸반 보드", keywords: ["칸반", "보드", "업무 보드"] },
  { path: "/projects", label: "프로젝트", keywords: ["프로젝트"] },
  { path: "/meetings", label: "회의자료", keywords: ["회의", "회의자료", "회의록"] },
  { path: "/team", label: "팀", keywords: ["팀", "멤버", "지체"] },
  { path: "/attendance", label: "출석", keywords: ["출석"] },
  { path: "/settings", label: "설정", keywords: ["설정"] },
  { path: "/admin", label: "관리자", keywords: ["관리자", "어드민"] },
];

function newMessage(role: AgentMessage["role"], content: string, actions?: AiAgentAction[]): AgentMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    content,
    actions,
  };
}

function containsAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

function summarizeAction(action: AiAgentAction) {
  const taskCount = action.preview.tasks.length;
  const projectName = action.preview.projectName || action.scope.label;
  return `${projectName}에 ${taskCount}개 업무 초안`;
}

export function AgentCommandCenter() {
  const navigate = useNavigate();
  const location = useLocation();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [reviewingActionId, setReviewingActionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<AgentMessage[]>([
    newMessage(
      "assistant",
      "원하는 일을 말로 지시해주세요. 페이지 이동, 새 업무/회의/프로젝트 열기, AI 승인 대기 처리부터 시작할 수 있습니다."
    ),
  ]);

  const {
    selectedProjectId,
    openCreateTaskModal,
    openCreateProjectModal,
    openCreateMeetingModal,
    openCreateRoutineModal,
  } = useUIStore();

  const routeHelp = useMemo(() => {
    const current = routeCommands.find((route) => route.path === location.pathname);
    return current ? `현재 위치: ${current.label}` : "현재 페이지에서 실행할 명령을 입력하세요.";
  }, [location.pathname]);

  const appendMessage = (message: AgentMessage) => {
    setMessages((current) => [...current, message].slice(-12));
    window.setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 0);
  };

  const runLocalCommand = async (command: string) => {
    const normalized = command.toLowerCase().trim();

    if (containsAny(normalized, ["승인", "대기", "검토"])) {
      const actions = await listAiAgentActions(8);
      return {
        content: actions.length
          ? `승인 대기 중인 AI 실행 제안 ${actions.filter((action) => action.status === "PENDING_APPROVAL").length}개를 불러왔습니다.`
          : "현재 승인 대기 중인 AI 실행 제안이 없습니다.",
        actions,
      };
    }

    if (containsAny(normalized, ["업무 초안", "업무 후보", "초안 만들어"])) {
      if (!selectedProjectId) {
        navigate("/tasks");
        return "업무 초안은 프로젝트 범위가 필요합니다. 칸반 보드로 이동했으니 프로젝트를 선택한 뒤 다시 명령해주세요.";
      }

      const result = await createAiTaskDraftAction(command, {
        type: "PROJECT",
        id: selectedProjectId,
      });
      return {
        content: `${result.action.preview.projectName}에 ${result.action.preview.tasks.length}개 업무 초안을 만들었습니다. 아래에서 승인하면 실제 업무로 생성됩니다.`,
        actions: [result.action],
      };
    }

    if (containsAny(normalized, ["새 업무", "업무 만들어", "업무 추가", "할 일", "태스크"])) {
      openCreateTaskModal(selectedProjectId || undefined);
      return selectedProjectId
        ? "선택된 프로젝트 기준으로 새 업무 창을 열었습니다."
        : "새 업무 창을 열었습니다. 프로젝트를 선택하고 내용을 입력하면 됩니다.";
    }

    if (containsAny(normalized, ["새 회의", "회의 만들", "회의 추가", "회의 등록"])) {
      openCreateMeetingModal();
      return "새 회의 창을 열었습니다.";
    }

    if (containsAny(normalized, ["새 프로젝트", "프로젝트 만들", "프로젝트 추가"])) {
      openCreateProjectModal();
      return "새 프로젝트 창을 열었습니다.";
    }

    if (containsAny(normalized, ["새 루틴", "루틴 만들", "루틴 추가", "반복 업무"])) {
      openCreateRoutineModal(selectedProjectId || undefined);
      return "새 루틴 창을 열었습니다.";
    }

    const route = routeCommands.find((item) => item.keywords.some((keyword) => normalized.includes(keyword)));
    if (containsAny(normalized, ["이동", "열어", "보여", "가줘", "가자"]) && route) {
      navigate(route.path);
      return `${route.label} 페이지로 이동했습니다.`;
    }

    return null;
  };

  const runCommand = async (command: string) => {
    const trimmed = command.trim();
    if (!trimmed || busy) return;

    appendMessage(newMessage("user", trimmed));
    setInput("");
    setBusy(true);

    try {
      const localResult = await runLocalCommand(trimmed);
      if (typeof localResult === "string") {
        appendMessage(newMessage("assistant", localResult));
        return;
      }
      if (localResult) {
        appendMessage(newMessage("assistant", localResult.content, localResult.actions));
        return;
      }

      const answer = await askAiAssistant(trimmed);
      appendMessage(newMessage("assistant", answer.answer));
    } catch (error) {
      appendMessage(newMessage("assistant", error instanceof Error ? error.message : "명령을 처리하지 못했습니다."));
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void runCommand(input);
  };

  const handleApprove = async (actionId: number) => {
    setReviewingActionId(actionId);
    try {
      const result = await approveAiAgentAction(actionId);
      const taskStore = useTaskStore.getState();
      const existingIds = new Set(taskStore.tasks.map((task) => task.id));
      taskStore.setTasks([
        ...taskStore.tasks,
        ...result.tasks.filter((task) => !existingIds.has(task.id)),
      ]);

      appendMessage(newMessage("assistant", `${result.createdCount}개 업무를 실제 업무 목록에 생성했습니다.`));
    } catch (error) {
      appendMessage(newMessage("assistant", error instanceof Error ? error.message : "승인 실행에 실패했습니다."));
    } finally {
      setReviewingActionId(null);
    }
  };

  const handleReject = async (actionId: number) => {
    setReviewingActionId(actionId);
    try {
      await rejectAiAgentAction(actionId);
      appendMessage(newMessage("assistant", "해당 AI 실행 제안을 보류했습니다."));
    } catch (error) {
      appendMessage(newMessage("assistant", error instanceof Error ? error.message : "거절 처리에 실패했습니다."));
    } finally {
      setReviewingActionId(null);
    }
  };

  return (
    <>
      {open && (
        <section className="fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[75] flex max-h-[76vh] flex-col overflow-hidden rounded-xl border border-border bg-white shadow-2xl ring-1 ring-black/5 dark:bg-zinc-950 sm:inset-x-auto sm:right-6 sm:bottom-24 sm:w-[420px]">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Bot className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-foreground">INTRUTH AI 명령</h2>
                <p className="truncate text-xs text-muted-foreground">{routeHelp}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
              aria-label="AI 명령창 닫기"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.map((message) => (
              <div key={message.id} className={message.role === "user" ? "text-right" : "text-left"}>
                <div
                  className={
                    message.role === "user"
                      ? "ml-auto inline-block max-w-[88%] rounded-xl bg-primary px-3 py-2 text-sm leading-6 text-primary-foreground"
                      : "inline-block max-w-[92%] rounded-xl bg-muted px-3 py-2 text-sm leading-6 text-foreground"
                  }
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>

                {message.actions && message.actions.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {message.actions.map((action) => (
                      <div key={action.id} className="rounded-xl border border-border bg-card p-3 text-left">
                        <div className="flex items-start gap-2">
                          <ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-foreground">{summarizeAction(action)}</p>
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{action.preview.brief}</p>
                          </div>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() => void handleApprove(action.id)}
                            disabled={reviewingActionId === action.id || action.status !== "PENDING_APPROVAL"}
                            className="inline-flex min-h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                          >
                            {reviewingActionId === action.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                            승인
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleReject(action.id)}
                            disabled={reviewingActionId === action.id || action.status !== "PENDING_APPROVAL"}
                            className="inline-flex min-h-9 flex-1 items-center justify-center rounded-lg border border-border px-3 text-xs font-semibold text-foreground disabled:opacity-50"
                          >
                            보류
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-border p-3">
            <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
              {commandSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => void runCommand(suggestion)}
                  className="shrink-0 rounded-full border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
                >
                  {suggestion}
                </button>
              ))}
            </div>
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                className="min-h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
                placeholder="예: 새 회의 열어줘"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50"
                aria-label="AI 명령 보내기"
              >
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </button>
            </form>
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] left-4 z-[70] flex h-14 w-14 items-center justify-center rounded-full bg-zinc-950 text-white shadow-xl shadow-black/20 sm:bottom-8"
        aria-label={open ? "AI 명령창 닫기" : "AI 명령창 열기"}
        title={open ? "AI 명령 닫기" : "AI 명령"}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      <div className="fixed bottom-[calc(9.5rem+env(safe-area-inset-bottom))] left-4 z-[69] hidden rounded-full border border-border bg-white px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm sm:flex">
        <Sparkles className="mr-1.5 h-3.5 w-3.5 text-primary" />
        말로 지시하기
      </div>
    </>
  );
}
