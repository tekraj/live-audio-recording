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
        with connection.cursor(pymysql.cursors.DictCursor) as cursor:
            sql = "SELECT id, email, name FROM students"
            cursor.execute(sql)
            students = cursor.fetchall()
            if not students:
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS students (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        email VARCHAR(255) UNIQUE NOT NULL,
                        name VARCHAR(255) NOT NULL
                    )
                """)
                connection.commit()
                cursor.execute(sql)
                students = cursor.fetchall()
            
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps(students, default=str)
        }
    except Exception as e:
        print(f"Query error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({"error": "Failed to fetch students"})
        }
    finally:
        connection.close()