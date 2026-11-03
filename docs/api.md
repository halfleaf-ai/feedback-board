# API reference

All endpoints are served under `/api` and exchange JSON.

## Feedback

### `GET /api/feedback`

Lists feedback, newest first.

| Query | Description |
| --- | --- |
| `status` | One of `open`, `planned`, `closed` |
| `tag` | Only feedback carrying this tag |
| `page` | Zero-based page number, default `0` |
| `limit` | Page size, default `25` |

Returns an array of feedback items.

### `POST /api/feedback`

Creates feedback.

```json
{ "title": "Export to CSV", "customer": "Brightwave", "tags": ["export"] }
```

### `PUT /api/feedback/:id`

Replaces a feedback item's `status`, `owner` and `tags`.

### `DELETE /api/feedback/:id`

Deletes a feedback item.

## Digest

### `GET /api/digest?week=YYYY-MM-DD`

Returns the digest for the week starting on the given Sunday.
