from rest_framework import serializers
from .models import *
import backend.settings as settings
import numpy as np
from PIL import Image
import os
from sklearn.cluster import KMeans

class UserRegistrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['username', 'real_name', 'gender', 'email']
        
    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username already exists")
        return value
        
    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already exists")
        return value


class BookImportSerializer(serializers.Serializer):
    ISBN = serializers.CharField(required=True)
    name = serializers.CharField(required=True)
    author_name = serializers.CharField(required=False)
    author_names = serializers.ListField(
        child=serializers.CharField(),
        required=False
    )
    author_biography = serializers.CharField(required=False)
    category_name = serializers.CharField(required=True)
    publisher_name = serializers.CharField(required=True)
    price = serializers.DecimalField(max_digits=10, decimal_places=2, required=True)
    stock = serializers.IntegerField(required=True)
    description = serializers.CharField(required=False, default='')
    status = serializers.CharField(required=True)
    cover = serializers.ImageField(required=False)
    
    def validate(self, data):
        if 'author_name' not in data and ('author_names' not in data or not data['author_names']):
            raise serializers.ValidationError("Either author_name or author_names must be provided")
        return data

class BookSerializer(serializers.ModelSerializer):
    cover_url = serializers.SerializerMethodField()
    isbn_name = serializers.SerializerMethodField()
    category_name = serializers.SerializerMethodField()
    publisher_name = serializers.SerializerMethodField()
    authors = serializers.SerializerMethodField()
    author_biographies = serializers.SerializerMethodField()
    bg_color = serializers.SerializerMethodField()
    
    class Meta:
        model = Book
        fields = ['book_id', 'price', 'description', 'status', 'stock', 
                 'ISBN', 'category', 'publisher', 'cover_url', 
                 'isbn_name', 'category_name', 'publisher_name',
                 'authors', 'author_biographies', 'bg_color']
    def get_dark_dominant_colors(self, image_path, num_colors=5, resize_to=(100, 100), fade_ratio=0.85):
        try:
            image = Image.open(image_path).convert('RGB')
            image = image.resize(resize_to)
            pixels = np.array(image).reshape(-1, 3)
            kmeans = KMeans(n_clusters=num_colors, random_state=0)
            kmeans.fit(pixels)
            colors = np.round(kmeans.cluster_centers_).astype(int)
            counts = np.bincount(kmeans.labels_)
            brightness = colors @ [0.299, 0.587, 0.114]
            scores = counts * (1 - brightness / 255)
            sorted_indices = np.argsort(-scores)
            faded_colors = np.round(colors[sorted_indices] * (1 - fade_ratio) + 255 * fade_ratio).astype(int)
            return faded_colors
        except Exception as e:
            print(f"Error in color extraction: {e}")
            return np.array([[245, 245, 245]])
                 
    def get_bg_color(self, obj):
        try:
            book_file = BookFile.objects.filter(book=obj).select_related('file').filter(file__file_type='cover').first()
            if book_file and book_file.file:
                image_path = os.path.join(settings.MEDIA_ROOT, book_file.file.file_path)
                if os.path.exists(image_path):
                    colors = self.get_dark_dominant_colors(image_path)
                    if len(colors) > 0:
                        r, g, b = colors[0]
                        return f'#{r:02x}{g:02x}{b:02x}'
        except Exception as e:
            print(f"Error getting background color: {e}")
        return '#000000'
        
    
    def get_cover_url(self, obj):
        try:
            book_file = BookFile.objects.filter(book=obj).select_related('file').filter(file__file_type='cover').first()
            if book_file and book_file.file:
                return f'{settings.MEDIA_URL}{book_file.file.file_path}'
        except Exception as e:
            print(f"Error getting cover URL: {e}")
        return None
    
    def get_isbn_name(self, obj):
        return obj.ISBN.name if obj.ISBN else None
    
    def get_category_name(self, obj):
        return obj.category.category_name if obj.category else None
    
    def get_publisher_name(self, obj):
        return obj.publisher.name if obj.publisher else None
        
    def get_authors(self, obj):
        try:
            book_authors = BookAuthor.objects.filter(book=obj).select_related('author')
            return [ba.author.name for ba in book_authors]
        except Exception as e:
            print(f"Error getting authors: {e}")
            return []
    
    def get_author_biographies(self, obj):
        try:
            book_authors = BookAuthor.objects.filter(book=obj).select_related('author')
            return {ba.author.name: ba.author.biography for ba in book_authors}
        except Exception as e:
            print(f"Error getting author biographies: {e}")
            return {}

class TablePermissionSerializer(serializers.Serializer):
    table = serializers.ChoiceField(
        choices=[(table, table) for table in CORE_TABLES],
        error_messages={
            'invalid_choice': f'Table must be one of: {", ".join(CORE_TABLES)}'
        }
    )
    permission_level = serializers.ChoiceField(
        choices=PERMISSION_LEVELS,
        error_messages={
            'invalid_choice': 'Permission level must be viewer, other, or admin'
        }
    )

class BackendUserRegistrationSerializer(serializers.ModelSerializer):
    default_permission_level = serializers.ChoiceField(
        choices=PERMISSION_LEVELS,
        default='viewer',
        error_messages={
            'invalid_choice': 'Permission level must be viewer, other, or admin'
        }
    )
    
    table_permissions = TablePermissionSerializer(many=True, required=False)
    
    class Meta:
        model = BackendUser
        fields = ['username', 'password', 'default_permission_level', 'table_permissions']
        extra_kwargs = {
            'username': {'required': True},
            'password': {'required': True, 'write_only': True}
        }
    
    def validate_username(self, value):
        if BackendUser.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username already exists")
        return value

class BackendUserLoginSerializer(serializers.Serializer):
    username = serializers.CharField(required=True)
    password = serializers.CharField(required=True, write_only=True)
    
    def validate(self, data):
        username = data.get('username')
        password = data.get('password')
        
        user = BackendUser.objects.filter(username=username).first()
        if not user:
            raise serializers.ValidationError("User not found")
            
        if user.password != password:
            raise serializers.ValidationError("Invalid password")
            
        if user.status != 'active':
            raise serializers.ValidationError(f"User account is {user.status}")
            
        return data

class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['real_name', 'gender', 'email', 'status']
        extra_kwargs = {
            'username': {'read_only': True}
        }
    
    def validate_email(self, value):
        instance = self.instance
        if User.objects.exclude(user_id=instance.user_id).filter(email=value).exists():
            raise serializers.ValidationError("Email already exists for another user")
        return value


class OrderItemSerializer(serializers.Serializer):
    book_id = serializers.IntegerField(required=True)
    quantity = serializers.IntegerField(required=True, min_value=1)

class CreateOrderSerializer(serializers.Serializer):
    username = serializers.CharField(required=True)
    shipping_address = serializers.CharField(required=True)
    cart_items = OrderItemSerializer(many=True, required=True)
