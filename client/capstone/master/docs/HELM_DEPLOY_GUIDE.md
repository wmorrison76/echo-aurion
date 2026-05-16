# Helm Deploy Guide — Echo Capstone

## Render manifests (no cluster changes)
```bash
bash scripts/helm_render.sh
kubectl apply -f k8s-rendered/all.yaml --dry-run=server
```

## Install/upgrade with Helm
```bash
helm upgrade --install echo ./helm/echo-capstone       --namespace echo-capstone --create-namespace       --set image.repository=echo-capstone       --set image.tag=latest       --set ingress.hosts[0].host=echo-capstone.local
```

## Package chart via CI
- Trigger the **Helm Package** workflow and provide chart/app versions.
- Download the chart artifact from the workflow run.
