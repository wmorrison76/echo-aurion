import express, { Router, Request, Response } from "express";
import { getCacheService } from "../services/cacheService";

const router = Router();
const cache = getCacheService();

interface ModuleSpec {
  name: string;
  framework: string;
  dependencies: string[];
  port: number;
  database?: {
    type: string;
    name: string;
  };
  environment?: Record<string, string>;
}

async function generateDockerfile(spec: ModuleSpec): Promise<string> {
  const nodeVersion = "20-alpine";
  const framework = spec.framework.toLowerCase();

  let dockerContent = `FROM node:${nodeVersion}

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

ENV NODE_ENV=production
PORT=${spec.port}

EXPOSE ${spec.port}

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD node -e "require('http').get('http://localhost:${spec.port}/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

CMD ["npm", "start"]
`;

  if (framework === "react" || framework === "vite") {
    dockerContent = `FROM node:${nodeVersion} AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:${nodeVersion}

WORKDIR /app

RUN npm install -g serve

COPY --from=builder /app/dist ./dist

EXPOSE ${spec.port}

CMD ["serve", "-s", "dist", "-l", "${spec.port}"]
`;
  }

  return dockerContent;
}

async function generateDockerCompose(spec: ModuleSpec): Promise<string> {
  let composeContent = `version: '3.8'

services:
  app:
    build: .
    ports:
      - "${spec.port}:${spec.port}"
    environment:
      - NODE_ENV=production
      - PORT=${spec.port}
`;

  if (spec.environment) {
    composeContent +=
      "      - " +
      Object.entries(spec.environment)
        .map(([key, value]) => `${key}=${value}`)
        .join("\n      - ");
  }

  if (spec.database) {
    const dbPort = spec.database.type === "postgresql" ? 5432 : 27017;
    const dbName = spec.database.name || "appdb";

    composeContent += `
    depends_on:
      - database

  database:
    image: ${spec.database.type === "postgresql" ? "postgres:15-alpine" : "mongo:6"}
    environment:`;

    if (spec.database.type === "postgresql") {
      composeContent += `
      - POSTGRES_DB=${dbName}
      - POSTGRES_USER=appuser
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data`;
    } else {
      composeContent += `
      - MONGO_INITDB_DATABASE=${dbName}
    volumes:
      - mongo_data:/data/db`;
    }

    composeContent += `
    ports:
      - "${dbPort}:${dbPort}"

volumes:`;
    if (spec.database.type === "postgresql") {
      composeContent += `
  postgres_data:`;
    } else {
      composeContent += `
  mongo_data:`;
    }
  }

  return composeContent;
}

async function generateKubernetesDeployment(spec: ModuleSpec): Promise<string> {
  const name = spec.name.toLowerCase().replace(/\s+/g, "-");

  let k8sContent = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${name}-deployment
  labels:
    app: ${name}
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: ${name}
  template:
    metadata:
      labels:
        app: ${name}
    spec:
      containers:
      - name: ${name}
        image: ${name}:latest
        imagePullPolicy: Always
        ports:
        - containerPort: ${spec.port}
          name: http
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "${spec.port}"
`;

  if (spec.environment) {
    for (const [key, value] of Object.entries(spec.environment)) {
      k8sContent += `        - name: ${key}
          value: "${value}"
`;
    }
  }

  k8sContent += `        livenessProbe:
          httpGet:
            path: /health
            port: ${spec.port}
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health
            port: ${spec.port}
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - ${name}
              topologyKey: kubernetes.io/hostname

---
apiVersion: v1
kind: Service
metadata:
  name: ${name}-service
  labels:
    app: ${name}
spec:
  selector:
    app: ${name}
  ports:
  - protocol: TCP
    port: 80
    targetPort: ${spec.port}
    name: http
  type: LoadBalancer

---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ${name}-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ${name}-deployment
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
`;

  return k8sContent;
}

async function generateKubernetesConfigMap(spec: ModuleSpec): Promise<string> {
  const name = spec.name.toLowerCase().replace(/\s+/g, "-");

  let configContent = `apiVersion: v1
kind: ConfigMap
metadata:
  name: ${name}-config
data:
  NODE_ENV: production
  PORT: "${spec.port}"
`;

  if (spec.environment) {
    for (const [key, value] of Object.entries(spec.environment)) {
      configContent += `  ${key}: "${value}"
`;
    }
  }

  return configContent;
}

async function generateNginxConfig(spec: ModuleSpec): Promise<string> {
  const safeName = spec.name.toLowerCase().replace(/\s+/g, "_");
  return `upstream ${safeName}_backend {
  least_conn;
  server localhost:${spec.port};
}

server {
  listen 80;
  server_name _;

  client_max_body_size 100M;
  
  gzip on;
  gzip_vary on;
  gzip_min_length 1024;
  gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;

  location / {
    proxy_pass http://${safeName}_backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_cache_bypass \$http_upgrade;
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
  }

  location /health {
    access_log off;
    proxy_pass http://${safeName}_backend;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
  }
}
`;
}

async function generateGitHubActionsCI(spec: ModuleSpec): Promise<string> {
  const safeName = spec.name.toLowerCase().replace(/\s+/g, "-");
  return `name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Lint
      run: npm run lint --if-present
    
    - name: Test
      run: npm test --if-present
    
    - name: Build
      run: npm run build
    
    - name: Build Docker image
      run: docker build -t ${safeName}:latest .
    
    - name: Push to registry
      if: github.event_name == 'push' && github.ref == 'refs/heads/main'
      run: |
        echo \${{ secrets.DOCKER_PASSWORD }} | docker login -u \${{ secrets.DOCKER_USERNAME }} --password-stdin
        docker tag ${safeName}:latest \${{ secrets.DOCKER_USERNAME }}/${safeName}:latest
        docker push \${{ secrets.DOCKER_USERNAME }}/${safeName}:latest
`;
}

router.post("/generate-dockerfile", async (req: Request, res: Response) => {
  try {
    const { moduleName, framework, port, dependencies } = req.body;

    if (!moduleName || !framework || !port) {
      return res
        .status(400)
        .json({ error: "moduleName, framework, and port are required" });
    }

    const spec: ModuleSpec = {
      name: moduleName,
      framework,
      dependencies: dependencies || [],
      port,
    };

    const dockerfile = await generateDockerfile(spec);
    res.json({
      success: true,
      dockerfile,
      filename: "Dockerfile",
    });
  } catch (error) {
    console.error("Dockerfile generation error:", error);
    res.status(500).json({ error: "Failed to generate Dockerfile" });
  }
});

router.post("/generate-docker-compose", async (req: Request, res: Response) => {
  try {
    const { moduleName, framework, port, database, environment } = req.body;

    const spec: ModuleSpec = {
      name: moduleName,
      framework: framework || "node",
      dependencies: [],
      port: port || 3000,
      database,
      environment,
    };

    const dockerCompose = await generateDockerCompose(spec);
    res.json({
      success: true,
      dockerCompose,
      filename: "docker-compose.yml",
    });
  } catch (error) {
    console.error("Docker Compose generation error:", error);
    res.status(500).json({ error: "Failed to generate docker-compose.yml" });
  }
});

router.post("/generate-kubernetes", async (req: Request, res: Response) => {
  try {
    const { moduleName, framework, port, database, environment, registryUrl } =
      req.body;

    const spec: ModuleSpec = {
      name: moduleName,
      framework: framework || "node",
      dependencies: [],
      port: port || 3000,
      database,
      environment,
    };

    const [deployment, configMap, nginx, githubCI] = await Promise.all([
      generateKubernetesDeployment(spec),
      generateKubernetesConfigMap(spec),
      generateNginxConfig(spec),
      generateGitHubActionsCI(spec),
    ]);

    res.json({
      success: true,
      files: {
        deployment,
        configMap,
        nginx,
        githubCI,
      },
      filenames: {
        deployment: "deployment.yaml",
        configMap: "configmap.yaml",
        nginx: "nginx.conf",
        githubCI: ".github/workflows/ci.yml",
      },
    });
  } catch (error) {
    console.error("Kubernetes generation error:", error);
    res.status(500).json({ error: "Failed to generate Kubernetes files" });
  }
});

router.post("/generate-all", async (req: Request, res: Response) => {
  try {
    const { moduleName, framework, port, database, environment } = req.body;

    const cacheKey = `docker-k8s:${moduleName}:${framework}:${port}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json({ success: true, ...cached, fromCache: true });
    }

    const spec: ModuleSpec = {
      name: moduleName,
      framework: framework || "node",
      dependencies: [],
      port: port || 3000,
      database,
      environment,
    };

    const [dockerfile, dockerCompose, deployment, configMap, nginx, githubCI] =
      await Promise.all([
        generateDockerfile(spec),
        generateDockerCompose(spec),
        generateKubernetesDeployment(spec),
        generateKubernetesConfigMap(spec),
        generateNginxConfig(spec),
        generateGitHubActionsCI(spec),
      ]);

    const result = {
      success: true,
      files: {
        dockerfile,
        dockerCompose,
        deployment,
        configMap,
        nginx,
        githubCI,
      },
      filenames: {
        dockerfile: "Dockerfile",
        dockerCompose: "docker-compose.yml",
        deployment: "deployment.yaml",
        configMap: "configmap.yaml",
        nginx: "nginx.conf",
        githubCI: ".github/workflows/ci.yml",
      },
    };

    await cache.set(cacheKey, result, 86400);
    res.json(result);
  } catch (error) {
    console.error("Deployment generation error:", error);
    res.status(500).json({ error: "Failed to generate deployment files" });
  }
});

export default router;
