"use client";

import { useEffect, useMemo, useState } from "react";
import { Filter, Trash2, UserRoundSearch } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { SectionToolbar } from "@/components/common/section-toolbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { deleteCandidate, listCandidates } from "@/lib/api/client";
import type { CandidateProfile } from "@/lib/api/types";
import { getInitials } from "@/lib/utils";

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
      toast.error(error instanceof Error ? error.message : "Unable to load candidates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCandidates();
  }, []);

  const filteredCandidates = useMemo(() => {
    return candidates.filter((candidate) => {
      const haystack = `${candidate.name} ${candidate.current_position} ${candidate.location} ${candidate.skills.join(" ")}`.toLowerCase();
      const searchMatch = !search || haystack.includes(search.toLowerCase());
      const skillsMatch = !skillsFilter || candidate.skills.join(" ").toLowerCase().includes(skillsFilter.toLowerCase());
      const locationMatch = !locationFilter || candidate.location.toLowerCase().includes(locationFilter.toLowerCase());
      const educationMatch = !educationFilter || candidate.education.toLowerCase().includes(educationFilter.toLowerCase());
      const certMatch = !certificationsFilter || candidate.certifications.join(" ").toLowerCase().includes(certificationsFilter.toLowerCase());
      const experienceMatch = candidate.years_of_experience >= minExperience;
      return searchMatch && skillsMatch && locationMatch && educationMatch && certMatch && experienceMatch;
    });
  }, [candidates, search, skillsFilter, locationFilter, educationFilter, certificationsFilter, minExperience]);

  const toggleSelect = (candidateId: string) => {
    setSelectedIds((current) =>
      current.includes(candidateId) ? current.filter((id) => id !== candidateId) : [...current, candidateId]
    );
  };

  const runBulkDelete = async () => {
    if (selectedIds.length === 0) {
      return;
    }

    try {
      for (const candidateId of selectedIds) {
        await deleteCandidate(candidateId);
      }
      toast.success(`${selectedIds.length} candidates deleted`);
      setSelectedIds([]);
      loadCandidates();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Bulk delete failed");
    }
  };

  return (
    <>
      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <div className="space-y-6">
          <PageHeader
            eyebrow="Candidates"
            title="Search and manage extracted talent profiles"
            description="Filter your structured candidate database by skills, experience, education, and certification signals."
          />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-primary" />
                Filters
              </CardTitle>
              <CardDescription>Local filtering over structured candidate data fetched from your backend.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <input value={search} onChange={(event) => setSearch(event.target.value)} className="h-11 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-white placeholder:text-white/28" placeholder="Search by name, role, or skill" />
              <input value={skillsFilter} onChange={(event) => setSkillsFilter(event.target.value)} className="h-11 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-white placeholder:text-white/28" placeholder="Skills" />
              <input value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)} className="h-11 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-white placeholder:text-white/28" placeholder="Location" />
              <input value={educationFilter} onChange={(event) => setEducationFilter(event.target.value)} className="h-11 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-white placeholder:text-white/28" placeholder="Education level" />
              <input value={certificationsFilter} onChange={(event) => setCertificationsFilter(event.target.value)} className="h-11 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-white placeholder:text-white/28" placeholder="Certifications" />
              <div>
                <div className="mb-2 flex items-center justify-between text-sm text-white/52">
                  <span>Minimum experience</span>
                  <span>{minExperience}+ years</span>
                </div>
                <input type="range" min={0} max={15} value={minExperience} onChange={(event) => setMinExperience(Number(event.target.value))} className="w-full accent-[#6C63FF]" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <SectionToolbar
            left={
              <>
                <Badge variant="outline">{filteredCandidates.length} candidates</Badge>
                <Badge variant="secondary">{selectedIds.length} selected</Badge>
              </>
            }
            right={
              <Button variant="destructive" onClick={runBulkDelete} disabled={selectedIds.length === 0}>
                <Trash2 className="h-4 w-4" />
                Bulk delete
              </Button>
            }
          />

          <Card>
            <CardHeader>
              <CardTitle>Candidate intelligence list</CardTitle>
              <CardDescription>Review extracted profiles and open detail panels without leaving the table.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((item) => (
                    <Skeleton key={item} className="h-24 w-full" />
                  ))}
                </div>
              ) : filteredCandidates.length === 0 ? (
                <EmptyState
                  icon={UserRoundSearch}
                  title="No matching candidates"
                  description="Adjust your search or filters to surface candidate profiles from the structured talent database."
                />
              ) : (
                <div className="space-y-3">
                  {filteredCandidates.map((candidate) => (
                    <button
                      key={candidate.candidate_id}
                      type="button"
                      onClick={() => setActiveCandidate(candidate)}
                      className="w-full rounded-[24px] border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-primary/35 hover:bg-white/[0.05]"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-start gap-4">
                          <label className="mt-1 flex h-5 w-5 items-center justify-center">
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(candidate.candidate_id)}
                              onChange={(event) => {
                                event.stopPropagation();
                                toggleSelect(candidate.candidate_id);
                              }}
                              onClick={(event) => event.stopPropagation()}
                              className="h-4 w-4 rounded border-white/10 bg-transparent accent-[#6C63FF]"
                            />
                          </label>
                          <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.05] text-white">
                            {getInitials(candidate.name)}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-3">
                              <p className="font-medium text-white">{candidate.name}</p>
                              <Badge variant="teal">AI score {Math.round(computeProfileScore(candidate))}%</Badge>
                            </div>
                            <p className="mt-1 text-sm text-white/50">{candidate.current_position || "Position unavailable"}</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {candidate.skills.slice(0, 3).map((skill) => (
                                <Badge key={skill} variant="outline">{skill}</Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="text-right text-sm text-white/48">
                          <p>{candidate.location || "Unknown location"}</p>
                          <p className="mt-1">{candidate.years_of_experience} years exp.</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Sheet open={Boolean(activeCandidate)} onOpenChange={(open) => !open && setActiveCandidate(null)}>
        <SheetContent side="right">
          {activeCandidate && (
            <>
              <SheetHeader>
                <SheetTitle>{activeCandidate.name}</SheetTitle>
                <SheetDescription>{activeCandidate.current_position || "Candidate profile"}</SheetDescription>
              </SheetHeader>

              <div className="space-y-5 overflow-y-auto pr-2 text-sm">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-white/35">Phone</p>
                    <p className="mt-2 text-white">{activeCandidate.phone_number || "Not extracted"}</p>
                  </div>
                  <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-white/35">Email</p>
                    <p className="mt-2 text-white">{activeCandidate.gmail || "Not extracted"}</p>
                  </div>
                  <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-white/35">Location</p>
                    <p className="mt-2 text-white">{activeCandidate.location || "Not extracted"}</p>
                  </div>
                  <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-white/35">Experience</p>
                    <p className="mt-2 text-white">{activeCandidate.years_of_experience} years</p>
                  </div>
                </div>

                <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/35">Education</p>
                  <p className="mt-2 text-white">{activeCandidate.education || "Not extracted"}</p>
                </div>

                <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/35">Skills</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {activeCandidate.skills.map((skill) => (
                      <Badge key={skill} variant="teal">{skill}</Badge>
                    ))}
                  </div>
                </div>

                <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/35">Certifications</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {activeCandidate.certifications.length === 0 && <span className="text-white/48">None extracted</span>}
                    {activeCandidate.certifications.map((certification) => (
                      <Badge key={certification} variant="outline">{certification}</Badge>
                    ))}
                  </div>
                </div>

                <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/35">Upload source</p>
                  <p className="mt-2 text-white">{activeCandidate.file_name}</p>
                </div>

                <Button
                  variant="destructive"
                  onClick={async () => {
                    try {
                      await deleteCandidate(activeCandidate.candidate_id);
                      toast.success(`${activeCandidate.name} deleted`);
                      setActiveCandidate(null);
                      loadCandidates();
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "Unable to delete candidate");
                    }
                  }}
                >
                  Delete candidate
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
