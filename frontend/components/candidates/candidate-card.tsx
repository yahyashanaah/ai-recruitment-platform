"use client";

import { Check, Eye, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { CandidateProfile } from "@/lib/api/types";
import { cn, getInitials } from "@/lib/utils";

interface CandidateCardProps {
  candidate: CandidateProfile;
  selected: boolean;
  onSelect: () => void;
  onView: () => void;
  onDelete: () => void;
}

export function CandidateCard({
  candidate,
  selected,
  onSelect,
  onView,
  onDelete
}: CandidateCardProps) {
  const visibleSkills = candidate.skills.slice(0, 3);
  const extraSkills = Math.max(0, candidate.skills.length - visibleSkills.length);
  const role = candidate.current_position || "Candidate profile";
  const location = candidate.location || "Location not provided";
  const experienceLabel =
    candidate.years_of_experience > 0
      ? `${candidate.years_of_experience} years experience`
      : "Experience not provided";

  return (
    <article
      className={cn(
        "group flex h-full min-h-[264px] flex-col rounded-[28px] bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)] ring-1 ring-slate-200/80 transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-[0_20px_40px_rgba(15,23,42,0.08)] hover:ring-slate-200",
        selected && "ring-2 ring-orange-200 shadow-[0_18px_36px_rgba(249,115,22,0.10)]"
      )}
    >
      <div className="flex items-start gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <button
            type="button"
            onClick={onSelect}
            aria-pressed={selected}
            aria-label={selected ? `Deselect ${candidate.name}` : `Select ${candidate.name}`}
            className={cn(
              "mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition",
              selected
                ? "border-orange-500 bg-orange-500 text-white"
                : "border-slate-300 bg-white text-transparent hover:border-orange-300"
            )}
          >
            <Check className="h-3 w-3" />
          </button>

          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-orange-50 text-sm font-semibold text-orange-700">
            {getInitials(candidate.name)}
          </div>

          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold tracking-tight text-slate-950">{candidate.name}</h3>
            <p className="mt-1 truncate text-sm text-slate-500">{role}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 text-sm text-slate-500">
        <p className="truncate">
          {location}
          <span className="mx-2 text-slate-300">•</span>
          {experienceLabel}
        </p>
      </div>

      <div className="mt-4 min-h-[52px]">
        {visibleSkills.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {visibleSkills.map((skill) => (
              <span
                key={skill}
                className="inline-flex max-w-full items-center truncate rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
                title={skill}
              >
                {skill}
              </span>
            ))}
            {extraSkills > 0 ? (
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                +{extraSkills} more
              </span>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-slate-400">No skills extracted yet.</p>
        )}
      </div>

      <div className="mt-auto border-t border-slate-200/80 pt-4">
        <div className="flex items-center justify-between gap-4">
          <p className="min-w-0 truncate text-xs text-slate-400" title={candidate.file_name}>
            {candidate.file_name}
          </p>

          <div className="flex items-center justify-end gap-2">
            <Button size="sm" onClick={onView}>
              <Eye className="h-4 w-4" />
              View
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
