"""
Echo AI³ memory substrate.

Per the Echo AI³ Integrated Technical Specification (§3.1), Echo's
memory is an append-only event log. This package owns the writer,
the reader, and the contract enforcement (Tenet 2/7/8, voice register,
tenant isolation).

What's in here:
  events.py       — append-only writer + retrieval API
  registers.py    — voice register validation
"""
