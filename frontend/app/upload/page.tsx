"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Download,
  Eye,
  FileText,
  LoaderCircle,
  Trash2,
  UploadCloud
} from "lucide-react";

import { uploadDocuments } from "@/lib/api/client";
import type { UploadResponse } from "@/lib/api/types";
import { formatFileSize } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface UploadItem {
  id: string;
  file: File;
  localUrl: string;
}

export default function UploadPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [lastUpload, setLastUpload] = useState<UploadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      items.forEach((item) => URL.revokeObjectURL(item.localUrl));
    };
  }, [items]);

  const hasItems = items.length > 0;
  const acceptedTypes = ".pdf,.docx,.txt";

  const summary = useMemo(
    () => ({
      totalFiles: items.length,
      totalSize: items.reduce((acc, item) => acc + item.file.size, 0)
    }),
    [items]
  );

  const onFilesSelected = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) {
      return;
    }

    const added = Array.from(fileList).map((file) => ({
      id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
      file,
      localUrl: URL.createObjectURL(file)
    }));

    setItems((prev) => [...prev, ...added]);
    setError(null);
  };

  const removeItem = (id: string) => {
    setItems((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) {
        URL.revokeObjectURL(target.localUrl);
      }
      return prev.filter((item) => item.id !== id);
    });
  };

  const clearAll = () => {
    items.forEach((item) => URL.revokeObjectURL(item.localUrl));
    setItems([]);
    setLastUpload(null);
    setError(null);
  };

  const triggerPicker = () => fileInputRef.current?.click();

  const handleUpload = async () => {
    if (!hasItems || isUploading) {
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadProgress(8);

    const progressTimer = window.setInterval(() => {
      setUploadProgress((current) => Math.min(92, current + Math.random() * 12));
    }, 250);

    try {
      const result = await uploadDocuments(items.map((item) => item.file));
      setLastUpload(result);
      setUploadProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      window.clearInterval(progressTimer);
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 350);
    }
  };

  const uploadStatusByFile = useMemo(() => {
    const statusMap = new Map<
      string,
      { status: "indexed" | "failed"; message?: string; candidateName?: string }
    >();
    if (!lastUpload) {
      return statusMap;
    }

    lastUpload.candidates.forEach((candidate) => {
      statusMap.set(candidate.file_name, {
        status: "indexed",
        candidateName: candidate.name
      });
    });

    lastUpload.errors.forEach((errorLine) => {
      const idx = errorLine.indexOf(":");
      if (idx <= 0) {
        return;
      }
      const fileName = errorLine.slice(0, idx).trim();
      const message = errorLine.slice(idx + 1).trim();
      statusMap.set(fileName, { status: "failed", message });
    });

    return statusMap;
  }, [lastUpload]);

  const totalIndexed = useMemo(() => {
    if (!lastUpload) {
      return 0;
    }
    return lastUpload.candidates.length;
  }, [lastUpload]);

  return (
    <div className="grid gap-6">
      <Card className="border-primary/25 bg-gradient-to-br from-orange-50 via-white to-orange-100/50">
        <CardHeader>
          <CardTitle className="text-2xl">Upload CV Documents</CardTitle>
          <CardDescription>
            Upload one or multiple files for parsing, chunking, embedding, and recruiter-ready indexing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <motion.button
            type="button"
            onClick={triggerPicker}
            whileHover={{ y: -2 }}
            className="group w-full rounded-xl border-2 border-dashed border-orange-300 bg-white/80 p-8 text-left transition-colors hover:border-primary"
          >
            <div className="mx-auto flex max-w-xl flex-col items-center gap-3 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
                <UploadCloud className="h-5 w-5" />
              </div>
              <p className="text-base font-semibold">Choose CV files from your system</p>
              <p className="text-sm text-muted-foreground">
                Supports PDF, DOCX, TXT. Metadata, chunking, and vector indexing happen automatically.
              </p>
            </div>
          </motion.button>

          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedTypes}
            multiple
            onChange={(event) => onFilesSelected(event.target.files)}
            className="hidden"
          />

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Files: {summary.totalFiles}</Badge>
            <Badge variant="outline">Total size: {formatFileSize(summary.totalSize)}</Badge>
            <Badge variant="warning">Endpoint: /api/v1/documents/upload</Badge>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={triggerPicker} variant="outline">
              Add More Files
            </Button>
            <Button onClick={handleUpload} disabled={!hasItems || isUploading}>
              {isUploading ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Upload and Index"
              )}
            </Button>
            <Button onClick={clearAll} variant="ghost" disabled={!hasItems || isUploading}>
              Clear
            </Button>
          </div>

          {isUploading && (
            <div className="space-y-2">
              <div className="h-2 w-full overflow-hidden rounded-full bg-orange-100">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  animate={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">Processing files and embedding chunks...</p>
            </div>
          )}

          {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Document Intake List</CardTitle>
          <CardDescription>
            File list with quick actions and upload status for each document.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">In Queue: {items.length}</Badge>
            <Badge variant="outline">Indexed: {totalIndexed}</Badge>
            <Badge variant="warning">View works directly in browser</Badge>
          </div>

          {!hasItems && (
            <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-5 text-sm text-muted-foreground">
              Add documents to start intake.
            </div>
          )}

          {items.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className="flex flex-col gap-3 rounded-xl border border-border/70 bg-white p-3 md:flex-row md:items-center md:justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-orange-100 text-primary">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <p className="max-w-[220px] truncate text-sm font-semibold md:max-w-[440px]">
                    {item.file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(item.file.size)} • {item.file.type || "unknown type"}
                  </p>
                  {uploadStatusByFile.get(item.file.name)?.candidateName && (
                    <p className="text-xs text-emerald-700">
                      Candidate: {uploadStatusByFile.get(item.file.name)?.candidateName}
                    </p>
                  )}
                  {uploadStatusByFile.get(item.file.name)?.message && (
                    <p className="text-xs text-red-700">
                      {uploadStatusByFile.get(item.file.name)?.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isUploading ? (
                  <Badge variant="outline">Uploading...</Badge>
                ) : uploadStatusByFile.get(item.file.name)?.status === "indexed" ? (
                  <Badge variant="success">Indexed</Badge>
                ) : uploadStatusByFile.get(item.file.name)?.status === "failed" ? (
                  <Badge variant="warning">Failed</Badge>
                ) : (
                  <Badge variant="outline">Pending</Badge>
                )}
                <Button asChild size="icon" variant="ghost">
                  <a href={item.localUrl} target="_blank" rel="noreferrer" aria-label="View document">
                    <Eye className="h-4 w-4" />
                  </a>
                </Button>
                <Button asChild size="icon" variant="ghost">
                  <a href={item.localUrl} download={item.file.name} aria-label="Download document">
                    <Download className="h-4 w-4" />
                  </a>
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => removeItem(item.id)}
                  aria-label="Remove document"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
