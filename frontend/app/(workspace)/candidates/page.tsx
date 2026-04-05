"use client";

import { useEffect, useMemo, useState } from "react";
import { Filter, Trash2, UserRoundSearch } from "lucide-react";
import { toast } from "sonner";

import { CandidateCard } from "@/components/candidates/candidate-card";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { SectionToolbar } from "@/components/common/section-toolbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  deleteCandidate,
  isAuthenticationRequiredError,
  listCandidates
} from "@/lib/api/client";
import type { CandidateProfile } from "@/lib/api/types";
import { formatDate } from "@/lib/utils";

function computeProfileScore(candidate: CandidateProfile) {
  return Math.min(
    98,
    42 + candidate.skills.length * 5 + candidate.certifications.length * 2 + candidate.years_of_experience * 3
  );
}

export default function CandidatesPage() {
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState<CandidateProfile[]>([]);
  const [search, setSearch] = useState("");
  const [skillsFilter, setSkillsFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [educationFilter, setEducationFilter] = useState("");
  const [certificationsFilter, setCertificationsFilter] = useState("");
  const [minExperience, setMinExperience] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeCandidate, setActiveCandidate] = useState<CandidateProfile | null>(null);

  const loadCandidates = async () => {
    try {
      const response = await listCandidates();
      setCandidates(response);
    } catch (error) {
      if (isAuthenticationRequiredError(error)) {
        return;
      }
      toast.error(error instanceof Error ? error.message : "Unable to load candidates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCandidates();
  }, []);

  const filteredCandidates = useMemo(() => {
    return candidates.filter((candidate) => {
      const haystack = `${candidate.name} ${candidate.current_position} ${candidate.location} ${candidate.skills.join(" ")}`.toLowerCase();
      const searchMatch = !search || haystack.includes(search.toLowerCase());
      const skillsMatch = !skillsFilter || candidate.skills.join(" ").toLowerCase().includes(skillsFilter.toLowerCase());
      const locationMatch = !locationFilter || candidate.location.toLowerCase().includes(locationFilter.toLowerCase());
      const educationMatch = !educationFilter || candidate.education.toLowerCase().includes(educationFilter.toLowerCase());
      const certMatch =
        !certificationsFilter || candidate.certifications.join(" ").toLowerCase().includes(certificationsFilter.toLowerCase());
      const experienceMatch = candidate.years_of_experience >= minExperience;
      return searchMatch && skillsMatch && locationMatch && educationMatch && certMatch && experienceMatch;
    });
  }, [candidates, search, skillsFilter, locationFilter, educationFilter, certificationsFilter, minExperience]);

  const toggleSelect = (candidateId: string) => {
    setSelectedIds((current) =>
      current.includes(candidateId) ? current.filter((id) => id !== candidateId) : [...current, candidateId]
    );
  };

  const runDelete = async (candidateId: string) => {
    try {
      await deleteCandidate(candidateId);
      setCandidates((current) => current.filter((candidate) => candidate.candidate_id !== candidateId));
      setSelectedIds((current) => current.filter((id) => id !== candidateId));
      if (activeCandidate?.candidate_id === candidateId) {
        setActiveCandidate(null);
      }
      toast.success("Candidate deleted");
    } catch (error) {
      if (isAuthenticationRequiredError(error)) {
        return;
      }
      toast.error(error instanceof Error ? error.message : "Unable to delete candidate");
    }
  };

  const runBulkDelete = async () => {
    if (selectedIds.length === 0) {
      return;
    }

    try {
      await Promise.all(selectedIds.map((candidateId) => deleteCandidate(candidateId)));
      setCandidates((current) => current.filter((candidate) => !selectedIds.includes(candidate.candidate_id)));
      setSelectedIds([]);
      setActiveCandidate(null);
      toast.success("Selected candidates deleted");
    } catch (error) {
      if (isAuthenticationRequiredError(error)) {
        return;
      }
      toast.error(error instanceof Error ? error.message : "Unable to delete selected candidates");
    }
  };

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Candidates"
        title="Review structured profiles with a cleaner management surface"
        description="Search, filter, and inspect recruiter-scoped candidates without leaving the same light product system as the landing page."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-orange-600" />
            Candidate filters
          </CardTitle>
          <CardDescription>Filter by skills, location, education, certifications, and years of experience.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search candidates" />
          <Input value={skillsFilter} onChange={(event) => setSkillsFilter(event.target.value)} placeholder="Skills" />
          <Input value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)} placeholder="Location" />
          <Input value={educationFilter} onChange={(event) => setEducationFilter(event.target.value)} placeholder="Education" />
          <Input
            value={certificationsFilter}
            onChange={(event) => setCertificationsFilter(event.target.value)}
            placeholder="Certifications"
          />
          <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-3">
            <div className="flex items-center justify-between gap-3 text-sm text-slate-600">
              <span>Min experience</span>
              <span>{minExperience} years</span>
            </div>
            <input
              type="range"
              min={0}
              max={15}
              value={minExperience}
              onChange={(event) => setMinExperience(Number(event.target.value))}
              className="mt-3 h-2 w-full accent-orange-500"
            />
          </div>
        </CardContent>
      </Card>

      <SectionToolbar
        left={
          <>
            <Badge variant="outline" className="normal-case tracking-normal">
              {filteredCandidates.length} shown
            </Badge>
            <Badge variant="secondary" className="normal-case tracking-normal">
              {selectedIds.length} selected
            </Badge>
          </>
        }
        right={
          <Button variant="destructive" onClick={runBulkDelete} disabled={selectedIds.length === 0}>
            <Trash2 className="h-4 w-4" />
            Bulk delete
          </Button>
        }
      />

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-52 rounded-[28px]" />
          ))}
        </div>
      ) : filteredCandidates.length === 0 ? (
        <EmptyState
          icon={UserRoundSearch}
          title="No matching candidates"
          description="Adjust the filters or upload more resumes to build your candidate workspace."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filteredCandidates.map((candidate) => {
            const isSelected = selectedIds.includes(candidate.candidate_id);
            const score = computeProfileScore(candidate);

            return (
              <CandidateCard
                key={candidate.candidate_id}
                candidate={candidate}
                score={score}
                selected={isSelected}
                onSelect={() => toggleSelect(candidate.candidate_id)}
                onView={() => setActiveCandidate(candidate)}
                onDelete={() => void runDelete(candidate.candidate_id)}
              />
            );
          })}
        </div>
      )}

      <Sheet open={Boolean(activeCandidate)} onOpenChange={(open) => !open && setActiveCandidate(null)}>
        <SheetContent>
          {activeCandidate ? (
            <div className="flex h-full flex-col gap-6 overflow-y-auto pr-1">
              <SheetHeader>
                <SheetTitle>{activeCandidate.name}</SheetTitle>
                <SheetDescription>
                  {activeCandidate.current_position || "Candidate profile"} {activeCandidate.location ? `• ${activeCandidate.location}` : ""}
                </SheetDescription>
              </SheetHeader>

              <div className="grid gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Profile details</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 text-sm text-slate-700 sm:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Email</p>
                      <p className="mt-2">{activeCandidate.gmail || "Not provided"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Phone</p>
                      <p className="mt-2">{activeCandidate.phone_number || "Not provided"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">LinkedIn</p>
                      <p className="mt-2 break-all">{activeCandidate.linkedin || "Not provided"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Education</p>
                      <p className="mt-2">{activeCandidate.education || "Not provided"}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Skills and certifications</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Skills</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {activeCandidate.skills.map((skill) => (
                          <Badge key={skill} className="normal-case tracking-normal">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Certifications</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {activeCandidate.certifications.length > 0 ? (
                          activeCandidate.certifications.map((certification) => (
                            <Badge key={certification} variant="outline" className="normal-case tracking-normal">
                              {certification}
                            </Badge>
                          ))
                        ) : (
                          <p className="text-sm text-slate-500">No certifications listed.</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Source</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-slate-700">
                    <p>File name: {activeCandidate.file_name}</p>
                    <p>Created: {formatDate(activeCandidate.created_at ?? Date.now())}</p>
                  </CardContent>
                </Card>

                <Button variant="destructive" onClick={() => void runDelete(activeCandidate.candidate_id)}>
                  <Trash2 className="h-4 w-4" />
                  Delete candidate
                </Button>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
