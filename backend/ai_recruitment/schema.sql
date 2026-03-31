create extension if not exists pgcrypto;
create extension if not exists vector with schema extensions;

create table if not exists public.recruiters (
    id uuid primary key references auth.users (id) on delete cascade,
    full_name text not null default '',
    email text not null unique,
    created_at timestamptz not null default timezone('utc', now()),
    last_login timestamptz not null default timezone('utc', now())
);

create table if not exists public.candidates (
    id uuid primary key default gen_random_uuid(),
    recruiter_id uuid not null references public.recruiters (id) on delete cascade,
    file_name text not null,
    name text not null default '',
    linkedin text not null default '',
    phone_number text not null default '',
    gmail text not null default '',
    location text not null default '',
    years_of_experience double precision not null default 0,
    skills jsonb not null default '[]'::jsonb,
    education text not null default '',
    current_position text not null default '',
    certifications jsonb not null default '[]'::jsonb,
    raw_profile jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.candidate_chunks (
    id uuid primary key default gen_random_uuid(),
    candidate_id uuid not null references public.candidates (id) on delete cascade,
    recruiter_id uuid not null references public.recruiters (id) on delete cascade,
    content text not null,
    embedding extensions.vector(384) not null,
    page_number integer not null default 1,
    file_name text not null,
    created_at timestamptz not null default timezone('utc', now())
);

create index if not exists recruiters_email_idx on public.recruiters (email);
create index if not exists candidates_recruiter_id_idx on public.candidates (recruiter_id);
create index if not exists candidates_created_at_idx on public.candidates (created_at desc);
create index if not exists candidates_skills_gin_idx on public.candidates using gin (skills jsonb_path_ops);
create index if not exists candidate_chunks_recruiter_id_idx on public.candidate_chunks (recruiter_id);
create index if not exists candidate_chunks_candidate_id_idx on public.candidate_chunks (candidate_id);
create index if not exists candidate_chunks_file_name_idx on public.candidate_chunks (file_name);
create index if not exists candidate_chunks_embedding_hnsw_idx
    on public.candidate_chunks
    using hnsw (embedding extensions.vector_cosine_ops);

alter table public.recruiters enable row level security;
alter table public.candidates enable row level security;
alter table public.candidate_chunks enable row level security;

drop policy if exists recruiters_select_own on public.recruiters;
create policy recruiters_select_own
    on public.recruiters
    for select
    using (auth.uid() = id);

drop policy if exists recruiters_insert_own on public.recruiters;
create policy recruiters_insert_own
    on public.recruiters
    for insert
    with check (auth.uid() = id);

drop policy if exists recruiters_update_own on public.recruiters;
create policy recruiters_update_own
    on public.recruiters
    for update
    using (auth.uid() = id)
    with check (auth.uid() = id);

drop policy if exists candidates_select_own on public.candidates;
create policy candidates_select_own
    on public.candidates
    for select
    using (auth.uid() = recruiter_id);

drop policy if exists candidates_insert_own on public.candidates;
create policy candidates_insert_own
    on public.candidates
    for insert
    with check (auth.uid() = recruiter_id);

drop policy if exists candidates_update_own on public.candidates;
create policy candidates_update_own
    on public.candidates
    for update
    using (auth.uid() = recruiter_id)
    with check (auth.uid() = recruiter_id);

drop policy if exists candidates_delete_own on public.candidates;
create policy candidates_delete_own
    on public.candidates
    for delete
    using (auth.uid() = recruiter_id);

drop policy if exists candidate_chunks_select_own on public.candidate_chunks;
create policy candidate_chunks_select_own
    on public.candidate_chunks
    for select
    using (auth.uid() = recruiter_id);

drop policy if exists candidate_chunks_insert_own on public.candidate_chunks;
create policy candidate_chunks_insert_own
    on public.candidate_chunks
    for insert
    with check (auth.uid() = recruiter_id);

drop policy if exists candidate_chunks_update_own on public.candidate_chunks;
create policy candidate_chunks_update_own
    on public.candidate_chunks
    for update
    using (auth.uid() = recruiter_id)
    with check (auth.uid() = recruiter_id);

drop policy if exists candidate_chunks_delete_own on public.candidate_chunks;
create policy candidate_chunks_delete_own
    on public.candidate_chunks
    for delete
    using (auth.uid() = recruiter_id);

create or replace function public.ingest_candidate_with_chunks(
    recruiter_input uuid,
    candidate_input jsonb,
    chunks_input jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public, extensions
as $$
declare
    recruiter_context uuid := coalesce(auth.uid(), recruiter_input);
    candidate_context uuid := coalesce((candidate_input ->> 'id')::uuid, gen_random_uuid());
    chunk_item jsonb;
begin
    if recruiter_context is null then
        raise exception 'Missing recruiter context';
    end if;

    if auth.uid() is not null and recruiter_input <> auth.uid() then
        raise exception 'Forbidden recruiter scope';
    end if;

    insert into public.candidates (
        id,
        recruiter_id,
        file_name,
        name,
        linkedin,
        phone_number,
        gmail,
        location,
        years_of_experience,
        skills,
        education,
        current_position,
        certifications,
        raw_profile
    )
    values (
        candidate_context,
        recruiter_context,
        coalesce(candidate_input ->> 'file_name', ''),
        coalesce(candidate_input ->> 'name', ''),
        coalesce(candidate_input ->> 'linkedin', ''),
        coalesce(candidate_input ->> 'phone_number', ''),
        coalesce(candidate_input ->> 'gmail', ''),
        coalesce(candidate_input ->> 'location', ''),
        coalesce((candidate_input ->> 'years_of_experience')::double precision, 0),
        coalesce(candidate_input -> 'skills', '[]'::jsonb),
        coalesce(candidate_input ->> 'education', ''),
        coalesce(candidate_input ->> 'current_position', ''),
        coalesce(candidate_input -> 'certifications', '[]'::jsonb),
        coalesce(candidate_input -> 'raw_profile', '{}'::jsonb)
    );

    for chunk_item in select value from jsonb_array_elements(chunks_input)
    loop
        insert into public.candidate_chunks (
            id,
            candidate_id,
            recruiter_id,
            content,
            embedding,
            page_number,
            file_name
        )
        values (
            coalesce((chunk_item ->> 'id')::uuid, gen_random_uuid()),
            candidate_context,
            recruiter_context,
            coalesce(chunk_item ->> 'content', ''),
            (chunk_item ->> 'embedding')::extensions.vector(384),
            coalesce((chunk_item ->> 'page_number')::integer, 1),
            coalesce(chunk_item ->> 'file_name', coalesce(candidate_input ->> 'file_name', ''))
        );
    end loop;

    return candidate_context;
end;
$$;

grant execute on function public.ingest_candidate_with_chunks(uuid, jsonb, jsonb) to authenticated;

create or replace function public.match_candidate_chunks(
    query_embedding text,
    recruiter_filter uuid,
    match_count integer default 5,
    candidate_filter uuid[] default null
)
returns table (
    id uuid,
    candidate_id uuid,
    recruiter_id uuid,
    content text,
    page_number integer,
    file_name text,
    created_at timestamptz,
    similarity double precision,
    candidate_name text
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
    select
        chunks.id,
        chunks.candidate_id,
        chunks.recruiter_id,
        chunks.content,
        chunks.page_number,
        chunks.file_name,
        chunks.created_at,
        1 - (chunks.embedding <=> (query_embedding)::extensions.vector(384)) as similarity,
        candidates.name as candidate_name
    from public.candidate_chunks as chunks
    join public.candidates as candidates
        on candidates.id = chunks.candidate_id
    where chunks.recruiter_id = recruiter_filter
      and (candidate_filter is null or chunks.candidate_id = any(candidate_filter))
    order by chunks.embedding <=> (query_embedding)::extensions.vector(384)
    limit greatest(match_count, 1);
$$;

grant execute on function public.match_candidate_chunks(text, uuid, integer, uuid[]) to authenticated;
