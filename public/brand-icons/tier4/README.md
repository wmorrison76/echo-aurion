# Tier 4 — UI / system icons (drop zone)

Drop commissioned PNGs here using the exact filenames below — no code
changes required. The resolver in `client/lib/tier4-icons.tsx` will
pick them up automatically on next page load.

## Required filenames (case-sensitive)

| File              | Replaces (lucide)     | Used for                          |
|-------------------|-----------------------|-----------------------------------|
| `Settings.png`    | `<Settings />`        | gear / preferences                |
| `Notifications.png` | `<Bell />`          | bell / inbox                      |
| `Search.png`      | `<Search />`          | magnifier                         |
| `Logout.png`      | `<LogOut />`          | sign-out                          |
| `Filter.png`      | `<Filter />`          | funnel                            |
| `Sort.png`        | `<ArrowUpDown />`     | sort toggle                       |
| `Export.png`      | `<Download />`        | export / download                 |
| `Refresh.png`     | `<RefreshCw />`       | reload                            |
| `Help.png`        | `<HelpCircle />`      | help / `?`                        |
| `Add.png`         | `<Plus />`            | create / `+`                      |
| `Edit.png`        | `<Pencil />`          | edit / pencil                     |
| `Delete.png`      | `<Trash2 />`          | delete / trash                    |
| `Close.png`       | `<X />`               | dismiss / `×`                     |
| `More.png`        | `<MoreHorizontal />`  | overflow / `…`                    |

## Visual spec
- 24 × 24 viewport, transparent background
- Gold-on-black aesthetic matching Tier 1/2/3
- Optical-aligned (the resolver renders inline-block, vertical-align: middle)
- PNG-32 with alpha · ≤ 4 KB per file preferred

## Verification

After dropping a file:
```
curl -I https://<preview-host>/brand-icons/tier4/Settings.png
# expect HTTP 200
```

The resolver does HEAD-request existence checks at first render and
caches the result, so a single reload picks up new assets across the
app.

## Brief / source spec

See `docs/UX_ICON_SYSTEM.md` § "Tier 4 system icons" for the full
illustrator brief.
