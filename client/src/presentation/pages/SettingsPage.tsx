import { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  User,
  Palette,
  Shield,
  Sparkles,
  Download,
  Upload,
  RotateCcw,
  Clock,
  Camera,
  Bell,
  Globe,
  MessageCircle,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Copy,
  FileDown,
} from "lucide-react";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { SettingsToggle } from "@/features/settings/components/SettingsToggle";
import { cn } from "@/core/utils/cn";
import { toast } from "@/stores/toastStore";
import { copyShareText, shareKakaoText, type ShareResult } from "@/shared/share/kakaoShare";
import { canNativeFileShare } from "@/shared/share/nativeFileShare";
import { createShareUrl, getShareRuntimeStatus } from "@/shared/share/shareConfig";

type TabId = "profile" | "appearance" | "notifications" | "integrations" | "security";

interface Tab {
  id: TabId;
  label: string;
  icon: typeof User;
  iconBg: string;
}

const tabs: Tab[] = [
  { id: "profile", label: "프로필", icon: User, iconBg: "widget-icon-blue" },
  { id: "appearance", label: "외관", icon: Palette, iconBg: "widget-icon-purple" },
  { id: "notifications", label: "알림", icon: Bell, iconBg: "widget-icon-orange" },
  { id: "integrations", label: "연동", icon: MessageCircle, iconBg: "widget-icon-blue" },
  { id: "security", label: "보안", icon: Shield, iconBg: "widget-icon-green" },
];

function maskKey(value: string) {
  if (!value) return "";
  if (value.length <= 8) return "설정됨";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const {
    settings,
    loading,
    updateAppearance,
    updateSecurity,
    resetSettings,
    exportSettings,
    importSettings,
    profile,
    updateProfile,
  } = useSettings();

  const [profileName, setProfileName] = useState(profile?.name || "");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const shareStatus = getShareRuntimeStatus();
  const kakaoJavascriptKey = shareStatus.kakaoJavascriptKey;
  const currentOrigin = shareStatus.currentOrigin;
  const publicAppUrl = shareStatus.publicAppUrl;
  const kakaoReady = Boolean(kakaoJavascriptKey);
  const publicUrlReady = shareStatus.configuredPublicUrl && !shareStatus.publicUrlIsLocal;
  const nativeFileShareReady = canNativeFileShare();
  const envSnippet = [
    `VITE_PUBLIC_APP_URL=${publicAppUrl || "https://intruth.example.com"}`,
    "VITE_KAKAO_JAVASCRIPT_KEY=카카오_JavaScript_키",
  ].join("\n");

  const notifyShareResult = (result: ShareResult) => {
    if (result === "kakao" || result === "native") {
      toast.success("공유 화면을 열었습니다.");
      return;
    }

    if (result === "copied") {
      toast.success("공유 내용을 복사했습니다.");
      return;
    }

    toast.info("공유를 완료했습니다.");
  };

  const handleCopyOrigin = async () => {
    try {
      await copyShareText(currentOrigin);
      toast.success("도메인을 복사했습니다.");
    } catch {
      toast.error("도메인 복사에 실패했습니다.");
    }
  };

  const handleCopyPublicUrl = async () => {
    try {
      await copyShareText(publicAppUrl);
      toast.success("공유 기준 URL을 복사했습니다.");
    } catch {
      toast.error("URL 복사에 실패했습니다.");
    }
  };

  const handleCopyEnvSnippet = async () => {
    try {
      await copyShareText(envSnippet);
      toast.success("환경 변수 예시를 복사했습니다.");
    } catch {
      toast.error("환경 변수 복사에 실패했습니다.");
    }
  };

  const handleKakaoTestShare = async () => {
    try {
      const result = await shareKakaoText({
        title: "INTRUTH",
        text: "INTRUTH 카카오 공유 테스트입니다.",
        url: createShareUrl("/"),
        buttonTitle: "INTRUTH 열기",
      });
      notifyShareResult(result);
    } catch {
      toast.error("공유 테스트에 실패했습니다.");
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('이미지 파일만 업로드할 수 있습니다.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('파일 크기는 5MB 이하여야 합니다.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        updateProfile({ avatarUrl: base64 });
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">설정을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  const handleExport = () => {
    const json = exportSettings();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "intruth-settings.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const json = e.target?.result as string;
          if (importSettings(json)) {
            alert("설정을 가져왔습니다.");
          } else {
            alert("설정 파일을 읽을 수 없습니다.");
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">설정</h1>
          <p className="text-muted-foreground text-sm mt-1">앱의 동작과 외관을 사용자화하세요</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="aboard-btn-secondary inline-flex items-center gap-2 text-sm"
          >
            <Download className="w-4 h-4" /> 내보내기
          </button>
          <button
            onClick={handleImport}
            className="aboard-btn-secondary inline-flex items-center gap-2 text-sm"
          >
            <Upload className="w-4 h-4" /> 가져오기
          </button>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Tab Navigation */}
        <div className="lg:w-72 shrink-0">
          <div className="aboard-card p-4">
            <h3 className="text-sm font-medium text-muted-foreground px-2 mb-3">설정 메뉴</h3>
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <motion.button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  whileHover={{ x: 2 }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all",
                    activeTab === tab.id
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", tab.iconBg)}>
                    <tab.icon className="w-4 h-4" />
                  </div>
                  <span className="font-medium">{tab.label}</span>
                </motion.button>
              ))}
            </nav>

            <div className="my-4 border-t border-border" />

            {/* Quick Actions */}
            <div className="space-y-1">
              <button
                onClick={() => {
                  if (confirm("모든 설정을 초기화하시겠습니까?")) {
                    resetSettings();
                  }
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-destructive hover:bg-destructive/10 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="text-sm">설정 초기화</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          {/* Profile Tab */}
          {activeTab === "profile" && (
            <motion.div
              className="space-y-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {/* Profile Card */}
              <div className="aboard-card p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl widget-icon-blue flex items-center justify-center">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">프로필 정보</h3>
                    <p className="text-xs text-muted-foreground">기본 프로필 정보를 관리하세요</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start gap-6 p-4 bg-muted/50 rounded-xl mb-6">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                  <div
                    className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-border cursor-pointer group shadow-sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {profile?.avatarUrl ? (
                      <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-linear-to-br from-primary to-primary/70 flex items-center justify-center text-white text-3xl font-bold">
                        {profile?.name.charAt(0) || "?"}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xl font-bold text-foreground">{profile?.name}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{profile?.username || profile?.email}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <span className="aboard-badge aboard-badge-info">{profile?.department}</span>
                      <span className="aboard-badge aboard-badge-success">{profile?.position}</span>
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-3 text-sm text-primary hover:underline inline-flex items-center gap-1"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      프로필 사진 변경
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 border-b border-border">
                    <div>
                      <p className="font-medium text-foreground">이름</p>
                      <p className="text-xs text-muted-foreground">표시될 이름을 입력하세요</p>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        placeholder="이름"
                        className="aboard-input w-48"
                      />
                      <button
                        onClick={() => updateProfile({ name: profileName })}
                        className="aboard-btn-primary text-sm"
                      >
                        저장
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3">
                    <div>
                      <p className="font-medium text-foreground">아이디</p>
                      <p className="text-xs text-muted-foreground">로그인에 사용하는 아이디</p>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="w-4 h-4" />
                      <span>{profile?.username || profile?.email}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Appearance Tab */}
          {activeTab === "appearance" && (
            <motion.div
              className="space-y-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {/* Theme Card */}
              <div className="aboard-card p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl widget-icon-purple flex items-center justify-center">
                    <Palette className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">테마 설정</h3>
                    <p className="text-xs text-muted-foreground">앱의 색상 테마를 선택하세요</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  {[
                    { value: "light", label: "라이트", icon: "☀️" },
                    { value: "dark", label: "다크", icon: "🌙" },
                    { value: "system", label: "시스템", icon: "💻" },
                  ].map((theme) => (
                    <button
                      key={theme.value}
                      onClick={() => updateAppearance({ theme: theme.value as "light" | "dark" | "system" })}
                      className={cn(
                        "p-4 rounded-xl border-2 transition-all text-center",
                        settings.appearance.theme === theme.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className="text-3xl mb-2">{theme.icon}</div>
                      <p className="font-medium text-foreground">{theme.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Effects Card */}
              <div className="aboard-card p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl widget-icon-orange flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">효과 설정</h3>
                    <p className="text-xs text-muted-foreground">UI 효과와 표시 옵션을 설정하세요</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-border">
                    <div>
                      <p className="font-medium text-foreground">애니메이션</p>
                      <p className="text-xs text-muted-foreground">UI 애니메이션 효과 활성화</p>
                    </div>
                    <SettingsToggle
                      enabled={settings.appearance.animationsEnabled}
                      onChange={(enabled) => updateAppearance({ animationsEnabled: enabled })}
                    />
                  </div>

                  <div className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium text-foreground">컴팩트 모드</p>
                      <p className="text-xs text-muted-foreground">더 많은 콘텐츠를 한 화면에 표시</p>
                    </div>
                    <SettingsToggle
                      enabled={settings.appearance.compactMode}
                      onChange={(enabled) => updateAppearance({ compactMode: enabled })}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Notifications Tab */}
          {activeTab === "notifications" && (
            <motion.div
              className="space-y-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="aboard-card p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl widget-icon-orange flex items-center justify-center">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">알림 설정</h3>
                    <p className="text-xs text-muted-foreground">알림 수신 방식을 설정하세요</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-border">
                    <div>
                      <p className="font-medium text-foreground">이메일 알림</p>
                      <p className="text-xs text-muted-foreground">중요한 업데이트를 이메일로 받기</p>
                    </div>
                    <SettingsToggle
                      enabled={true}
                      onChange={() => {}}
                    />
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-border">
                    <div>
                      <p className="font-medium text-foreground">브라우저 알림</p>
                      <p className="text-xs text-muted-foreground">데스크톱 푸시 알림 받기</p>
                    </div>
                    <SettingsToggle
                      enabled={true}
                      onChange={() => {}}
                    />
                  </div>

                  <div className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium text-foreground">업무 마감 알림</p>
                      <p className="text-xs text-muted-foreground">마감일 하루 전 알림 받기</p>
                    </div>
                    <SettingsToggle
                      enabled={true}
                      onChange={() => {}}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Integrations Tab */}
          {activeTab === "integrations" && (
            <motion.div
              className="space-y-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="aboard-card p-6">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FEE500] text-[#191919]">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">카카오톡 공유</h3>
                    <p className="text-xs text-muted-foreground">업무, 프로젝트, 회의자료 공유 상태</p>
                  </div>
                </div>

                <div className="grid gap-3">
                  <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-lg",
                        kakaoReady ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
                      )}>
                        {kakaoReady ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">JavaScript 키</p>
                        <p className="text-xs text-muted-foreground">
                          {kakaoReady ? maskKey(kakaoJavascriptKey) : "VITE_KAKAO_JAVASCRIPT_KEY 필요"}
                        </p>
                      </div>
                    </div>
                    <span className={cn(
                      "aboard-badge text-[10px]",
                      kakaoReady ? "aboard-badge-success" : "aboard-badge-warning"
                    )}>
                      {kakaoReady ? "설정됨" : "대기"}
                    </span>
                  </div>

                  <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                        publicUrlReady ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
                      )}>
                        {publicUrlReady ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">공유 기준 URL</p>
                        <p className="truncate text-sm text-muted-foreground">{publicAppUrl || "VITE_PUBLIC_APP_URL 필요"}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          카카오 Developers의 JavaScript SDK 도메인에 등록할 주소입니다.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => void handleCopyPublicUrl()}
                      className="aboard-btn-secondary inline-flex min-h-10 items-center justify-center gap-2 text-sm"
                    >
                      <Copy className="h-4 w-4" />
                      복사
                    </button>
                  </div>

                  <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">현재 접속 도메인</p>
                      <p className="truncate text-sm text-muted-foreground">{currentOrigin}</p>
                      {shareStatus.currentOriginIsLocal && (
                        <p className="mt-1 text-xs text-amber-600">
                          로컬 주소에서는 카카오 SDK 도메인 검증이 제한될 수 있습니다.
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => void handleCopyOrigin()}
                      className="aboard-btn-secondary inline-flex min-h-10 items-center justify-center gap-2 text-sm"
                    >
                      <Copy className="h-4 w-4" />
                      복사
                    </button>
                  </div>

                  <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-lg",
                        nativeFileShareReady ? "bg-emerald-500/10 text-emerald-600" : "bg-slate-500/10 text-slate-600"
                      )}>
                        {nativeFileShareReady ? <CheckCircle2 className="h-5 w-5" /> : <FileDown className="h-5 w-5" />}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">PDF 파일 공유</p>
                        <p className="text-xs text-muted-foreground">
                          {nativeFileShareReady
                            ? "이 브라우저는 PDF를 카카오톡 앱으로 보낼 수 있습니다."
                            : "미지원 브라우저에서는 PDF를 내려받은 뒤 공유합니다."}
                        </p>
                      </div>
                    </div>
                    <span className={cn(
                      "aboard-badge text-[10px]",
                      nativeFileShareReady ? "aboard-badge-success" : "aboard-badge-info"
                    )}>
                      {nativeFileShareReady ? "파일 공유 가능" : "다운로드 대체"}
                    </span>
                  </div>

                  <div className="rounded-xl border border-dashed border-border bg-card p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-medium text-foreground">운영 배포 환경 변수</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          VPS 도메인이 정해지면 아래 값을 production 환경에 넣고 같은 도메인을 카카오 앱에 등록하세요.
                        </p>
                      </div>
                      <button
                        onClick={() => void handleCopyEnvSnippet()}
                        className="aboard-btn-secondary inline-flex min-h-10 items-center justify-center gap-2 text-sm"
                      >
                        <Copy className="h-4 w-4" />
                        복사
                      </button>
                    </div>
                    <pre className="mt-3 overflow-x-auto rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                      {envSnippet}
                    </pre>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    onClick={() => void handleKakaoTestShare()}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#FEE500] px-4 py-2 text-sm font-semibold text-[#191919] transition-colors hover:bg-[#f2da00]"
                  >
                    <MessageCircle className="h-4 w-4" />
                    공유 테스트
                  </button>
                  <a
                    href="https://developers.kakao.com/console/app"
                    target="_blank"
                    rel="noreferrer"
                    className="aboard-btn-secondary inline-flex min-h-11 items-center justify-center gap-2 text-sm"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Kakao Developers
                  </a>
                </div>
              </div>
            </motion.div>
          )}

          {/* Security Tab */}
          {activeTab === "security" && (
            <motion.div
              className="space-y-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="aboard-card p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl widget-icon-green flex items-center justify-center">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">보안 설정</h3>
                    <p className="text-xs text-muted-foreground">계정 보안을 관리하세요</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 border-b border-border">
                    <div>
                      <p className="font-medium text-foreground">세션 타임아웃</p>
                      <p className="text-xs text-muted-foreground">자동 로그아웃 시간 설정</p>
                    </div>
                    <select
                      value={String(settings.security.sessionTimeout)}
                      onChange={(e) => updateSecurity({ sessionTimeout: parseInt(e.target.value) })}
                      className="aboard-input w-40"
                    >
                      <option value="15">15분</option>
                      <option value="30">30분</option>
                      <option value="60">1시간</option>
                      <option value="120">2시간</option>
                      <option value="480">8시간</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-border">
                    <div>
                      <p className="font-medium text-foreground">2단계 인증</p>
                      <p className="text-xs text-muted-foreground">추가 보안 레이어 활성화</p>
                    </div>
                    <span className="aboard-badge aboard-badge-warning">준비 중</span>
                  </div>

                  <div className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium text-foreground">비밀번호 변경</p>
                      <p className="text-xs text-muted-foreground">계정 비밀번호 업데이트</p>
                    </div>
                    <button className="aboard-btn-secondary text-sm">
                      변경하기
                    </button>
                  </div>
                </div>
              </div>

              {/* Login History Card */}
              <div className="aboard-card p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl widget-icon-blue flex items-center justify-center">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">로그인 기록</h3>
                    <p className="text-xs text-muted-foreground">최근 로그인 활동을 확인하세요</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    { device: "Chrome on Windows", location: "Seoul, Korea", time: "현재 세션", current: true },
                    { device: "Safari on macOS", location: "Seoul, Korea", time: "2일 전", current: false },
                    { device: "Mobile App", location: "Seoul, Korea", time: "1주 전", current: false },
                  ].map((session, index) => (
                    <div
                      key={index}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg",
                        session.current ? "bg-primary/5 border border-primary/20" : "bg-muted/50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center",
                          session.current ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                        )}>
                          <Globe className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{session.device}</p>
                          <p className="text-xs text-muted-foreground">{session.location}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {session.current ? (
                          <span className="aboard-badge aboard-badge-success text-[10px]">현재</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">{session.time}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
