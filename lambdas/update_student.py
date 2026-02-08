import json
import pymysql

def lambda_handler(event, context):
    try:
        connection = pymysql.connect(
            host='example-db-host',
            user='admin',
            password='password@123',
            database='student_db',
            connect_timeout=5
        )
    except Exception as e:
        print(f"Database connection error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({"error": "Database connection failed"})
        }
    
    # Get ID from query parameters
    student_id = event.get('queryStringParameters', {}).get('id') if event.get('queryStringParameters') else None
    
    if not student_id:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({"error": "Missing student ID in query parameters"})
        }
    
    # Parse request body
    body_raw = event.get('body', {})
    if body_raw and isinstance(body_raw, str):
        try:
            data = json.loads(body_raw)
        except json.JSONDecodeError:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({"error": "Invalid JSON in request body"})
            }
    else:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({"error": "Invalid request body"})
        }
    
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    
    try:
        with connection.cursor(pymysql.cursors.DictCursor) as cursor:
            sql = "UPDATE students SET name=%s, email=%s, password=%s WHERE id=%s"
            cursor.execute(sql, (name, email, password, student_id))
            connection.commit()
            result = {"message": "Student updated successfully"}
    except Exception as e:
        connection.close()
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({"error": str(e)})
        }
    
    connection.close()
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json'},
        'body': json.dumps(result, default=str)
    }