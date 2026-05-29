"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import { useCallback, useRef } from "react";
import {
  Bold, Italic, Underline as UnderlineIcon, Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Paperclip, FileText, Download, Trash2,
} from "lucide-react";

interface CurriculumFile {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  content_type: string | null;
}

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  files?: CurriculumFile[];
  onFileUpload?: (file: File) => Promise<void>;
  onFileDelete?: (fileId: string) => Promise<void>;
  uploading?: boolean;
  readOnly?: boolean;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = "Escribe el contenido del temario...",
  files = [],
  onFileUpload,
  onFileDelete,
  uploading = false,
  readOnly = false,
}: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Placeholder.configure({ placeholder }),
    ],
    content,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: readOnly
          ? "prose prose-sm max-w-none focus:outline-none min-h-[100px]"
          : "prose prose-sm max-w-none focus:outline-none min-h-[240px] px-4 py-3",
      },
    },
  });

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !onFileUpload) return;
      await onFileUpload(file);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [onFileUpload]
  );

  if (!editor) return null;

  const ToolbarButton = ({
    active,
    onClick,
    children,
    title,
  }: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
    title: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded hover:bg-slate-100 transition ${
        active ? "bg-slate-200 text-primary-700" : "text-slate-600"
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className={`border border-slate-200 rounded-xl overflow-hidden ${readOnly ? "bg-slate-50/50" : "bg-white"}`}>
      {!readOnly && (
        <div className="flex items-center gap-0.5 px-3 py-2 border-b border-slate-200 bg-slate-50/80 flex-wrap">
          <ToolbarButton
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Negrita"
          >
            <Bold className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Cursiva"
          >
            <Italic className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("underline")}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            title="Subrayado"
          >
            <UnderlineIcon className="w-4 h-4" />
          </ToolbarButton>

          <div className="w-px h-5 bg-slate-200 mx-1" />

          <ToolbarButton
            active={editor.isActive("heading", { level: 1 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            title="Título 1"
          >
            <Heading1 className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("heading", { level: 2 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            title="Título 2"
          >
            <Heading2 className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("heading", { level: 3 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            title="Título 3"
          >
            <Heading3 className="w-4 h-4" />
          </ToolbarButton>

          <div className="w-px h-5 bg-slate-200 mx-1" />

          <ToolbarButton
            active={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="Lista"
          >
            <List className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="Lista numerada"
          >
            <ListOrdered className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("blockquote")}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            title="Cita"
          >
            <Quote className="w-4 h-4" />
          </ToolbarButton>

          {onFileUpload && (
            <>
              <div className="w-px h-5 bg-slate-200 mx-1" />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                title="Adjuntar archivo"
                className="p-1.5 rounded hover:bg-slate-100 transition text-slate-600 disabled:opacity-50"
              >
                {uploading ? (
                  <div className="w-4 h-4 border-2 border-slate-300 border-t-primary-500 rounded-full animate-spin" />
                ) : (
                  <Paperclip className="w-4 h-4" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif"
                onChange={handleFileSelect}
              />
            </>
          )}
        </div>
      )}

      <EditorContent editor={editor} className={readOnly ? "p-4" : ""} />

      {files.length > 0 && (
        <div className="border-t border-slate-200 px-4 py-3 bg-slate-50/50">
          <p className="text-xs font-medium text-slate-500 mb-2">
            Archivos adjuntos ({files.length})
          </p>
          <div className="space-y-1.5">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-2 text-sm text-slate-700 bg-white rounded-lg px-3 py-1.5 border border-slate-100"
              >
                <FileText className="w-4 h-4 text-primary-500 shrink-0" />
                <span className="flex-1 truncate">{file.file_name}</span>
                {file.file_size && (
                  <span className="text-xs text-slate-400 shrink-0">
                    {formatFileSize(file.file_size)}
                  </span>
                )}
                <a
                  href={file.file_path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-500 hover:text-primary-700 shrink-0"
                  title="Descargar"
                >
                  <Download className="w-4 h-4" />
                </a>
                {!readOnly && onFileDelete && (
                  <button
                    type="button"
                    onClick={() => onFileDelete(file.id)}
                    className="text-slate-300 hover:text-red-500 transition shrink-0"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
