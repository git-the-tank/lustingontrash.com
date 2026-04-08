# Wowaudit API Integration

## Authentication

- API key via `WOWAUDIT_API_KEY` env var
- Pass as `Authorization: <key>` header (no Bearer prefix) or `?api_key=<key>` query param
- Base URL: `https://wowaudit.com/v1`

## Endpoints We Need

### GET /v1/characters — Roster with roles

This is the primary endpoint. Returns all tracked characters with **role** and **rank** — data WCL doesn't provide.

```json
{
    "id": 4,
    "name": "Bexey",
    "realm": "Stormrage",
    "class": "Mage",
    "role": "Ranged",
    "rank": "Main",
    "status": "tracking",
    "note": null,
    "blizzard_id": 13345678,
    "tracking_since": "2024-10-01T19:51:31.000Z"
}
```

**Key fields for parseboard:**

| Field         | Type   | Values                                    | Use                                             |
| ------------- | ------ | ----------------------------------------- | ----------------------------------------------- |
| `id`          | number | —                                         | Wowaudit internal ID                            |
| `name`        | string | —                                         | Match to WCL character by name+realm            |
| `realm`       | string | —                                         | Match to WCL character by name+realm            |
| `class`       | string | e.g. "Mage", "Death Knight"               | Cross-check with WCL class                      |
| `role`        | string | `"Melee"`, `"Ranged"`, `"Heal"`, `"Tank"` | **Primary value — not in WCL**                  |
| `rank`        | string | `"Main"`, `"Trial"`, `"Social"`, `"Alt"`  | Roster rank (different from WCL guild rank int) |
| `status`      | string | `"tracking"`, `"pending"`                 | Filter to `tracking` only                       |
| `blizzard_id` | number | —                                         | Blizzard character ID                           |

## Other Endpoints (available but not needed yet)

- `POST /v1/characters` — Track a new character
- `PUT /v1/characters/{id}` — Update role/rank/note
- `DELETE /v1/characters/{id}` — Untrack a character
- `GET /v1/historical_data?period=N` — Weekly activity (dungeons, world quests, vault)
- `GET /v1/historical_data/{id}` — Single character history + best gear
- `GET /v1/wishlists` — Loot wishlists

## Integration Plan

Wowaudit is the **roster source of truth** for:

- Player **role** (Tank / Heal / Melee / Ranged)
- Player **rank** (Main / Trial / Social / Alt)

WCL remains the source of truth for:

- Character class (though wowaudit also has it)
- Combat logs and performance data
- WCL guild membership

### Matching strategy

Characters are matched between WCL and wowaudit by **name + realm** (case-insensitive). The realm in WCL is called `server`, in wowaudit it's `realm` — same value.

### Schema changes needed

Add to Character model:

- `role` — enum: Tank, Heal, Melee, Ranged (from wowaudit)
- `wowauditRank` — enum: Main, Trial, Social, Alt (from wowaudit)
- `wowauditId` — int, optional (wowaudit internal ID)
- `blizzardId` — bigint, optional (from wowaudit)
