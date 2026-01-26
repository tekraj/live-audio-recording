# Audio Transcription Service - Python Flask
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY app/ .

# Create recordings directory
RUN mkdir -p /app/recordings

# Expose port
EXPOSE 5555

# Run the application
CMD ["python", "server.py"]
