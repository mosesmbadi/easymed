# announcement — internal channels and announcements

`backend/announcement/` · mounted at `/announcement/`

A simple internal noticeboard: channels, posts in channels, and comments on
posts.

## Models

| Model | Fields |
| --- | --- |
| `Channel` | `name`, `photo` |
| `Announcement` | `title`, `content`, `created_by`, `created_at`, `channel`, `file` |
| `Comment` | `title`, `content`, `created_by`, `created_at`, `announcement`, `file` |

Uploads go to `announcements/channel/`, `announcements/file/` and
`announcements/comments/` under `MEDIA_ROOT`.

## Endpoints

| Path | ViewSet |
| --- | --- |
| `channels/` | `ChannelViewset` |
| `announcements/` | `AnnouncementViewset` |
| `comments/` | `CommentViewset` |

All three allow doctor, nurse or labtech roles (and superusers).

## Frontend

`/dashboard/announcements` and `/dashboard/announcements/channel/[channel_name]`,
plus `/account/announcements`. Permission `CAN_ACCESS_ANNOUNCEMENT_DASHBOARD`.

## Known issues

- `title` and `content` are `CharField(max_length=45)`; an announcement body is
  limited to 45 characters.
- Receptionists, pharmacists and sysadmins (non-superuser) are refused by the
  API even if their group grants the announcements page.
- Serializers live in `serializeers.py` (typo).
