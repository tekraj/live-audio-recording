import json
import pymysql

def lambda_handler(event, context):
    try:
        connection = pymysql.connect(
                host='database-1.cpum1y0g7b8g.us-east-1.rds.amazonaws.com',
                user='admin',
                password='urGqWlnJ8Mt3ldEHwFHN',
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
        password = query_params.get('password') or body.get('password')
        
        print(f"Login Attempt - Username: {username}")
        
        with connection.cursor(pymysql.cursors.DictCursor) as cursor:
            sql = "SELECT id, username, name FROM students WHERE username = %s AND password = %s"
            cursor.execute(sql, (username, password))
            student = cursor.fetchone()
        
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
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({"error": "Internal Server Error"})
        }
    
    finally:
        connection.close()