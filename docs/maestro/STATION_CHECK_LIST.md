# Station Check List

> What every chef walks through before firing each plate. *The discipline of did-I-prepare-or-am-I-just-hoping.*

## Before service starts (every shift)

Walk through this once at the start of each session. Ten minutes. Do not skip.

- [ ] I have read `THE_LINE.md` and remember which apron I am putting on
- [ ] I have read `PRIVACY_TENETS.md` — the eight tenets are present in my mind
- [ ] I have read my station document in `STATIONS/` — I know what is mine and what is not
- [ ] I have read the current `THE_MENU.md` — I know where the recipes live
- [ ] I have my order tickets for the shift (or I know where to find them)
- [ ] My local environment is mise en place (dependencies installed, types compiling, tests runnable)
- [ ] If anything has changed since my last shift, I know what changed (read the ledger)

If any of those is false, you are not ready to tie your apron. Fix it first.

## Before firing each plate (every implementation)

- [ ] I have re-read the file header for the file I am about to implement
- [ ] I have re-read every file in `Depends on:` of that header
- [ ] The pending checklist in the file header is clear to me
- [ ] I understand which tenets apply to this work
- [ ] I know what *done* looks like for this station (see my station doc)
- [ ] I know what *send-back* looks like (when the pass will return the plate)
- [ ] My tests are written or scoped *before* I implement (or I have a clear reason for the order)

## Tasting before sending to the pass

This is the part most often skipped. *Do not skip it.*

- [ ] Type check passes (`tsc --noEmit`)
- [ ] Tests pass (the ones I wrote and the ones that already existed)
- [ ] I have run the affected user-flow myself, end to end (not just the unit tests)
- [ ] I have re-read my own work as if I were the pass — does this match the standard?
- [ ] I have updated the file header: pending items `[x]`, status moved (STUB → PARTIAL → IMPLEMENTED if all done)
- [ ] I have not modified anything outside my station's authority (see station doc)
- [ ] My commit message follows the convention (`feat(layer): ...`, `test(privacy): ...`)
- [ ] I have written a one-paragraph note for the pass explaining: what I did, what I decided, what I want them to look at carefully

If any of those is false, *the plate does not leave the station*. Fix it first.

## After the pass reviews

The pass will either fire it through (merge) or send it back. If sent back:

- [ ] *Yes, Chef.* No explanation. No justification. *Yes, Chef.*
- [ ] Read the send-back note carefully
- [ ] Fix the issue
- [ ] Re-run the tasting checklist above
- [ ] Re-fire

## End of shift

- [ ] All my tickets either fired through or returned with notes
- [ ] My file headers are up to date (status, pending checkboxes)
- [ ] My commits are pushed
- [ ] Anything I learned today that changes the menu has been raised to the pass for tomorrow's prep
- [ ] If I had a bad shift, I have written a short, honest note in the ledger about what went wrong and how I will avoid it tomorrow

---

> *"The check list is not for the chefs who don't know what they're doing. It is for the chefs who do."*
