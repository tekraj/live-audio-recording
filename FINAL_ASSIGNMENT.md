# Week 8 Assignment: Deploying Live Audio Recording Application on AWS

## Objective
Deploy the Live Audio Recording application using AWS infrastructure with proper VPC networking, RDS database, Application Load Balancer, and Cloudflare DNS integration.

---



## Architecture Overview

```
Internet (Cloudflare DNS)
                ↓
                ↓
       ALB (Public Subnets)
                ↓
       ┌────────┴────────┐
       ↓                 ↓             ┌──────────────┐
     EC2-1             EC2-2  ───────→ │  Amazon S3   │
    (App SG)          (App SG)         │ (Object Store)│
   [IAM Role]        [IAM Role]        └──────────────┘
       ↓                 ↓
       └────────┬────────┘
                ↓
         ┌──────────────┐
         │  RDS MySQL   │
         │ (Private Sub)│
         └──────────────┘
```

---

## Assignment Tasks

### Phase 0: IAM Permissions and S3 Setup

#### 0.1 Add S3 Permissions to IAM Role
The EC2 instances will store audio files in S3 and need permission to access it:

1. Go to AWS Management Console → Search for **IAM**
2. Click **Roles** on the left sidebar
3. Search for and select **LabRole** (or the role your instructor provided)
4.  **Add permissions**
5. Select **Attach policies directly**
6. Search for **AmazonS3FullAccess** in the policy search
7. Check the box next to **AmazonS3FullAccess**
8. Click **Add permissions**

**Result:** EC2 instances launched with this role will have S3 access without needing access keys.

#### 0.2 Create S3 Bucket
1. Go to AWS Management Console → Search for **S3**
2. Click **Create bucket** button
3. Configure bucket:
   - **Bucket name**: `audio-recordings-<your-name>` (must be globally unique)
   - **AWS Region**: us-east-1
4. **Create bucket**

**Important:** Save the bucket name for later use in the application configuration.

---

### Phase 1: VPC and Network Infrastructure

#### 1.1 Create VPC
Create a new VPC with the following configuration:
- **Name**: `audio-recording-vpc`
- **IPv4 CIDR**: `10.0.0.0/16`

#### 1.2 Create Subnets
Create 6 subnets as follows:

| Subnet Name | Availability Zone | CIDR Block | Type |
|-------------|-------------------|------------|------|
| ALB-1 | us-east-1a | 10.0.1.0/24 | Public |
| ALB-2 | us-east-1b | 10.0.2.0/24 | Public |
| App-1 | us-east-1a | 10.0.3.0/24 | Public |
| App-2 | us-east-1b | 10.0.4.0/24 | Public |
| DB-1 | us-east-1a | 10.0.5.0/24 | Private |
| DB-2 | us-east-1b | 10.0.6.0/24 | Private |

#### 1.3 Create Internet Gateway
- Create an Internet Gateway named `audio-recording-igw`
- Attach it to `audio-recording-vpc`

#### 1.4 Create NAT Gateway
- Create Regional NAT Gateway named `audio-recording-nat` 
- Select previously created VPC (`audio-recording-vpc`)

#### 1.5 Create Route Tables

**Public Route Table (for ALB and App subnets):**
- Name: `Public-RT` 
- VPC : `audio-recording-vpc`
- Add route: `0.0.0.0/0` → Internet Gateway (`audio-recording-igw`)
- Associate subnets: **ALB-1**, **ALB-2**, **App-1**, **App-2**

**Private Route Table (for RDS subnets):**
- Name: `Private-RT`
- Add route: `0.0.0.0/0` → NAT Gateway (`audio-recording-nat`)
- Associate subnets: **DB-1**, **DB-2**

---

### Phase 2: Security Groups

Create the following security groups in `audio-recording-vpc`:

#### 2.1 ALB Security Group
- **Name**: `ALB-SG`
- **Inbound Rules:**
  - HTTP (80) from `0.0.0.0/0`
  - HTTPS (443) from `0.0.0.0/0`

#### 2.2 Application (EC2) Security Group
- **Name**: `App-SG`
- **Inbound Rules:**
  - HTTP (80) from `ALB-SG`
  - HTTPS (443) from `ALB-SG`
  - SSH (22) from `<YOUR_IP>/32` (replace with your public IP address)

#### 2.3 Database Security Group
- **Name**: `DB-SG`
- **Inbound Rules:**
  - MySQL (3306) from `App-SG`

---

### Phase 3: Load Balancer Setup

#### 3.1 Create Target Group (EC2)
- **Name**: `audio-recording-tg`
- **Protocol**: HTTP
- **Port**: 80
- **VPC**: `audio-recording-vpc`
- **Health Check Settings:**
  - Path: `/health`
  - Protocol: HTTP
  - **Note**: Do NOT register targets yet. We'll add EC2 instances after they're created.

#### 3.2 Create Application Load Balancer (EC2)
- **Type**: Application Load Balancer
- **Name**: `audio-recording-alb`
- **Scheme**: Internet-facing
- **IP Address Type**: IPv4
- **VPC**: `audio-recording-vpc`
- **Availability Zones and subnet**: **us-east-1a** and **us-east-1b**
- **Security Groups**: `ALB-SG`
- **Listeners:**
  - Protocol: HTTP
  - Port: 80
  - Target Group: `audio-recording-tg`


#### 3.3 Copy ALB DNS Name
Once the ALB is created:
1. Go to Load Balancers and select `audio-recording-alb`
2. Copy the **DNS name** (e.g., `audio-recording-alb-1234567890.us-east-1.elb.amazonaws.com`)

### 3.4 Cloudflare DNS Integration
1. Log in to your Cloudflare account
2. Select (Click) your domain
3. Go to **DNS** → **Records**
4. Add/Update a CNAME record:
   - **Name**: `@` (for root) or a subdomain (e.g., `audio`)
   - **Type**: CNAME
   - **Content**: Your ALB DNS name (from Phase 3.3)


---

### Phase 4: RDS Database Setup

#### 4.1 Create DB Subnet Group
- **Name**: `audio-recording-db-sg`
- **VPC**: `audio-recording-vpc`
- **Availability Zones**: us-east-1a, us-east-1b
- **Subnets**: **DB-1** and **DB-2**

#### 4.2 Create RDS MySQL Database
- **Engine**: MySQL 8.0
- **Template**: Free Tier
- **DB Instance Identifier**: `audio-recording-db`
- **Username**: `admin`
- **Password**: Self-Managed, Auto-generate (AWS will provide)
- **Instance Class**: db.t3.micro
- **VPC**: `audio-recording-vpc`
- **DB Subnet Group**: `audio-recording-db-sg`
- **Security Group**: `DB-SG`
- **Public Access**: **No**
- **Initial Database Name**: `live_audio_db`

**IMPORTANT:**
- Once created, copy and save the following:
  - **RDS Endpoint** (e.g., `audio-recording-db.xxxxx.us-east-1.rds.amazonaws.com`)
  - **Master Username**: `admin`
  - **Password**: The auto-generated password AWS provided
  - **Database Name**: `live_audio_db`

---

### Phase 5: EC2 Instances Deployment

#### 5.1 Launch EC2 Instances
Create 2 EC2 instances with the following configuration:

**Instance Details:**
- **AMI**: Ubuntu 22.04 LTS
- **Instance Type**: t2.medium (2 vCPU, 4 GB RAM)
- **Quantity**: 2
- **Root Volume**: 20 GB SSD

**Network Configuration:**
- **VPC**: `audio-recording-vpc`
- **Subnet**: 
  - Instance 1: **App-1**
  - Instance 2: **App-2**
- **Auto-assign Public IP**: **Yes** (needed for SSH access)
- **Security Group**: `App-SG`
- **IAM Instance Profile**: **LabInstanceProfile** (this gives EC2 access to S3 without access keys)

**Key Pair:**
- Create a new key pair named `audio-recording-key`
- Download and save it securely (you'll need it for SSH)
- Use same audio-recording-key for both instances

**Launch the instances and wait for them to reach "running" state**

---

### Phase 6: Configure Applications on EC2 Instances

SSH into each EC2 instance using the key pair you created. Replace `<EC2_IP>` with the public IP of each instance:

```bash
ssh -i audio-recording-key.pem ubuntu@<EC2_IP>
```

#### 6.1 Clone Repository
```bash
cd ~
git clone https://github.com/tekraj/live-audio-recording.git
cd live-audio-recording
```

#### 6.2 Run aws-setup.sh file
- To run this file you need to update the permission to execute
- Then run with   `sudo ./aws-setup.sh`


#### 6.3 Update .env File with RDS Credentials

The `.env` file already exists in the repository. Edit it with your RDS credentials and ALB DNS:

```bash
nano .env
```

Update the following variables:

```env
# MySQL Database Configuration - USE YOUR RDS DETAILS
DB_HOST=<YOUR_RDS_ENDPOINT>
DB_PORT=3306
DB_USER=admin
DB_PASSWORD=<YOUR_RDS_PASSWORD>
DB_NAME=live_audio_db
DATABASE_URL="mysql://admin:<YOUR_RDS_PASSWORD>@<YOUR_RDS_ENDPOINT>:3306/live_audio_db"

# S3 Configuration - for storing audio files
AWS_S3_BUCKET_NAME=<YOUR_S3_BUCKET_NAME>

# Frontend Configuration - USE YOUR Domain Name 
REACT_APP_AUDIO_SERVER_URL=http://<YOUR_DOMAIN_NAME>/api/
REACT_APP_AUDIO_TRANSCRIBER_URL=http://<YOUR_DOMAIN_NAME>/transcriber/

# Keep other settings as default
NODE_ENV=production
REDIS_HOST=redis
REDIS_PORT=6379
```

Replace:
- `<YOUR_RDS_ENDPOINT>` with your RDS endpoint (from Phase 4.2)
- `<YOUR_RDS_PASSWORD>` with your RDS password (from Phase 4.2)
- `<YOUR_S3_BUCKET_NAME>` with your S3 bucket name (from Phase 0.2)
- `<YOUR_DOMAIN_NAME>` with your DOMAIN name (from Phase 3.3)

Press `Ctrl+X`, then `Y`, then `Enter` to save.

#### 6.4 Build and Start Containers

```bash
# Build images
docker compose build

# Start services
docker compose up -d

# Verify services are running
docker compose ps
```

All services should show "Up":
- backend
- frontend
- nginx

#### 6.5 Verify Database Connection
```bash
docker compose logs backend | grep -i "database\|connection\|prisma"
```

You should see successful database connection messages.

---

### Phase 7: Register EC2 Instances to Target Group

Once both EC2 instances are running and containers are healthy, register them to the ALB target group.

**Wait for targets to become "Healthy"** (this may take 2-3 minutes):
- Status: `Healthy`
- Health Check Status: `Healthy`

---

#### 8.2 Access Application
Open your browser and navigate to:
```
http://your-domain.com
```

You should see the Live Audio Recording application frontend.


## 📋 Deployment Metadata

| Resource | Value / ID |
| :--- | :--- |
| **VPC ID** | `vpc-_____________________` |
| **S3 Bucket Name** | `audio-recordings-_____________________` |
| **ALB DNS Name** | `_____________________.us-east-1.elb.amazonaws.com` |
| **RDS Endpoint** | `_____________________.rds.amazonaws.com` |
| **Cloudflare Domain** | `_____________________` |
| **EC2 Instance IDs** | `i-__________, i-__________` |
| **EC2 Public IPs** | `__________, __________` |

---

## ✅ Deployment Checklist

### Phase 0: Permissions & Storage
- [ ] **IAM Role:** `LabRole` updated with `AmazonS3FullAccess`.
- [ ] **S3 Bucket:** Unique bucket created in `us-east-1`.

### Phase 1 & 2: Infrastructure & Security
- [ ] **VPC:** `audio-recording-vpc` created (10.0.0.0/16).
- [ ] **Subnets:** 4 Public (ALB/App) and 2 Private (DB) subnets configured.
- [ ] **Routing:** IGW attached for Public subnets; NAT Gateway configured for Private subnets.
- [ ] **Security Groups:** - `ALB-SG`: Port 80/443 open to world.
    - `App-SG`: Port 80/443 from ALB; Port 22 from My IP.
    - `DB-SG`: Port 3306 strictly from `App-SG`.

### Phase 3 & 4: Load Balancer & RDS
- [ ] **Target Group:** `audio-recording-tg` created (HTTP:80).
- [ ] **ALB:** Internet-facing ALB deployed in `ALB-1` and `ALB-2`.
- [ ] **Cloudflare:** CNAME record added pointing to ALB DNS.
- [ ] **RDS:** MySQL 8.0 instance running in Private DB subnets.

### Phase 5 & 6: EC2 & App Configuration
- [ ] **EC2 Instances:** 2x `t2.medium` instances launched with `LabInstanceProfile`.
- [ ] **Environment:** `.env` file updated with RDS endpoint, S3 bucket name, and Domain URLs.
- [ ] **Docker:** `docker compose up -d` successful (Backend, Frontend, Nginx).

### Phase 7 & 8: Integration & Testing
- [ ] **Target Health:** Both instances showing **Healthy** in AWS Console.
- [ ] **App Access:** Application accessible via custom domain.
- [ ] **Functional Test:** 5-second audio recording test completed successfully.

---

