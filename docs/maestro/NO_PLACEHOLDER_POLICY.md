# No Placeholder Policy

> *We don't send out food we wouldn't eat.*

## The rule

Every plate that leaves this kitchen is real. Real production code. Real config. Real manifest. Real test that runs against real services.

What is *not* allowed:

- Functions that "look complete" but have placeholder internals
- "Coming soon" logic dressed up as production
- Files that compile but do nothing meaningful at runtime
- Tests that are stubbed and pass trivially without exercising real behavior
- Migrations that "should work" but have not been run against a real database
- UI components that render in Storybook but break on real data
- Routes that return 200 with hardcoded fake responses

What *is* allowed (and required, where appropriate):

- **Scaffolding stubs**, *clearly marked* with `Status: SCAFFOLD` or `Status: STUB` headers and `throw new Error('Not implemented (Phase N)')` bodies. These are not "fake completed" — they are *honestly incomplete*. The header tells you so.
- **Optional future enhancements**, clearly marked as outside the install path, in their own folder, with their own status indicating they are aspirational.
- **Test stubs as `it.todo(...)`**, which Jest/Vitest reports as todo, not as passing.
- **Real implementations that have known limitations**, where the limitations are documented in the file header under a "Known limitations" section. *Honest gaps are fine. Hidden gaps are forbidden.*

## The distinction that matters

There is a real difference between:

> **Scaffolding** — *I know this isn't done, you know this isn't done, the header says so, the function throws.*

and

> **Placeholder slop** — *This looks like it works. The function returns something. The test passes. But the test passes because the function returns a hardcoded value, not because it computes anything. Six months from now, someone is going to find this and rage-quit.*

The first is fine and necessary. The second is forbidden.

The way to tell them apart is the **honesty test**: *if a developer reads this code in six months, will they correctly understand its state?* A SCAFFOLD-status file with `throw new Error('Not implemented')` passes the test — they will know it is not implemented. A function that returns a fake-but-plausible value with no indication that it is fake fails the test — they will think it works and they will be wrong.

## How this applies to AI-generated code specifically

This is the failure mode that earned this policy its sharpness. AI tools can produce code that *looks* complete in a way human-authored placeholders rarely do. The function has a body. It has reasonable-looking variable names. It returns a plausible value. *And it is fake.*

Every chef de partie reviewing AI-generated work asks:

1. Did the function actually compute the result, or did it return a hardcoded value?
2. Are the tests testing actual behavior, or are they testing that the function returns the hardcoded value?
3. If I removed every `return` statement and ran the tests, would they fail correctly, or would they still pass?
4. Are the imports actually used? Or are they decoration?
5. If I called this function from production, would it work, or would it look like it worked?

If any of those answers is wrong, *the plate does not fire*. The chef de partie sends it back to themselves, fixes it, and re-tastes.

## What gets caught at the pass

The pass's review specifically looks for placeholder slop. The pass is *trained* to be skeptical. The pass asks the chef de partie: *show me the test that fails if I delete this implementation.* If no such test exists, the implementation is suspect. The pass will demand a real test.

The fresh-eyes pass at end of shift goes through every file that was marked IMPLEMENTED that day and runs them in production-like conditions. Anything that fails because of placeholder slop gets sent back, and the chef de partie gets a quiet word from the pass about the policy.

## Why this is non-negotiable

You have been burned before. The user who built this kitchen has been burned before. *We are not going to do that to ourselves again.*

The cost of placeholder slop is not the time to fix it later. The cost is the *trust loss*. Once a developer learns that the codebase has fake implementations dressed as real ones, they cannot trust *any* implementation without re-verifying it. The whole codebase becomes suspect. That is a worse outcome than slow delivery.

We ship slower than competitors who tolerate slop. We ship more honestly. *That is the trade we are making and we are making it on purpose.*

---

> *"We don't send out food we wouldn't eat. We don't ship code we wouldn't trust."*
