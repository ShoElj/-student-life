-- Sending money between students.
--
-- Wallets live in each student's saved profile, so a transfer is recorded here and the
-- receiver's device collects it ("claims" it) exactly once, adding it to their wallet. The
-- sender's device takes the money from its wallet when the transfer is accepted here.
--
-- Limits keep it friendly: ₦50–₦5,000 per transfer, at most ₦10,000 sent per day, and no more
-- than 5 transfers a minute.

create table if not exists life_transfers (
  id bigint generated always as identity primary key,
  class_id uuid not null references life_classes(id) on delete cascade,
  sender uuid not null references life_students(id) on delete cascade,
  recipient uuid not null references life_students(id) on delete cascade,
  amount integer not null check (amount between 50 and 5000),
  note text not null default '' check (char_length(note) <= 60),
  created_at timestamptz not null default now(),
  claimed_at timestamptz
);

create index if not exists life_transfers_recipient_idx on life_transfers (recipient) where claimed_at is null;
create index if not exists life_transfers_sender_idx on life_transfers (sender, created_at desc);

alter table life_transfers enable row level security;

create or replace function life_send_money(p_token uuid, p_to uuid, p_amount integer, p_note text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me life_students;
  v_note text := left(trim(regexp_replace(coalesce(p_note, ''), '[[:cntrl:]]', ' ', 'g')), 60);
  v_row life_transfers;
begin
  select * into v_me from life_students where session_token = p_token and p_token is not null;
  if not found then
    return json_build_object('error', 'signed_out');
  end if;
  if p_amount is null or p_amount < 50 or p_amount > 5000 then
    return json_build_object('error', 'invalid_amount');
  end if;
  if p_to is null or p_to = v_me.id or not exists (select 1 from life_students where id = p_to and class_id = v_me.class_id) then
    return json_build_object('error', 'not_found');
  end if;
  if (select count(*) from life_transfers where sender = v_me.id and created_at > now() - interval '1 minute') >= 5 then
    return json_build_object('error', 'too_fast');
  end if;
  if (select coalesce(sum(amount), 0) from life_transfers where sender = v_me.id and created_at > now() - interval '1 day') + p_amount > 10000 then
    return json_build_object('error', 'daily_limit');
  end if;
  insert into life_transfers (class_id, sender, recipient, amount, note)
  values (v_me.class_id, v_me.id, p_to, p_amount, v_note)
  returning * into v_row;
  return json_build_object('id', v_row.id, 'at', floor(extract(epoch from v_row.created_at) * 1000));
end;
$$;

-- Collects every transfer waiting for me (each one only once).
create or replace function life_claim_money(p_token uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me life_students;
  v_result json;
begin
  select * into v_me from life_students where session_token = p_token and p_token is not null;
  if not found then
    return json_build_object('error', 'signed_out');
  end if;
  with claimed as (
    update life_transfers tr
      set claimed_at = now()
      from life_students s
      where tr.recipient = v_me.id and tr.claimed_at is null and s.id = tr.sender
      returning tr.id, tr.sender, s.display_name, tr.amount, tr.note, tr.created_at
  )
  select json_build_object('transfers', coalesce(json_agg(json_build_object(
    'id', c.id, 'from', c.sender, 'fromName', c.display_name, 'amount', c.amount, 'note', c.note,
    'at', floor(extract(epoch from c.created_at) * 1000)
  ) order by c.id), '[]'::json))
  into v_result
  from claimed c;
  return v_result;
end;
$$;

revoke all on function life_send_money(uuid, uuid, integer, text) from public;
revoke all on function life_claim_money(uuid) from public;
grant execute on function life_send_money(uuid, uuid, integer, text) to anon, authenticated;
grant execute on function life_claim_money(uuid) to anon, authenticated;
