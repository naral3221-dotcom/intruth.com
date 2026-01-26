/**
 * EditorToolbar - 리치 에디터 툴바
 * PC와 모바일 모두에서 사용 가능한 반응형 툴바
 */
import { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  CheckSquare,
  Link2,
  Undo,
  Redo,
  MoreHorizontal,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/core/utils/cn';

interface EditorToolbarProps {
  editor: Editor;
  onSetLink: () => void;
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title?: string;
}

function ToolbarButton({ onClick, isActive, disabled, children, title }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'min-w-[36px] min-h-[36px] md:min-w-[32px] md:min-h-[32px]',
        'flex items-center justify-center rounded-md',
        'transition-colors',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-6 bg-border mx-1" />;
}

export function EditorToolbar({ editor, onSetLink }: EditorToolbarProps) {
  const [showMoreTools, setShowMoreTools] = useState(false);

  if (!editor) return null;

  // 기본 도구 (모바일에서도 항상 표시)
  const basicTools = (
    <>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        title="굵게 (Ctrl+B)"
      >
        <Bold className="w-4 h-4" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        title="기울임 (Ctrl+I)"
      >
        <Italic className="w-4 h-4" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive('underline')}
        title="밑줄 (Ctrl+U)"
      >
        <Underline className="w-4 h-4" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        title="글머리 기호"
      >
        <List className="w-4 h-4" />
      </ToolbarButton>
    </>
  );

  // 확장 도구 (PC에서 항상 표시, 모바일에서는 More 버튼으로 토글)
  const extendedTools = (
    <>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive('strike')}
        title="취소선"
      >
        <Strikethrough className="w-4 h-4" />
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive('heading', { level: 1 })}
        title="제목 1"
      >
        <Heading1 className="w-4 h-4" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
        title="제목 2"
      >
        <Heading2 className="w-4 h-4" />
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        title="번호 매기기"
      >
        <ListOrdered className="w-4 h-4" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        isActive={editor.isActive('taskList')}
        title="체크리스트"
      >
        <CheckSquare className="w-4 h-4" />
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton
        onClick={onSetLink}
        isActive={editor.isActive('link')}
        title="링크"
      >
        <Link2 className="w-4 h-4" />
      </ToolbarButton>
    </>
  );

  // Undo/Redo
  const historyTools = (
    <>
      <ToolbarDivider />

      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="실행 취소 (Ctrl+Z)"
      >
        <Undo className="w-4 h-4" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="다시 실행 (Ctrl+Y)"
      >
        <Redo className="w-4 h-4" />
      </ToolbarButton>
    </>
  );

  return (
    <div className="border-b border-border bg-muted/30">
      {/* PC 툴바 (md 이상) */}
      <div className="hidden md:flex items-center gap-0.5 p-2 flex-wrap">
        {basicTools}
        {extendedTools}
        {historyTools}
      </div>

      {/* 모바일 툴바 (md 미만) */}
      <div className="md:hidden">
        <div className="flex items-center gap-0.5 p-2">
          {basicTools}

          {/* More 버튼 */}
          <ToolbarButton
            onClick={() => setShowMoreTools(!showMoreTools)}
            isActive={showMoreTools}
            title="더 보기"
          >
            <MoreHorizontal className="w-4 h-4" />
          </ToolbarButton>

          <div className="flex-1" />

          {/* Undo/Redo는 항상 표시 */}
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="실행 취소"
          >
            <Undo className="w-4 h-4" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="다시 실행"
          >
            <Redo className="w-4 h-4" />
          </ToolbarButton>
        </div>

        {/* 확장 도구 (토글) */}
        {showMoreTools && (
          <div className="flex items-center gap-0.5 p-2 pt-0 border-t border-border/50">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleStrike().run()}
              isActive={editor.isActive('strike')}
              title="취소선"
            >
              <Strikethrough className="w-4 h-4" />
            </ToolbarButton>

            <ToolbarDivider />

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              isActive={editor.isActive('heading', { level: 1 })}
              title="제목 1"
            >
              <Heading1 className="w-4 h-4" />
            </ToolbarButton>

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              isActive={editor.isActive('heading', { level: 2 })}
              title="제목 2"
            >
              <Heading2 className="w-4 h-4" />
            </ToolbarButton>

            <ToolbarDivider />

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              isActive={editor.isActive('orderedList')}
              title="번호 매기기"
            >
              <ListOrdered className="w-4 h-4" />
            </ToolbarButton>

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleTaskList().run()}
              isActive={editor.isActive('taskList')}
              title="체크리스트"
            >
              <CheckSquare className="w-4 h-4" />
            </ToolbarButton>

            <ToolbarDivider />

            <ToolbarButton
              onClick={onSetLink}
              isActive={editor.isActive('link')}
              title="링크"
            >
              <Link2 className="w-4 h-4" />
            </ToolbarButton>
          </div>
        )}
      </div>
    </div>
  );
}
