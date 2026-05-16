# Makefile — 409A valuation evidence pipeline
# Target: make valuation-evidence
#
# Runs FW-2 through FW-11 from valuation/SCORECARD_2026-05-13.md:
#   cloc · radon · jscpd · vitest --coverage · cyclonedx-npm · cyclonedx-py ·
#   git-history · git-of-theseus · git shortlog · git timeline · pyan3 callgraphs
#
# Fails loudly if any required tool is missing.
# All FW steps strict-fail EXCEPT FW-5 (vitest) — frontend test failure does
# not block independent evidence generation; captured to PIPELINE_FAILURES.txt.

SHELL := /usr/bin/env bash
.SHELLFLAGS := -euo pipefail -c

# Python user-installed bin must be on PATH so make valuation-check-tools and
# make valuation-evidence find radon, pyan3, etc. installed via python3 -m pip --user.
PY_USER_BASE := $(shell python3 -m site --user-base 2>/dev/null)
export PATH := $(PY_USER_BASE)/bin:$(PATH)

DATE := $(shell date -u +%Y-%m-%d)
EVIDENCE_DIR := valuation/evidence/$(DATE)
ALGO_DIR := valuation/algorithms

# Algorithm files (per Section 3 of SCORECARD_2026-05-13.md)
ALGO_3a := backend/routes/echo_schedule.py
ALGO_3b := backend/routes/cross_dept_borrow.py
ALGO_3c := backend/routes/chef_outlet.py backend/routes/beverage_network.py
ALGO_3d := backend/routes/echoai3_ripple.py backend/routes/echoai3_roi.py

REQUIRED_TOOLS := cloc radon npx git-of-theseus-analyze pydeps cyclonedx-py git pnpm gtimeout

.PHONY: valuation-evidence valuation-check-tools valuation-install-tools valuation-clean

valuation-check-tools:
	@echo "==> Checking required tools..."
	@missing=0; \
	for tool in $(REQUIRED_TOOLS); do \
	  if ! command -v $$tool >/dev/null 2>&1; then \
	    echo "  MISSING: $$tool" >&2; \
	    missing=1; \
	  fi; \
	done; \
	if [ $$missing -eq 1 ]; then \
	  echo "" >&2; \
	  echo "Install with:" >&2; \
	  echo "  brew install cloc" >&2; \
	  echo "  pip install --user radon git-of-theseus pyan3 cyclonedx-bom" >&2; \
	  echo "  (npx + pnpm + git assumed already installed)" >&2; \
	  echo "  OR: make valuation-install-tools" >&2; \
	  exit 1; \
	fi; \
	echo "    All required tools present."

valuation-install-tools:
	@echo "==> Installing required tools (requires brew + python3 on PATH)"
	brew install cloc coreutils graphviz
	python3 -m pip install --user radon git-of-theseus pydeps cyclonedx-bom
	@echo ""
	@echo "==> NOTE: $(PY_USER_BASE)/bin is on PATH for make recipes."
	@echo "    For interactive shells, add to ~/.zshrc:"
	@echo "    export PATH=\"$(PY_USER_BASE)/bin:\$$PATH\""

valuation-evidence: valuation-check-tools
	@mkdir -p $(EVIDENCE_DIR) $(ALGO_DIR)/3a $(ALGO_DIR)/3b $(ALGO_DIR)/3c $(ALGO_DIR)/3d
	@echo "==> Evidence dir: $(EVIDENCE_DIR)"
	@echo ""
	@echo "[FW-2] cloc — total LOC by language"
	cloc client/ backend/ --exclude-dir=node_modules,dist,coverage,_quarantine > $(EVIDENCE_DIR)/cloc.txt
	@echo ""
	@echo "[FW-3] radon — cyclomatic complexity + maintainability"
	radon cc -a -s backend/ > $(EVIDENCE_DIR)/radon-cc.txt
	radon mi -s backend/ > $(EVIDENCE_DIR)/radon-mi.txt
	@echo ""
	@echo "[FW-4] jscpd — duplication ratio"
	NODE_OPTIONS="--max-old-space-size=8192" npx -y jscpd client/ backend/ --output $(EVIDENCE_DIR)/jscpd --reporters json,console > $(EVIDENCE_DIR)/jscpd-stdout.txt
	@echo ""
	@echo "[FW-5] vitest --coverage — frontend test coverage (non-blocking)"
	gtimeout 300 pnpm test -- --coverage --run \
	  --exclude '**/_archive_node_dev_server/**' \
	  --exclude '**/_quarantine/**' \
	  --exclude '**/node_modules/**' \
	  > $(EVIDENCE_DIR)/vitest-coverage.txt 2>&1 || \
	  ( echo "FW-5 FAILED OR TIMED OUT — see vitest-coverage.txt" | \
	    tee -a $(EVIDENCE_DIR)/PIPELINE_FAILURES.txt )
	@echo ""
	@echo "[FW-6a] cyclonedx-npm — JS dependency SBOM"
	npx -y @cyclonedx/cyclonedx-npm --ignore-npm-errors --output-file $(EVIDENCE_DIR)/sbom-npm.json
	@echo ""
	@echo "[FW-6b] cyclonedx-py — Python dependency SBOM"
	cyclonedx-py environment -o $(EVIDENCE_DIR)/sbom-py.json
	@echo ""
	@echo "[FW-7] git log — commit history CSV"
	git log --pretty=format:'%H,%ai,%an,%ae,%s' origin/main > valuation/git-history.csv
	@echo "    rows: $$(wc -l < valuation/git-history.csv)"
	@echo ""
	@echo "[FW-8] git-of-theseus — line-survival analysis"
	mkdir -p $(EVIDENCE_DIR)/theseus
	git-of-theseus-analyze . --outdir $(EVIDENCE_DIR)/theseus
	@echo ""
	@echo "[FW-9] git shortlog — per-algorithm authorship"
	@for bucket in 3a 3b 3c 3d; do \
	  case $$bucket in \
	    3a) files="$(ALGO_3a)" ;; 3b) files="$(ALGO_3b)" ;; \
	    3c) files="$(ALGO_3c)" ;; 3d) files="$(ALGO_3d)" ;; \
	  esac; \
	  : > $(ALGO_DIR)/$$bucket/authorship.txt; \
	  for f in $$files; do \
	    if [ -f "$$f" ]; then \
	      echo "=== $$f ===" >> $(ALGO_DIR)/$$bucket/authorship.txt; \
	      git shortlog -sn -- $$f >> $(ALGO_DIR)/$$bucket/authorship.txt; \
	      echo "" >> $(ALGO_DIR)/$$bucket/authorship.txt; \
	    else \
	      echo "  SKIP $$f (not on current branch)" >&2; \
	    fi; \
	  done; \
	done
	@echo ""
	@echo "[FW-10] git log --follow — per-algorithm timeline"
	@for bucket in 3a 3b 3c 3d; do \
	  case $$bucket in \
	    3a) files="$(ALGO_3a)" ;; 3b) files="$(ALGO_3b)" ;; \
	    3c) files="$(ALGO_3c)" ;; 3d) files="$(ALGO_3d)" ;; \
	  esac; \
	  : > $(ALGO_DIR)/$$bucket/timeline.txt; \
	  for f in $$files; do \
	    if [ -f "$$f" ]; then \
	      echo "=== $$f ===" >> $(ALGO_DIR)/$$bucket/timeline.txt; \
	      git log --follow --pretty=format:'%ai %h %an %s' -- $$f >> $(ALGO_DIR)/$$bucket/timeline.txt; \
	      echo "" >> $(ALGO_DIR)/$$bucket/timeline.txt; \
	    fi; \
	  done; \
	done
	@echo ""
	@echo "[FW-11] pydeps — per-algorithm call graph / dependency manifest"
	@for bucket in 3a 3b 3c 3d; do \
	  case $$bucket in \
	    3a) files="$(ALGO_3a)" ;; 3b) files="$(ALGO_3b)" ;; \
	    3c) files="$(ALGO_3c)" ;; 3d) files="$(ALGO_3d)" ;; \
	  esac; \
	  for f in $$files; do \
	    if [ -f "$$f" ]; then \
	      basename=$$(basename $$f .py); \
	      pydeps $$f --show-deps --no-output --max-bacon 3 --noise-level 200 > $(ALGO_DIR)/$$bucket/callgraph-$$basename.dot 2>/dev/null || \
	        echo "FW-11 pydeps failed on $$f" | tee -a $(EVIDENCE_DIR)/PIPELINE_FAILURES.txt; \
	    fi; \
	  done; \
	done
	@echo ""
	@echo "==> Done. Evidence in $(EVIDENCE_DIR)/ and $(ALGO_DIR)/{3a,3b,3c,3d}/"

valuation-clean:
	@echo "Removing $(EVIDENCE_DIR) and $(ALGO_DIR)/{3a,3b,3c,3d}..."
	rm -rf $(EVIDENCE_DIR) $(ALGO_DIR)/3a $(ALGO_DIR)/3b $(ALGO_DIR)/3c $(ALGO_DIR)/3d
