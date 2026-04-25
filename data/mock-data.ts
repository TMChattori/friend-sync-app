export type DateOption = {
  key: string;
  label: string;
  dayText: string;
};

export type User = {
  id: string;
  name: string;
  userId: string;
  avatarText: string;
  avatarImage?: string;
  hobby?: string;
  note: string;
  role: 'self' | 'friend';
};

export type Event = {
  id: string;
  userId: string;
  date: string;
  title: string;
  time: string;
  startTime?: string;
  endTime?: string;
  category?: string;
  memo: string;
};

export type FriendRelation = {
  id: string;
  ownerUserId: string;
  friendUserId: string;
  visibility: 'visible' | 'hidden';
};

export type Invite = {
  id: string;
  fromUserId: string;
  fromUserName?: string;
  toUserId: string;
  date: string;
  message: string;
  status: 'sent' | 'request' | 'friend_request_sent';
};

export type CalendarDay = {
  date: string;
  dayNumber: number;
  isCurrentMonth: boolean;
};

export type HomeFriendCard = {
  id: string;
  name: string;
  hobby: string;
  avatar: string;
};

export type FriendListItem = {
  id: string;
  name: string;
  note: string;
};

export type NotificationItem = {
  id: string;
  title: string;
  type: 'sent' | 'request';
  message: string;
};

export type Profile = {
  icon: string;
  name: string;
  userId: string;
  note: string;
};

export const SELF_USER_ID = 'mina';

export const DATE_OPTIONS: DateOption[] = [
  { key: '2026-04-11', label: '今日', dayText: '4/11 土' },
  { key: '2026-04-12', label: '明日', dayText: '4/12 日' },
  { key: '2026-04-13', label: '月', dayText: '4/13 月' },
  { key: '2026-04-14', label: '火', dayText: '4/14 火' },
  { key: '2026-04-15', label: '水', dayText: '4/15 水' },
  { key: '2026-04-16', label: '木', dayText: '4/16 木' },
  { key: '2026-04-17', label: '金', dayText: '4/17 金' },
];

export const WEEK_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

export const CALENDAR_DAYS: CalendarDay[] = [
  { date: '2026-03-29', dayNumber: 29, isCurrentMonth: false },
  { date: '2026-03-30', dayNumber: 30, isCurrentMonth: false },
  { date: '2026-03-31', dayNumber: 31, isCurrentMonth: false },
  { date: '2026-04-01', dayNumber: 1, isCurrentMonth: true },
  { date: '2026-04-02', dayNumber: 2, isCurrentMonth: true },
  { date: '2026-04-03', dayNumber: 3, isCurrentMonth: true },
  { date: '2026-04-04', dayNumber: 4, isCurrentMonth: true },
  { date: '2026-04-05', dayNumber: 5, isCurrentMonth: true },
  { date: '2026-04-06', dayNumber: 6, isCurrentMonth: true },
  { date: '2026-04-07', dayNumber: 7, isCurrentMonth: true },
  { date: '2026-04-08', dayNumber: 8, isCurrentMonth: true },
  { date: '2026-04-09', dayNumber: 9, isCurrentMonth: true },
  { date: '2026-04-10', dayNumber: 10, isCurrentMonth: true },
  { date: '2026-04-11', dayNumber: 11, isCurrentMonth: true },
  { date: '2026-04-12', dayNumber: 12, isCurrentMonth: true },
  { date: '2026-04-13', dayNumber: 13, isCurrentMonth: true },
  { date: '2026-04-14', dayNumber: 14, isCurrentMonth: true },
  { date: '2026-04-15', dayNumber: 15, isCurrentMonth: true },
  { date: '2026-04-16', dayNumber: 16, isCurrentMonth: true },
  { date: '2026-04-17', dayNumber: 17, isCurrentMonth: true },
  { date: '2026-04-18', dayNumber: 18, isCurrentMonth: true },
  { date: '2026-04-19', dayNumber: 19, isCurrentMonth: true },
  { date: '2026-04-20', dayNumber: 20, isCurrentMonth: true },
  { date: '2026-04-21', dayNumber: 21, isCurrentMonth: true },
  { date: '2026-04-22', dayNumber: 22, isCurrentMonth: true },
  { date: '2026-04-23', dayNumber: 23, isCurrentMonth: true },
  { date: '2026-04-24', dayNumber: 24, isCurrentMonth: true },
  { date: '2026-04-25', dayNumber: 25, isCurrentMonth: true },
  { date: '2026-04-26', dayNumber: 26, isCurrentMonth: true },
  { date: '2026-04-27', dayNumber: 27, isCurrentMonth: true },
  { date: '2026-04-28', dayNumber: 28, isCurrentMonth: true },
  { date: '2026-04-29', dayNumber: 29, isCurrentMonth: true },
  { date: '2026-04-30', dayNumber: 30, isCurrentMonth: true },
  { date: '2026-05-01', dayNumber: 1, isCurrentMonth: false },
  { date: '2026-05-02', dayNumber: 2, isCurrentMonth: false },
];

export const users: User[] = [
  {
    id: SELF_USER_ID,
    name: 'みな',
    userId: 'mina_0415',
    avatarText: 'M',
    avatarImage:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=240&q=80',
    note: '映画と夜カフェが好きです',
    role: 'self',
  },
  {
    id: 'mio',
    name: 'みお',
    userId: 'mio_0214',
    avatarText: 'M',
    hobby: '映画 / カフェ',
    note: '映画とカフェが好き',
    role: 'friend',
  },
  {
    id: 'ren',
    name: 'れん',
    userId: 'ren_0811',
    avatarText: 'R',
    hobby: 'ランチ / 散歩',
    note: 'ランチのお店探し担当',
    role: 'friend',
  },
  {
    id: 'yuna',
    name: 'ゆな',
    userId: 'yuna_1120',
    avatarText: 'Y',
    hobby: 'ショッピング / 夜ごはん',
    note: '夜ごはんに誘いやすい',
    role: 'friend',
  },
  {
    id: 'sota',
    name: 'そうた',
    userId: 'sota_0703',
    avatarText: 'S',
    hobby: 'ゲーム / ドライブ',
    note: 'ドライブ計画が得意',
    role: 'friend',
  },
  {
    id: 'haru',
    name: 'はる',
    userId: 'haru_0328',
    avatarText: 'H',
    note: '休日はだいたい早起き派',
    role: 'friend',
  },
  {
    id: 'nagi',
    name: 'なぎ',
    userId: 'nagi_0915',
    avatarText: 'N',
    note: '展示やイベント巡りが好き',
    role: 'friend',
  },
  {
    id: 'kenta',
    name: '山田 健太',
    userId: 'kenta_0411',
    avatarText: 'K',
    note: '仕事終わりのごはんに乗りやすい',
    role: 'friend',
  },
  {
    id: 'hayate',
    name: '佐藤 颯',
    userId: 'hayate_0415',
    avatarText: 'H',
    note: '夜の予定が合わせやすい',
    role: 'friend',
  },
  {
    id: 'misaki',
    name: '田中 美咲',
    userId: 'misaki_0415',
    avatarText: 'M',
    note: '展示やカフェに行くのが好き',
    role: 'friend',
  },
];

export const friends: FriendRelation[] = [
  { id: 'f-1', ownerUserId: SELF_USER_ID, friendUserId: 'mio', visibility: 'visible' },
  { id: 'f-2', ownerUserId: SELF_USER_ID, friendUserId: 'ren', visibility: 'visible' },
  { id: 'f-3', ownerUserId: SELF_USER_ID, friendUserId: 'yuna', visibility: 'visible' },
  { id: 'f-4', ownerUserId: SELF_USER_ID, friendUserId: 'sota', visibility: 'visible' },
  { id: 'f-5', ownerUserId: SELF_USER_ID, friendUserId: 'haru', visibility: 'visible' },
  { id: 'f-6', ownerUserId: SELF_USER_ID, friendUserId: 'nagi', visibility: 'visible' },
];

export const events: Event[] = [
  { id: 'self-1', userId: SELF_USER_ID, date: '2026-04-01', title: '家計の見直し', time: '19:30', memo: '今月の固定費を自分用メモに整理' },
  { id: 'self-2', userId: SELF_USER_ID, date: '2026-04-03', title: '美容院', time: '11:00', memo: '前髪カットも相談する' },
  { id: 'self-3', userId: SELF_USER_ID, date: '2026-04-03', title: 'ドラッグストアで買い物', time: '18:30', memo: '洗剤と日用品を補充' },
  { id: 'self-4', userId: SELF_USER_ID, date: '2026-04-12', title: '部屋の片付け', time: '10:00', memo: 'クローゼットを中心に1時間だけ進める' },
  { id: 'self-5', userId: SELF_USER_ID, date: '2026-04-12', title: 'ネイル予約', time: '14:00', memo: 'デザイン候補を事前に見ておく' },
  { id: 'self-6', userId: SELF_USER_ID, date: '2026-04-14', title: '歯医者', time: '09:30', memo: '保険証を忘れない' },
  { id: 'self-7', userId: SELF_USER_ID, date: '2026-04-15', title: '在宅ワーク集中日', time: '09:00', memo: '午前中に企画書の下書きを終える' },
  { id: 'self-8', userId: SELF_USER_ID, date: '2026-04-15', title: 'ジム', time: '18:00', memo: '脚トレ中心で45分' },
  { id: 'self-9', userId: SELF_USER_ID, date: '2026-04-15', title: '夜に日記を書く', time: '22:00', memo: '今日の気分を自分用にメモ' },
  { id: 'self-10', userId: SELF_USER_ID, date: '2026-04-17', title: '病院の定期受診', time: '15:30', memo: '質問したいことを先にまとめる' },
  { id: 'self-11', userId: SELF_USER_ID, date: '2026-04-20', title: '銀行手続き', time: '12:00', memo: '通帳と本人確認書類を持参' },
  { id: 'self-12', userId: SELF_USER_ID, date: '2026-04-20', title: '資格勉強', time: '20:00', memo: '問題集を2章ぶん進める' },
  { id: 'self-13', userId: SELF_USER_ID, date: '2026-04-23', title: '皮膚科', time: '17:00', memo: '薬の残りを確認しておく' },
  { id: 'self-14', userId: SELF_USER_ID, date: '2026-04-27', title: '洗濯機の掃除', time: '08:30', memo: '洗濯槽クリーナーを使う' },
  { id: 'self-15', userId: SELF_USER_ID, date: '2026-04-30', title: '月末の振り返り', time: '21:00', memo: '今月よかったことを3つ書く' },

  { id: 'mio-1', userId: 'mio', date: '2026-04-11', title: '映画の予定', time: '13:00', memo: '友達と映画館へ' },
  { id: 'mio-2', userId: 'mio', date: '2026-04-13', title: 'カフェ巡り', time: '15:00', memo: '新しいカフェに行く' },
  { id: 'mio-3', userId: 'mio', date: '2026-04-16', title: '家族の予定', time: '18:00', memo: '家族で夜ごはん' },
  { id: 'ren-1', userId: 'ren', date: '2026-04-12', title: 'ランチ予定', time: '12:00', memo: '同僚とランチ' },
  { id: 'ren-2', userId: 'ren', date: '2026-04-15', title: '用事', time: '17:00', memo: '役所の手続き' },
  { id: 'yuna-1', userId: 'yuna', date: '2026-04-11', title: '買い物', time: '14:00', memo: 'ショッピングモールへ' },
  { id: 'yuna-2', userId: 'yuna', date: '2026-04-14', title: '夜ごはん', time: '19:00', memo: '家族で外食' },
  { id: 'yuna-3', userId: 'yuna', date: '2026-04-16', title: '病院', time: '10:00', memo: '定期受診' },
  { id: 'sota-1', userId: 'sota', date: '2026-04-13', title: 'ゲーム会', time: '20:00', memo: '友達とオンラインゲーム' },
  { id: 'sota-2', userId: 'sota', date: '2026-04-14', title: 'ドライブ', time: '09:00', memo: '遠出の予定' },
  { id: 'sota-3', userId: 'sota', date: '2026-04-17', title: '用事', time: '16:00', memo: '実家に寄る' },
];

export const invites: Invite[] = [
  {
    id: 'invite-1',
    fromUserId: SELF_USER_ID,
    toUserId: 'kenta',
    date: '2026-04-11',
    message: '仕事終わりに軽くごはん行かない？',
    status: 'sent',
  },
  {
    id: 'invite-2',
    fromUserId: 'hayate',
    toUserId: SELF_USER_ID,
    date: '2026-04-15',
    message: '水曜の夜、もし空いてたらごはん行こう！',
    status: 'request',
  },
  {
    id: 'invite-3',
    fromUserId: SELF_USER_ID,
    toUserId: 'misaki',
    date: '2026-04-15',
    message: '展示を見に行ったあとカフェもどう？',
    status: 'sent',
  },
];

export function getUserById(userId: string) {
  return users.find((user) => user.id === userId);
}

export function getUserByPublicId(publicUserId: string) {
  return users.find((user) => user.userId.toLowerCase() === publicUserId.trim().toLowerCase());
}

export function getCurrentUserProfile(): Profile {
  const user = getUserById(SELF_USER_ID);
  return {
    icon: user?.avatarImage ?? '',
    name: user?.name ?? '',
    userId: user?.userId ?? '',
    note: user?.note ?? '',
  };
}

export function getEventsByUserId(userId: string) {
  return events.filter((event) => event.userId === userId);
}

export function getEventsByDate(userId: string, date: string) {
  return events.filter((event) => event.userId === userId && event.date === date);
}

export function getFriendUsers(ownerUserId = SELF_USER_ID): User[] {
  return friends
    .filter((relation) => relation.ownerUserId === ownerUserId && relation.visibility === 'visible')
    .map((relation) => getUserById(relation.friendUserId))
    .filter((user): user is User => Boolean(user));
}

export function getAvailableFriendCards(date: string): HomeFriendCard[] {
  return getFriendUsers()
    .filter((friend) => getEventsByDate(friend.id, date).length === 0)
    .map((friend) => ({
      id: friend.id,
      name: friend.name,
      hobby: friend.hobby ?? '予定はまだありません',
      avatar: friend.avatarText,
    }));
}

export function getFriendListItems(): FriendListItem[] {
  return getFriendUsers().map((friend) => ({
    id: friend.userId,
    name: friend.name,
    note: friend.note,
  }));
}

export function sendFriendRequestByPublicId(publicUserId: string) {
  const targetUser = getUserByPublicId(publicUserId);

  if (!targetUser || targetUser.id === SELF_USER_ID) {
    return { ok: false as const, reason: 'not_found' as const };
  }

  const alreadyFriend = friends.some(
    (relation) => relation.ownerUserId === SELF_USER_ID && relation.friendUserId === targetUser.id
  );

  if (alreadyFriend) {
    return { ok: false as const, reason: 'already_friend' as const, user: targetUser };
  }

  const alreadyRequested = invites.some(
    (invite) =>
      invite.status === 'friend_request_sent' &&
      invite.fromUserId === SELF_USER_ID &&
      invite.toUserId === targetUser.id
  );

  if (!alreadyRequested) {
    invites.unshift({
      id: `friend-request-${Date.now()}`,
      fromUserId: SELF_USER_ID,
      toUserId: targetUser.id,
      date: '2026-04-16',
      message: `${targetUser.name}に友達申請を送りました`,
      status: 'friend_request_sent',
    });
  }

  return { ok: true as const, user: targetUser, alreadyRequested };
}

export function addIncomingInviteRequest({
  fromUserId,
  fromUserName,
  date,
  message,
}: {
  fromUserId: string;
  fromUserName: string;
  date: string;
  message: string;
}) {
  invites.unshift({
    id: `incoming-invite-${Date.now()}`,
    fromUserId,
    fromUserName,
    toUserId: SELF_USER_ID,
    date,
    message,
    status: 'request',
  });
}

export function getNotificationItems(): NotificationItem[] {
  return invites.map((invite) => {
    const fromUser = getUserById(invite.fromUserId);
    const toUser = getUserById(invite.toUserId);
    const dateMeta = DATE_OPTIONS.find((date) => date.key === invite.date);
    const dateText = dateMeta?.dayText ?? invite.date;

    if (invite.status === 'request') {
      return {
        id: invite.id,
        title: `${fromUser?.name ?? invite.fromUserName ?? '友達'}から${dateText}のお誘い申請が来ました`,
        type: 'request',
        message: invite.message,
      };
    }

    if (invite.status === 'friend_request_sent') {
      return {
        id: invite.id,
        title: `${toUser?.name ?? '友達'}に友達申請を送りました`,
        type: 'sent',
        message: invite.message,
      };
    }

    return {
      id: invite.id,
      title: `${toUser?.name ?? '友達'}に${dateText}の誘いを送りました`,
      type: 'sent',
      message: invite.message,
    };
  });
}
