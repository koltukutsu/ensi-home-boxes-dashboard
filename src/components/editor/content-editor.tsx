'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { EditorContent, useEditor, Editor as EditorType } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { Toggle } from '@/registry/new-york-v4/ui/toggle';
import { Button } from '@/registry/new-york-v4/ui/button';
import { Input } from '@/registry/new-york-v4/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/registry/new-york-v4/ui/popover';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/registry/new-york-v4/ui/dialog';
import { ScrollArea } from '@/registry/new-york-v4/ui/scroll-area';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Link as LinkIcon,
  Image as ImageIcon,
  Check,
  X
} from 'lucide-react';

interface ContentEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function ContentEditor({ value, onChange, placeholder = 'Write your content here...' }: ContentEditorProps) {
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [isLinkPopoverOpen, setIsLinkPopoverOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          class: 'text-primary underline',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-md max-w-full h-auto',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert focus:outline-none min-h-[300px] max-w-none',
      },
    },
    onUpdate: ({ editor }: { editor: EditorType }) => {
      onChange(editor.getHTML());
    },
  });
  
  // Update editor content when value prop changes
  useEffect(() => {
    if (editor && editor.getHTML() !== value) {
      editor.commands.setContent(value);
    }
  }, [editor, value]);
  
  // Link handling
  const setLink = useCallback(() => {
    if (!editor) return;
    
    if (linkUrl === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    
    // If text is selected, update the link on that text
    if (editor.state.selection.empty && linkText) {
      editor.chain().focus().insertContent(`<a href="${linkUrl}">${linkText}</a>`).run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
    }
    
    setIsLinkPopoverOpen(false);
    setLinkUrl('');
    setLinkText('');
  }, [editor, linkUrl, linkText]);
  
  // Capture selected text when opening link popover
  const handleLinkButtonClick = useCallback(() => {
    if (!editor) return;
    
    const { state } = editor;
    const selectedText = state.doc.textBetween(
      state.selection.from,
      state.selection.to,
      ' '
    );
    
    if (selectedText) {
      setLinkText(selectedText);
    }
    
    // If there's an existing link, populate the URL
    const linkMark = editor.getAttributes('link');
    if (linkMark.href) {
      setLinkUrl(linkMark.href);
    }
    
    setIsLinkPopoverOpen(true);
  }, [editor]);
  
  // Image handling
  const addImage = useCallback(() => {
    if (!editor) return;
    
    if (imageUrl) {
      editor.chain().focus().setImage({ 
        src: imageUrl,
        alt: imageAlt || 'Image',
      }).run();
      
      setImageUrl('');
      setImageAlt('');
      setIsImageDialogOpen(false);
    }
  }, [editor, imageUrl, imageAlt]);
  
  if (!editor) {
    return null;
  }
  
  return (
    <div className="border rounded-md">
      <div className="bg-muted px-2 py-2 border-b flex flex-wrap gap-1 items-center">
        <Toggle
          size="sm"
          pressed={editor.isActive('bold')}
          onPressedChange={() => editor.chain().focus().toggleBold().run()}
          aria-label="Bold"
        >
          <Bold className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('italic')}
          onPressedChange={() => editor.chain().focus().toggleItalic().run()}
          aria-label="Italic"
        >
          <Italic className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('underline')}
          onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
          aria-label="Underline"
        >
          <UnderlineIcon className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('strike')}
          onPressedChange={() => editor.chain().focus().toggleStrike().run()}
          aria-label="Strike through"
        >
          <Strikethrough className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('code')}
          onPressedChange={() => editor.chain().focus().toggleCode().run()}
          aria-label="Code"
        >
          <Code className="h-4 w-4" />
        </Toggle>
        
        <div className="w-[1px] h-6 bg-border mx-1"></div>
        
        <Toggle
          size="sm"
          pressed={editor.isActive('heading', { level: 1 })}
          onPressedChange={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          aria-label="Heading 1"
        >
          <Heading1 className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('heading', { level: 2 })}
          onPressedChange={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          aria-label="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('heading', { level: 3 })}
          onPressedChange={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          aria-label="Heading 3"
        >
          <Heading3 className="h-4 w-4" />
        </Toggle>
        
        <div className="w-[1px] h-6 bg-border mx-1"></div>
        
        <Toggle
          size="sm"
          pressed={editor.isActive('bulletList')}
          onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
          aria-label="Bullet List"
        >
          <List className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('orderedList')}
          onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
          aria-label="Ordered List"
        >
          <ListOrdered className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('blockquote')}
          onPressedChange={() => editor.chain().focus().toggleBlockquote().run()}
          aria-label="Quote"
        >
          <Quote className="h-4 w-4" />
        </Toggle>
        
        <div className="w-[1px] h-6 bg-border mx-1"></div>
        
        <Popover open={isLinkPopoverOpen} onOpenChange={setIsLinkPopoverOpen}>
          <PopoverTrigger asChild>
            <Toggle
              size="sm"
              pressed={editor.isActive('link')}
              onPressedChange={handleLinkButtonClick}
              aria-label="Link"
            >
              <LinkIcon className="h-4 w-4" />
            </Toggle>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-3">
            <div className="space-y-2">
              <div className="space-y-1">
                <label htmlFor="link-url" className="text-sm font-medium">URL</label>
                <Input
                  id="link-url"
                  placeholder="https://example.com"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && setLink()}
                />
              </div>
              {!editor?.state.selection.content().size && (
                <div className="space-y-1">
                  <label htmlFor="link-text" className="text-sm font-medium">Text</label>
                  <Input
                    id="link-text"
                    placeholder="Link text"
                    value={linkText}
                    onChange={(e) => setLinkText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && setLink()}
                  />
                </div>
              )}
              <div className="flex justify-between pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsLinkPopoverOpen(false);
                    setLinkUrl('');
                    setLinkText('');
                  }}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button size="sm" onClick={setLink}>
                  <Check className="h-4 w-4 mr-1" />
                  {editor.isActive('link') ? 'Update' : 'Add'} Link
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
        
        <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
          <DialogTrigger asChild>
            <Toggle
              size="sm"
              onPressedChange={() => setIsImageDialogOpen(true)}
              aria-label="Image"
            >
              <ImageIcon className="h-4 w-4" />
            </Toggle>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Insert Image</DialogTitle>
              <DialogDescription>
                Add an image URL to insert into your content.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <label htmlFor="image-url" className="text-sm font-medium">Image URL</label>
                <Input
                  id="image-url"
                  placeholder="https://example.com/image.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="image-alt" className="text-sm font-medium">Alt Text</label>
                <Input
                  id="image-alt"
                  placeholder="Image description"
                  value={imageAlt}
                  onChange={(e) => setImageAlt(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsImageDialogOpen(false);
                  setImageUrl('');
                  setImageAlt('');
                }}
              >
                Cancel
              </Button>
              <Button onClick={addImage} disabled={!imageUrl}>
                Insert Image
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        <div className="w-[1px] h-6 bg-border mx-1"></div>
        
        <Toggle
          size="sm"
          pressed={false}
          onPressedChange={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          aria-label="Undo"
        >
          <Undo className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={false}
          onPressedChange={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          aria-label="Redo"
        >
          <Redo className="h-4 w-4" />
        </Toggle>
      </div>
      
      <ScrollArea className="max-h-[500px]">
        <div className="p-4">
          <EditorContent editor={editor} />
        </div>
      </ScrollArea>
    </div>
  );
} 