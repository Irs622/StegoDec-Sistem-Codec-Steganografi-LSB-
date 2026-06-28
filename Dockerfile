# Use official lightweight Python image
FROM python:3.9-slim

# Set working directory
WORKDIR /code

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Create uploads directory and set permissions
RUN mkdir -p /code/uploads && chmod 777 /code/uploads

# Copy application files
COPY . .

# Set env for Hugging Face (default port 7860)
ENV PORT=7860

# Expose port 7860
EXPOSE 7860

# Command to run the application
CMD ["python", "app.py"]
