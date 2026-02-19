-- Create chat_sessions table to map novels to chat history
create table public.chat_sessions (
  id uuid default gen_random_uuid() primary key,
  novel_id uuid not null references public.novels(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint chat_sessions_novel_id_key unique (novel_id)
);

-- Enable RLS for chat_sessions
alter table public.chat_sessions enable row level security;

create policy "Users can view their own chat sessions"
  on public.chat_sessions for select
  using ( exists ( select 1 from public.novels where novels.id = chat_sessions.novel_id and novels.user_id = auth.uid() ) );

create policy "Users can insert their own chat sessions"
  on public.chat_sessions for insert
  with check ( exists ( select 1 from public.novels where novels.id = chat_sessions.novel_id and novels.user_id = auth.uid() ) );

-- Create chat_messages table with advanced monitoring fields
create table public.chat_messages (
  id uuid default gen_random_uuid() primary key,
  session_id uuid not null references public.chat_sessions(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  model_used text, -- 記錄使用的模型 (如: DeepSeek-R1, Qwen-Plus)
  context_mode text, -- 記錄上下文模式 (如: quick, review, deep)
  tokens_input integer, -- 記錄輸入 Token
  tokens_output integer, -- 記錄輸出 Token
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  metadata jsonb default '{}'::jsonb
);

-- Create index for faster retrieval of mostly recent messages
create index chat_messages_session_id_created_at_idx on public.chat_messages(session_id, created_at desc);

-- Enable RLS for chat_messages
alter table public.chat_messages enable row level security;

create policy "Users can view messages of their sessions"
  on public.chat_messages for select
  using ( exists ( select 1 from public.chat_sessions join public.novels on novels.id = chat_sessions.novel_id where chat_sessions.id = chat_messages.session_id and novels.user_id = auth.uid() ) );

create policy "Users can insert messages to their sessions"
  on public.chat_messages for insert
  with check ( exists ( select 1 from public.chat_sessions join public.novels on novels.id = chat_sessions.novel_id where chat_sessions.id = chat_messages.session_id and novels.user_id = auth.uid() ) );

-- Create chapter_briefings table with S/A/B priority
create table public.chapter_briefings (
  id uuid default gen_random_uuid() primary key,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  content text not null,
  priority_level text default 'B' check (priority_level in ('S', 'A', 'B')), -- S:核心 A:分卷 B:細節
  is_critical boolean default false, -- 舊有無損相容欄位
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint chapter_briefings_chapter_id_key unique (chapter_id)
);

-- Enable RLS for chapter_briefings
alter table public.chapter_briefings enable row level security;

create policy "Users can view briefings of their chapters"
  on public.chapter_briefings for select
  using ( exists ( select 1 from public.chapters join public.volumes on volumes.id = chapters.volume_id join public.novels on novels.id = volumes.novel_id where chapters.id = chapter_briefings.chapter_id and novels.user_id = auth.uid() ) );

create policy "Users can insert briefings for their chapters"
  on public.chapter_briefings for insert
  with check ( exists ( select 1 from public.chapters join public.volumes on volumes.id = chapters.volume_id join public.novels on novels.id = volumes.novel_id where chapters.id = chapter_briefings.chapter_id and novels.user_id = auth.uid() ) );

-- Create session_summaries table for dialogue compression (Event-triggered)
create table public.session_summaries (
  id uuid default gen_random_uuid() primary key,
  session_id uuid not null references public.chat_sessions(id) on delete cascade,
  summary text not null,
  trigger_event text, -- 觸發事件說明
  message_count_at_summary integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for session_summaries
alter table public.session_summaries enable row level security;

create policy "Users can view summaries of their sessions"
  on public.session_summaries for select
  using ( exists ( select 1 from public.chat_sessions join public.novels on novels.id = chat_sessions.novel_id where chat_sessions.id = session_summaries.session_id and novels.user_id = auth.uid() ) );

create policy "Users can insert summaries to their sessions"
  on public.session_summaries for insert
  with check ( exists ( select 1 from public.chat_sessions join public.novels on novels.id = chat_sessions.novel_id where chat_sessions.id = session_summaries.session_id and novels.user_id = auth.uid() ) );
