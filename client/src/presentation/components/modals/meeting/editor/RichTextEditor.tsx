/**
 * RichTextEditor - TipTap 기반 리치 텍스트 에디터
 * 회의자료 작성을 위한 WYSIWYG 에디터
 */
import { useEditor, EditorContent } from '@tiptap/react';
import type { JSONContent } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Link from '@tiptap/extension-link';
import { useCallback, useEffect } from 'react';
import { EditorToolbar } from './EditorToolbar';
import { cn } from '@/core/utils/cn';

interface RichTextEditorProps {
  /** 에디터 내용 (JSON 또는 HTML 문자열) */
  content: JSONContent | string;
  /** 내용 변경 콜백 */
  onChange: (content: string, json: JSONContent) => void;
  /** 플레이스홀더 텍스트 */
  placeholder?: string;
  /** 최소 높이 */
  minHeight?: string;
  /** 읽기 전용 모드 */
  readOnly?: boolean;
  /** 에디터 포커스 콜백 */
  onFocus?: () => void;
  /** 에디터 블러 콜백 */
  onBlur?: () => void;
  /** 커스텀 클래스명 */
  className?: string;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = '내용을 입력하세요...',
  minHeight = '200px',
  readOnly = false,
  onFocus,
  onBlur,
  className,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
      Underline,
      TaskList.configure({
        HTMLAttributes: {
          class: 'task-list',
        },
      }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: 'task-item',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline',
        },
      }),
    ],
    content: typeof content === 'string' ? content : content,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML(), editor.getJSON());
    },
    onFocus: () => {
      onFocus?.();
    },
    onBlur: () => {
      onBlur?.();
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm dark:prose-invert max-w-none',
          'focus:outline-none',
          'px-4 py-3',
          '[&_ul]:list-disc [&_ol]:list-decimal',
          '[&_ul]:ml-4 [&_ol]:ml-4',
          '[&_h1]:text-xl [&_h1]:font-bold [&_h1]:mt-4 [&_h1]:mb-2',
          '[&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-3 [&_h2]:mb-2',
          '[&_h3]:text-base [&_h3]:font-medium [&_h3]:mt-2 [&_h3]:mb-1',
          '[&_p]:my-1',
          '[&_.task-list]:list-none [&_.task-list]:ml-0 [&_.task-list]:pl-0',
          '[&_.task-item]:flex [&_.task-item]:items-start [&_.task-item]:gap-2',
          '[&_.task-item_input]:mt-1',
          '[&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]',
          '[&_.is-editor-empty:first-child::before]:text-muted-foreground',
          '[&_.is-editor-empty:first-child::before]:float-left',
          '[&_.is-editor-empty:first-child::before]:h-0',
          '[&_.is-editor-empty:first-child::before]:pointer-events-none'
        ),
        style: `min-height: ${minHeight}`,
      },
    },
  });

  // 외부에서 content가 변경되면 에디터 업데이트
  useEffect(() => {
    if (editor && content) {
      const currentContent = editor.getHTML();
      const newContent = typeof content === 'string' ? content : editor.getHTML();

      // 내용이 다를 때만 업데이트 (무한 루프 방지)
      if (currentContent !== newContent && typeof content === 'string') {
        editor.commands.setContent(content);
      }
    }
  }, [content, editor]);

  // 링크 추가 핸들러
  const setLink = useCallback(() => {
    if (!editor) return;

    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL을 입력하세요', previousUrl);

    if (url === null) return;

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  if (!editor) {
    return (
      <div className={cn(
        'border border-border rounded-lg bg-muted/30 animate-pulse',
        className
      )} style={{ minHeight }} />
    );
  }

  return (
    <div className={cn(
      'border border-border rounded-lg overflow-hidden bg-white dark:bg-slate-900',
      'focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20',
      'transition-colors',
      className
    )}>
      {/* 툴바 */}
      {!readOnly && (
        <EditorToolbar editor={editor} onSetLink={setLink} />
      )}

      {/* 에디터 본문 */}
      <EditorContent editor={editor} />
    </div>
  );
}

/**
 * 텍스트를 HTML로 변환 (레거시 데이터 호환)
 */
export function textToHtml(text: string): string {
  if (!text) return '';

  // 이미 HTML 태그가 포함되어 있으면 그대로 반환
  if (/<[^>]+>/.test(text)) {
    return text;
  }

  // 줄바꿈을 <br> 또는 <p>로 변환
  return text
    .split('\n\n')
    .map(paragraph => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

/**
 * HTML을 텍스트로 변환
 */
export function htmlToText(html: string): string {
  if (!html) return '';

  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}
