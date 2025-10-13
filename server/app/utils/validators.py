import re
from datetime import datetime

def validate_email(email):
    """Validate email format"""
    if not email:
        return False
    
    # Basic email regex pattern
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_password(password):
    """Validate password strength"""
    if not password:
        return False
    
    # Password must be at least 8 characters long
    if len(password) < 8:
        return False
    
    # Password must contain at least one letter and one number
    has_letter = re.search(r'[a-zA-Z]', password)
    has_number = re.search(r'\d', password)
    
    return has_letter and has_number

def validate_issue_data(data):
    """Validate issue data"""
    # Validate title
    if not data.get('title') or len(data['title'].strip()) < 5:
        return 'Title must be at least 5 characters long'
    
    if len(data['title'].strip()) > 200:
        return 'Title must be less than 200 characters'
    
    # Validate description
    if not data.get('description') or len(data['description'].strip()) < 10:
        return 'Description must be at least 10 characters long'
    
    if len(data['description'].strip()) > 2000:
        return 'Description must be less than 2000 characters'
    
    # Validate issue type
    valid_types = [
        'pothole', 'streetlight', 'garbage', 'traffic',
        'sidewalk', 'drainage', 'noise', 'other'
    ]
    
    if not data.get('issue_type') or data['issue_type'] not in valid_types:
        return 'Invalid issue type'
    
    # Validate coordinates
    try:
        lat = float(data.get('latitude', 0))
        lng = float(data.get('longitude', 0))
        
        if not (-90 <= lat <= 90):
            return 'Invalid latitude value'
        
        if not (-180 <= lng <= 180):
            return 'Invalid longitude value'
            
    except (ValueError, TypeError):
        return 'Invalid coordinates'
    
    # Validate priority
    valid_priorities = ['low', 'medium', 'high', 'urgent']
    if data.get('priority') and data['priority'] not in valid_priorities:
        return 'Invalid priority level'
    
    return None

def validate_comment_data(data):
    """Validate comment data"""
    if not data.get('content') or len(data['content'].strip()) < 1:
        return 'Comment cannot be empty'
    
    if len(data['content'].strip()) > 1000:
        return 'Comment must be less than 1000 characters'
    
    return None

def validate_user_data(data):
    """Validate user registration/update data"""
    # Validate first name
    if not data.get('first_name') or len(data['first_name'].strip()) < 2:
        return 'First name must be at least 2 characters long'
    
    if len(data['first_name'].strip()) > 50:
        return 'First name must be less than 50 characters'
    
    # Validate last name
    if not data.get('last_name') or len(data['last_name'].strip()) < 2:
        return 'Last name must be at least 2 characters long'
    
    if len(data['last_name'].strip()) > 50:
        return 'Last name must be less than 50 characters'
    
    # Validate email
    if not validate_email(data.get('email', '')):
        return 'Invalid email format'
    
    # Validate password (for registration)
    if data.get('password') and not validate_password(data['password']):
        return 'Password must be at least 8 characters long and contain letters and numbers'
    
    # Validate role
    valid_roles = ['resident', 'admin']
    if data.get('role') and data['role'] not in valid_roles:
        return 'Invalid role'
    
    return None

def sanitize_input(text):
    """Basic input sanitization"""
    if not text:
        return text
    
    # Remove potentially dangerous characters
    text = re.sub(r'[<>]', '', text)
    return text.strip()

def validate_date_format(date_string, format='%Y-%m-%d'):
    """Validate date string format"""
    try:
        datetime.strptime(date_string, format)
        return True
    except ValueError:
        return False

def validate_file_upload(file, allowed_extensions=None, max_size_mb=16):
    """Validate file upload"""
    if not file:
        return 'No file provided'
    
    if not file.filename:
        return 'No filename provided'
    
    # Check file extension
    if allowed_extensions:
        file_ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
        if file_ext not in allowed_extensions:
            return f'File type not allowed. Allowed types: {", ".join(allowed_extensions)}'
    
    # Check file size
    file.seek(0, 2)  # Seek to end
    file_size = file.tell()
    file.seek(0)  # Reset to beginning
    
    max_size_bytes = max_size_mb * 1024 * 1024
    if file_size > max_size_bytes:
        return f'File too large. Maximum size: {max_size_mb}MB'
    
    return None 