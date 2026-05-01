import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent, ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Bot,
  CheckCircle2,
  ClipboardCheck,
  Eraser,
  Loader2,
  MessageCircle,
  Send,
  Sparkles,
  UserRound,
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

type QuickAction = {
  label: string;
  command: string;
};

type AgentMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  actions?: AiAgentAction[];
  quickActions?: QuickAction[];
};

type LocalCommandResult =
  | string
  | {
      content: string;
      actions?: AiAgentAction[];
      quickActions?: QuickAction[];
      collapseAfter?: boolean;
    };

const commandSuggestions: QuickAction[] = [
  { label: "새 회의", command: "새 회의 열어줘" },
  { label: "회의 안건", command: "주간 회의 안건을 만들어줘" },
  { label: "승인 대기", command: "AI 승인 대기 보여줘" },
  { label: "업무 초안", command: "현재 프로젝트 업무 초안 만들어줘" },
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

const welcomeMessage =
  "무엇부터 도와드릴까요? 회의 안건을 같이 만들거나, 새 업무/회의를 열고, AI 승인 대기 항목을 처리할 수 있어요.";

function createMessage(
  role: AgentMessage["role"],
  content: string,
  options: Pick<AgentMessage, "actions" | "quickActions"> = {}
): AgentMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    content,
    ...options,
  };
}

function containsAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

function getActionStatusLabel(status: AiAgentAction["status"]) {
  switch (status) {
    case "PENDING_APPROVAL":
      return "승인 대기";
    case "EXECUTED":
      return "실행 완료";
    case "REJECTED":
      return "보류됨";
    case "FAILED":
      return "실패";
    default:
      return status;
  }
}

function summarizeAction(action: AiAgentAction) {
  const taskCount = action.preview.tasks.length;
  const projectName = action.preview.projectName || action.scope.label;
  return `${projectName}에 ${taskCount}개 업무 초안`;
}

function uniqueQuickActions(actions: QuickAction[]) {
  const seen = new Set<string>();
  return actions.filter((action) => {
    const key = `${action.label}:${action.command}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getFollowUpActions(command: string, answer = ""): QuickAction[] {
  const text = `${command} ${answer}`.toLowerCase();
  const actions: QuickAction[] = [];

  if (containsAny(text, ["회의", "안건", "회의록", "자료", "주간"])) {
    actions.push(
      { label: "새 회의 열기", command: "새 회의 열어줘" },
      { label: "회의자료로 이동", command: "회의 페이지로 이동" }
    );
  }

  if (containsAny(text, ["업무", "할 일", "액션", "진행", "task"])) {
    actions.push(
      { label: "업무 초안 만들기", command: "이 내용을 업무 초안으로 만들어줘" },
      { label: "업무 보드로 이동", command: "업무 보드로 이동" }
    );
  }

  if (containsAny(text, ["프로젝트", "사역", "팀"])) {
    actions.push(
      { label: "새 프로젝트", command: "새 프로젝트 열어줘" },
      { label: "팀 페이지", command: "팀 페이지로 이동" }
    );
  }

  if (containsAny(text, ["승인", "초안", "대기"])) {
    actions.push({ label: "승인 대기 보기", command: "AI 승인 대기 보여줘" });
  }

  return uniqueQuickActions(actions).slice(0, 4);
}

function buildConversationPrompt(command: string, history: AgentMessage[]) {
  const recentMessages = history
    .slice(-6)
    .map((message) => `${message.role === "user" ? "사용자" : "INTRUTH AI"}: ${message.content}`)
    .join("\n");

  if (!recentMessages) return command;

  return [
    "아래는 INTRUTH 업무 시스템 안에서 이어진 최근 대화입니다.",
    "교회 청년부 리더들이 바로 실행할 수 있게 한국어로 간결하고 실제적인 답을 주세요.",
    "",
    recentMessages,
    "",
    `새 요청: ${command}`,
  ].join("\n");
}

function renderInline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={`${part}-${index}`} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }

    return part;
  });
}

function renderMessageContent(content: string) {
  const lines = content.split("\n");

  return (
    <div className="space-y-2">
      {lines.map((rawLine, index) => {
        const line = rawLine.trim();
        if (!line) {
          return <div key={`space-${index}`} className="h-1" />;
        }

        if (line.startsWith("- ")) {
          return (
            <p key={`${line}-${index}`} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-50" />
              <span>{renderInline(line.slice(2))}</span>
            </p>
          );
        }

        return <p key={`${line}-${index}`}>{renderInline(line)}</p>;
      })}
    </div>
  );
}

function isClearCommand(command: string) {
  const normalized = command.toLowerCase().trim();
  return normalized === "/clear" || containsAny(normalized, ["대화 초기화", "대화 지워", "채팅 초기화"]);
}

export function AgentCommandCenter() {
  const navigate = useNavigate();
  const location = useLocation();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [reviewingActionId, setReviewingActionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<AgentMessage[]>([
    createMessage("assistant", welcomeMessage, {
      quickActions: commandSuggestions.slice(0, 3),
    }),
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
    return current ? `현재 위치: ${current.label}` : "현재 페이지에서 실행";
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return;
    window.setTimeout(() => inputRef.current?.focus(), 120);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    window.setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 0);
  }, [messages, busy, open]);

  useEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 132)}px`;
  }, [input]);

  const appendMessage = (message: AgentMessage) => {
    setMessages((current) => [...current, message].slice(-24));
  };

  const updateActionInMessages = (updatedAction: AiAgentAction) => {
    setMessages((current) =>
      current.map((message) => ({
        ...message,
        actions: message.actions?.map((action) => (action.id === updatedAction.id ? updatedAction : action)),
      }))
    );
  };

  const resetConversation = () => {
    setMessages([
      createMessage("assistant", "대화를 정리했어요. 새로 필요한 일을 바로 말해주세요.", {
        quickActions: commandSuggestions.slice(0, 3),
      }),
    ]);
    setInput("");
  };

  const runLocalCommand = async (command: string): Promise<LocalCommandResult | null> => {
    const normalized = command.toLowerCase().trim();

    if (containsAny(normalized, ["승인", "대기", "검토"])) {
      const actions = await listAiAgentActions(8);
      const pendingCount = actions.filter((action) => action.status === "PENDING_APPROVAL").length;
      return {
        content: pendingCount
          ? `승인 대기 중인 AI 실행 제안 ${pendingCount}개를 불러왔어요. 필요한 항목만 승인하면 실제 업무로 생성됩니다.`
          : "현재 승인 대기 중인 AI 실행 제안은 없습니다.",
        actions,
        quickActions: [{ label: "업무 초안 만들기", command: "현재 프로젝트 업무 초안 만들어줘" }],
      };
    }

    if (containsAny(normalized, ["업무 초안", "업무 후보", "초안 만들어", "업무로 만들어"])) {
      if (!selectedProjectId) {
        navigate("/tasks");
        return {
          content:
            "업무 초안을 만들려면 먼저 프로젝트 범위가 필요해요. 칸반 보드로 이동했으니 프로젝트를 선택한 뒤 다시 명령해주세요.",
          quickActions: [
            { label: "업무 보드로 이동", command: "업무 보드로 이동" },
            { label: "승인 대기 보기", command: "AI 승인 대기 보여줘" },
          ],
        };
      }

      const result = await createAiTaskDraftAction(buildConversationPrompt(command, messages), {
        type: "PROJECT",
        id: selectedProjectId,
      });
      return {
        content: `${result.action.preview.projectName}에 ${result.action.preview.tasks.length}개 업무 초안을 만들었어요. 아래에서 승인하면 실제 업무로 생성됩니다.`,
        actions: [result.action],
        quickActions: [{ label: "승인 대기 보기", command: "AI 승인 대기 보여줘" }],
      };
    }

    if (containsAny(normalized, ["새 업무", "업무 만들", "업무 추가", "할 일", "태스크"])) {
      openCreateTaskModal(selectedProjectId || undefined);
      return selectedProjectId
        ? { content: "선택된 프로젝트 기준으로 새 업무 창을 열었어요.", collapseAfter: true }
        : { content: "새 업무 창을 열었어요. 프로젝트를 선택하고 내용을 입력하면 됩니다.", collapseAfter: true };
    }

    if (containsAny(normalized, ["새 회의", "회의 만들", "회의 추가", "회의 등록"])) {
      openCreateMeetingModal();
      return {
        content: "새 회의 창을 열었어요.",
        quickActions: [
          { label: "회의 안건 만들기", command: "주간 회의 안건을 만들어줘" },
          { label: "회의자료로 이동", command: "회의 페이지로 이동" },
        ],
        collapseAfter: true,
      };
    }

    if (containsAny(normalized, ["새 프로젝트", "프로젝트 만들", "프로젝트 추가"])) {
      openCreateProjectModal();
      return { content: "새 프로젝트 창을 열었어요.", collapseAfter: true };
    }

    if (containsAny(normalized, ["새 루틴", "루틴 만들", "루틴 추가", "반복 업무"])) {
      openCreateRoutineModal(selectedProjectId || undefined);
      return { content: "새 루틴 창을 열었어요.", collapseAfter: true };
    }

    const route = routeCommands.find((item) => item.keywords.some((keyword) => normalized.includes(keyword)));
    if (containsAny(normalized, ["이동", "열어", "보여", "가줘", "가기"]) && route) {
      navigate(route.path);
      return `${route.label} 페이지로 이동했어요.`;
    }

    return null;
  };

  const runCommand = async (command: string) => {
    const trimmed = command.trim();
    if (!trimmed || busy) return;

    if (isClearCommand(trimmed)) {
      resetConversation();
      return;
    }

    appendMessage(createMessage("user", trimmed));
    setInput("");
    setBusy(true);

    try {
      const localResult = await runLocalCommand(trimmed);
      if (typeof localResult === "string") {
        appendMessage(
          createMessage("assistant", localResult, {
            quickActions: getFollowUpActions(trimmed, localResult),
          })
        );
        return;
      }

      if (localResult) {
        appendMessage(
          createMessage("assistant", localResult.content, {
            actions: localResult.actions,
            quickActions: localResult.quickActions || getFollowUpActions(trimmed, localResult.content),
          })
        );
        if (localResult.collapseAfter) {
          window.setTimeout(() => setOpen(false), 120);
        }
        return;
      }

      const answer = await askAiAssistant(buildConversationPrompt(trimmed, messages));
      appendMessage(
        createMessage("assistant", answer.answer, {
          quickActions: getFollowUpActions(trimmed, answer.answer),
        })
      );
    } catch (error) {
      appendMessage(
        createMessage(
          "assistant",
          error instanceof Error ? error.message : "명령을 처리하지 못했어요. 잠시 뒤 다시 시도해주세요.",
          {
            quickActions: [
              { label: "승인 대기 보기", command: "AI 승인 대기 보여줘" },
              { label: "회의자료로 이동", command: "회의 페이지로 이동" },
            ],
          }
        )
      );
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void runCommand(input);
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    void runCommand(input);
  };

  const handleApprove = async (actionId: number) => {
    setReviewingActionId(actionId);
    try {
      const result = await approveAiAgentAction(actionId);
      updateActionInMessages(result.action);

      const taskStore = useTaskStore.getState();
      const existingIds = new Set(taskStore.tasks.map((task) => task.id));
      taskStore.setTasks([...taskStore.tasks, ...result.tasks.filter((task) => !existingIds.has(task.id))]);

      appendMessage(
        createMessage("assistant", `${result.createdCount}개 업무를 실제 업무 목록에 생성했어요.`, {
          quickActions: [
            { label: "업무 보드로 이동", command: "업무 보드로 이동" },
            { label: "새 업무 열기", command: "새 업무 열어줘" },
          ],
        })
      );
    } catch (error) {
      appendMessage(createMessage("assistant", error instanceof Error ? error.message : "승인 실행에 실패했어요."));
    } finally {
      setReviewingActionId(null);
    }
  };

  const handleReject = async (actionId: number) => {
    setReviewingActionId(actionId);
    try {
      const action = await rejectAiAgentAction(actionId);
      updateActionInMessages(action);
      appendMessage(createMessage("assistant", "해당 AI 실행 제안을 보류했어요."));
    } catch (error) {
      appendMessage(createMessage("assistant", error instanceof Error ? error.message : "보류 처리에 실패했어요."));
    } finally {
      setReviewingActionId(null);
    }
  };

  return (
    <>
      {open && (
        <section
          role="dialog"
          aria-modal="false"
          aria-label="INTRUTH AI 명령"
          className="fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[75] flex max-h-[min(78vh,42rem)] flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-2xl ring-1 ring-black/5 dark:bg-zinc-950 lg:inset-x-auto lg:right-6 lg:bottom-24 lg:w-[460px]"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-950 text-white">
                <Bot className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-base font-bold text-foreground">INTRUTH AI 명령</h2>
                <p className="truncate text-xs text-muted-foreground">{routeHelp}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={resetConversation}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="대화 초기화"
                title="대화 초기화"
              >
                <Eraser className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="AI 명령창 닫기"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto bg-zinc-50/70 px-4 py-4 dark:bg-zinc-900/40">
            {messages.map((message) => (
              <div key={message.id} className={message.role === "user" ? "flex justify-end" : "flex items-start gap-2.5"}>
                {message.role === "assistant" && (
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-zinc-700 shadow-sm ring-1 ring-border dark:bg-zinc-900 dark:text-zinc-200">
                    <Bot className="h-4 w-4" />
                  </div>
                )}

                <div className={message.role === "user" ? "max-w-[84%]" : "min-w-0 max-w-[92%] flex-1"}>
                  <div
                    className={
                      message.role === "user"
                        ? "rounded-2xl rounded-br-md bg-zinc-950 px-4 py-3 text-sm leading-6 text-white shadow-sm"
                        : "rounded-2xl rounded-tl-md border border-border bg-white px-4 py-3 text-sm leading-6 text-foreground shadow-sm dark:bg-zinc-950"
                    }
                  >
                    {renderMessageContent(message.content)}
                  </div>

                  {message.quickActions && message.quickActions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {message.quickActions.map((action) => (
                        <button
                          key={`${message.id}-${action.label}-${action.command}`}
                          type="button"
                          onClick={() => void runCommand(action.command)}
                          disabled={busy}
                          className="rounded-full border border-border bg-white px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm hover:border-primary/50 hover:bg-primary/5 disabled:opacity-50 dark:bg-zinc-950"
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {message.actions && message.actions.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {message.actions.map((action) => {
                        const canReview = action.status === "PENDING_APPROVAL";
                        return (
                          <div key={action.id} className="rounded-2xl border border-border bg-card p-3 text-left shadow-sm">
                            <div className="flex items-start gap-2">
                              <ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="min-w-0 truncate text-sm font-semibold text-foreground">{summarizeAction(action)}</p>
                                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                                    {getActionStatusLabel(action.status)}
                                  </span>
                                </div>
                                <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{action.preview.brief}</p>
                              </div>
                            </div>
                            <div className="mt-3 flex gap-2">
                              <button
                                type="button"
                                onClick={() => void handleApprove(action.id)}
                                disabled={reviewingActionId === action.id || !canReview}
                                className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                              >
                                {reviewingActionId === action.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                )}
                                {canReview ? "승인 실행" : "처리됨"}
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleReject(action.id)}
                                disabled={reviewingActionId === action.id || !canReview}
                                className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl border border-border px-3 text-xs font-semibold text-foreground disabled:opacity-50"
                              >
                                보류
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {message.role === "user" && (
                  <div className="mt-0.5 hidden h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-zinc-700 shadow-sm ring-1 ring-border sm:flex dark:bg-zinc-900 dark:text-zinc-200">
                    <UserRound className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}

            {busy && (
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-zinc-700 shadow-sm ring-1 ring-border dark:bg-zinc-900 dark:text-zinc-200">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="inline-flex items-center gap-2 rounded-2xl rounded-tl-md border border-border bg-white px-4 py-3 text-sm text-muted-foreground shadow-sm dark:bg-zinc-950">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  처리 중입니다
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-border bg-white p-3 dark:bg-zinc-950">
            <div className="mb-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              {commandSuggestions.map((suggestion) => (
                <button
                  key={suggestion.label}
                  type="button"
                  onClick={() => void runCommand(suggestion.command)}
                  disabled={busy}
                  className="min-h-9 truncate rounded-full border border-border bg-muted/40 px-3 text-xs font-semibold text-muted-foreground hover:bg-muted disabled:opacity-50"
                  title={suggestion.command}
                >
                  {suggestion.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleInputKeyDown}
                rows={1}
                className="max-h-32 min-h-12 min-w-0 flex-1 resize-none rounded-2xl border border-border bg-background px-4 py-3 text-sm leading-6 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="예: 주간 회의 안건 만들어줘"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm disabled:opacity-50"
                aria-label="AI 명령 보내기"
              >
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </button>
            </form>
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              Enter로 보내고 Shift+Enter로 줄바꿈
            </p>
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] left-4 z-[70] flex h-14 w-14 items-center justify-center rounded-full bg-zinc-950 text-white shadow-xl shadow-black/20 transition hover:scale-[1.02] lg:bottom-8"
        aria-label={open ? "AI 명령창 닫기" : "AI 명령창 열기"}
        title={open ? "AI 명령 닫기" : "AI 명령"}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </>
  );
}
