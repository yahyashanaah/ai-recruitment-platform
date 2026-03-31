"use client";

import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Download, Eye, FileStack, FolderOpen, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { deleteDocumentFile, listCandidates, uploadDocuments } from "@/lib/api/client";
import type { CandidateProfile, UploadResponse } from "@/lib/api/types";
import { formatDate, formatFileSize } from "@/lib/utils";

type UploadStatus = "pending" | "uploading" | "extracting" | "indexing" | "done" | "error";

interface UploadItem {
  id: string;
  file: File;
  status: UploadStatus;
  previewUrl: string;
  candidateName?: string;
  error?: string;
}

interface FileHistoryRow {
  fileName: string;
  candidatesExtracted: number;
  lastSeen: string;
}

const statusProgress: Record<UploadStatus, number> = {
  pending: 0,
  uploading: 28,
  extracting: 58,
  indexing: 82,
  done: 100,
  error: 100
};

const statusMeta: Record<UploadStatus, { label: string; variant: "outline" | "teal" | "warning" }> = {
  pending: { label: "Pending", variant: "outline" },
  uploading: { label: "Uploading", variant: "outline" },
  extracting: { label: "Extracting", variant: "outline" },
  indexing: { label: "Indexing", variant: "outline" },
  done: { label: "Indexed", variant: "teal" },
  error: { label: "Failed", variant: "warning" }
};

function uniqueId() {
  return Math.random().toString(36).slice(2);
}

function groupHistory(candidates: CandidateProfile[]): FileHistoryRow[] {
  const grouped = new Map<string, { count: number; latest: string }>();

  candidates.forEach((candidate) => {
    const existing = grouped.get(candidate.file_name);
    const createdAt = candidate.created_at ?? new Date().toISOString();

    if (!existing) {
      grouped.set(candidate.file_name, { count: 1, latest: createdAt });
      return;
    }

    grouped.set(candidate.file_name, {
      count: existing.count + 1,
      latest: new Date(createdAt) > new Date(existing.latest) ? createdAt : existing.latest
    });
  });

  return Array.from(grouped.entries())
    .map(([fileName, value]) => ({
      fileName,
      candidatesExtracted: value.count,
      lastSeen: value.latest
    }))
    .sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export default function IntakePage() {
  const [queue, setQueue] = useState<UploadItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [history, setHistory] = useState<FileHistoryRow[]>([]);
  const [summary, setSummary] = useState<UploadResponse | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const queueRef = useRef<UploadItem[]>([]);

  const refreshHistory = async () => {
    try {
      const candidates = await listCandidates();
      setHistory(groupHistory(candidates));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load file history");
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    void refreshHistory();
    return () => {
      queueRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, []);

  const queueStats = useMemo(
    () => ({
      total: queue.length,
      completed: queue.filter((item) => item.status === "done").length,
      errors: queue.filter((item) => item.status === "error").length
    }),
    [queue]
  );

  const addFilesToQueue = (files: FileList | File[]) => {
    const nextFiles = Array.from(files).filter((file) => {
      const key = `${file.name}-${file.size}-${file.lastModified}`;
      return !queue.some((item) => `${item.file.name}-${item.file.size}-${item.file.lastModified}` === key);
    });

    if (nextFiles.length === 0) {
      return;
    }

    setQueue((current) => [
      ...nextFiles.map((file) => ({
        id: uniqueId(),
        file,
        status: "pending" as const,
        previewUrl: URL.createObjectURL(file)
      })),
      ...current
    ]);
  };

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length) {
      return;
    }
    addFilesToQueue(event.target.files);
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!event.dataTransfer.files.length) {
      return;
    }
    addFilesToQueue(event.dataTransfer.files);
  };

  const removeQueueItem = (itemId: string) => {
    setQueue((current) => {
      const target = current.find((item) => item.id === itemId);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return current.filter((item) => item.id !== itemId);
    });
  };

  const setAllStatuses = (status: UploadStatus) => {
    setQueue((current) => current.map((item) => ({ ...item, status, error: status === "error" ? item.error : undefined })));
  };

  const runUpload = async () => {
    if (queue.length === 0 || uploading) {
      return;
    }

    setUploading(true);
    setSummary(null);
    setAllStatuses("uploading");

    try {
      const response = await uploadDocuments(queue.map((item) => item.file));
      setSummary(response);
      await sleep(180);
      setAllStatuses("extracting");
      await sleep(180);
      setAllStatuses("indexing");
      await sleep(220);

      setQueue((current) =>
        current.map((item) => {
          const candidate = response.candidates.find((entry) => entry.file_name === item.file.name);
          const failed = response.errors.some((error) => error.toLowerCase().includes(item.file.name.toLowerCase()));
          return {
            ...item,
            status: failed ? "error" : "done",
            candidateName: candidate?.name,
            error: failed ? "Processing failed" : undefined
          };
        })
      );

      await refreshHistory();
      toast.success(response.message || "Files processed");
    } catch (error) {
      setQueue((current) =>
        current.map((item) => ({
          ...item,
          status: "error",
          error: error instanceof Error ? error.message : "Upload failed"
        }))
      );
      toast.error(error instanceof Error ? error.message : "Unable to upload documents");
    } finally {
      setUploading(false);
    }
  };

  const removeHistoryFile = async (fileName: string) => {
    try {
      await deleteDocumentFile(fileName);
      setHistory((current) => current.filter((item) => item.fileName !== fileName));
      toast.success(`Removed ${fileName}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to remove file");
    }
  };

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Document Intake"
        title="Bring resume files into the same clean recruiter workflow"
        description="Upload CVs, monitor processing states, and manage your intake history without breaking the visual system of the new landing experience."
        action={
          <Button onClick={runUpload} disabled={queue.length === 0 || uploading}>
            <UploadCloud className="h-4 w-4" />
            {uploading ? "Processing..." : "Upload files"}
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
        <Card>
          <CardContent className="p-6 md:p-8">
            <motion.div
              whileHover={{ y: -2 }}
              transition={{ duration: 0.2 }}
              onDrop={handleDrop}
              onDragOver={(event) => event.preventDefault()}
              className="rounded-[30px] border border-dashed border-orange-200 bg-gradient-to-br from-orange-50 via-white to-amber-50 p-8 text-center"
            >
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-[24px] bg-white text-orange-600 shadow-[0_16px_34px_rgba(249,115,22,0.12)]">
                <UploadCloud className="h-7 w-7" />
              </div>
              <h3 className="font-display mt-5 text-2xl font-semibold text-slate-950">Upload CV files</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Drag and drop files here or choose files manually. Supported formats: PDF, DOCX, and TXT.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Button variant="secondary" onClick={() => inputRef.current?.click()}>
                  <FolderOpen className="h-4 w-4" />
                  Choose files
                </Button>
                <Button onClick={runUpload} disabled={queue.length === 0 || uploading}>
                  Start processing
                </Button>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.docx,.txt"
                multiple
                className="hidden"
                onChange={handleFileInput}
              />
            </motion.div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Batch summary</CardTitle>
            <CardDescription>Live queue summary for the files currently staged in this browser.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <div className="rounded-[22px] border border-slate-200 bg-white p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Queued</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{queueStats.total}</p>
              </div>
              <div className="rounded-[22px] border border-slate-200 bg-white p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Indexed</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{queueStats.completed}</p>
              </div>
              <div className="rounded-[22px] border border-slate-200 bg-white p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Errors</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{queueStats.errors}</p>
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-600">
              {summary ? (
                <div className="space-y-2">
                  <p className="font-medium text-slate-950">{summary.message}</p>
                  <p>
                    {summary.files_processed} files processed • {summary.total_chunks} chunks stored
                  </p>
                  {summary.errors.length > 0 ? <p>{summary.errors.length} file errors returned from the backend.</p> : null}
                </div>
              ) : (
                <p>Upload a batch to see the backend response summary for processed files and chunks.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>Upload queue</CardTitle>
            <CardDescription>Preview local files, monitor status, and remove items before or after processing.</CardDescription>
          </CardHeader>
          <CardContent>
            {queue.length === 0 ? (
              <EmptyState
                icon={FileStack}
                title="No files in queue"
                description="Choose files or drag resumes into the intake area to start a new upload batch."
              />
            ) : (
              <div className="max-h-[620px] space-y-4 overflow-y-auto pr-1">
                {queue.map((item) => {
                  const status = statusMeta[item.status];
                  return (
                    <div key={item.id} className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-base font-semibold text-slate-950">{item.file.name}</p>
                          <p className="mt-1 text-sm text-slate-500">
                            {formatFileSize(item.file.size)} • {item.file.type || "Document file"}
                          </p>
                        </div>
                        <Badge variant={status.variant} className="normal-case tracking-normal">
                          {status.label}
                        </Badge>
                      </div>

                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${item.status === "error" ? "bg-rose-400" : "bg-[linear-gradient(90deg,#f97316,#fb923c)]"}`}
                          style={{ width: `${statusProgress[item.status]}%` }}
                        />
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        {item.candidateName ? (
                          <Badge className="normal-case tracking-normal">{item.candidateName}</Badge>
                        ) : null}
                        {item.error ? (
                          <Badge variant="warning" className="normal-case tracking-normal">
                            {item.error}
                          </Badge>
                        ) : null}
                      </div>

                      <div className="mt-5 flex flex-wrap gap-3">
                        <Button variant="secondary" onClick={() => window.open(item.previewUrl, "_blank", "noopener,noreferrer")}>
                          <Eye className="h-4 w-4" />
                          View
                        </Button>
                        <Button variant="outline" asChild>
                          <a href={item.previewUrl} download={item.file.name}>
                            <Download className="h-4 w-4" />
                            Download
                          </a>
                        </Button>
                        <Button variant="outline" onClick={() => removeQueueItem(item.id)}>
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>File history</CardTitle>
            <CardDescription>Uploaded file groups already stored in the backend for this recruiter.</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingHistory ? (
              <div className="grid gap-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-20 rounded-[22px]" />
                ))}
              </div>
            ) : history.length === 0 ? (
              <EmptyState
                icon={FolderOpen}
                title="No stored files yet"
                description="Once documents are processed successfully, they will appear in this history list."
              />
            ) : (
              <div className="max-h-[620px] space-y-3 overflow-y-auto pr-1">
                {history.map((row) => (
                  <div key={row.fileName} className="rounded-[24px] border border-slate-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-950">{row.fileName}</p>
                        <p className="mt-1 text-sm text-slate-500">Last activity: {formatDate(row.lastSeen)}</p>
                      </div>
                      <Badge variant="secondary" className="normal-case tracking-normal">
                        {row.candidatesExtracted} candidates
                      </Badge>
                    </div>
                    <div className="mt-4 flex justify-end gap-3">
                      <Button variant="outline" onClick={() => void removeHistoryFile(row.fileName)}>
                        <Trash2 className="h-4 w-4" />
                        Delete file
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
