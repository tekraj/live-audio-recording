import json

STUDENTS = [
    {"id": 1, "username": "jdoe", "password": "password123", "name": "John Doe"},
    {"id": 2, "username": "asmith", "password": "secure456", "name": "Alice Smith"}
]

def lambda_handler(event, context):
    try:
        query_params = event.get('queryStringParameters') or {}
        
        body_raw = event.get('body', {})
        body = {}
        if body_raw and isinstance(body_raw, str):
            try:
                body = json.loads(body_raw)
            except json.JSONDecodeError:
                pass 

        username = query_params.get('username') or body.get('username')
        password = query_params.get('password') or query_params.get('passwod') or body.get('password')
        
        print(f"Login Attempt - Username: {username}, Password Provided: {'Yes' if password else 'No'}")

        student = next(
            ({k: v for k, v in s.items() if k != 'password'}
             for s in STUDENTS
             if s['username'] == username and s['password'] == password), 
            None
        )
        
        if student:
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({"student": student, "message": "Login successful"})
            }
        else:
            return {
                'statusCode': 401,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({"message": "Invalid username or password"})
            }

    except Exception as e:
        print(f"Error: {str(e)}") # Log the actual error
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({"error": "Internal Server Error"})
        }