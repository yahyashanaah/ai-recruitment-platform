"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Download, Eye, Mail, Phone, RefreshCw, Trash2, UserRound } from "lucide-react";

import { deleteCandidate, listCandidates } from "@/lib/api/client";
import type { CandidateProfile } from "@/lib/api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

export default function CandidatesPage() {
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<CandidateProfile[]>([]);
  const [selected, setSelected] = useState<CandidateProfile | null>(null);

  const loadCandidates = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await listCandidates();
      setCandidates(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to fetch candidates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCandidates();
  }, []);

  const totalSkills = useMemo(
    () => candidates.reduce((acc, candidate) => acc + candidate.skills.length, 0),
    [candidates]
  );

  const handleDelete = async (candidateId: string) => {
    setDeletingId(candidateId);
    try {
      await deleteCandidate(candidateId);
      setCandidates((prev) => prev.filter((candidate) => candidate.candidate_id !== candidateId));
      if (selected?.candidate_id === candidateId) {
        setSelected(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="grid gap-6">
      <Card className="border-primary/20 bg-gradient-to-r from-orange-50 via-white to-orange-100/60">
        <CardHeader>
          <CardTitle className="text-2xl">Candidate Intelligence Hub</CardTitle>
          <CardDescription>
            Manage all structured candidate profiles from <code>/api/v1/candidates</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">Profiles: {candidates.length}</Badge>
          <Badge variant="outline">Total Skills Indexed: {totalSkills}</Badge>
          <Button variant="outline" onClick={loadCandidates} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardContent>
      </Card>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Candidates</CardTitle>
          <CardDescription>
            Open details in a slide-over panel. Delete removes both SQLite profile and FAISS vectors.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && (
            <div className="grid gap-3">
              {[1, 2, 3].map((item) => (
                <Skeleton key={item} className="h-16 w-full" />
              ))}
            </div>
          )}

          {!loading && candidates.length === 0 && (
            <p className="text-sm text-muted-foreground">No candidates found. Upload CVs to populate records.</p>
          )}

          {!loading &&
            candidates.map((candidate, index) => (
              <motion.div
                key={candidate.candidate_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="rounded-xl border border-border/70 bg-white p-3"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <p className="font-semibold">{candidate.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {candidate.current_position || "Position N/A"} • {candidate.location || "Location N/A"}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {candidate.skills.slice(0, 5).map((skill) => (
                        <Badge key={`${candidate.candidate_id}-${skill}`} variant="outline">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Sheet>
                      <SheetTrigger asChild>
                        <Button variant="outline" onClick={() => setSelected(candidate)}>
                          <Eye className="h-4 w-4" />
                          Details
                        </Button>
                      </SheetTrigger>
                      <SheetContent side="right" className="w-full sm:max-w-xl">
                        {selected && (
                          <div className="flex h-full flex-col gap-4">
                            <SheetHeader>
                              <SheetTitle className="flex items-center gap-2">
                                <UserRound className="h-4 w-4 text-primary" />
                                {selected.name}
                              </SheetTitle>
                              <SheetDescription>{selected.file_name}</SheetDescription>
                            </SheetHeader>

                            <div className="grid gap-3 text-sm">
                              <div className="grid gap-2 rounded-xl border border-border/70 bg-muted/20 p-3">
                                <p className="font-semibold">Contact</p>
                                <p className="flex items-center gap-2">
                                  <Mail className="h-3.5 w-3.5 text-primary" />
                                  {selected.gmail || "Not extracted"}
                                </p>
                                <p className="flex items-center gap-2">
                                  <Phone className="h-3.5 w-3.5 text-primary" />
                                  {selected.phone_number || "Not extracted"}
                                </p>
                              </div>

                              <div className="grid gap-2 rounded-xl border border-border/70 bg-muted/20 p-3">
                                <p>
                                  <span className="font-semibold">Experience:</span>{" "}
                                  {selected.years_of_experience} years
                                </p>
                                <p>
                                  <span className="font-semibold">Education:</span>{" "}
                                  {selected.education || "N/A"}
                                </p>
                                <p>
                                  <span className="font-semibold">Current Position:</span>{" "}
                                  {selected.current_position || "N/A"}
                                </p>
                              </div>

                              <div className="grid gap-2 rounded-xl border border-border/70 bg-muted/20 p-3">
                                <p className="font-semibold">Skills</p>
                                <div className="flex flex-wrap gap-2">
                                  {selected.skills.length === 0 && (
                                    <span className="text-xs text-muted-foreground">No extracted skills</span>
                                  )}
                                  {selected.skills.map((skill) => (
                                    <Badge key={`${selected.candidate_id}-${skill}`} variant="outline">
                                      {skill}
                                    </Badge>
                                  ))}
                                </div>
                              </div>

                              <div className="grid gap-2 rounded-xl border border-border/70 bg-muted/20 p-3">
                                <p className="font-semibold">Document Actions</p>
                                <div className="flex items-center gap-2">
                                  <Button variant="outline" size="sm" disabled title="Document URL endpoint not configured">
                                    <Eye className="h-4 w-4" />
                                    View
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled
                                    title="Document URL endpoint not configured"
                                  >
                                    <Download className="h-4 w-4" />
                                    Download
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </SheetContent>
                    </Sheet>

                    <Button
                      variant="destructive"
                      onClick={() => handleDelete(candidate.candidate_id)}
                      disabled={deletingId === candidate.candidate_id}
                    >
                      <Trash2 className="h-4 w-4" />
                      {deletingId === candidate.candidate_id ? "Deleting..." : "Delete"}
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}
