import os
import uuid
from werkzeug.utils import secure_filename
from PIL import Image
import io

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
MAX_FILE_SIZE = 16 * 1024 * 1024  # 16MB

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def save_image(file, upload_folder):
    """Save uploaded image with validation and optimization"""
    try:
        # Validate file
        if not file or not file.filename:
            raise ValueError("No file provided")
        
        if not allowed_file(file.filename):
            raise ValueError(f"File type not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}")
        
        # Check file size
        file.seek(0, 2)  # Seek to end
        file_size = file.tell()
        file.seek(0)  # Reset to beginning
        
        if file_size > MAX_FILE_SIZE:
            raise ValueError(f"File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB")
        
        # Generate unique filename
        file_ext = file.filename.rsplit('.', 1)[1].lower()
        unique_filename = f"{uuid.uuid4().hex}.{file_ext}"
        
        # Create upload directory if it doesn't exist
        os.makedirs(upload_folder, exist_ok=True)
        
        # Process and save image
        image = Image.open(file.stream)
        
        # Convert to RGB if necessary
        if image.mode in ('RGBA', 'LA', 'P'):
            image = image.convert('RGB')
        
        # Resize if too large (max 1920x1080)
        max_width = 1920
        max_height = 1080
        
        if image.width > max_width or image.height > max_height:
            image.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)
        
        # Save optimized image
        file_path = os.path.join(upload_folder, unique_filename)
        
        # Save with optimization
        if file_ext == 'jpeg' or file_ext == 'jpg':
            image.save(file_path, 'JPEG', quality=85, optimize=True)
        elif file_ext == 'png':
            image.save(file_path, 'PNG', optimize=True)
        elif file_ext == 'webp':
            image.save(file_path, 'WEBP', quality=85)
        else:
            image.save(file_path)
        
        return unique_filename
        
    except Exception as e:
        raise ValueError(f"Failed to save image: {str(e)}")

def delete_image(filename, upload_folder):
    """Delete image file"""
    try:
        if filename:
            file_path = os.path.join(upload_folder, filename)
            if os.path.exists(file_path):
                os.remove(file_path)
                return True
        return False
    except Exception as e:
        print(f"Failed to delete image {filename}: {e}")
        return False

def get_image_url(filename, base_url=None):
    """Get full URL for image"""
    if not filename:
        return None
    
    if base_url:
        return f"{base_url}/uploads/{filename}"
    
    return f"/uploads/{filename}"

def validate_image_file(file):
    """Validate image file before processing"""
    errors = []
    
    if not file:
        errors.append("No file provided")
        return errors
    
    if not file.filename:
        errors.append("No filename provided")
        return errors
    
    # Check file extension
    if not allowed_file(file.filename):
        errors.append(f"File type not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}")
    
    # Check file size
    try:
        file.seek(0, 2)  # Seek to end
        file_size = file.tell()
        file.seek(0)  # Reset to beginning
        
        if file_size > MAX_FILE_SIZE:
            errors.append(f"File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB")
    except Exception:
        errors.append("Unable to read file size")
    
    # Try to open as image
    try:
        image = Image.open(file.stream)
        file.seek(0)  # Reset to beginning
        
        # Check image dimensions
        if image.width > 5000 or image.height > 5000:
            errors.append("Image dimensions too large")
        
    except Exception:
        errors.append("Invalid image file")
    
    return errors

def create_thumbnail(image_path, thumbnail_path, size=(300, 300)):
    """Create thumbnail from image"""
    try:
        with Image.open(image_path) as image:
            # Convert to RGB if necessary
            if image.mode in ('RGBA', 'LA', 'P'):
                image = image.convert('RGB')
            
            # Create thumbnail
            image.thumbnail(size, Image.Resampling.LANCZOS)
            
            # Save thumbnail
            image.save(thumbnail_path, 'JPEG', quality=85, optimize=True)
            
        return True
    except Exception as e:
        print(f"Failed to create thumbnail: {e}")
        return False 