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
    
    query_params = event.get('queryStringParameters', {})
    if not query_params or not query_params.get('id'):
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({"error": "Missing required parameter: id"})
        }
    
    student_id = query_params.get('id')
    
    try:
        with connection.cursor(pymysql.cursors.DictCursor) as cursor:
            sql = "DELETE FROM students WHERE id = %s"
            cursor.execute(sql, (student_id,))
            connection.commit()
            
            if cursor.rowcount == 0:
                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json'},
                    'body': json.dumps({"error": "Student not found"})
                }
            
            result = {"message": "Student deleted successfully"}
    except Exception as e:
        print(f"Database error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({"error": "Failed to delete student"})
        }
    finally:
        connection.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json'},
        'body': json.dumps(result)
    }