from django.db import models

GENDER_CHOICES = [
    ('M', 'Male'),
    ('F', 'Female'),
    ('O', 'Other'),
]

ACCOUNT_STATUS_CHOICES = [
    ('active', 'Active'),
    ('inactive', 'Inactive'),
]

PERMISSION_LEVELS = [
    ('admin', 'Administrator'),
    ('viewer', 'Viewer'),
    ('other', 'Other'),
]

TABLE_RELATIONSHIPS = {
    'User': ['CartItem', 'Order', 'UserBrowseHistory'],
    'BookMeta': [],
    'Book': ['BookAuthor', 'RecommendBooks', 'BookFile', 'OrderDetail', 'CartItem', 'UserBrowseHistory'],
    'Category': [],
    'Publisher': [],
    'Author': [],
    'File': [],
    'Order': ['OrderDetail'],
    'BackendUser': ['Permission'],
}

CORE_TABLES = ['User', 'BookMeta', 'Category', 'Publisher', 'Author', 'File', 'BackendUser', 'Book', 'Order']

FILE_TYPES = [
    ('cover', 'Cover Image'),
    ('preview', 'Preview'),
    ('content', 'Content'),
    ('other', 'Other'),
]

BOOK_STATUS_CHOICES = [
    ('available', 'Available'),
    ('out_of_stock', 'Out of Stock'),
    ('coming_soon', 'Coming Soon'),
    ('discontinued', 'Discontinued'),
]

ORDER_STATUS_CHOICES = [
    ('pending', 'Pending'),
    ('paid', 'Paid'),
    ('shipped', 'Shipped'),
    ('delivered', 'Delivered'),
    ('canceled', 'Canceled'),
]

class User(models.Model):
    user_id = models.AutoField(primary_key=True)
    username = models.CharField(max_length=100, unique=True)
    real_name = models.CharField(max_length=100)
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES)
    email = models.EmailField(unique=True)
    registration_time = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=ACCOUNT_STATUS_CHOICES, default='active')

    def __str__(self):
        return self.username

class BackendUser(models.Model):
    backend_user_id = models.AutoField(primary_key=True)
    username = models.CharField(max_length=100, unique=True)
    password = models.CharField(max_length=128)
    status = models.CharField(max_length=20, choices=ACCOUNT_STATUS_CHOICES, default='active')

    def __str__(self):
        return self.username

class Category(models.Model):
    category_id = models.AutoField(primary_key=True)
    category_name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.category_name

class Publisher(models.Model):
    publisher_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)
    contact = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return self.name

class BookMeta(models.Model):
    ISBN = models.CharField(max_length=20, primary_key=True)
    name = models.CharField(max_length=255)

    def __str__(self):
        return f"{self.name} ({self.ISBN})"

class Author(models.Model):
    author_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)
    biography = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name

class File(models.Model):
    file_id = models.AutoField(primary_key=True)
    file_path = models.CharField(max_length=255)
    upload_time = models.DateTimeField(auto_now_add=True)
    file_type = models.CharField(max_length=20, choices=FILE_TYPES)

    def __str__(self):
        return self.file_path

class Book(models.Model):
    book_id = models.AutoField(primary_key=True)
    ISBN = models.ForeignKey(BookMeta, on_delete=models.CASCADE)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True)
    publisher = models.ForeignKey(Publisher, on_delete=models.SET_NULL, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=BOOK_STATUS_CHOICES, default='available')
    stock = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.ISBN.name}"

class BookAuthor(models.Model):
    author = models.ForeignKey(Author, on_delete=models.CASCADE)
    book = models.ForeignKey(Book, on_delete=models.CASCADE)

    class Meta:
        unique_together = ('author', 'book')

    def __str__(self):
        return f"{self.author.name} - {self.book.ISBN.name}"

class RecommendBooks(models.Model):
    recommend_id = models.IntegerField(primary_key=True)
    book = models.ForeignKey(Book, on_delete=models.CASCADE)

    def __str__(self):
        return f"Recommend {self.recommend_id} - {self.book_id.name}"

class BookFile(models.Model):
    book = models.ForeignKey(Book, on_delete=models.CASCADE)
    file = models.ForeignKey(File, on_delete=models.CASCADE)

    class Meta:
        unique_together = ('book', 'file')

class CartItem(models.Model):
    cart_item_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    book = models.ForeignKey(Book, on_delete=models.CASCADE)
    quantity = models.IntegerField(default=1)

    def __str__(self):
        return f"{self.quantity} x {self.book.ISBN.name}"

class Order(models.Model):
    order_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    order_time = models.DateTimeField(auto_now_add=True)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    shipping_address = models.TextField()
    status = models.CharField(max_length=20, choices=ORDER_STATUS_CHOICES, default='pending')

    def __str__(self):
        return f"Order {self.order_id} by {self.user.username}"

class OrderDetail(models.Model):
    order_detail_id = models.AutoField(primary_key=True)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='details')
    book = models.ForeignKey(Book, on_delete=models.CASCADE)
    quantity = models.IntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.quantity} x {self.book.ISBN.name}"

class UserBrowseHistory(models.Model):
    browse_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    book = models.ForeignKey(Book, on_delete=models.CASCADE)
    browse_time = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "User browse histories"

class Permission(models.Model):
    permission_id = models.AutoField(primary_key=True)
    backend_user = models.ForeignKey(BackendUser, on_delete=models.CASCADE)
    permission_level = models.CharField(max_length=20, choices=PERMISSION_LEVELS)
    table_name = models.CharField(max_length=100)

    def __str__(self):
        return f"{self.backend_user.username} - {self.table_name} - {self.permission_level}"