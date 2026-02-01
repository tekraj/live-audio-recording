import json

STUDENTS = [
    {"id": 1, "username": "jdoe", "password": "password123", "name": "John Doe"},
    {"id": 2, "username": "asmith", "password": "secure456", "name": "Alice Smith"}
]
def lambda_handler(event, context):
    safe_students = [
        {k: v for k, v in student.items() if k != 'password'} 
        for student in STUDENTS
    ]
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json'},
        'body': json.dumps(safe_students)
    }