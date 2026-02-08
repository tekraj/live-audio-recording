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
- Create an Elastic IP address
- Create a NAT Gateway named `audio-recording-nat` in subnet **ALB-1**
- Allocate the Elastic IP to the NAT Gateway

#### 1.5 Create Route Tables

**Public Route Table (for ALB and App subnets):**
- Name: `Public-RT`
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

#### 3.1 Create Target Group
- **Name**: `audio-recording-tg`
- **Protocol**: HTTP
- **Port**: 5000
- **VPC**: `audio-recording-vpc`
- **Health Check Settings:**
  - Path: `/health`
  - Protocol: HTTP
  - Interval: 30 seconds
  - Healthy Threshold: 2
  - Unhealthy Threshold: 2

#### 3.2 Create Application Load Balancer
- **Name**: `audio-recording-alb`
- **Scheme**: Internet-facing
- **IP Address Type**: IPv4
- **VPC**: `audio-recording-vpc`
- **Subnets**: **ALB-1** and **ALB-2**
- **Security Groups**: `ALB-SG`
- **Listeners:**
  - Protocol: HTTP
  - Port: 80
  - Forward to target group: `audio-recording-tg`

**Note**: Do NOT register targets yet. You'll add EC2 instances after they're created.

#### 3.3 Copy ALB DNS Name
Once the ALB is created:
1. Go to Load Balancers and select `audio-recording-alb`
2. Copy the **DNS name** (e.g., `audio-recording-alb-1234567890.us-east-1.elb.amazonaws.com`)
3. Save it for later use

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
- **Password**: Auto-generate (AWS will provide)
- **Instance Class**: db.t3.micro
- **VPC**: `audio-recording-vpc`
- **DB Subnet Group**: `audio-recording-db-sg`
- **Security Group**: `DB-SG`
- **Public Access**: **No**
- **Initial Database Name**: `live_audio_db`
- **Backup Retention**: 0 days (for cost savings)

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
- **IAM Instance Profile**: **LabProfileRole** (this gives EC2 access to S3 without access keys)

**Key Pair:**
- Create a new key pair named `audio-recording-key`
- Download and save it securely (you'll need it for SSH)

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

#### 6.2 Install Docker and Docker Compose
Visit https://docs.docker.com/engine/install/ubuntu/ and follow the instructions.


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
AWS_REGION=us-east-1

# Frontend Configuration - USE YOUR ALB DNS
REACT_APP_AUDIO_SERVER_URL=http://<YOUR_ALB_DNS>/api/
REACT_APP_AUDIO_TRANSCRIBER_URL=http://<YOUR_ALB_DNS>/transcriber/

# Keep other settings as default
NODE_ENV=production
REDIS_HOST=redis
REDIS_PORT=6379
```

Replace:
- `<YOUR_RDS_ENDPOINT>` with your RDS endpoint (from Phase 4.2)
- `<YOUR_RDS_PASSWORD>` with your RDS password (from Phase 4.2)
- `<YOUR_S3_BUCKET_NAME>` with your S3 bucket name (from Phase 0.2)
- `<YOUR_ALB_DNS>` with your ALB DNS name (from Phase 3.3)

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

Check the ALB DNS to verify it's working:
```bash
curl http://<YOUR_ALB_DNS>/api/health
```

Should return a response indicating the backend is healthy.

---

### Phase 8: Cloudflare DNS Integration

#### 8.1 Connect ALB to Cloudflare Domain
1. Log in to your Cloudflare account
2. Select your domain
3. Go to **DNS** → **Records**
4. Add/Update a CNAME record:
   - **Name**: `@` (for root) or a subdomain (e.g., `audio`)
   - **Type**: CNAME
   - **Content**: Your ALB DNS name (from Phase 3.3)


5. Click **Save**

#### 8.2 Test DNS Resolution
Wait 2-5 minutes for DNS propagation, then test:

```bash
nslookup your-domain.com
```

Should resolve to your ALB.

#### 8.3 Access Application
Open your browser and navigate to:
```
http://your-domain.com
```

You should see the Live Audio Recording application frontend.
Now update the URL in the frontend to point to your domain instead of ALB DNS:

```bash
nano .env
REACT_APP_AUDIO_SERVER_URL=http://your-domain.com/api/
REACT_APP_AUDIO_TRANSCRIBER_URL=http://your-domain.com/transcriber/
```

---




---

## Testing and Verification

### 1. Test ALB Health Check
```bash
curl http://<YOUR_ALB_DNS>/api/health
```

Should return a successful response.

### 2. Test via Cloudflare Domain
Once DNS is propagated:
```bash
curl http://your-domain.com/api/health
```

### 3. Access Application in Browser
Open in your browser:
```
http://your-domain.com
```

You should see the Live Audio Recording application with:
- React frontend loaded
- Ability to record audio from microphone
- Real-time audio streaming to backend


## Troubleshooting

### Cannot SSH to EC2
- Verify your public IP is allowed in App-SG (SSH port 22)
- Check you're using the correct key pair
- Ensure EC2 has a public IP assigned
- Verify security group allows your IP: `ssh -i key.pem ubuntu@<EC2_IP>`

### ALB Targets Showing "Unhealthy"
1. Check security groups:
   - App-SG should allow HTTP (80) and HTTPS (443) from ALB-SG
   - Verify DB-SG allows MySQL (3306) from App-SG
2. Verify EC2 containers running: `docker compose ps`
3. Check backend logs: `docker compose logs backend`
4. Ensure RDS endpoint and credentials are correct in `.env`
5. Give targets 2-3 minutes to pass health checks

### Cannot Connect to RDS from EC2
1. Verify RDS database is in "Available" state
2. Verify security groups:
   - DB-SG should allow MySQL (3306) from App-SG
   - App-SG should allow all outbound traffic (should be default)
3. Check RDS endpoint is correct in `.env`
4. Test from EC2: `mysql -h <RDS_ENDPOINT> -u admin -p`
5. Check logs: `docker compose logs backend | grep -i "error"`

### Docker Compose Not Starting
1. Verify Docker is running: `docker ps`
2. Check `.env` file syntax (no quotes around values)
3. Verify all environment variables are set
4. Build again: `docker compose build --no-cache`
5. Check logs: `docker compose logs`

### DNS Not Resolving
1. Wait 5-10 minutes for DNS propagation
2. Clear DNS cache: `nslookup -debug your-domain.com`
3. Verify CNAME record in Cloudflare points to ALB DNS
4. Use incognito browser mode
5. Check Cloudflare DNS status in dashboard

### Application Loading Slowly
1. Check ALB target health: all should be "Healthy"
2. Monitor EC2 resources: CPU and memory usage
3. Check network connectivity between EC2 and RDS
4. Review application logs for errors
5. Verify backend health endpoint: `/api/health`

### File Permission Errors on EC2
```bash
# Give Docker permission to current user
sudo usermod -aG docker ubuntu

# Log out and back in for changes to take effect
exit
```

---

## Deployment Checklist

**Phase 0: IAM and S3**
- [ ] LabProfileRole updated with AmazonS3FullAccess policy
- [ ] S3 bucket created: `audio-recordings-<your-name>`
- [ ] S3 bucket has public read access enabled
- [ ] S3 bucket name documented

**Phase 1: VPC & Networking**
- [ ] VPC `audio-recording-vpc` created (10.0.0.0/16)
- [ ] 6 subnets created (ALB-1, ALB-2, App-1, App-2, DB-1, DB-2)
- [ ] Internet Gateway created and attached to VPC
- [ ] NAT Gateway created in ALB-1
- [ ] Public Route Table created and associated with ALB and App subnets
- [ ] Private Route Table created and associated with DB subnets

**Phase 2: Security Groups**
- [ ] ALB-SG created (HTTP 80, HTTPS 443 from 0.0.0.0/0)
- [ ] App-SG created (HTTP/HTTPS from ALB-SG, SSH from your IP)
- [ ] DB-SG created (MySQL 3306 from App-SG)

**Phase 3: Load Balancer**
- [ ] Target Group `audio-recording-tg` created (port 5000)
- [ ] ALB `audio-recording-alb` created in public subnets
- [ ] ALB DNS name copied and saved

**Phase 4: RDS Database**
- [ ] DB Subnet Group created (DB-1 and DB-2)
- [ ] RDS MySQL instance created (`audio-recording-db`)
- [ ] RDS endpoint, username, password copied and saved
- [ ] RDS in Available state
- [ ] RDS security group is DB-SG

**Phase 5: EC2 Instances**
- [ ] 2 EC2 instances launched (t2.medium, Ubuntu 22.04)
- [ ] Instance 1 in App-1 subnet with public IP
- [ ] Instance 2 in App-2 subnet with public IP
- [ ] Both instances in App-SG security group
- [ ] Both instances assigned LabProfileRole IAM instance profile
- [ ] Key pair downloaded and secured

**Phase 6: Application Configuration**
- [ ] Repository cloned on both EC2s
- [ ] Docker and Docker Compose installed on both EC2s
- [ ] `.env` file updated with RDS credentials on both EC2s
- [ ] `.env` file updated with S3 bucket name on both EC2s
- [ ] `.env` file updated with ALB DNS name on both EC2s
- [ ] Docker images built on both EC2s
- [ ] Containers running on both EC2s: `docker compose ps`
- [ ] Backend connected to RDS (check logs)
- [ ] Backend can access S3 bucket (verify IAM role attached)

**Phase 7: Load Balancer Integration**
- [ ] Both EC2 instances registered to target group
- [ ] Targets showing "Healthy" status
- [ ] ALB responding: `curl http://<ALB_DNS>/api/health`

**Phase 8: DNS Integration**
- [ ] Cloudflare CNAME record created pointing to ALB DNS
- [ ] DNS propagated (test with `nslookup`)
- [ ] Application accessible via domain: `http://your-domain.com`
- [ ] Frontend loads and responds

---

## Submission Requirements

Submit a document with the following information:

1. **S3 Bucket Name**: `_____________________`
2. **VPC ID**: `_____________________`
3. **ALB DNS Name**: `_____________________`
4. **RDS Endpoint**: `_____________________`
5. **Cloudflare Domain**: `_____________________`
6. **EC2 Instance IDs**: `_____________________`
7. **EC2 Public IP Addresses**: `_____________________`
8. **Screenshots:**
   - [ ] AWS IAM showing LabProfileRole with S3FullAccess policy attached
   - [ ] S3 bucket created and visible in S3 console
   - [ ] Target Group showing both instances as "Healthy"
   - [ ] Application running in browser (showing audio recording interface)
   - [ ] Docker containers running on EC2: `docker compose ps`
   - [ ] Backend logs showing successful database connection
9. **Verification Test:**
   - [ ] Successfully recorded 5 seconds of audio through the application
   - [ ] Screenshot of recording completion

---

## Important Notes

⚠️ **Before You Start:**
- Get your public IP address: Go to `whatismyipaddress.com`
- You'll need this to allow SSH access in App-SG
- Have your Cloudflare domain ready

⚠️ **Security Considerations:**
- Never commit `.env` file to Git (add to `.gitignore`)
- Keep RDS password secure
- App-SG should only allow SSH from your IP, not 0.0.0.0/0
- In production, enable HTTPS and use SSL certificates
- Consider enabling encryption at rest for RDS

⚠️ **Cost Estimation:**
- ALB: ~$16/month (including data processing)
- RDS Free Tier: Free for 12 months (t3.micro)
- EC2 t2.medium: ~$30/month each (×2 = $60/month)
- NAT Gateway: ~$32/month
- **Total estimated: ~$108/month** (without free tier)

💡 **To minimize costs:**
- Use Free Tier for RDS (first 12 months)
- Terminate instances when not needed
- Turn off NAT Gateway if instances don't need outbound internet
- Use t2.micro or t2.small if sufficient

⚠️ **Cleanup When Done:**
1. Delete ALB (will remove target group automatically)
2. Terminate EC2 instances
3. Delete RDS database (backup first if needed)
4. Delete NAT Gateway
5. Release Elastic IP
6. Delete VPC (will remove subnets, route tables automatically)

📝 **Useful Commands:**

SSH into EC2:
```bash
ssh -i audio-recording-key.pem ubuntu@<EC2_IP>
```

View Docker containers:
```bash
docker compose ps
docker compose logs -f
```

Check RDS from EC2:
```bash
mysql -h <RDS_ENDPOINT> -u admin -p
```

View load balancer status:
```bash
aws elbv2 describe-target-health --target-group-arn <TARGET_GROUP_ARN>
```

---

## Additional Resources

- [AWS EC2 Documentation](https://docs.aws.amazon.com/ec2/)
- [AWS RDS Documentation](https://docs.aws.amazon.com/rds/)
- [AWS ALB Documentation](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/)
- [Cloudflare DNS Documentation](https://developers.cloudflare.com/dns/)
- [Docker Documentation](https://docs.docker.com/)
