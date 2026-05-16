# Helm Guide — Echo Capstone

## Requirements
- Helm 3.8+
- Kubernetes cluster with nginx ingress

## Install
```bash
bash scripts/helm_install.sh 0.1.0
```

## Customize
- Override values: `helm upgrade --install echo-capstone helm/echo-capstone -f my-values.yaml`
- Common overrides: `replicaCount`, `image.tag`, `service.type`, `ingress.hosts`

## Release pipeline
- CI workflow `.github/workflows/helm-release.yml` packages chart
- Artifact uploaded as `helm-chart` in GitHub Actions
