import { Router, Request, Response } from "express";
import { getCacheService } from "../services/cacheService";

const router = Router();
const cache = getCacheService();

interface InfrastructureConfig {
  projectName: string;
  cloudProvider: string;
  region: string;
  environment: string;
  instanceType?: string;
  database?: string;
  messaging?: string;
}

function generateTerraform(config: InfrastructureConfig): string {
  return `terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "${config.region}"

  default_tags {
    tags = {
      Environment = "${config.environment}"
      Project     = "${config.projectName}"
      ManagedBy   = "Terraform"
    }
  }
}

# VPC Configuration
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "\${var.project_name}-vpc"
  }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "\${var.project_name}-igw"
  }
}

resource "aws_subnet" "public_1" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "\${var.aws_region}a"
  map_public_ip_on_launch = true

  tags = {
    Name = "\${var.project_name}-public-subnet-1"
  }
}

resource "aws_subnet" "public_2" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.2.0/24"
  availability_zone       = "\${var.aws_region}b"
  map_public_ip_on_launch = true

  tags = {
    Name = "\${var.project_name}-public-subnet-2"
  }
}

resource "aws_subnet" "private_1" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.10.0/24"
  availability_zone = "\${var.aws_region}a"

  tags = {
    Name = "\${var.project_name}-private-subnet-1"
  }
}

resource "aws_subnet" "private_2" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.11.0/24"
  availability_zone = "\${var.aws_region}b"

  tags = {
    Name = "\${var.project_name}-private-subnet-2"
  }
}

# Route Tables
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block      = "0.0.0.0/0"
    gateway_id      = aws_internet_gateway.main.id
  }

  tags = {
    Name = "\${var.project_name}-public-rt"
  }
}

resource "aws_route_table_association" "public_1" {
  subnet_id      = aws_subnet.public_1.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "public_2" {
  subnet_id      = aws_subnet.public_2.id
  route_table_id = aws_route_table.public.id
}

# Security Groups
resource "aws_security_group" "alb" {
  name        = "\${var.project_name}-alb-sg"
  description = "Security group for ALB"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "\${var.project_name}-alb-sg"
  }
}

resource "aws_security_group" "ecs_tasks" {
  name        = "\${var.project_name}-ecs-sg"
  description = "Security group for ECS tasks"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 0
    to_port         = 65535
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "\${var.project_name}-ecs-sg"
  }
}

# Application Load Balancer
resource "aws_lb" "main" {
  name               = "\${var.project_name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = [aws_subnet.public_1.id, aws_subnet.public_2.id]

  enable_deletion_protection = false

  tags = {
    Name = "\${var.project_name}-alb"
  }
}

resource "aws_lb_target_group" "app" {
  name        = "\${var.project_name}-tg"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    healthy_threshold   = 2
    unhealthy_threshold = 2
    timeout             = 3
    interval            = 30
    path                = "/health"
    matcher             = "200"
  }

  tags = {
    Name = "\${var.project_name}-tg"
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}

# Variables
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "${config.region}"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "${config.projectName}"
}

variable "environment" {
  description = "Environment"
  type        = string
  default     = "${config.environment}"
}

# Outputs
output "alb_dns_name" {
  value = aws_lb.main.dns_name
  description = "DNS name of the load balancer"
}
`;
}

function generateCloudFormation(config: InfrastructureConfig): string {
  return `AWSTemplateFormatVersion: '2010-09-09'
Description: 'CloudFormation template for ${config.projectName}'

Parameters:
  Environment:
    Type: String
    Default: ${config.environment}
    Description: Environment name

  ProjectName:
    Type: String
    Default: ${config.projectName}
    Description: Project name

Resources:
  VPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: 10.0.0.0/16
      EnableDnsHostnames: true
      EnableDnsSupport: true
      Tags:
        - Key: Name
          Value: !Sub '\${ProjectName}-vpc'

  InternetGateway:
    Type: AWS::EC2::InternetGateway
    Properties:
      Tags:
        - Key: Name
          Value: !Sub '\${ProjectName}-igw'

  AttachGateway:
    Type: AWS::EC2::VPCGatewayAttachment
    Properties:
      VpcId: !Ref VPC
      InternetGatewayId: !Ref InternetGateway

  PublicSubnet1:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      CidrBlock: 10.0.1.0/24
      AvailabilityZone: !Select [0, !GetAZs '']
      MapPublicIpOnLaunch: true
      Tags:
        - Key: Name
          Value: !Sub '\${ProjectName}-public-subnet-1'

  PublicSubnet2:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      CidrBlock: 10.0.2.0/24
      AvailabilityZone: !Select [1, !GetAZs '']
      MapPublicIpOnLaunch: true
      Tags:
        - Key: Name
          Value: !Sub '\${ProjectName}-public-subnet-2'

  PublicRouteTable:
    Type: AWS::EC2::RouteTable
    Properties:
      VpcId: !Ref VPC
      Tags:
        - Key: Name
          Value: !Sub '\${ProjectName}-public-rt'

  PublicRoute:
    Type: AWS::EC2::Route
    DependsOn: AttachGateway
    Properties:
      RouteTableId: !Ref PublicRouteTable
      DestinationCidrBlock: 0.0.0.0/0
      GatewayId: !Ref InternetGateway

  SubnetRouteTableAssociation1:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Properties:
      SubnetId: !Ref PublicSubnet1
      RouteTableId: !Ref PublicRouteTable

  SubnetRouteTableAssociation2:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Properties:
      SubnetId: !Ref PublicSubnet2
      RouteTableId: !Ref PublicRouteTable

  ALBSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: Security group for ALB
      VpcId: !Ref VPC
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 80
          ToPort: 80
          CidrIp: 0.0.0.0/0
        - IpProtocol: tcp
          FromPort: 443
          ToPort: 443
          CidrIp: 0.0.0.0/0
      SecurityGroupEgress:
        - IpProtocol: -1
          CidrIp: 0.0.0.0/0

  ApplicationLoadBalancer:
    Type: AWS::ElasticLoadBalancingV2::LoadBalancer
    Properties:
      Name: !Sub '\${ProjectName}-alb'
      Subnets:
        - !Ref PublicSubnet1
        - !Ref PublicSubnet2
      SecurityGroups:
        - !Ref ALBSecurityGroup
      Tags:
        - Key: Name
          Value: !Sub '\${ProjectName}-alb'

  TargetGroup:
    Type: AWS::ElasticLoadBalancingV2::TargetGroup
    Properties:
      Name: !Sub '\${ProjectName}-tg'
      Port: 3000
      Protocol: HTTP
      VpcId: !Ref VPC
      TargetType: ip
      HealthCheckEnabled: true
      HealthCheckPath: /health
      HealthCheckProtocol: HTTP
      HealthCheckIntervalSeconds: 30
      HealthCheckTimeoutSeconds: 3
      HealthyThresholdCount: 2
      UnhealthyThresholdCount: 2

  Listener:
    Type: AWS::ElasticLoadBalancingV2::Listener
    Properties:
      LoadBalancerArn: !Ref ApplicationLoadBalancer
      Port: 80
      Protocol: HTTP
      DefaultActions:
        - Type: forward
          TargetGroupArn: !Ref TargetGroup

Outputs:
  LoadBalancerDNS:
    Description: DNS name of the load balancer
    Value: !GetAtt ApplicationLoadBalancer.DNSName
    Export:
      Name: !Sub '\${ProjectName}-alb-dns'

  VpcId:
    Description: VPC ID
    Value: !Ref VPC
    Export:
      Name: !Sub '\${ProjectName}-vpc-id'
`;
}

function generatePrometheus(config: InfrastructureConfig): string {
  return `global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    environment: '${config.environment}'
    project: '${config.projectName}'

alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - alertmanager:9093

rule_files:
  - '/etc/prometheus/rules.yml'

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: '${config.projectName}-app'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['localhost:9100']

  - job_name: 'docker'
    static_configs:
      - targets: ['localhost:9323']
`;
}

function generateDatadogConfig(config: InfrastructureConfig): string {
  return `# Datadog Agent Configuration for ${config.projectName}

api_key: \${DATADOG_API_KEY}
hostname: ${config.projectName}-\${ENV_IDENTIFIER}
site: datadoghq.com

tags:
  - environment:\${config.environment}
  - project:${config.projectName}
  - version:\${APP_VERSION}

logs_enabled: true
process_config:
  enabled: true

apm_config:
  enabled: true
  receiver_port: 8126
  max_memory: 2000000000
  max_cpu_percent: 5

checks:
  docker:
    enabled: true
  cpu:
    enabled: true
  disk:
    enabled: true
  memory:
    enabled: true
  network:
    enabled: true
  ntp:
    enabled: true
  processes:
    enabled: true

statsd:
  port: 8125
  non_local_traffic: false

jmx_custom_metrics: []
`;
}

function generateNewRelic(config: InfrastructureConfig): string {
  return `# New Relic Agent Configuration for ${config.projectName}

app_name: ${config.projectName}-${config.environment}
license_key: \${NEW_RELIC_LICENSE_KEY}
agent_enabled: true

logging:
  level: info
  file_path: logs/newrelic_agent.log

transaction_tracer:
  enabled: true
  record_sql: obfuscated
  capture_params: false
  explain_enabled: true
  explain_threshold: 0.5

error_collector:
  enabled: true
  capture_source: true
  record_database_statements: false

transaction_events:
  enabled: true
  max_samples_stored: 10000

distributed_tracing:
  enabled: true

custom_insights_events:
  enabled: true
  max_samples_stored: 5000

security:
  request_parameter_enabled: false
  custom_parameter_enabled: false
`;
}

function generateBackupPolicy(config: InfrastructureConfig): string {
  return `# Backup and Disaster Recovery Policy for ${config.projectName}

Backup Strategy:
  Frequency: Daily
  Retention: 30 days for daily, 1 year for monthly
  Location: AWS S3 with cross-region replication
  Encryption: AES-256

Recovery Objectives:
  RTO: 4 hours
  RPO: 1 hour

Database Backups:
  - Type: Automated snapshots
  - Frequency: Every 6 hours
  - Retention: 7 days
  - Cross-region backup: Enabled
  - Point-in-time recovery: 7 days

Application Backups:
  - Code repository: Daily
  - Configuration: On deployment
  - User-generated data: Real-time replication

Disaster Recovery Plan:
  1. Detection: CloudWatch alarms trigger on anomalies
  2. Assessment: On-call engineer reviews impact
  3. Activation: DR procedures initiated for major outages
  4. Recovery: Database restored from backup, application redeployed
  5. Verification: Health checks and smoke tests run
  6. Communication: Status updates to stakeholders

Testing:
  - DR drills: Quarterly
  - Backup verification: Monthly
  - Recovery testing: After each major change

Compliance:
  - GDPR compliance: Data residency maintained
  - Backup audit logs: Retained for 2 years
  - Encryption keys: Managed by KMS
`;
}

router.post("/generate-terraform", async (req: Request, res: Response) => {
  try {
    const config: InfrastructureConfig = req.body;

    if (!config.projectName || !config.cloudProvider) {
      return res.status(400).json({
        error: "projectName and cloudProvider are required",
      });
    }

    const terraform = generateTerraform(config);
    res.json({
      success: true,
      content: terraform,
      filename: "main.tf",
      platform: "terraform",
    });
  } catch (error) {
    console.error("Terraform generation error:", error);
    res.status(500).json({ error: "Failed to generate Terraform" });
  }
});

router.post("/generate-cloudformation", async (req: Request, res: Response) => {
  try {
    const config: InfrastructureConfig = req.body;

    if (!config.projectName) {
      return res.status(400).json({ error: "projectName is required" });
    }

    const cfn = generateCloudFormation(config);
    res.json({
      success: true,
      content: cfn,
      filename: "template.yaml",
      platform: "cloudformation",
    });
  } catch (error) {
    console.error("CloudFormation generation error:", error);
    res
      .status(500)
      .json({ error: "Failed to generate CloudFormation template" });
  }
});

router.post("/generate-monitoring", async (req: Request, res: Response) => {
  try {
    const {
      projectName,
      monitoringPlatform,
      environment,
      region,
    }: InfrastructureConfig & { monitoringPlatform: string } = req.body;

    if (!projectName || !monitoringPlatform) {
      return res.status(400).json({
        error: "projectName and monitoringPlatform are required",
      });
    }

    let content = "";
    let filename = "";

    switch (monitoringPlatform.toLowerCase()) {
      case "prometheus":
        content = generatePrometheus({
          projectName,
          environment: environment || "production",
          region: region || "us-east-1",
          cloudProvider: "aws",
        });
        filename = "prometheus.yml";
        break;
      case "datadog":
        content = generateDatadogConfig({
          projectName,
          environment: environment || "production",
          region: region || "us-east-1",
          cloudProvider: "aws",
        });
        filename = "datadog.yaml";
        break;
      case "newrelic":
        content = generateNewRelic({
          projectName,
          environment: environment || "production",
          region: region || "us-east-1",
          cloudProvider: "aws",
        });
        filename = "newrelic.ini";
        break;
      default:
        return res
          .status(400)
          .json({ error: "Unsupported monitoring platform" });
    }

    res.json({
      success: true,
      content,
      filename,
      platform: monitoringPlatform,
    });
  } catch (error) {
    console.error("Monitoring configuration error:", error);
    res
      .status(500)
      .json({ error: "Failed to generate monitoring configuration" });
  }
});

router.post(
  "/generate-disaster-recovery",
  async (req: Request, res: Response) => {
    try {
      const config: InfrastructureConfig = req.body;

      if (!config.projectName) {
        return res.status(400).json({ error: "projectName is required" });
      }

      const policy = generateBackupPolicy(config);
      res.json({
        success: true,
        content: policy,
        filename: "DISASTER_RECOVERY_PLAN.md",
        type: "markdown",
      });
    } catch (error) {
      console.error("Disaster recovery plan error:", error);
      res
        .status(500)
        .json({ error: "Failed to generate disaster recovery plan" });
    }
  },
);

router.post("/generate-all-enterprise", async (req: Request, res: Response) => {
  try {
    const config: InfrastructureConfig = req.body;

    if (!config.projectName) {
      return res.status(400).json({ error: "projectName is required" });
    }

    const terraform = generateTerraform(config);
    const cloudformation = generateCloudFormation(config);
    const prometheus = generatePrometheus(config);
    const datadog = generateDatadogConfig(config);
    const newrelic = generateNewRelic(config);
    const backup = generateBackupPolicy(config);

    res.json({
      success: true,
      files: {
        terraform: { content: terraform, filename: "main.tf" },
        cloudformation: {
          content: cloudformation,
          filename: "template.yaml",
        },
        prometheus: { content: prometheus, filename: "prometheus.yml" },
        datadog: { content: datadog, filename: "datadog.yaml" },
        newrelic: { content: newrelic, filename: "newrelic.ini" },
        backup: {
          content: backup,
          filename: "DISASTER_RECOVERY_PLAN.md",
        },
      },
    });
  } catch (error) {
    console.error("Enterprise generation error:", error);
    res.status(500).json({ error: "Failed to generate enterprise configs" });
  }
});

export default router;
