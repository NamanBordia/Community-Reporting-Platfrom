import os
import cloudinary
import cloudinary.uploader
from PIL import Image
import io

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
MAX_FILE_SIZE = 16 * 1024 * 1024  # 16MB

# Configure Cloudinary (will be initialized in app factory)
def init_cloudinary():
    """Initialize Cloudinary with environment variables"""
    cloudinary_enabled = os.getenv('CLOUDINARY_CLOUD_NAME') and \
                        os.getenv('CLOUDINARY_API_KEY') and \
                        os.getenv('CLOUDINARY_API_SECRET')
    
    if cloudinary_enabled:
        cloudinary.config(
            cloud_name=os.getenv('CLOUDINARY_CLOUD_NAME'),
            api_key=os.getenv('CLOUDINARY_API_KEY'),
            api_secret=os.getenv('CLOUDINARY_API_SECRET'),
            secure=True
        )
        print("✓ Cloudinary configured successfully")
        return True
    else:
        print("⚠️  Cloudinary not configured - using local storage")
        return False

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def upload_image_to_cloudinary(file):
    """Upload image to Cloudinary and return URL"""
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
        
        # Process image
        image = Image.open(file.stream)
        
        # Convert to RGB if necessary
        if image.mode in ('RGBA', 'LA', 'P'):
            image = image.convert('RGB')
        
        # Resize if too large (max 1920x1080)
        max_width = 1920
        max_height = 1080
        
        if image.width > max_width or image.height > max_height:
            image.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)
        
        # Convert to bytes
        img_byte_arr = io.BytesIO()
        image.save(img_byte_arr, format='JPEG', quality=85, optimize=True)
        img_byte_arr.seek(0)
        
        # Upload to Cloudinary
        result = cloudinary.uploader.upload(
            img_byte_arr,
            folder="community-reporting",
            resource_type="image",
            transformation=[
                {'quality': 'auto:good'},
                {'fetch_format': 'auto'}
            ]
        )
        
        # Return the secure URL
        return result['secure_url']
        
    except Exception as e:
        raise ValueError(f"Failed to upload image: {str(e)}")

def delete_image_from_cloudinary(image_url):
    """Delete image from Cloudinary"""
    try:
        if image_url and 'cloudinary.com' in image_url:
            # Extract public_id from URL
            # URL format: https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/{public_id}.{format}
            parts = image_url.split('/')
            if 'upload' in parts:
                upload_index = parts.index('upload')
                if upload_index + 2 < len(parts):
                    # Get public_id (with folder path but without extension)
                    public_id_with_ext = '/'.join(parts[upload_index + 2:])
                    public_id = public_id_with_ext.rsplit('.', 1)[0]
                    
                    result = cloudinary.uploader.destroy(public_id)
                    return result.get('result') == 'ok'
        return False
    except Exception as e:
        print(f"Failed to delete image from Cloudinary: {e}")
        return False

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
