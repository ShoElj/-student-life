-- Classmates can visit each other's rooms and compare progress on the leaderboard, so the roster
-- now includes each student's room (furniture and pet), XP, savings and sports stats. Nothing
-- else from the saved profile is shared.

create or replace function life_roster(p_token uuid)
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
  return json_build_object(
    'students', coalesce((
      select json_agg(json_build_object(
        'id', s.id,
        'name', s.display_name,
        'look', s.profile -> 'look',
        'home', s.profile -> 'home',
        'xp', s.profile -> 'xp',
        'savings', s.profile -> 'savings',
        'stats', s.profile -> 'stats'
      ) order by s.display_name)
      from life_students s
      where s.class_id = v_me.class_id and s.id <> v_me.id
    ), '[]'::json),
    'friendships', coalesce((
      select json_object_agg(case when f.a = v_me.id then f.b else f.a end, f.points)
      from life_friendships f
      where f.a = v_me.id or f.b = v_me.id
    ), '{}'::json)
  );
end;
$$;
