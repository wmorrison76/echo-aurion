import { Router, Request, Response } from "express";
import { getCacheService } from "../services/cacheService";

const router = Router();
const cache = getCacheService();

interface PipelineConfig {
  projectName: string;
  framework: string;
  testFramework: string;
  nodeVersion: string;
  deploymentTarget: string;
  environment: Record<string, string>;
  branches?: string[];
}

function generateGithubActions(config: PipelineConfig): string {
  const testCmd = config.testFramework === "jest" ? "npm test" : "npm run test";

  return `name: CI/CD Pipeline

on:
  push:
    branches: [main, develop, staging]
  pull_request:
    branches: [main, develop]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: \${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Use Node.js
      uses: actions/setup-node@v4
      with:
        node-version: \${{ matrix.node-version }}
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run linter
      run: npm run lint --if-present
    
    - name: Run tests
      run: ${testCmd}
    
    - name: Generate coverage report
      if: always()
      run: npm run test:coverage --if-present
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      if: always()
      with:
        file: ./coverage/coverage-final.json

  build:
    needs: test
    runs-on: ubuntu-latest
    
    permissions:
      contents: read
      packages: write
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v2
    
    - name: Log in to Container Registry
      if: github.event_name == 'push' && github.ref == 'refs/heads/main'
      uses: docker/login-action@v2
      with:
        registry: \${{ env.REGISTRY }}
        username: \${{ github.actor }}
        password: \${{ secrets.GITHUB_TOKEN }}
    
    - name: Extract metadata
      id: meta
      uses: docker/metadata-action@v4
      with:
        images: \${{ env.REGISTRY }}/\${{ env.IMAGE_NAME }}
        tags: |
          type=ref,event=branch
          type=semver,pattern={{version}}
          type=semver,pattern={{major}}.{{minor}}
          type=sha
    
    - name: Build and push Docker image
      uses: docker/build-push-action@v4
      with:
        context: .
        push: \${{ github.event_name == 'push' && github.ref == 'refs/heads/main' }}
        tags: \${{ steps.meta.outputs.tags }}
        labels: \${{ steps.meta.outputs.labels }}

  deploy:
    needs: build
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Deploy to production
      run: |
        echo "Deploying to production..."
`;
}

function generateGitlabCI(config: PipelineConfig): string {
  return `image: node:${config.nodeVersion}-alpine

stages:
  - test
  - build
  - deploy

cache:
  paths:
    - node_modules/

variables:
  DOCKER_IMAGE: \$CI_REGISTRY_IMAGE:\$CI_COMMIT_SHA
  DOCKER_IMAGE_LATEST: \$CI_REGISTRY_IMAGE:latest

before_script:
  - npm ci

test:
  stage: test
  script:
    - npm run lint --if-present
    - npm test
    - npm run test:coverage --if-present
  coverage: '/Lines\\s*:\\s*(\\d+\\.\\d+)%/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
  only:
    - branches
  except:
    - tags

build:image:
  stage: build
  image: docker:latest
  services:
    - docker:dind
  before_script:
    - docker login -u \$CI_REGISTRY_USER -p \$CI_REGISTRY_PASSWORD \$CI_REGISTRY
  script:
    - docker build -t \$DOCKER_IMAGE -t \$DOCKER_IMAGE_LATEST .
    - docker push \$DOCKER_IMAGE
    - docker push \$DOCKER_IMAGE_LATEST
  only:
    - main
    - develop

deploy:staging:
  stage: deploy
  script:
    - echo "Deploying to staging..."
    - kubectl set image deployment/${config.projectName}-staging ${config.projectName}=\$DOCKER_IMAGE --record -n staging
  environment:
    name: staging
    kubernetes:
      namespace: staging
  only:
    - develop

deploy:production:
  stage: deploy
  script:
    - echo "Deploying to production..."
    - kubectl set image deployment/${config.projectName} ${config.projectName}=\$DOCKER_IMAGE --record -n production
  environment:
    name: production
    kubernetes:
      namespace: production
  only:
    - main
  when: manual
`;
}

function generateJenkinsfile(config: PipelineConfig): string {
  return `pipeline {
    agent any

    options {
        buildDiscarder(logRotator(numToKeepStr: '30', artifactNumToKeepStr: '10'))
        timeout(time: 1, unit: 'HOURS')
        timestamps()
    }

    environment {
        NODE_ENV = 'production'
        DOCKER_REGISTRY = credentials('docker-registry-credentials')
        AWS_CREDENTIALS = credentials('aws-credentials')
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    GIT_COMMIT_MSG = sh(returnStdout: true, script: 'git log -1 --pretty=%B').trim()
                    GIT_COMMIT_AUTHOR = sh(returnStdout: true, script: 'git log -1 --pretty=%an').trim()
                }
            }
        }

        stage('Install') {
            steps {
                script {
                    sh 'npm ci'
                }
            }
        }

        stage('Lint') {
            steps {
                script {
                    sh 'npm run lint --if-present || true'
                }
            }
        }

        stage('Test') {
            steps {
                script {
                    sh 'npm test'
                }
            }
            post {
                always {
                    junit(testResults: 'test-results.xml', allowEmptyResults: true)
                    publishHTML([
                        reportDir: 'coverage',
                        reportFiles: 'index.html',
                        reportName: 'Coverage Report'
                    ])
                }
            }
        }

        stage('Build') {
            steps {
                script {
                    sh 'npm run build'
                }
            }
        }

        stage('Build Docker Image') {
            when {
                branch 'main'
            }
            steps {
                script {
                    DOCKER_TAG = sh(returnStdout: true, script: 'git rev-parse --short HEAD').trim()
                    sh '''
                        docker build -t docker-registry/${config.projectName}:\${DOCKER_TAG} .
                        docker tag docker-registry/${config.projectName}:\${DOCKER_TAG} docker-registry/${config.projectName}:latest
                    '''
                }
            }
        }

        stage('Push Docker Image') {
            when {
                branch 'main'
            }
            steps {
                script {
                    sh '''
                        docker push docker-registry/${config.projectName}:\${DOCKER_TAG}
                        docker push docker-registry/${config.projectName}:latest
                    '''
                }
            }
        }

        stage('Deploy to Staging') {
            when {
                branch 'develop'
            }
            steps {
                script {
                    sh '''
                        kubectl set image deployment/${config.projectName}-staging \\
                            ${config.projectName}=docker-registry/${config.projectName}:\${DOCKER_TAG} \\
                            --record -n staging
                        kubectl rollout status deployment/${config.projectName}-staging -n staging
                    '''
                }
            }
        }

        stage('Deploy to Production') {
            when {
                branch 'main'
            }
            input {
                message "Deploy to production?"
                ok "Deploy"
            }
            steps {
                script {
                    sh '''
                        kubectl set image deployment/${config.projectName} \\
                            ${config.projectName}=docker-registry/${config.projectName}:\${DOCKER_TAG} \\
                            --record -n production
                        kubectl rollout status deployment/${config.projectName} -n production
                    '''
                }
            }
        }

        stage('Smoke Tests') {
            when {
                branch 'main'
            }
            steps {
                script {
                    sh 'npm run test:e2e --if-present'
                }
            }
        }
    }

    post {
        always {
            cleanWs()
        }
        success {
            script {
                echo "Pipeline succeeded!"
            }
        }
        failure {
            script {
                echo "Pipeline failed!"
            }
        }
    }
}
`;
}

function generateBitbucketPipelines(config: PipelineConfig): string {
  return `image: node:${config.nodeVersion}

definitions:
  steps:
    - step: &test
        name: Test
        caches:
          - node
        script:
          - npm ci
          - npm run lint --if-present
          - npm test
          - npm run test:coverage --if-present
        artifacts:
          - coverage/**
    - step: &build
        name: Build
        caches:
          - node
        script:
          - npm ci
          - npm run build
        artifacts:
          - dist/**

pipelines:
  branches:
    main:
      - step: *test
      - step: *build
      - step:
          name: Deploy to Production
          script:
            - echo "Deploying to production..."
    develop:
      - step: *test
      - step: *build
      - step:
          name: Deploy to Staging
          script:
            - echo "Deploying to staging environment..."

  pull-requests:
    '**':
      - step: *test
`;
}

router.post("/generate-github-actions", async (req: Request, res: Response) => {
  try {
    const { projectName, framework, testFramework, nodeVersion } = req.body;

    const config: PipelineConfig = {
      projectName: projectName || "my-project",
      framework: framework || "node",
      testFramework: testFramework || "jest",
      nodeVersion: nodeVersion || "20.x",
      deploymentTarget: "kubernetes",
      environment: {},
    };

    const workflow = generateGithubActions(config);
    res.json({
      success: true,
      content: workflow,
      filename: ".github/workflows/ci-cd.yml",
      platform: "github-actions",
    });
  } catch (error) {
    console.error("GitHub Actions generation error:", error);
    res
      .status(500)
      .json({ error: "Failed to generate GitHub Actions workflow" });
  }
});

router.post("/generate-gitlab-ci", async (req: Request, res: Response) => {
  try {
    const { projectName, framework, testFramework, nodeVersion } = req.body;

    const config: PipelineConfig = {
      projectName: projectName || "my-project",
      framework: framework || "node",
      testFramework: testFramework || "jest",
      nodeVersion: nodeVersion || "20",
      deploymentTarget: "kubernetes",
      environment: {},
    };

    const pipeline = generateGitlabCI(config);
    res.json({
      success: true,
      content: pipeline,
      filename: ".gitlab-ci.yml",
      platform: "gitlab-ci",
    });
  } catch (error) {
    console.error("GitLab CI generation error:", error);
    res.status(500).json({ error: "Failed to generate GitLab CI pipeline" });
  }
});

router.post("/generate-jenkinsfile", async (req: Request, res: Response) => {
  try {
    const { projectName, framework, testFramework, nodeVersion } = req.body;

    const config: PipelineConfig = {
      projectName: projectName || "my-project",
      framework: framework || "node",
      testFramework: testFramework || "jest",
      nodeVersion: nodeVersion || "20",
      deploymentTarget: "kubernetes",
      environment: {},
    };

    const jenkinsfile = generateJenkinsfile(config);
    res.json({
      success: true,
      content: jenkinsfile,
      filename: "Jenkinsfile",
      platform: "jenkins",
    });
  } catch (error) {
    console.error("Jenkinsfile generation error:", error);
    res.status(500).json({ error: "Failed to generate Jenkinsfile" });
  }
});

router.post(
  "/generate-bitbucket-pipelines",
  async (req: Request, res: Response) => {
    try {
      const { projectName, framework, testFramework, nodeVersion } = req.body;

      const config: PipelineConfig = {
        projectName: projectName || "my-project",
        framework: framework || "node",
        testFramework: testFramework || "jest",
        nodeVersion: nodeVersion || "20",
        deploymentTarget: "kubernetes",
        environment: {},
      };

      const pipelines = generateBitbucketPipelines(config);
      res.json({
        success: true,
        content: pipelines,
        filename: "bitbucket-pipelines.yml",
        platform: "bitbucket-pipelines",
      });
    } catch (error) {
      console.error("Bitbucket Pipelines generation error:", error);
      res.status(500).json({ error: "Failed to generate Bitbucket Pipelines" });
    }
  },
);

router.post("/generate-all-pipelines", async (req: Request, res: Response) => {
  try {
    const { projectName, framework, testFramework, nodeVersion } = req.body;

    const cacheKey = `pipelines:${projectName}:${framework}:${testFramework}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json({ success: true, ...cached, fromCache: true });
    }

    const config: PipelineConfig = {
      projectName: projectName || "my-project",
      framework: framework || "node",
      testFramework: testFramework || "jest",
      nodeVersion: nodeVersion || "20",
      deploymentTarget: "kubernetes",
      environment: {},
    };

    const githubActions = generateGithubActions(config);
    const gitlabCI = generateGitlabCI(config);
    const jenkinsfile = generateJenkinsfile(config);
    const bitbucketPipelines = generateBitbucketPipelines(config);

    const result = {
      success: true,
      pipelines: {
        githubActions,
        gitlabCI,
        jenkinsfile,
        bitbucketPipelines,
      },
      filenames: {
        githubActions: ".github/workflows/ci-cd.yml",
        gitlabCI: ".gitlab-ci.yml",
        jenkinsfile: "Jenkinsfile",
        bitbucketPipelines: "bitbucket-pipelines.yml",
      },
    };

    await cache.set(cacheKey, result, 86400);
    res.json(result);
  } catch (error) {
    console.error("CI/CD pipeline generation error:", error);
    res.status(500).json({ error: "Failed to generate CI/CD pipelines" });
  }
});

export default router;
