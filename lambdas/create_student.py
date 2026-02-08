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
    body_raw = event.get('body', {})
    if body_raw and isinstance(body_raw, str):
            try:
                data = json.loads(body_raw)
            except json.JSONDecodeError:
                pass
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
            sql = "INSERT INTO students (name, email, password) VALUES (%s, %s, %s)"
            cursor.execute(sql, (name, email, password))
            connection.commit()
            result = {"message": "Student created successfully"}
    except Exception as e:
        connection.close()

    return {
        "statusCode": 200,
        "body": json.dumps(result, default=str)
    }