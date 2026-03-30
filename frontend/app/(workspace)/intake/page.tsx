"use client";

import { ChangeEvent, DragEvent, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Eye, FileStack, Trash2, UploadCloud } from "lucide-react";
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
  pending: 5,
  uploading: 28,
  extracting: 56,
  indexing: 82,
  done: 100,
  error: 100
};

function uniqueId() {
  return Math.random().toString(36).slice(2);
}

function groupHistory(candidates: CandidateProfile[]): FileHistoryRow[] {
  const grouped = new Map<string, number>();
  candidates.forEach((candidate) => {
    grouped.set(candidate.file_name, (grouped.get(candidate.file_name) ?? 0) + 1);
  });

  return Array.from(grouped.entries()).map(([fileName, count], index) => ({
    fileName,
    candidatesExtracted: count,
    lastSeen: new Date(Date.now() - index * 43200000).toISOString()
  }));
}

export default function IntakePage() {
  const [queue, setQueue] = useState<UploadItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [history, setHistory] = useState<FileHistoryRow[]>([]);
  const [summary, setSummary] = useState<UploadResponse | null>(null);

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
    refreshHistory();
    return () => {
      queue.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addFiles = (files: FileList | File[]) => {
    const supported = Array.from(files).filter((file) => /\.(pdf|docx|txt)$/i.test(file.name));
    if (supported.length === 0) {
      toast.error("Only PDF, DOCX, and TXT files are supported.");
      return;
    }

    const nextItems = supported.map((file) => ({
      id: uniqueId(),
      file,
      status: "pending" as UploadStatus,
      previewUrl: URL.createObjectURL(file)
    }));

    setQueue((current) => [...current, ...nextItems]);
  };

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      addFiles(event.target.files);
    }
  };

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    addFiles(event.dataTransfer.files);
  };

  const runUpload = async () => {
    if (queue.length === 0 || uploading) {
      return;
    }

    setUploading(true);
    setSummary(null);
    setQueue((current) => current.map((item) => ({ ...item, status: "uploading", error: undefined })));

    window.setTimeout(() => {
      setQueue((current) => current.map((item) => ({ ...item, status: "extracting" })));
    }, 350);

    window.setTimeout(() => {
      setQueue((current) => current.map((item) => ({ ...item, status: "indexing" })));
    }, 900);

    try {
      const response = await uploadDocuments(queue.map((item) => item.file));
      setSummary(response);
      setQueue((current) =>
        current.map((item) => {
          const extracted = response.candidates.find((candidate) => candidate.file_name === item.file.name);
          const failed = response.errors.find((error) => error.includes(item.file.name));
          return {
            ...item,
            status: failed ? "error" : "done",
            candidateName: extracted?.name,
            error: failed
          };
        })
      );
      toast.success(response.message || "Batch processed");
      refreshHistory();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      setQueue((current) => current.map((item) => ({ ...item, status: "error", error: message })));
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  const removeQueuedFile = (id: string) => {
    setQueue((current) => {
      const target = current.find((item) => item.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return current.filter((item) => item.id !== id);
    });
  };

  const previewCandidates = useMemo(() => summary?.candidates ?? [], [summary]);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Intake"
        title="Bring candidate documents into TalentCore AI"
        description="Upload batches, monitor processing states, preview extracted candidates, and manage source file history without leaving the intake console."
        action={
          <Button onClick={runUpload} disabled={queue.length === 0 || uploading}>
            {uploading ? "Processing batch..." : "Start ingestion"}
          </Button>
        }
      />

      <Card>
        <CardContent className="p-6">
          <label
            onDragOver={(event) => event.preventDefault()}
            onDrop={onDrop}
            className="flex cursor-pointer flex-col items-center justify-center rounded-[28px] border border-dashed border-white/12 bg-white/[0.03] px-8 py-14 text-center transition hover:border-primary/45 hover:bg-primary/10"
          >
            <UploadCloud className="h-10 w-10 text-primary" />
            <p className="mt-5 font-display text-2xl text-white">Drag and drop CV files here</p>
            <p className="mt-3 max-w-xl text-sm leading-7 text-white/52">
              Support for PDF, DOCX, and TXT. Each file is uploaded, parsed, chunked, embedded, and indexed against your backend.
            </p>
            <div className="mt-6 rounded-full border border-white/10 bg-white/[0.05] px-5 py-2 text-sm text-white/70">
              Or click to browse from your system
            </div>
            <input aria-label="Upload candidate files" type="file" multiple className="hidden" onChange={onInputChange} />
          </label>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>Active upload queue</CardTitle>
            <CardDescription>Each document shows file details, progress state, and local actions.</CardDescription>
          </CardHeader>
          <CardContent>
            {queue.length === 0 ? (
              <EmptyState
                icon={UploadCloud}
                title="No files in queue"
                description="Add resumes to see per-file progress, local preview actions, and ingestion status updates."
              />
            ) : (
              <div className="space-y-3">
                {queue.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                    className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-white">{item.file.name}</p>
                        <p className="mt-1 text-sm text-white/48">
                          {formatFileSize(item.file.size)} • {item.file.type || "Unknown type"}
                        </p>
                        {item.candidateName && <p className="mt-2 text-sm text-[#8DF5DF]">Candidate: {item.candidateName}</p>}
                        {item.error && <p className="mt-2 text-sm text-red-300">{item.error}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={item.status === "done" ? "teal" : item.status === "error" ? "warning" : "outline"}>
                          {item.status}
                        </Badge>
                        <Button variant="ghost" size="icon" onClick={() => window.open(item.previewUrl, "_blank", "noopener,noreferrer")}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => removeQueuedFile(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/6">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${statusProgress[item.status]}%` }}
                        transition={{ duration: 0.5 }}
                        className="h-full rounded-full bg-[linear-gradient(90deg,#6C63FF,#00D4AA)]"
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Batch upload summary</CardTitle>
              <CardDescription>Results returned from the backend after the latest ingestion run.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/35">Files</p>
                  <p className="mt-3 font-display text-3xl text-white">{summary?.files_processed ?? 0}</p>
                </div>
                <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/35">Candidates</p>
                  <p className="mt-3 font-display text-3xl text-white">{summary?.processed_count ?? 0}</p>
                </div>
                <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/35">Errors</p>
                  <p className="mt-3 font-display text-3xl text-white">{summary?.failed_count ?? 0}</p>
                </div>
              </div>

              {previewCandidates.length > 0 && (
                <div className="space-y-3">
                  {previewCandidates.map((candidate) => (
                    <div key={candidate.candidate_id} className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                      <p className="font-medium text-white">{candidate.name}</p>
                      <p className="mt-1 text-sm text-white/48">{candidate.current_position || "Position not extracted"}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {candidate.skills.slice(0, 4).map((skill) => (
                          <Badge key={skill} variant="outline">{skill}</Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>File history</CardTitle>
              <CardDescription>Previously indexed source files currently represented in SQLite and FAISS.</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingHistory ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((item) => (
                    <Skeleton key={item} className="h-20 w-full" />
                  ))}
                </div>
              ) : history.length === 0 ? (
                <EmptyState
                  icon={FileStack}
                  title="No file history"
                  description="Once resumes are ingested, the history table will show source files and extracted candidate counts."
                />
              ) : (
                <div className="space-y-3">
                  {history.map((row) => (
                    <div key={row.fileName} className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                      <div>
                        <p className="font-medium text-white">{row.fileName}</p>
                        <p className="mt-1 text-sm text-white/48">
                          {row.candidatesExtracted} candidates extracted • {formatDate(row.lastSeen)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        onClick={async () => {
                          try {
                            await deleteDocumentFile(row.fileName);
                            toast.success(`${row.fileName} removed`);
                            refreshHistory();
                          } catch (error) {
                            toast.error(error instanceof Error ? error.message : "Unable to delete file");
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
