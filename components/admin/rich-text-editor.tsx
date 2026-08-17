'use client';

import { useEffect, useRef, useState, type ClipboardEvent, type ComponentType } from 'react';
import { Bold, Code2, Eraser, Heading2, Heading3, Italic, Link2, List, ListOrdered, Pilcrow, Quote, Underline } from 'lucide-react';
import { normalizeProductHtml, plainTextToHtml, sanitizeProductHtml } from '@/lib/catalog/html';

type RichTextEditorProps = {
  initialValue: string;
  name: string;
};

type ToolbarButtonProps = {
  children?: string;
  icon?: ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
};

function ToolbarButton({ children, icon: Icon, label, onClick }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="inline-flex h-9 min-w-9 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 px-2 text-xs font-semibold text-gray-600 transition-colors hover:border-gray-200 hover:bg-gray-100 hover:text-white"
    >
      {Icon ? <Icon className="h-4 w-4" /> : children}
    </button>
  );
}

export function RichTextEditor({ initialValue, name }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [mode, setMode] = useState<'visual' | 'html'>('visual');
  const [html, setHtml] = useState(() => normalizeProductHtml(initialValue));

  useEffect(() => {
    if (mode === 'visual' && editorRef.current && editorRef.current.innerHTML !== html) {
      editorRef.current.innerHTML = html;
    }
  }, [html, mode]);

  function syncFromEditor() {
    setHtml(editorRef.current?.innerHTML ?? '');
  }

  function runCommand(command: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    syncFromEditor();
  }

  function createLink() {
    const href = window.prompt('Bağlantı adresi');
    const trimmedHref = href?.trim();

    if (!trimmedHref) {
      return;
    }

    runCommand('createLink', trimmedHref);
  }

  function clearFormatting() {
    runCommand('removeFormat');
    runCommand('formatBlock', '<p>');
  }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    event.preventDefault();
    const pastedHtml = event.clipboardData.getData('text/html');
    const pastedText = event.clipboardData.getData('text/plain');
    const nextHtml = pastedHtml ? sanitizeProductHtml(pastedHtml) : plainTextToHtml(pastedText);

    document.execCommand('insertHTML', false, nextHtml);
    syncFromEditor();
  }

  return (
    <div className="overflow-hidden rounded-[18px] border border-gray-200 bg-white/[0.035]">
      <input type="hidden" name={name} value={html} />

      <div className="flex flex-col gap-3 border-b border-gray-100 bg-gray-50 p-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap gap-2">
          <ToolbarButton icon={Pilcrow} label="Paragraf" onClick={() => runCommand('formatBlock', '<p>')} />
          <ToolbarButton icon={Heading2} label="Başlık 2" onClick={() => runCommand('formatBlock', '<h2>')} />
          <ToolbarButton icon={Heading3} label="Başlık 3" onClick={() => runCommand('formatBlock', '<h3>')} />
          <ToolbarButton icon={Bold} label="Kalın" onClick={() => runCommand('bold')} />
          <ToolbarButton icon={Italic} label="İtalik" onClick={() => runCommand('italic')} />
          <ToolbarButton icon={Underline} label="Altı çizili" onClick={() => runCommand('underline')} />
          <ToolbarButton icon={List} label="Madde listesi" onClick={() => runCommand('insertUnorderedList')} />
          <ToolbarButton icon={ListOrdered} label="Numaralı liste" onClick={() => runCommand('insertOrderedList')} />
          <ToolbarButton icon={Quote} label="Alıntı" onClick={() => runCommand('formatBlock', '<blockquote>')} />
          <ToolbarButton icon={Link2} label="Bağlantı ekle" onClick={createLink} />
          <ToolbarButton icon={Eraser} label="Biçimi temizle" onClick={clearFormatting} />
        </div>

        <div className="inline-flex w-fit rounded-full border border-gray-200 bg-gray-50 p-1">
          <button
            type="button"
            onClick={() => setMode('visual')}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${mode === 'visual' ? 'bg-white text-[#111111]' : 'text-gray-500 hover:text-white'}`}
          >
            Görsel
          </button>
          <button
            type="button"
            onClick={() => setMode('html')}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${mode === 'html' ? 'bg-white text-[#111111]' : 'text-gray-500 hover:text-white'}`}
          >
            <Code2 className="h-3.5 w-3.5" />
            HTML
          </button>
        </div>
      </div>

      {mode === 'visual' ? (
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={syncFromEditor}
          onBlur={syncFromEditor}
          onPaste={handlePaste}
          className="admin-rich-text-surface min-h-[240px] bg-[#0d0d0d] px-5 py-5 text-sm leading-7 text-gray-900 outline-none transition-colors focus:bg-[#101010]"
        />
      ) : (
        <textarea
          value={html}
          onChange={(event) => setHtml(event.target.value)}
          rows={14}
          spellCheck={false}
          className="min-h-[240px] w-full resize-y bg-[#0d0d0d] px-5 py-5 font-mono text-sm leading-7 text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:bg-[#101010]"
        />
      )}
    </div>
  );
}
