begin;

-- Mock data restored from repository history.
-- auth_user_id is intentionally left null because real Supabase Auth user IDs
-- are not stored in the repo. Replace mailadress/auth_user_id as needed when
-- restoring real accounts.

insert into public."User" (
  id,
  auth_user_id,
  name,
  user_id,
  note,
  mailadress,
  icon_url,
  plan_status
) values
  (1, null, 'みな', 'mina_0415', '映画と夜カフェが好きです', 'mina_0415_restore@example.com', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=240&q=80', 'free'),
  (2, null, 'みお', 'mio_0214', '映画とカフェが好き', 'mio_0214_restore@example.com', null, 'free'),
  (3, null, 'れん', 'ren_0811', 'ランチのお店探し担当', 'ren_0811_restore@example.com', null, 'free'),
  (4, null, 'ゆな', 'yuna_1120', '夜ごはんに誘いやすい', 'yuna_1120_restore@example.com', null, 'free'),
  (5, null, 'そうた', 'sota_0703', 'ドライブ計画が得意', 'sota_0703_restore@example.com', null, 'free'),
  (6, null, 'はる', 'haru_0328', '休日はだいたい早起き派', 'haru_0328_restore@example.com', null, 'free'),
  (7, null, 'なぎ', 'nagi_0915', '展示やイベント巡りが好き', 'nagi_0915_restore@example.com', null, 'free'),
  (8, null, '山田 健太', 'kenta_0411', '仕事終わりのごはんに乗りやすい', 'kenta_0411_restore@example.com', null, 'free'),
  (9, null, '佐藤 颯', 'hayate_0415', '夜の予定が合わせやすい', 'hayate_0415_restore@example.com', null, 'free'),
  (10, null, '田中 美咲', 'misaki_0415', '展示やカフェに行くのが好き', 'misaki_0415_restore@example.com', null, 'free');

-- Friend pairs are stored in both directions to match the current RPC behavior.
insert into public."Friend" (
  id,
  owner_user_id,
  friend_user_id
) values
  (1, 1, 2),
  (2, 2, 1),
  (3, 1, 3),
  (4, 3, 1),
  (5, 1, 4),
  (6, 4, 1),
  (7, 1, 5),
  (8, 5, 1),
  (9, 1, 6),
  (10, 6, 1),
  (11, 1, 7),
  (12, 7, 1);

insert into public.events (
  id,
  user_id,
  start_date,
  end_date,
  title,
  start_time,
  end_time,
  category
) values
  (1, 1, '2026-04-01', null, '家計の見直し', '19:30', null, null),
  (2, 1, '2026-04-03', null, '美容院', '11:00', null, null),
  (3, 1, '2026-04-03', null, 'ドラッグストアで買い物', '18:30', null, null),
  (4, 1, '2026-04-12', null, '部屋の片付け', '10:00', null, null),
  (5, 1, '2026-04-12', null, 'ネイル予約', '14:00', null, null),
  (6, 1, '2026-04-14', null, '歯医者', '09:30', null, null),
  (7, 1, '2026-04-15', null, '在宅ワーク集中日', '09:00', null, null),
  (8, 1, '2026-04-15', null, 'ジム', '18:00', null, null),
  (9, 1, '2026-04-15', null, '夜に日記を書く', '22:00', null, null),
  (10, 1, '2026-04-17', null, '病院の定期受診', '15:30', null, null),
  (11, 1, '2026-04-20', null, '銀行手続き', '12:00', null, null),
  (12, 1, '2026-04-20', null, '資格勉強', '20:00', null, null),
  (13, 1, '2026-04-23', null, '皮膚科', '17:00', null, null),
  (14, 1, '2026-04-27', null, '洗濯機の掃除', '08:30', null, null),
  (15, 1, '2026-04-30', null, '月末の振り返り', '21:00', null, null),
  (16, 2, '2026-04-11', null, '映画の予定', '13:00', null, null),
  (17, 2, '2026-04-13', null, 'カフェ巡り', '15:00', null, null),
  (18, 2, '2026-04-16', null, '家族の予定', '18:00', null, null),
  (19, 3, '2026-04-12', null, 'ランチ予定', '12:00', null, null),
  (20, 3, '2026-04-15', null, '用事', '17:00', null, null),
  (21, 4, '2026-04-11', null, '買い物', '14:00', null, null),
  (22, 4, '2026-04-14', null, '夜ごはん', '19:00', null, null),
  (23, 4, '2026-04-16', null, '病院', '10:00', null, null),
  (24, 5, '2026-04-13', null, 'ゲーム会', '20:00', null, null),
  (25, 5, '2026-04-14', null, 'ドライブ', '09:00', null, null),
  (26, 5, '2026-04-17', null, '用事', '16:00', null, null);

insert into public.invites (
  id,
  from_user_id,
  to_user_id,
  date,
  message,
  status
) values
  (1, 1, 8, '2026-04-11', '仕事終わりに軽くごはん行かない？', 'sent'),
  (2, 9, 1, '2026-04-15', '水曜の夜、もし空いてたらごはん行こう！', 'request'),
  (3, 1, 10, '2026-04-15', '展示を見に行ったあとカフェもどう？', 'sent');

select setval(pg_get_serial_sequence('public."User"', 'id'), coalesce((select max(id) from public."User"), 1), true);
select setval(pg_get_serial_sequence('public."Friend"', 'id'), coalesce((select max(id) from public."Friend"), 1), true);
select setval(pg_get_serial_sequence('public.events', 'id'), coalesce((select max(id) from public.events), 1), true);
select setval(pg_get_serial_sequence('public.invites', 'id'), coalesce((select max(id) from public.invites), 1), true);

commit;
