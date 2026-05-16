package guardrails

default allow := false

allow {
  input.request.kind == "review"
  not violates_pr_only
  not violates_self_edit
}

violates_pr_only {
  not input.request.pr
}

violates_pr_only {
  some check in {"unit", "lint", "sast", "sbom", "license"}
  not input.request.checks[check]
}

violates_self_edit {
  input.request.author == "EchoBot"
  some file in input.request.files
  glob.match("**/auth/**", [], file)
}

violates_self_edit {
  input.request.author == "EchoBot"
  some file in input.request.files
  glob.match("**/ci/**", [], file)
}

violates_self_edit {
  input.request.author == "EchoBot"
  some file in input.request.files
  glob.match(".github/workflows/**", [], file)
}
