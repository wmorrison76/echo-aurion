"""
D54 · Invoice extractor tests.

Validates extract_invoice() against real OCR'd invoice fixtures
saved at backend/tests/fixtures/invoices/. Each fixture is a real
OCR output from the 91-invoice training corpus the user provided
on 2026-05-07.

Run:
    cd backend && python tests/test_invoice_extractor.py
"""
from __future__ import annotations
import os
import sys
import types


def _install_harness():
    if "_invoice_test_harness" in sys.modules:
        return
    fake_fastapi = types.ModuleType("fastapi")
    class APIRouter:
        def __init__(self, *a, **kw): self.prefix=kw.get("prefix","")
        def get(self,*a,**kw):
            def deco(f): return f
            return deco
        def post(self,*a,**kw):
            def deco(f): return f
            return deco
    class HTTPException(Exception):
        def __init__(self,c,d=""): self.status_code=c; self.detail=d
    def Header(default=None): return default
    fake_fastapi.APIRouter=APIRouter; fake_fastapi.HTTPException=HTTPException; fake_fastapi.Header=Header
    sys.modules["fastapi"]=fake_fastapi

    fake_pyd=types.ModuleType("pydantic")
    class BaseModel:
        def __init__(self,**kw):
            for k,v in kw.items(): setattr(self,k,v)
    def Field(default=None,**kw): return default
    fake_pyd.BaseModel=BaseModel; fake_pyd.Field=Field
    sys.modules["pydantic"]=fake_pyd

    fake_db=types.ModuleType("database")
    class FakeColl:
        def __init__(self): self.rows=[]
        def insert_one(self,d): self.rows.append(d)
    fake_db.db=type("D",(),{"__getitem__":lambda s,k: FakeColl()})()
    sys.modules["database"]=fake_db

    pkg_echo = types.ModuleType("echo")
    pkg_echo.__path__ = [os.path.abspath(os.path.join(
        os.path.dirname(__file__), "..", "echo"))]
    sys.modules["echo"]=pkg_echo

    sys.modules["_invoice_test_harness"]=types.ModuleType("_marker")


def _load_extractor():
    import importlib.util
    base = os.path.dirname(__file__)
    spec = importlib.util.spec_from_file_location(
        "echo.invoice_extractor",
        os.path.join(base, "..", "echo", "invoice_extractor.py"))
    m = importlib.util.module_from_spec(spec)
    sys.modules["echo.invoice_extractor"] = m
    spec.loader.exec_module(m)
    return m


def _read_fixture(name: str) -> str:
    base = os.path.dirname(__file__)
    path = os.path.join(base, "fixtures", "invoices", name)
    with open(path) as f:
        return f.read()


def test_mr_greens():
    _install_harness()
    ie = _load_extractor()
    text = _read_fixture("mr_greens_sample.txt")
    r = ie.extract_invoice(text)
    assert r["vendor_key"] == "mr_greens", \
        f"expected mr_greens, got {r['vendor_key']}"
    assert r["invoice_number"] is not None
    assert r["overall_confidence"] >= 0.7
    return f"PASS · Mr Greens vendor recognized · invoice #{r['invoice_number']}"


def test_waste_management():
    _install_harness()
    ie = _load_extractor()
    text = _read_fixture("waste_management_sample.txt")
    r = ie.extract_invoice(text)
    assert r["vendor_key"] == "waste_management"
    assert r["invoice_number"] == "2460417-2237-1"
    return f"PASS · Waste Management · #{r['invoice_number']}"


def test_2j_logistics():
    _install_harness()
    ie = _load_extractor()
    text = _read_fixture("2j_logistics_sample.txt")
    r = ie.extract_invoice(text)
    assert r["vendor_key"] == "2j_logistics"
    assert r["total_amount"] == 5000.00, \
        f"expected 5000, got {r['total_amount']}"
    return f"PASS · 2J Logistics · ${r['total_amount']}"


def test_amazon_tpc():
    _install_harness()
    ie = _load_extractor()
    text = _read_fixture("amazon_tpc_sample.txt")
    r = ie.extract_invoice(text)
    assert r["vendor_key"] == "amazon_tpc"
    return f"PASS · Amazon TPC · #{r['invoice_number']}"


def test_unknown_vendor_graceful():
    """Unknown vendor should not crash; returns vendor_key=None."""
    _install_harness()
    ie = _load_extractor()
    r = ie.extract_invoice(
        "INVOICE #12345\nTotal Due: $42.00\nDate: 5/1/2026")
    # Vendor unknown but fields still extracted
    assert r["invoice_number"] == "12345"
    assert r["total_amount"] == 42.00
    return "PASS · unknown vendor graceful (fields still extracted)"


def test_corpus_calibration_metadata():
    """Sanity check on the template library size after D54.2 expansion."""
    _install_harness()
    ie = _load_extractor()
    assert len(ie.VENDOR_TEMPLATES) >= 60, \
        f"expected ≥60 vendor templates, got {len(ie.VENDOR_TEMPLATES)}"
    return f"PASS · {len(ie.VENDOR_TEMPLATES)} vendor templates loaded"


TESTS = [
    test_mr_greens,
    test_waste_management,
    test_2j_logistics,
    test_amazon_tpc,
    test_unknown_vendor_graceful,
    test_corpus_calibration_metadata,
]


if __name__ == "__main__":
    passes = failures = 0
    print("=" * 60)
    print("  D54 invoice extractor tests")
    print("=" * 60)
    for t in TESTS:
        sys.modules.pop("_invoice_test_harness", None)
        sys.modules.pop("database", None)
        sys.modules.pop("fastapi", None)
        sys.modules.pop("pydantic", None)
        try:
            print(f"  {t()}")
            passes += 1
        except Exception as e:
            print(f"  FAIL · {t.__name__}: {e}")
            failures += 1
    print("=" * 60)
    print(f"  {passes}/{len(TESTS)} passed · {failures} failed")
    print("=" * 60)
    sys.exit(failures)
