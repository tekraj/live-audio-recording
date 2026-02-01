## Create Lambda functions and Test them
## 1 Create Get students data Lambda function
- Go to the AWS Management Console and type "Lambda" in the search bar at the top.
- Click on the "Create function" button.
- Choose "Author from scratch".
- Enter the function name as "get_students".
- Choose Python 3.12 or higher as the runtime.
- Under Permissions, choose "Use an existing role" and select "LabRole".
- Click on the "Create function" button at the bottom.
- In the function code section, replace the default code with the code from lambdas/get_students.py file.
- Click on the "Deploy" button to save the changes.

### Test Get students data Lambda function
- Click on Configuration
- Click on function URL from the left sidebar.
- Click on "Create function URL".
- Choose "None" for Auth type.
- Click on "Create".
- Copy the Function URL.
- Open a new browser tab and paste the Function URL to test the Lambda function.
## 2 Create Login Lambda function
- Go to the AWS Management Console and type "Lambda" in the search bar at the top.
- Click on the "Create function" button.
- Choose "Author from scratch".
- Enter the function name as "login".
- Choose Python 3.12 or higher as the runtime.
- Under Permissions, choose "Use an existing role" and select "LabRole".
- Click on the "Create function" button at the bottom.
- In the function code section, replace the default code with the code from lambdas/login.py file.
- Click on the "Deploy" button to save the changes.
### Test Login Lambda function
- Click on Configuration
- Click on function URL from the left sidebar.
- Click on "Create function URL".
- Choose "None" for Auth type.
- Click on "Create".
- Copy the Function URL.
- Open a new browser tab and paste the Function URL with query parameters to test the Lambda function.
  For example: `<lambda url>?username=jdoe&passwod=password123`

- You can also test with POST method using curl or Postman by sending JSON body with username and password.
  For example:
  ```
  {
    "username": "jdoe",
    "password": "password123"
  }
  ```