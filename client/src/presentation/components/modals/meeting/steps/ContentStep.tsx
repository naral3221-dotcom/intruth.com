/**
 * ContentStep - 회의 내용 작성 스텝
 * TipTap 리치 에디터를 사용한 회의 내용 및 결정사항 입력
 */
import { useState } from 'react';
import { RichTextEditor, textToHtml } from '../editor';
import type { JSONContent } from '@tiptap/react';

interface ContentStepProps {
  formData: {
    content: string;
    contentType: 'text' | 'json';
    summary: string;
  };
  onChange: (field: string, value: unknown) => void;
}

export function ContentStep({ formData, onChange }: ContentStepProps) {
  // 레거시 텍스트 데이터를 HTML로 변환
  const initialContent = formData.contentType === 'text' && formData.content
    ? textToHtml(formData.content)
    : formData.content;

  const handleContentChange = (html: string, json: JSONContent) => {
    onChange('content', html);
    // 처음 에디터 사용 시 contentType을 json으로 변경
    if (formData.contentType === 'text') {
      onChange('contentType', 'json');
    }
  };

  return (
    <div className="space-y-6">
      {/* 회의 내용 */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          회의 내용 <span className="text-destructive">*</span>
        </label>
        <RichTextEditor
          content={initialContent}
          onChange={handleContentChange}
          placeholder="회의 내용을 작성하세요... (굵게, 목록, 체크리스트 등 서식 지원)"
          minHeight="250px"
        />
        <p className="mt-2 text-xs text-muted-foreground">
          Tip: 굵게(Ctrl+B), 기울임(Ctrl+I), 실행 취소(Ctrl+Z) 단축키를 사용할 수 있습니다.
        </p>
      </div>

      {/* 결정사항/요약 */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          결정사항 / 요약
        </label>
        <textarea
          value={formData.summary}
          onChange={(e) => onChange('summary', e.target.value)}
          placeholder="주요 결정사항이나 회의 요약을 입력하세요..."
          rows={4}
          className="aboard-input resize-none"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          핵심 결정사항을 간략하게 정리해주세요.
        </p>
      </div>
    </div>
  );
}
