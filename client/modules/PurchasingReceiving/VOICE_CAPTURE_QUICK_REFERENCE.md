# Voice Inventory Capture - Quick Reference

## What Changed?

The Voice Inventory Capture system has been completely redesigned to be **faster, smarter, and require zero approvals**.

### Before vs. After

| Feature | Before | After |
|---------|--------|-------|
| Display speed | 2-3s per item | Instant |
| Requires approval | Yes | No |
| Location matching | No | Yes (with correction) |
| Undo support | No | Yes |
| Performance with 1000+ items | Laggy | Smooth |
| Auto-commits data | No | Yes |
| Handles typos | No | Yes (walkin→Walk-in Cooler) |

## How to Use

### Start Voice Capture
1. Go to **Inventory → Voice Inventory Capture**
2. Click **Start** button
3. Grant microphone permission (first time only)
4. Speak naturally!

### What to Say
Just speak like you normally would:
- "3 cases tomatoes"
- "6 pounds chicken in the walk-in cooler"
- "2 dozen eggs, freezer"
- "4 boxes oil, dry storage"

### System Understands
✓ Quantities: 3, 6.5, "2 and 1/2", etc.
✓ Units: cases, boxes, pounds, lbs, kg, gallons, liters, dozen, etc.
✓ Locations: walk-in cooler, dry storage, freezer, bar, etc.
✓ Mistakes: "walkin" → "Walk-in Cooler", "freezer room" → "Walk-in Freezer"

### Manual Entry
If voice doesn't work:
1. Paste or type text in "Manual entry" box
2. Click "Parse & Capture"
3. Works exactly like voice

### Undo Last Capture
Click **Undo** button to remove the last captured item (appears after first capture)

### Clear All
Click **Clear** button to remove all captures from this session

## Natural Language Examples

### Perfect Inputs
```
"Add 3 cases tomatoes in dry storage"
→ Item: Tomatoes, Qty: 3, Unit: case, Location: Dry Storage ✓

"6 lbs of chicken breast in the walk-in cooler"
→ Item: Chicken Breast, Qty: 6, Unit: lb, Location: Walk-in Cooler ✓

"2 dozen eggs, freezer"
→ Item: Eggs, Qty: 2, Unit: each, Location: Freezer ✓

"1 case beer at the bar"
→ Item: Beer, Qty: 1, Unit: case, Location: Bar ✓
```

### With Typos (Still Works!)
```
"walkin said 4 boxes oil"
→ Item: Oil, Qty: 4, Unit: case, Location: Walk-in Cooler
   (Auto-corrects: walkin→Walk-in Cooler, boxes→case) ✓

"freezer room, 2 frozzen chickens"
→ Item: Chickens, Qty: 2, Unit: each, Location: Walk-in Freezer ✓

"3 kgs tomatoe in dry"
→ Item: Tomatoes, Qty: 3, Unit: kg, Location: Dry Storage ✓
```

## Feedback

### What You'll See

**Success Toast:**
```
✓ Captured
3 case of Tomatoes in Dry Storage
```

**Recent Captures List:**
```
3 case        Tomatoes • Dry Storage          42% confidence
6 lb          Chicken Breast • Walk-in Cooler 95% confidence
2 each        Eggs • Freezer                  88% confidence
```

**Error Toast:**
```
⚠️ Could not parse: xyz abc 123
```

## Tips & Tricks

### 1. Speak Clearly
The browser's speech recognition works best with clear audio.

### 2. Include Quantities
"3 cases" works better than just "tomatoes"

### 3. Mention Locations When Possible
"tomatoes in dry storage" better than "tomatoes"

### 4. Use Undo Liberally
Made a mistake? Just click Undo - super quick!

### 5. Mix Voice and Manual Entry
Speak fast items, paste text for complex ones

### 6. Let It Guess
System creates custom items if it can't match - edit later if needed

### 7. Check Recent Captures
Verify your items in the "Recent captures" list - they show confidence level

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Parse manual text | Ctrl+Enter (in manual entry box) |
| Stop listening | Click "Stop" or Esc key |
| Undo last | Click "Undo" button |
| Clear all | Click "Clear" button |

## Supported Locations (Default)

The system automatically recognizes these location names (and typos):

- **Walk-in Cooler** - walkin, walk in, cooler, walk-in cooler
- **Walk-in Freezer** - freezer, freeze room, walk-in freezer
- **Dry Storage** - dry, dry goods, dry store, pantry, storage
- **Bar** - bar, liquor, bottle rack, bar storage
- **Reach-in Cooler** - reach in, reach-in, reach cooler

*Ask your admin to add custom locations for your outlets*

## Supported Units (Default)

The system recognizes these units and normalizes them:

| Input | Normalized To |
|-------|---------------|
| cases, case, boxes, box | case |
| pounds, pound, lbs, lb | lb |
| kilograms, kilogram, kg | kg |
| ounces, ounce, oz | oz |
| gallons, gallon, gal | gal |
| liters, liter, l | l |
| each, ea, piece, pieces | each |
| dozen, dz | doz |
| pack, packs | pack |

## Troubleshooting

### "Speech recognition unavailable"
- Using Firefox? Enable speech recognition in browser settings
- Using Safari? Update to version 14.1+
- Using Chrome/Edge? Should work - check microphone permission

### "Could not parse: ..."
- Try saying it differently
- Include a quantity: "3 cases" instead of just "tomatoes"
- Mention location: "in dry storage"
- Use manual entry as fallback

### Item not in inventory
- Click back to Inventory page and verify item exists
- System auto-creates custom items if needed
- You can edit custom items later

### Wrong location matched
- Check location name spelling
- Verify location exists in inventory
- System auto-creates locations if they don't exist

### Voice not working on mobile
- Some mobile browsers don't support speech input
- Use manual text entry instead
- Works best on Chrome mobile

## Performance

| Metric | Performance |
|--------|-------------|
| Parse time | <100ms |
| Commit time | <50ms |
| Undo time | Instant |
| UI responsiveness | Smooth (60fps) |
| Offline support | Yes, full sync later |

## Data Flow

```
Voice/Text Input
    ↓
[Parse with NLP]
    ↓
[Match Item & Location]
    ↓
[Commit to Inventory]
    ↓
[Log for Audit]
    ↓
[Show Confirmation]
    ↓
Ready for next input
```

No manual approval needed!

## Going Offline

The system works offline:
1. Speak/type items as normal
2. Items captured locally
3. When internet returns, automatically syncs
4. No data loss!

## Confidence Levels

The system shows confidence for each capture:
- **95-100%** - Perfect match, item definitely correct
- **80-94%** - Good match, item very likely correct
- **60-79%** - Okay match, item probably correct
- **40-59%** - Weak match, system guessed
- **<40%** - Custom item created, check it

## Advanced Features

### View Audit Log
All voice captures are logged with:
- ✓ Exact transcript
- ✓ Parsed items
- ✓ User who captured
- ✓ Timestamp
- ✓ Outlet name

### Correct Mistakes Later
If you said the wrong item:
1. Click "Undo" immediately, OR
2. Edit in Inventory page later

## Batch Operations

### Capture Multiple Items
Just keep talking! System will:
- Listen to each phrase
- Parse and commit immediately
- Show toast for each one
- Keep list updated

### Check What You Said
Scroll the "Recent captures" list to see:
- Items captured
- Quantities
- Locations
- Confidence scores

## Browser Compatibility

| Browser | Support | Version |
|---------|---------|---------|
| Chrome | ✓ Full | 25+ |
| Chrome Mobile | ✓ Full | 25+ |
| Edge | ✓ Full | 79+ |
| Safari | ✓ Full | 14.1+ |
| Safari Mobile | ✓ Full | 14.1+ |
| Firefox | ✓ Limited | 25+ (need to enable) |
| IE | ✗ No | Not supported |

## Getting Help

1. **Check the "How to use" tips** - Shown in UI
2. **Try a different phrasing** - "3 cases tomatoes" vs "tomatoes, 3 cases"
3. **Use manual entry** - Paste text instead of voice
4. **Contact support** - Include what you tried to say

## Advanced: Custom Configuration

Your admin can customize:
- Location aliases (add more location names)
- Unit patterns (add custom units)
- Confidence threshold (how strict matching is)
- Voice recognition language

Ask your admin if you need these changed!

## Summary

**Old Way:** Voice → Review each item → Approve → Commit (Slow, manual)

**New Way:** Voice → Auto-commit → Done! (Fast, automatic)

🎉 You're ready! Start capturing inventory now!
