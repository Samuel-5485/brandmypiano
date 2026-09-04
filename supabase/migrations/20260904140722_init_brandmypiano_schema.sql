-- Brand My Piano — run in Supabase SQL editor

create table if not exists bids (
  id text primary key,
  spot_id int not null check (spot_id between 1 and 11),
  brand_name text not null,
  handle text not null,
  website text not null default '',
  logo_url text not null default '',
  keep_background boolean not null default false,
  amount numeric(12, 2) not null check (amount > 0),
  deposit numeric(12, 2) not null check (deposit > 0),
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'rejected')),
  note text,
  paid_at timestamptz,
  refunded_at timestamptz,
  refund_needed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bids_spot_id_idx on bids (spot_id);
create index if not exists bids_created_at_idx on bids (created_at desc);

create table if not exists locked_spots (
  spot_id int primary key check (spot_id between 1 and 11),
  locked_at timestamptz not null default now()
);

alter table bids enable row level security;
alter table locked_spots enable row level security;

create policy "Public read bids"
  on bids for select
  using (true);

create policy "Public read locked_spots"
  on locked_spots for select
  using (true);

-- Storage: create a public bucket named "logos" in Supabase Dashboard
-- (Storage → New bucket → name: logos → Public bucket)
