import { useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"

import { mockDefaultPostsByTid, mockTeachers } from "@/mock/data"
import type { Post } from "@/types"

const STORAGE_KEY = "academy-linker:discussions-posts"

function loadPostsByTid(): Record<string, Post[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, Post[]>
  } catch {
    return {}
  }
}

function savePostsByTid(map: Record<string, Post[]>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
}

export default function TeacherDiscussionsPage() {
  const { sid, tid } = useParams()
  const navigate = useNavigate()

  const teachers = mockTeachers

  const teacher = useMemo(
    () => teachers.find((t) => t.tid === tid) ?? null,
    [tid],
  )

  const [posts, setPosts] = useState<Post[]>(() => {
    if (!tid) return []
    const map = loadPostsByTid()
    if (map[tid]?.length) return map[tid]
    return mockDefaultPostsByTid[tid] ?? []
  })

  const [createOpen, setCreateOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [tagsText, setTagsText] = useState("讨论")
  const [replyEnabled, setReplyEnabled] = useState(false)
  const [replyToId, setReplyToId] = useState<string | undefined>(undefined)
  const [attachmentsNote, setAttachmentsNote] = useState("")

  const saveAndSetPosts = (nextPosts: Post[]) => {
    if (!tid) return
    setPosts(nextPosts)
    const map = loadPostsByTid()
    map[tid] = nextPosts
    savePostsByTid(map)
  }

  const onOpenCreate = () => {
    setTitle("")
    setBody("")
    setTagsText("讨论")
    setReplyEnabled(false)
    setReplyToId(undefined)
    setAttachmentsNote("")
    setCreateOpen(true)
  }

  const onSubmitCreate = () => {
    if (!tid) return
    const cleanedTags = tagsText
      .split(/[，,]/g)
      .map((t) => t.trim())
      .filter(Boolean)

    const next: Post = {
      id: `p-${Date.now()}`,
      tid,
      title: title.trim(),
      body: body.trim(),
      tags: cleanedTags.length ? cleanedTags : ["讨论"],
      replyToId: replyEnabled ? replyToId : undefined,
      attachmentsNote: attachmentsNote.trim() || undefined,
      createdAt: new Date().toISOString().slice(0, 10),
    }

    saveAndSetPosts([next, ...posts])
    setCreateOpen(false)
  }

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">讨论区</h1>
          <div className="mt-1 text-sm text-muted-foreground">
            sid: {sid} · tid: {tid} · {teacher?.name ?? "未知老师"}
          </div>
        </div>

        <Button onClick={onOpenCreate}>创建帖子</Button>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-[260px_1fr]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">老师列表</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[420px]">
              <div className="space-y-2 pr-2">
                {teachers.map((t) => {
                  const active = t.tid === tid
                  return (
                    <button
                      key={t.tid}
                      className={[
                        "w-full rounded-xl border p-3 text-left hover:bg-muted/30",
                        active
                          ? "border-ring bg-muted/40"
                          : "border-transparent",
                      ].join(" ")}
                      onClick={() => {
                        if (!sid) return
                        navigate(
                          `/parent/students/${sid}/discussions/teachers/${t.tid}`,
                        )
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">
                            {t.name}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {t.subject}
                          </div>
                        </div>
                        {t.unreadCount > 0 ? (
                          <Badge variant="destructive">{t.unreadCount}</Badge>
                        ) : (
                          <Badge variant="outline">0</Badge>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">帖子列表</CardTitle>
            <div className="mt-1 text-sm text-muted-foreground">
              点击“创建帖子”添加一个新帖子（mock）。
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {posts.map((p) => {
                const replyLabel = p.replyToId
                  ? posts.find((x) => x.id === p.replyToId)?.title
                  : undefined
                return (
                  <div key={p.id} className="rounded-xl border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          {p.title}
                        </div>
                        {replyLabel ? (
                          <div className="mt-1 text-xs text-muted-foreground">
                            回复：{replyLabel}
                          </div>
                        ) : null}
                        <div className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
                          {p.body}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {p.createdAt}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {p.tags.map((t) => (
                        <Badge key={t} variant="outline">
                          {t}
                        </Badge>
                      ))}
                      {p.attachmentsNote ? (
                        <Badge variant="secondary">附带信息</Badge>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建帖子（mock）</DialogTitle>
            <DialogDescription>
              标题 / 正文 / 标签 / 是否回复某个帖子（可选）。
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <label className="text-sm font-medium" htmlFor="post-title">
                标题
              </label>
              <Input
                id="post-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="输入帖子标题"
              />
            </div>

            <div className="grid gap-1.5">
              <label className="text-sm font-medium" htmlFor="post-body">
                正文
              </label>
              <Textarea
                id="post-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="输入帖子正文"
              />
            </div>

            <div className="grid gap-1.5">
              <label className="text-sm font-medium" htmlFor="post-tags">
                Tag（逗号分隔）
              </label>
              <Input
                id="post-tags"
                value={tagsText}
                onChange={(e) => setTagsText(e.target.value)}
                placeholder="例如：作业, 进度, 答疑"
              />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl border p-3">
              <div className="text-sm">
                <div className="font-medium">是否回复某个帖子</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  选择一个被回复的帖子。
                </div>
              </div>
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={replyEnabled}
                  onChange={(e) => {
                    setReplyEnabled(e.target.checked)
                    if (!e.target.checked) setReplyToId(undefined)
                  }}
                />
                开启
              </label>
            </div>

            {replyEnabled ? (
              <div className="grid gap-1.5">
                <label className="text-sm font-medium" htmlFor="reply-to">
                  回复目标
                </label>
                <select
                  id="reply-to"
                  className="h-10 w-full rounded-lg border bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  value={replyToId ?? ""}
                  onChange={(e) =>
                    setReplyToId(e.target.value || undefined)
                  }
                >
                  <option value="" disabled>
                    选择一个帖子
                  </option>
                  {posts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="grid gap-1.5">
              <label className="text-sm font-medium" htmlFor="attachments-note">
                附带信息（mock 文本，可选）
              </label>
              <Input
                id="attachments-note"
                value={attachmentsNote}
                onChange={(e) => setAttachmentsNote(e.target.value)}
                placeholder="例如：上传了图表/补充说明"
              />
            </div>

            <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                取消
              </Button>
              <Button
                onClick={() => {
                  if (!title.trim() || !body.trim()) return
                  onSubmitCreate()
                }}
                disabled={!title.trim() || !body.trim()}
              >
                提交
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

