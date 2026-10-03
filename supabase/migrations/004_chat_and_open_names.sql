-- Open names and school chat.
--
-- Names: any characters (accents, emoji, other scripts) are allowed. Only the length is
-- limited (1–20 characters) so names fit above students' heads, and control characters are
-- removed.
--
-- Chat: students can post messages to everyone in their school or to one classmate. Messages
-- are stored here so people who were away can catch up; new messages are also sent instantly
-- over Realtime broadcast on `life:{classCode}`. Like the other life_* tables, the browser can
-- only reach this table through the functions below.

-- Names ----------------------------------------------------------------------

alter table life_students drop constraint if exists life_students_display_name_check;
alter table life_students add constraint life_students_display_name_check
  check (char_length(display_name) between 1 and 20);

alter table players drop constraint if exists players_display_name_check;
alter table players add constraint players_display_name_check
  check (char_length(display_name) between 1 and 20);

alter table rooms drop constraint if exists rooms_host_name_check;
alter table rooms add constraint rooms_host_name_check
  check (char_length(host_name) between 1 and 20);

create or replace function life_enter(p_code text, p_name text, p_pin text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_class life_classes;
  v_student life_students;
  v_name text := regexp_replace(trim(regexp_replace(coalesce(p_name, ''), '[[:cntrl:]]', '', 'g')), '\s+', ' ', 'g');
  v_key text;
  v_token uuid := gen_random_uuid();
begin
  v_key := lower(v_name);
  select * into v_class from life_classes where code = upper(trim(coalesce(p_code, '')));
  if not found then
    return json_build_object('error', 'class_not_found');
  end if;
  if char_length(v_name) not between 1 and 20 then
    return json_build_object('error', 'invalid_name');
  end if;
  if coalesce(p_pin, '') !~ '^[0-9]{4}$' then
    return json_build_object('error', 'invalid_pin');
  end if;

  select * into v_student from life_students where class_id = v_class.id and name_key = v_key for update;

  if not found then
    if (select count(*) from life_students where class_id = v_class.id) >= 60 then
      return json_build_object('error', 'class_full');
    end if;
    insert into life_students (class_id, display_name, name_key, pin_hash, session_token)
    values (v_class.id, v_name, v_key, extensions.crypt(p_pin, extensions.gen_salt('bf')), v_token)
    returning * into v_student;
    return json_build_object(
      'studentId', v_student.id, 'token', v_token, 'name', v_student.display_name,
      'isNew', true, 'profile', null, 'className', v_class.name
    );
  end if;

  if v_student.locked_until is not null and v_student.locked_until > now() then
    return json_build_object('error', 'locked', 'retryAfter', ceil(extract(epoch from v_student.locked_until - now())));
  end if;

  if extensions.crypt(p_pin, v_student.pin_hash) <> v_student.pin_hash then
    update life_students
      set failed_attempts = case when failed_attempts + 1 >= 5 then 0 else failed_attempts + 1 end,
          locked_until = case when failed_attempts + 1 >= 5 then now() + interval '5 minutes' else locked_until end
      where id = v_student.id;
    return json_build_object('error', 'wrong_pin');
  end if;

  update life_students
    set session_token = v_token, failed_attempts = 0, locked_until = null, last_seen = now()
    where id = v_student.id;
  return json_build_object(
    'studentId', v_student.id, 'token', v_token, 'name', v_student.display_name,
    'isNew', false, 'profile', nullif(v_student.profile, '{}'::jsonb), 'className', v_class.name
  );
end;
$$;

-- Chat -----------------------------------------------------------------------

create table if not exists life_messages (
  id bigint generated always as identity primary key,
  class_id uuid not null references life_classes(id) on delete cascade,
  sender uuid not null references life_students(id) on delete cascade,
  -- null means "everyone in the school".
  recipient uuid references life_students(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 300),
  created_at timestamptz not null default now()
);

create index if not exists life_messages_class_idx on life_messages (class_id, id desc);
create index if not exists life_messages_sender_idx on life_messages (sender, created_at desc);
create index if not exists life_messages_recipient_idx on life_messages (recipient) where recipient is not null;

alter table life_messages enable row level security;

-- Posts a message. Returns { id, at } or { error }.
create or replace function life_send_message(p_token uuid, p_to uuid, p_body text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me life_students;
  v_body text := trim(regexp_replace(coalesce(p_body, ''), '[[:cntrl:]]', ' ', 'g'));
  v_row life_messages;
begin
  select * into v_me from life_students where session_token = p_token and p_token is not null;
  if not found then
    return json_build_object('error', 'signed_out');
  end if;
  if char_length(v_body) = 0 then
    return json_build_object('error', 'empty');
  end if;
  v_body := left(v_body, 300);
  if p_to is not null and not exists (
    select 1 from life_students where id = p_to and class_id = v_me.class_id and id <> v_me.id
  ) then
    return json_build_object('error', 'not_found');
  end if;
  -- Slow down spam: at most 8 messages in 20 seconds.
  if (select count(*) from life_messages where sender = v_me.id and created_at > now() - interval '20 seconds') >= 8 then
    return json_build_object('error', 'too_fast');
  end if;
  insert into life_messages (class_id, sender, recipient, body)
  values (v_me.class_id, v_me.id, p_to, v_body)
  returning * into v_row;
  return json_build_object('id', v_row.id, 'at', floor(extract(epoch from v_row.created_at) * 1000));
end;
$$;

-- The latest school messages plus my private conversations (oldest first).
create or replace function life_messages_for(p_token uuid)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_me life_students;
begin
  select * into v_me from life_students where session_token = p_token and p_token is not null;
  if not found then
    return json_build_object('error', 'signed_out');
  end if;
  return json_build_object('messages', coalesce((
    select json_agg(m order by m.id)
    from (
      select msg.id, msg.sender as "from", s.display_name as "fromName", msg.recipient as "to", msg.body,
             floor(extract(epoch from msg.created_at) * 1000) as at
      from life_messages msg
      join life_students s on s.id = msg.sender
      where msg.class_id = v_me.class_id
        and (msg.recipient is null or msg.recipient = v_me.id or msg.sender = v_me.id)
      order by msg.id desc
      limit 150
    ) m
  ), '[]'::json));
end;
$$;

revoke all on function life_send_message(uuid, uuid, text) from public;
revoke all on function life_messages_for(uuid) from public;
grant execute on function life_send_message(uuid, uuid, text) to anon, authenticated;
grant execute on function life_messages_for(uuid) to anon, authenticated;
