## 1. Add S3 Permissions to IAM User
- Go to the AWS Management Console and type "IAM" in the search bar at the top.
- Select Roles from the left sidebar.
- Search for "LabRole"  and click on it.
- Click on the "Add permissions" button.
- Choose "Attach policies directly".
- Search for "AmazonS3FullAccess" in the policy list.
- Check the box next to "AmazonS3FullAccess".
- Review the permissions and click on the "Add permissions" button to finalize.

## Create S3 Bucket
- Go to the AWS Management Console and type "S3" in the search bar at the top.
- Click on the "Create bucket" button.
- Enter a unique bucket name (e.g., "liveaudiorecordings<yourname>").
- Select the AWS Region closest to your users.
- Leave the other settings as default and click on the "Create bucket" button at the bottom.

## Create EC2 Instance
- Go to the AWS Management Console and type "EC2" in the search bar at the top.
- Click on the "Launch Instance" button.
- Choose Ubuntu 
- Select min 2 CPU and 4 GB RAM instance type (e.g., t2.medium).
- Select Http and Https in the security group settings to allow web traffic.
- Attach an existing key pair or create a new one to access the instance.
- On advanced details on IAM role select LabProfile role.
- Click on the "Launch Instance" button to create the instance.

- Open the EC2 CConsole
- Clone the repository https://github.com/tekraj/live-audio-recording.git
- Go to live-audio-recording directory
- Run sudo chmod +x aws-setup.sh
- Run sudo ./aws-setup.sh
- Update the .env file with the S3 bucket name created earlier and replace localhost with the IP of the EC2 instance.
- Run sudo docker compose build
- RUn sudo docker compose up -d


Now open the IP of the EC2 instance in the browser to access the application.
## Notes
 for testing with ipsecures origins, you may need to enable the following flag in Chrome:
chrome://flags/#unsafely-treat-insecure-origin-as-secure