<script setup lang="ts">
import { watch, onBeforeUnmount } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()

const editor = useEditor({
  content: props.modelValue,
  extensions: [StarterKit, Link.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' } })],
  editorProps: { attributes: { class: 'prose-editor min-h-[180px] p-3 outline-none' } },
  onUpdate: ({ editor }) => emit('update:modelValue', editor.isEmpty ? '' : editor.getHTML()),
})
watch(() => props.modelValue, (v) => { if (editor.value && v !== editor.value.getHTML()) editor.value.commands.setContent(v || '', false) })
onBeforeUnmount(() => editor.value?.destroy())

const setLink = () => {
  const url = window.prompt('URL (https://…)')
  if (url === null) return
  url ? editor.value?.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
      : editor.value?.chain().focus().unsetLink().run()
}
const btns = [
  { i: 'fa-bold', a: () => editor.value?.chain().focus().toggleBold().run(), on: 'bold' },
  { i: 'fa-italic', a: () => editor.value?.chain().focus().toggleItalic().run(), on: 'italic' },
  { i: 'fa-heading', a: () => editor.value?.chain().focus().toggleHeading({ level: 2 }).run(), on: 'heading' },
  { i: 'fa-list-ul', a: () => editor.value?.chain().focus().toggleBulletList().run(), on: 'bulletList' },
  { i: 'fa-list-ol', a: () => editor.value?.chain().focus().toggleOrderedList().run(), on: 'orderedList' },
  { i: 'fa-quote-left', a: () => editor.value?.chain().focus().toggleBlockquote().run(), on: 'blockquote' },
  { i: 'fa-link', a: setLink, on: 'link' },
]
</script>

<template>
  <div class="border border-gray-300 rounded-xl overflow-hidden">
    <div class="flex gap-1 p-1 bg-gray-50 border-b border-gray-200">
      <v-btn v-for="b in btns" :key="b.i" icon size="x-small" variant="text" :color="editor?.isActive(b.on) ? 'primary' : undefined" @click="b.a"><i :class="['fa-solid', b.i]"></i></v-btn>
    </div>
    <EditorContent :editor="editor" />
  </div>
</template>

<style>
.prose-editor h2, .lesson-html h2 { font-size: 1.25rem; font-weight: 700; margin: 1rem 0 .5rem }
.prose-editor ul, .lesson-html ul { list-style: disc; margin-left: 1.25rem }
.prose-editor ol, .lesson-html ol { list-style: decimal; margin-left: 1.25rem }
.prose-editor blockquote, .lesson-html blockquote { border-left: 3px solid #d1d5db; padding-left: .75rem; color: #6b7280 }
.prose-editor a, .lesson-html a { color: rgb(var(--v-theme-primary)); text-decoration: underline }
.prose-editor p, .lesson-html p { margin-bottom: .6rem }
</style>