from django.http import HttpResponse
from django.shortcuts import render,redirect
from rest_framework import generics
from .serializers import *
from rest_framework.renderers import JSONRenderer, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import JSONParser
from django.db import transaction
import os
from django.conf import settings
import random
from datetime import datetime
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

class RecommendBooksImportVIEW(APIView):
    def post(self, request):
        try:
            index = request.data.get('index', '')
            book_id = request.data.get('book_id', '')
            try:
                index = int(index)
                book_id = int(book_id)
            except ValueError:
                return Response({
                    "error": "Index and book_id must be integers"
                }, status=status.HTTP_400_BAD_REQUEST)
            if not Book.objects.filter(book_id=book_id).exists():
                return Response({
                    "error": f"Book with id {book_id} does not exist"
                }, status=status.HTTP_404_NOT_FOUND)
            if index > 30 or index < 0:
                return Response({
                    "error": f"Index '{index}' out of range [0,30)"
                }, status=status.HTTP_400_BAD_REQUEST)
            RecommendBooks.objects.create(recommend_id=index, book_id=book_id)

            return Response({
                "index": index,
                "book_id": book_id,
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({
                "error": str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

class BookListALLAPIVIEW(generics.ListAPIView):
    renderer_classes = [JSONRenderer]
    queryset = Book.objects.all()
    serializer_class = BookSerializer

class RandomBooksView(APIView):
    @staticmethod
    def string_to_numeric(s):
        return ''.join(str(ord(c)) for c in s)

    def get_randomized_books(self, username):
        all_books = list(Book.objects.all())
        
        random.seed(int(datetime.now().strftime("%Y%m%d"))+int(self.string_to_numeric(username)))
        random.shuffle(all_books)
        
        return all_books
    def get(self, request):
        try:
            i_param = request.query_params.get('i')
            if i_param is None:
                i_param = request.data.get('i', '0')
            i = int(i_param)
            
            username = request.query_params.get('username')
            if username is None:
                username = request.data.get('username')
            
            if not username:
                return Response({
                    "error": "Username is required"
                }, status=status.HTTP_400_BAD_REQUEST)
            randomized_books = self.get_randomized_books(username)
            if i >= len(randomized_books):
                return Response({
                    "message": "Index out of range",
                    "total_books": len(randomized_books)
                }, status=status.HTTP_400_BAD_REQUEST)
                
            end_index = min(i + 20, len(randomized_books))
            selected_books = randomized_books[i:end_index]

            serializer = BookSerializer(selected_books, many=True)
            
            return Response({
                "count": len(selected_books),
                "start_index": i,
                "end_index": end_index - 1,
                "books": serializer.data
            })
            
        except ValueError:
            return Response({
                "error": "Invalid index parameter"
            }, status=status.HTTP_400_BAD_REQUEST)

class BookEveryDayAPIView(APIView):
    def get_randomized_books(self):
        all_books = list(Book.objects.all())
        random.seed(int(datetime.now().strftime("%Y%m%d")))
        random.shuffle(all_books)
        return all_books

    def get(self, request):
        try:
            randomized_books = self.get_randomized_books()
            if not randomized_books:
                return Response({
                    "error": "No books available"
                }, status=status.HTTP_404_NOT_FOUND)
            selected_book = randomized_books[0]
            serializer = BookSerializer(selected_book)

            return Response({
                "book": serializer.data
            })

        except Exception as e:
            return Response({
                "error": str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

class RecommendBooksListAPIVIEW(APIView):
    def get(self, request):
        try:
            recommended = RecommendBooks.objects.all()
            
            if not recommended:
                return Response({
                    "message": "No recommended books found"
                }, status=status.HTTP_404_NOT_FOUND)

            book_ids = [rec.book_id for rec in recommended]
            books = Book.objects.filter(book_id__in=book_ids)
            
            recommended_books = []
            for rec in recommended:
                book = books.filter(book_id=rec.book_id).first()
                if book:
                    recommended_books.append({
                        "position": rec.recommend_id,
                        "book": BookSerializer(book).data
                    })
            
            return Response({
                "count": len(recommended_books),
                "recommendations": recommended_books
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                "error": str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

class CategoryListVIEW(generics.ListAPIView):
    renderer_classes = [JSONRenderer]

    def get(self, request):
        category_names = Category.objects.values_list('category_name', flat=True).distinct()
        return Response(list(category_names))


class CategoryDetailListVIEW(APIView):
    def get(self, request):
        try:
            category_name = request.query_params.get('category')
            if not category_name:
                return Response({
                    "error": "category is required"
                }, status=status.HTTP_400_BAD_REQUEST)

            if not Category.objects.filter(category_name=category_name).exists():
                return Response({
                    "error": f"Category '{category_name}' not found"
                }, status=status.HTTP_404_NOT_FOUND)

            category = Category.objects.get(category_name=category_name)
            books = Book.objects.filter(category=category)
            serializer = BookSerializer(books, many=True)

            return Response({
                "category": category_name,
                "count": books.count(),
                "books": serializer.data
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                "error": str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

from django.db.models import Q

class BookSearchAPIView(APIView):

    def get_search_results(self, search_query):
        if not search_query:
            return None, {"error": "Please provide a search term using the 'q' parameter"}

        keywords = search_query.split()
        books = Book.objects.all()

        for keyword in keywords:
            keyword_query = (
                Q(ISBN__name__icontains=keyword) |
                # Q(description__icontains=keyword) |
                Q(ISBN__ISBN__icontains=keyword) |
                Q(category__category_name__icontains=keyword) |
                Q(publisher__name__icontains=keyword) |
                Q(bookauthor__author__name__icontains=keyword)
            )
            books = books.filter(keyword_query)
        
        return books.distinct(), None

    def post(self, request):
        try:
            search_query = request.data.get('q', '')
            books, error = self.get_search_results(search_query)
            if error:
                return Response(error, status=status.HTTP_400_BAD_REQUEST)

            serializer = BookSerializer(books, many=True)
            return Response({
                "search_term": search_query,
                "count": books.count(),
                "books": serializer.data
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                "error": str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

class UserRegistrationView(APIView):
    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({
                "message": "Registration successful",
                "data": serializer.data
            }, status=status.HTTP_201_CREATED)

        errors = {}
        for field, messages in serializer.errors.items():
            errors[field] = messages[0] if messages else "Unknown error"

        return Response({
            "message": "Registration failed",
            "errors": errors
        }, status=status.HTTP_400_BAD_REQUEST)

class UserLoginView(APIView):
    parser_classes = [JSONParser]

    def post(self, request):
        username = request.data.get('username')
        user = User.objects.filter(username=username).first()

        if User.objects.filter(username=username).exists():
            user = User.objects.filter(username=username).first()
            if user.status == 'active':
                return Response({
                    "message": "Login successful",
                    "data": {"username": user.username,
                             "user_id": user.user_id,
                             "real_name": user.real_name,
                             "gender": user.gender,
                             "email": user.email,
                             "status": user.status,
                             "registration": user.registration_time,}
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    "message": f"Login failed: the user status is{user.status}",
                    "errors": {"error": f"user status is {user.status}"}
                }, status=status.HTTP_401_UNAUTHORIZED)
        else:
            return Response({
                "message": "Login failed: user not found",
                "errors": {"error": "Unauthorized"}
            }, status=status.HTTP_401_UNAUTHORIZED)

class UserCloseView(APIView):
    parser_classes = [JSONParser]
    @transaction.atomic
    def post(self, request):
        try:
            username = request.data.get('username')
            
            if not username:
                return Response({
                    "message": "Delete failed",
                    "error": "Username is required"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            user = User.objects.filter(username=username).first()
            if not user:
                return Response({
                    "message": "Delete failed",
                    "error": "User not found"
                }, status=status.HTTP_404_NOT_FOUND)
            
            user_id = user.user_id
            cart_count = CartItem.objects.filter(user=user).count()
            order_count = Order.objects.filter(user=user).count()
            browse_history_count = UserBrowseHistory.objects.filter(user=user).count()

            CartItem.objects.filter(user=user).delete()
            orders = Order.objects.filter(user=user)
            order_ids = list(orders.values_list('order_id', flat=True))
            OrderDetail.objects.filter(order__in=orders).delete()
            orders.delete()

            UserBrowseHistory.objects.filter(user=user).delete()
            user.delete()
            
            return Response({
                "message": "Delete successful",
                "data": {
                    "username": username,
                    "user_id": user_id,
                    "deleted_related_data": {
                        "cart_items": cart_count,
                        "orders": order_count,
                        "order_ids": order_ids,
                        "browse_history": browse_history_count
                    }
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "message": "Delete failed",
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class UserUpdateView(APIView):
    def post(self, request):
        try:
            username = request.data.get('username')
            
            if not username:
                return Response({
                    "message": "Update failed",
                    "error": "Username is required"
                }, status=status.HTTP_400_BAD_REQUEST)

            user = User.objects.filter(username=username).first()
            if not user:
                return Response({
                    "message": "Update failed",
                    "error": f"User '{username}' does not exist"
                }, status=status.HTTP_404_NOT_FOUND)

            serializer = UserUpdateSerializer(user, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                updated_user = User.objects.get(username=username)
                return Response({
                    "message": "User information updated successfully",
                    "data": {
                        "username": updated_user.username,
                        "real_name": updated_user.real_name,
                        "gender": updated_user.gender,
                        "email": updated_user.email,
                        "status": updated_user.status,
                        "registration_time": updated_user.registration_time
                    }
                }, status=status.HTTP_200_OK)
            else:
                errors = {}
                for field, messages in serializer.errors.items():
                    errors[field] = messages[0] if messages else "Unknown error"
                
                return Response({
                    "message": "Update failed",
                    "errors": errors
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response({
                "message": "Update failed",
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ChartListView(APIView):
    def get(self, request):
        try:
            username = request.query_params.get('username') or request.data.get('username', '')
            if not username:
                return Response({
                    "error": "Username is required"
                }, status=status.HTTP_400_BAD_REQUEST)
            if not User.objects.filter(username=username).exists():
                return Response({
                    "error": f"User '{username}' does not exist"
                }, status=status.HTTP_404_NOT_FOUND)
            user = User.objects.get(username=username)
            cart_items = CartItem.objects.filter(user=user)

            if not cart_items.exists():
                return Response({
                    "message": "Cart is empty",
                    "username": username,
                    "items": []
                }, status=status.HTTP_200_OK)

            cart_data = []
            for item in cart_items:
                book = item.book
                cart_data.append({
                    "cart_item_id": item.cart_item_id,
                    "book_id": book.book_id,
                    "book_title": book.ISBN.name,
                    "quantity": item.quantity,
                    "price": str(book.price),
                    "total_price": str(book.price * item.quantity),
                    "book_details": BookSerializer(book).data
                })

            return Response({
                "username": username,
                "item_count": len(cart_data),
                "cart_items": cart_data
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                "error": str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

class ChartAddView(APIView):
    def post(self, request):
        try:
            username = request.data.get('username', '')
            book_id = request.data.get('book_id', '')
            quantity = request.data.get('quantity', 1)

            if not username or not book_id:
                return Response({
                    "error": "Username and book_id are required"
                }, status=status.HTTP_400_BAD_REQUEST)

            try:
                book_id = int(book_id)
                quantity = int(quantity)
            except ValueError:
                return Response({
                    "error": "book_id and quantity must be integers"
                }, status=status.HTTP_400_BAD_REQUEST)

            if not User.objects.filter(username=username).exists():
                return Response({
                    "error": f"User '{username}' does not exist"
                }, status=status.HTTP_404_NOT_FOUND)

            user = User.objects.get(username=username)
            
            if not Book.objects.filter(book_id=book_id).exists():
                return Response({
                    "error": f"Book with id {book_id} does not exist"
                }, status=status.HTTP_404_NOT_FOUND)

            book = Book.objects.get(book_id=book_id)
            cart_item = CartItem.objects.filter(user=user, book=book).first()

            if quantity <= 0:
                if cart_item:
                    cart_item.delete()
                    return Response({
                        "message": "Item removed from cart successfully",
                        "cart_item_id": cart_item.cart_item_id,
                        "username": username,
                        "book_id": book_id,
                        "quantity": 0
                    }, status=status.HTTP_200_OK)
                else:
                    return Response({
                        "message": "Item not found in cart",
                        "username": username,
                        "book_id": book_id
                    }, status=status.HTTP_404_NOT_FOUND)
            
            if cart_item:
                cart_item.quantity = quantity
                cart_item.save()
                created = False
            else:
                cart_item = CartItem.objects.create(
                    user=user,
                    book=book,
                    quantity=quantity
                )
                created = True
            
            return Response({
                "message": "Item added to cart successfully",
                "cart_item_id": cart_item.cart_item_id,
                "username": username,
                "book_id": book_id,
                "book_title": book.ISBN.name,
                "quantity": cart_item.quantity,
                "created": created
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                "error": str(e)
            }, status=status.HTTP_400_BAD_REQUEST)


class BackendUserRegistrationView(APIView):
    def post(self, request):
        try:
            operator_username = request.data.get('operator_username')
            operator_password = request.data.get('operator_password')
            
            if not operator_username or not operator_password:
                return Response({
                    "message": "Registration failed",
                    "error": "Operator username and password are required"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            operator = BackendUser.objects.filter(username=operator_username).first()
            if not operator:
                return Response({
                    "message": "Registration failed",
                    "error": "Invalid operator credentials"
                }, status=status.HTTP_401_UNAUTHORIZED)
                
            if operator.password != operator_password:
                return Response({
                    "message": "Registration failed",
                    "error": "Invalid operator password"
                }, status=status.HTTP_401_UNAUTHORIZED)
                
            if operator.status != 'active':
                return Response({
                    "message": "Registration failed",
                    "error": f"Operator account is {operator.status}"
                }, status=status.HTTP_401_UNAUTHORIZED)
            
            has_permission = Permission.objects.filter(
                backend_user=operator,
                table_name='BackendUser',
                permission_level='admin'
            ).exists()
            
            if not has_permission:
                return Response({
                    "message": "Registration failed",
                    "error": "Operator does not have permission to create backend users"
                }, status=status.HTTP_403_FORBIDDEN)
            serializer = BackendUserRegistrationSerializer(data=request.data)
            if serializer.is_valid():
                username = serializer.validated_data['username']
                password = serializer.validated_data['password']
                default_permission_level = serializer.validated_data['default_permission_level']
                table_permissions = serializer.validated_data.get('table_permissions', [])
                
                backend_user = BackendUser.objects.create(
                    username=username,
                    password=password,
                    status='active'
                )
                table_permissions_dict = {tp['table']: tp['permission_level'] for tp in table_permissions} if table_permissions else {}
                
                permissions_created = []
                for parent_table, child_tables in TABLE_RELATIONSHIPS.items():
                    if parent_table in table_permissions_dict:
                        parent_level = table_permissions_dict[parent_table]
                    else:
                        parent_level = default_permission_level
                    
                    permission, created = Permission.objects.update_or_create(
                        backend_user=backend_user,
                        table_name=parent_table,
                        defaults={'permission_level': parent_level}
                    )
                    permissions_created.append({"table": parent_table, "level": parent_level})
                    
                    for child_table in child_tables:
                        child_level = table_permissions_dict.get(child_table, parent_level)
                        permission, created = Permission.objects.update_or_create(
                            backend_user=backend_user,
                            table_name=child_table,
                            defaults={'permission_level': child_level}
                        )
                        permissions_created.append({"table": child_table, "level": child_level})

                return Response({
                    "message": "Backend user registered successfully",
                    "user": {
                        "backend_user_id": backend_user.backend_user_id,
                        "username": backend_user.username,
                        "status": backend_user.status
                    },
                    "permissions": permissions_created,
                    "created_by": operator_username
                }, status=status.HTTP_201_CREATED)

            else:
                errors = {}
                for field, messages in serializer.errors.items():
                    errors[field] = messages[0] if messages else "Unknown error"
                    
                return Response({
                    "message": "Registration failed",
                    "errors": errors
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response({
                "message": "Registration failed",
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class BackendUserUpdateView(APIView):
    def post(self, request):
        try:
            operator_username = request.data.get('operator_username')
            operator_password = request.data.get('operator_password')
            username = request.data.get('username')
            
            if not operator_username or not operator_password:
                return Response({
                    "message": "Update failed",
                    "error": "Operator username and password are required"
                }, status=status.HTTP_400_BAD_REQUEST)
                
            if not username:
                return Response({
                    "message": "Update failed",
                    "error": "Username to update is required"
                }, status=status.HTTP_400_BAD_REQUEST)
                
            operator = BackendUser.objects.filter(username=operator_username).first()
            if not operator:
                return Response({
                    "message": "Update failed",
                    "error": "Invalid operator credentials"
                }, status=status.HTTP_401_UNAUTHORIZED)
                
            if operator.password != operator_password:
                return Response({
                    "message": "Update failed",
                    "error": "Invalid operator password"
                }, status=status.HTTP_401_UNAUTHORIZED)
                
            if operator.status != 'active':
                return Response({
                    "message": "Update failed",
                    "error": f"Operator account is {operator.status}"
                }, status=status.HTTP_401_UNAUTHORIZED)
            
            has_permission = Permission.objects.filter(
                backend_user=operator,
                table_name='BackendUser',
                permission_level='admin'
            ).exists()
            
            if not has_permission:
                return Response({
                    "message": "Update failed",
                    "error": "Operator does not have permission to update backend users"
                }, status=status.HTTP_403_FORBIDDEN)
            
            backend_user = BackendUser.objects.filter(username=username).first()
            if not backend_user:
                return Response({
                    "message": "Update failed",
                    "error": f"User '{username}' does not exist"
                }, status=status.HTTP_404_NOT_FOUND)
            updated_fields = []
            
            new_password = request.data.get('password')
            if new_password:
                backend_user.password = new_password
                updated_fields.append('password')
                
            new_status = request.data.get('status')
            if new_status in ['active', 'inactive']:
                backend_user.status = new_status
                updated_fields.append('status')
            
            backend_user.save()
            default_permission_level = request.data.get('default_permission_level')
            table_permissions = request.data.get('table_permissions', [])
            
            if default_permission_level or table_permissions:
                table_permissions_dict = {tp['table']: tp['permission_level'] for tp in table_permissions} if table_permissions else {}
                
                permissions_updated = []
                for parent_table, child_tables in TABLE_RELATIONSHIPS.items():
                    if parent_table in table_permissions_dict:
                        parent_level = table_permissions_dict[parent_table]
                    elif default_permission_level:
                        parent_level = default_permission_level
                    else:
                        continue
                    permission, created = Permission.objects.update_or_create(
                        backend_user=backend_user,
                        table_name=parent_table,
                        defaults={'permission_level': parent_level}
                    )
                    permissions_updated.append({"table": parent_table, "level": parent_level})
                    for child_table in child_tables:
                        child_level = table_permissions_dict.get(child_table, parent_level)
                        permission, created = Permission.objects.update_or_create(
                            backend_user=backend_user,
                            table_name=child_table,
                            defaults={'permission_level': child_level}
                        )
                        permissions_updated.append({"table": child_table, "level": child_level})
                
                if permissions_updated:
                    updated_fields.append('permissions')
            
            if not updated_fields:
                return Response({
                    "message": "No fields updated",
                    "user": username
                }, status=status.HTTP_400_BAD_REQUEST)
                
            return Response({
                "message": "Backend user updated successfully",
                "user": {
                    "backend_user_id": backend_user.backend_user_id,
                    "username": backend_user.username,
                    "status": backend_user.status
                },
                "updated_fields": updated_fields,
                "updated_by": operator_username
            }, status=status.HTTP_200_OK)
                
        except Exception as e:
            return Response({
                "message": "Update failed",
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class BackendUserRegistrationView_without_permission(APIView):
    def post(self, request):
        try:
            serializer = BackendUserRegistrationSerializer(data=request.data)
            if serializer.is_valid():
                username = serializer.validated_data['username']
                password = serializer.validated_data['password']
                default_permission_level = serializer.validated_data.get('default_permission_level', 'viewer')

                backend_user = BackendUser.objects.create(
                    username=username,
                    password=password,
                    status='active'
                )

                permissions_created = []
                for table in CORE_TABLES:
                    Permission.objects.create(
                        backend_user=backend_user,
                        permission_level=default_permission_level,
                        table_name=table
                    )
                    permissions_created.append({"table": table, "level": default_permission_level})

                return Response({
                    "message": "Backend user registered successfully with default permissions",
                    "user": {
                        "backend_user_id": backend_user.backend_user_id,
                        "username": backend_user.username,
                        "status": backend_user.status
                    },
                    "permissions": permissions_created
                }, status=status.HTTP_201_CREATED)
            else:
                errors = {}
                for field, messages in serializer.errors.items():
                    errors[field] = messages[0] if messages else "Unknown error"
                    
                return Response({
                    "message": "Registration failed",
                    "errors": errors
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response({
                "message": "Registration failed",
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class BackendUserLoginView(APIView):
    def post(self, request):
        serializer = BackendUserLoginSerializer(data=request.data)
        if serializer.is_valid():
            username = serializer.validated_data['username']
            user = BackendUser.objects.get(username=username)
            permissions = Permission.objects.filter(backend_user=user)
            
            permission_data = {}
            for perm in permissions:
                permission_data[perm.table_name] = perm.permission_level
            
            permissions_by_level = {level: [] for level, _ in PERMISSION_LEVELS}
            for table, level in permission_data.items():
                permissions_by_level[level].append(table)
            
            return Response({
                "message": "Login successful",
                "user": {
                    "user_id": user.backend_user_id,
                    "username": user.username,
                    "status": user.status
                },
                "permissions": permission_data,
                "permissions_by_level": permissions_by_level
            }, status=status.HTTP_200_OK)
        
        errors = {}
        for field, messages in serializer.errors.items():
            errors[field] = messages[0] if messages else "Unknown error"
            
        return Response({
            "message": "Login failed",
            "errors": errors
        }, status=status.HTTP_401_UNAUTHORIZED)

class BackendUserDeleteView(APIView):
    def post(self, request):
        try:
            username = request.data.get('username')
            operator_username = request.data.get('operator_username')
            operator_password = request.data.get('operator_password')

            if not username:
                return Response({
                    "message": "Delete failed",
                    "error": "Username to delete is required"
                }, status=status.HTTP_400_BAD_REQUEST)

            if not operator_username or not operator_password:
                return Response({
                    "message": "Delete failed",
                    "error": "Operator username and password are required"
                }, status=status.HTTP_400_BAD_REQUEST)

            operator = BackendUser.objects.filter(username=operator_username).first()
            if not operator:
                return Response({
                    "message": "Delete failed",
                    "error": "Invalid operator credentials"
                }, status=status.HTTP_401_UNAUTHORIZED)

            if operator.password != operator_password:
                return Response({
                    "message": "Delete failed",
                    "error": "Invalid operator credentials"
                }, status=status.HTTP_401_UNAUTHORIZED)

            if operator.status != 'active':
                return Response({
                    "message": "Delete failed",
                    "error": f"Operator account is {operator.status}"
                }, status=status.HTTP_401_UNAUTHORIZED)

            has_permission = Permission.objects.filter(
                backend_user=operator,
                table_name__in=['BackendUser', 'Permission'],
                permission_level__in=['admin']
            ).exists()
            
            if not has_permission:
                return Response({
                    "message": "Delete failed",
                    "error": "Operator does not have permission to delete users"
                }, status=status.HTTP_403_FORBIDDEN)

            user = BackendUser.objects.filter(username=username).first()
            if not user:
                return Response({
                    "message": "Delete failed",
                    "error": f"User '{username}' does not exist"
                }, status=status.HTTP_404_NOT_FOUND)

            permission_count = Permission.objects.filter(backend_user=user).count()

            user_id = user.backend_user_id
            user.delete()

            return Response({
                "message": "User deleted successfully",
                "data": {
                    "username": username,
                    "user_id": user_id,
                    "permissions_removed": permission_count,
                    "deleted_by": operator_username
                }
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                "message": "Delete failed",
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class BackendUserGetBackendUserListView(APIView):
    def post(self, request):
        try:
            operator_username = request.query_params.get('operator_username')
            operator_password = request.query_params.get('operator_password')

            if not operator_username or not operator_password:
                operator_username = request.data.get('operator_username')
                operator_password = request.data.get('operator_password')

            if not operator_username or not operator_password:
                return Response({
                    "message": "Authentication failed",
                    "error": "Operator username and password are required"
                }, status=status.HTTP_400_BAD_REQUEST)

            operator = BackendUser.objects.filter(username=operator_username).first()
            if not operator:
                return Response({
                    "message": "Authentication failed",
                    "error": "Invalid operator credentials"
                }, status=status.HTTP_401_UNAUTHORIZED)

            if operator.password != operator_password:
                return Response({
                    "message": "Authentication failed",
                    "error": "Invalid operator credentials"
                }, status=status.HTTP_401_UNAUTHORIZED)

            if operator.status != 'active':
                return Response({
                    "message": "Authentication failed",
                    "error": f"Operator account is {operator.status}"
                }, status=status.HTTP_401_UNAUTHORIZED)

            has_permission = Permission.objects.filter(
                backend_user=operator,
                table_name='BackendUser',
                permission_level__in=['admin', 'viewer']
            ).exists()

            if not has_permission:
                return Response({
                    "message": "Access denied",
                    "error": "Insufficient permissions to view backend users"
                }, status=status.HTTP_403_FORBIDDEN)

            backend_users = BackendUser.objects.all()
            user_list = []
            for user in backend_users:
                permissions = Permission.objects.filter(backend_user=user)
                
                permission_data = {}
                for perm in permissions:
                    permission_data[perm.table_name] = perm.permission_level
                
                user_list.append({
                    "backend_user_id": user.backend_user_id,
                    "username": user.username,
                    "status": user.status,
                    "permissions": permission_data
                })

            return Response({
                "message": "Backend user list retrieved successfully",
                "count": len(user_list),
                "users": user_list
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                "message": "Failed to retrieve user list",
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    
    
class BackendUserGetUserListView(APIView):
    def get(self, request):
        try:
            operator_username = request.query_params.get('operator_username')
            operator_password = request.query_params.get('operator_password')

            if not operator_username or not operator_password:
                operator_username = request.data.get('operator_username')
                operator_password = request.data.get('operator_password')

            if not operator_username or not operator_password:
                return Response({
                    "message": "Authentication failed",
                    "error": "Operator username and password are required"
                }, status=status.HTTP_400_BAD_REQUEST)

            operator = BackendUser.objects.filter(username=operator_username).first()
            if not operator:
                return Response({
                    "message": "Authentication failed",
                    "error": "Invalid operator credentials"
                }, status=status.HTTP_401_UNAUTHORIZED)

            if operator.password != operator_password:
                return Response({
                    "message": "Authentication failed",
                    "error": "Invalid operator credentials"
                }, status=status.HTTP_401_UNAUTHORIZED)

            if operator.status != 'active':
                return Response({
                    "message": "Authentication failed",
                    "error": f"Operator account is {operator.status}"
                }, status=status.HTTP_401_UNAUTHORIZED)

            has_permission = Permission.objects.filter(
                backend_user=operator,
                table_name='User',
                permission_level__in=['admin', 'viewer']
            ).exists()

            if not has_permission:
                return Response({
                    "message": "Access denied",
                    "error": "Operator does not have permission to view users"
                }, status=status.HTTP_403_FORBIDDEN)
            users = User.objects.all()

            user_list = []
            for user in users:
                user_list.append({
                    "user_id": user.user_id,
                    "username": user.username,
                    "real_name": user.real_name,
                    "gender": user.gender,
                    "email": user.email,
                    "registration_time": user.registration_time.strftime("%Y-%m-%d %H:%M:%S"),
                    "status": user.status
                })

            return Response({
                "message": "User list retrieved successfully",
                "count": len(user_list),
                "users": user_list,
                "requested_by": operator_username
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                "message": "Failed to retrieve user list",
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class BackendUserUpdateUserView(APIView):
    def post(self, request):
        try:
            user_id = request.data.get('user_id')
            operator_username = request.data.get('operator_username')
            operator_password = request.data.get('operator_password')
            user_data = request.data.get('user_data', {})
            
            if not user_id:
                return Response({
                    "message": "Update failed",
                    "error": "User ID is required"
                }, status=status.HTTP_400_BAD_REQUEST)
                
            if not operator_username or not operator_password:
                return Response({
                    "message": "Update failed",
                    "error": "Operator username and password are required"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            operator = BackendUser.objects.filter(username=operator_username).first()
            if not operator:
                return Response({
                    "message": "Update failed",
                    "error": "Invalid operator credentials"
                }, status=status.HTTP_401_UNAUTHORIZED)
                
            if operator.password != operator_password:
                return Response({
                    "message": "Update failed",
                    "error": "Invalid operator credentials"
                }, status=status.HTTP_401_UNAUTHORIZED)
                
            if operator.status != 'active':
                return Response({
                    "message": "Update failed",
                    "error": f"Operator account is {operator.status}"
                }, status=status.HTTP_401_UNAUTHORIZED)
            
            has_permission = Permission.objects.filter(
                backend_user=operator,
                table_name='User',
                permission_level='admin'
            ).exists()

            if not has_permission:
                return Response({
                    "message": "Update failed",
                    "error": "Operator does not have permission to modify user data"
                }, status=status.HTTP_403_FORBIDDEN)
            
            user = User.objects.filter(user_id=user_id).first()
            if not user:
                return Response({
                    "message": "Update failed",
                    "error": f"User ID {user_id} does not exist"
                }, status=status.HTTP_404_NOT_FOUND)
            
            if 'username' in user_data:
                del user_data['username']
            
            serializer = UserUpdateSerializer(user, data=user_data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response({
                    "message": "User updated successfully",
                    "data": {
                        "user_id": user.user_id,
                        "updated_fields": list(user_data.keys()),
                        "updated_by": operator_username
                    }
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    "message": "Update failed",
                    "errors": serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            return Response({
                "message": "Update failed",
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class CreateOrderView(APIView):
    @transaction.atomic
    def post(self, request):
        try:
            username = request.data.get('username')
            shipping_address = request.data.get('shipping_address')
            cart_items = request.data.get('cart_items', [])
            
            if not username or not shipping_address:
                return Response({
                    "message": "Order creation failed",
                    "error": "Username and shipping address are required"
                }, status=status.HTTP_400_BAD_REQUEST)
                
            if not cart_items:
                return Response({
                    "message": "Order creation failed",
                    "error": "Cart items are required"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if not User.objects.filter(username=username).exists():
                return Response({
                    "message": "Order creation failed",
                    "error": f"User '{username}' does not exist"
                }, status=status.HTTP_404_NOT_FOUND)
                
            user = User.objects.get(username=username)
            total_amount = 0
            order_items = []
            
            for item in cart_items:
                book_id = item.get('book_id')
                quantity = item.get('quantity', 0)
                
                if not book_id or quantity <= 0:
                    return Response({
                        "message": "Order creation failed",
                        "error": f"Invalid item: book_id and quantity > 0 required"
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                try:
                    book = Book.objects.get(book_id=book_id)
                except Book.DoesNotExist:
                    return Response({
                        "message": "Order creation failed",
                        "error": f"Book with ID {book_id} does not exist"
                    }, status=status.HTTP_404_NOT_FOUND)
                
                if book.status != 'available':
                    return Response({
                        "message": "Order creation failed",
                        "error": f"Book '{book.ISBN.name}' is not available"
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                if book.stock < quantity:
                    return Response({
                        "message": "Order creation failed",
                        "error": f"Insufficient stock for book '{book.ISBN.name}'. Available: {book.stock}, Requested: {quantity}"
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                order_items.append({
                    'book': book,
                    'quantity': quantity,
                    'unit_price': book.price
                })

                total_amount += book.price * quantity

            order = Order.objects.create(
                user=user,
                shipping_address=shipping_address,
                total_amount=total_amount,
                status='pending'
            )

            for item in order_items:
                OrderDetail.objects.create(
                    order=order,
                    book=item['book'],
                    quantity=item['quantity'],
                    unit_price=item['unit_price']
                )
                book = item['book']
                book.stock -= item['quantity']
                book.save()

            CartItem.objects.filter(user=user).delete()
            
            return Response({
                "message": "Order created successfully",
                "order_id": order.order_id,
                "username": username,
                "shipping_address": shipping_address,
                "total_amount": str(total_amount),
                "order_time": order.order_time,
                "status": order.status,
                "item_count": len(order_items)
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({
                "message": "Order creation failed",
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



class GetUserOrderDetailsView(APIView):
    def post(self, request):
        username = request.data.get('username')
        
        if not username:
            return Response({
                "message": "Failed to retrieve orders",
                "error": "Username is required"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not User.objects.filter(username=username).exists():
            return Response({
                "message": "Failed to retrieve orders", 
                "error": f"User '{username}' does not exist"
            }, status=status.HTTP_404_NOT_FOUND)
        
        user = User.objects.get(username=username)
        orders = Order.objects.filter(user=user).order_by('-order_time')
        
        if not orders:
            return Response({
                "message": "No orders found",
                "username": username,
                "orders": []
            }, status=status.HTTP_200_OK)
        
        result = []
        for order in orders:
            order_details = OrderDetail.objects.filter(order=order).select_related('book', 'book__ISBN')
            items = []
            for detail in order_details:
                book = detail.book
                cover_url = None
                try:
                    book_file = BookFile.objects.filter(book=book).select_related('file').filter(file__file_type='cover').first()
                    if book_file and book_file.file:
                        cover_url = f'{settings.MEDIA_URL}{book_file.file.file_path}'
                except Exception:
                    cover_url = None
                items.append({
                    "book_id": detail.book.book_id,
                    "cover_url": cover_url,
                    "title": detail.book.ISBN.name if detail.book.ISBN else "Unknown Book",
                    "quantity": detail.quantity,
                    "unit_price": str(detail.unit_price),
                    "subtotal": str(detail.quantity * detail.unit_price)
                })
            
            result.append({
                "order_id": order.order_id,
                "order_time": order.order_time,
                "shipping_address": order.shipping_address,
                "total_amount": str(order.total_amount),
                "status": order.status,
                "items": items
            })
        
        return Response({
            "message": "Orders retrieved successfully",
            "username": username,
            "count": len(result),
            "orders": result
        }, status=status.HTTP_200_OK)
    

class UserCancelOrderView(APIView):
    def post(self, request):
        try:
            username = request.data.get('username')
            order_id = request.data.get('order_id')

            if not username or not order_id:
                return Response({
                    "message": "Cancellation failed",
                    "error": "Username and order_id are required"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if not User.objects.filter(username=username).exists():
                return Response({
                    "message": "Cancellation failed", 
                    "error": f"User '{username}' does not exist"
                }, status=status.HTTP_404_NOT_FOUND)
            
            user = User.objects.get(username=username)
            
            try:
                order = Order.objects.get(order_id=order_id)
            except Order.DoesNotExist:
                return Response({
                    "message": "Cancellation failed",
                    "error": f"Order with ID {order_id} does not exist"
                }, status=status.HTTP_404_NOT_FOUND)
            
            if order.user != user:
                return Response({
                    "message": "Cancellation failed",
                    "error": "This order does not belong to the specified user"
                }, status=status.HTTP_403_FORBIDDEN)

            if order.status not in ['pending', 'paid']:
                return Response({
                    "message": "Cancellation failed",
                    "error": f"Cannot cancel order with status '{order.status}'"
                }, status=status.HTTP_400_BAD_REQUEST)
            

            previous_status = order.status
            order.status = 'canceled'
            order.save()
            
            order_items = OrderDetail.objects.filter(order=order)
            for item in order_items:
                book = item.book
                book.stock += item.quantity
                book.save()
            
            return Response({
                "message": "Order canceled successfully",
                "order_id": order_id,
                "username": username,
                "previous_status": previous_status,
                "current_status": "canceled"
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "message": "Cancellation failed",
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
class UserBrowseHistoryView(APIView):
    def post(self, request):
        try:
            username = request.data.get('username')
            book_id = request.data.get('book_id')

            if not username or not book_id:
                return Response({
                    "message": "Failed to record browsing history",
                    "error": "Username and book_id are required"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if not User.objects.filter(username=username).exists():
                return Response({
                    "message": "Failed to record browsing history",
                    "error": f"User '{username}' does not exist"
                }, status=status.HTTP_404_NOT_FOUND)
                
            user = User.objects.get(username=username)
            
            try:
                book = Book.objects.get(book_id=book_id)
            except Book.DoesNotExist:
                return Response({
                    "message": "Failed to record browsing history",
                    "error": f"Book with ID {book_id} does not exist"
                }, status=status.HTTP_404_NOT_FOUND)

            browse_history = UserBrowseHistory.objects.create(
                user=user,
                book=book
            )
            
            return Response({
                "message": "Browsing history recorded successfully",
                "browse_id": browse_history.browse_id,
                "username": username,
                "book_id": book_id,
                "book_title": book.ISBN.name if book.ISBN else "Unknown Book",
                "browse_time": browse_history.browse_time
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({
                "message": "Failed to record browsing history",
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class GetUserBrowseHistoryView(APIView):
    def post(self, request):
        try:
            username = request.data.get('username')

            if not username:
                return Response({
                    "message": "Failed to retrieve browsing history",
                    "error": "Username is required"
                }, status=status.HTTP_400_BAD_REQUEST)

            if not User.objects.filter(username=username).exists():
                return Response({
                    "message": "Failed to retrieve browsing history",
                    "error": f"User '{username}' does not exist"
                }, status=status.HTTP_404_NOT_FOUND)
                
            user = User.objects.get(username=username)
            browse_history = UserBrowseHistory.objects.filter(user=user).order_by('-browse_time')
            
            if not browse_history:
                return Response({
                    "message": "No browsing history found",
                    "username": username,
                    "history": []
                }, status=status.HTTP_200_OK)

            history_data = []
            for item in browse_history:
                book = item.book
                history_data.append({
                    "browse_id": item.browse_id,
                    "book_id": book.book_id,
                    "book_title": book.ISBN.name if book.ISBN else "Unknown Book",
                    "browse_time": item.browse_time,
                    "book_details": BookSerializer(book).data
                })
            
            return Response({
                "message": "Browsing history retrieved successfully",
                "username": username,
                "count": len(history_data),
                "history": history_data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "message": "Failed to retrieve browsing history",
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class BackendUserGetOrdersView(APIView):
    def post(self, request):
        try:
            operator_username = request.data.get('operator_username')
            if not operator_username:
                return Response({
                    "message": "Authentication failed",
                    "error": "Operator username is required"
                }, status=status.HTTP_400_BAD_REQUEST)

            operator = BackendUser.objects.filter(username=operator_username).first()
            if not operator:
                return Response({
                    "message": "Authentication failed",
                    "error": "Invalid operator credentials"
                }, status=status.HTTP_401_UNAUTHORIZED)
            
            has_permission = Permission.objects.filter(
                backend_user=operator,
                table_name='Order',
                permission_level__in=['admin', 'viewer']
            ).exists()
            if not has_permission:
                return Response({
                    "message": "Get failed",
                    "error": "Operator does not have permission to get the information of orders"
                }, status=status.HTTP_403_FORBIDDEN)

            if operator.status != 'active':
                return Response({
                    "message": "Authentication failed",
                    "error": f"Operator account is {operator.status}"
                }, status=status.HTTP_401_UNAUTHORIZED)

            orders_query = Order.objects.all().order_by('-order_time')

            result = []
            for order in orders_query:
                order_details = OrderDetail.objects.filter(order=order).select_related('book', 'book__ISBN')

                items = []
                for detail in order_details:
                    items.append({
                        "book_id": detail.book.book_id,
                        "title": detail.book.ISBN.name if detail.book.ISBN else "Unknown Book",
                        "quantity": detail.quantity,
                        "unit_price": str(detail.unit_price),
                        "subtotal": str(detail.quantity * detail.unit_price)
                    })

                result.append({
                    "order_id": order.order_id,
                    "username": order.user.username,
                    "user_id": order.user.user_id,
                    "order_time": order.order_time,
                    "shipping_address": order.shipping_address,
                    "total_amount": str(order.total_amount),
                    "status": order.status,
                    "items": items
                })
            
            return Response({
                "message": "Orders retrieved successfully",
                "count": len(result),
                "orders": result,
                "requested_by": operator_username
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "message": "Failed to retrieve orders",
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
class BackendUserUpdateOrderView(APIView):
    def post(self, request):
        try:
            operator_username = request.data.get('operator_username')
            operator_password = request.data.get('operator_password')

            order_id = request.data.get('order_id')
            new_status = request.data.get('status')

            if not operator_username or not operator_password:
                return Response({
                    "message": "Authentication failed",
                    "error": "Operator username and password are required"
                }, status=status.HTTP_400_BAD_REQUEST)
            
                
            if not order_id or not new_status:
                return Response({
                    "message": "Update failed",
                    "error": "Order ID and new status are required"
                }, status=status.HTTP_400_BAD_REQUEST)

            operator = BackendUser.objects.filter(username=operator_username).first()
            if not operator:
                return Response({
                    "message": "Authentication failed",
                    "error": "Invalid operator credentials"
                }, status=status.HTTP_401_UNAUTHORIZED)

            if operator.password != operator_password:
                return Response({
                    "message": "Delete failed",
                    "error": "Invalid operator credentials"
                }, status=status.HTTP_401_UNAUTHORIZED)
            
            if operator.status != 'active':
                return Response({
                    "message": "Authentication failed",
                    "error": f"Operator account is {operator.status}"
                }, status=status.HTTP_401_UNAUTHORIZED)

            has_permission = Permission.objects.filter(
                backend_user=operator,
                table_name='Order',
                permission_level__in=['admin']
            ).exists()
            
            if not has_permission:
                return Response({
                    "message": "Access denied",
                    "error": "Operator does not have permission to update orders"
                }, status=status.HTTP_403_FORBIDDEN)

            try:
                order = Order.objects.get(order_id=order_id)
            except Order.DoesNotExist:
                return Response({
                    "message": "Update failed",
                    "error": f"Order with ID {order_id} does not exist"
                }, status=status.HTTP_404_NOT_FOUND)

            valid_statuses = ['pending', 'paid', 'shipped', 'delivered', 'canceled']
            if new_status not in valid_statuses:
                return Response({
                    "message": "Update failed",
                    "error": f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
                }, status=status.HTTP_400_BAD_REQUEST)

            previous_status = order.status
            order.status = new_status
            order.save()

            if new_status == 'canceled' and previous_status != 'canceled':
                order_items = OrderDetail.objects.filter(order=order)
                for item in order_items:
                    book = item.book
                    book.stock += item.quantity
                    book.save()
            
            return Response({
                "message": "Order updated successfully",
                "order_id": order_id,
                "previous_status": previous_status,
                "new_status": new_status,
                "updated_by": operator_username
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "message": "Update failed",
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
class BackendUserUpdateBookView(APIView):
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    
    def post(self, request):
        try:
            operator_username = request.data.get('operator_username')
            operator_password = request.data.get('operator_password')
            book_id = request.data.get('book_id')
            
            if not operator_username or not operator_password:
                return Response({
                    "message": "Authentication failed",
                    "error": "Operator username and password are required"
                }, status=status.HTTP_400_BAD_REQUEST)
                
            if not book_id:
                return Response({
                    "message": "Update failed",
                    "error": "Book ID is required"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            operator = BackendUser.objects.filter(username=operator_username).first()
            if not operator:
                return Response({
                    "message": "Authentication failed",
                    "error": "Invalid operator credentials"
                }, status=status.HTTP_401_UNAUTHORIZED)
            
            if operator.password != operator_password:
                return Response({
                    "message": "Delete failed",
                    "error": "Invalid operator credentials"
                }, status=status.HTTP_401_UNAUTHORIZED)
            
            if operator.status != 'active':
                return Response({
                    "message": "Authentication failed",
                    "error": f"Operator account is {operator.status}"
                }, status=status.HTTP_401_UNAUTHORIZED)

            has_permission = Permission.objects.filter(
                backend_user=operator,
                table_name='Book',
                permission_level__in=['admin']
            ).exists()
            
            if not has_permission:
                return Response({
                    "message": "Access denied",
                    "error": "Operator does not have permission to update books"
                }, status=status.HTTP_403_FORBIDDEN)

            try:
                book = Book.objects.get(book_id=book_id)
            except Book.DoesNotExist:
                return Response({
                    "message": "Update failed",
                    "error": f"Book with ID {book_id} does not exist"
                }, status=status.HTTP_404_NOT_FOUND)
            
            updatable_fields = [
                'price', 'stock', 'sales', 'category_id', 'publisher_id', 'description', 'status'
            ]

            updated_fields = []
            for field in updatable_fields:
                if field in request.data:
                    if field == 'category_id':
                        try:
                            category_id = request.data.get('category_id')
                            category = Category.objects.get(category_id=category_id)
                            book.category = category
                            updated_fields.append('category')
                        except Category.DoesNotExist:
                            return Response({
                                "message": "Update failed",
                                "error": f"Category with ID {category_id} does not exist"
                            }, status=status.HTTP_404_NOT_FOUND)
                    elif field == 'publisher_id':
                        try:
                            publisher_id = request.data.get('publisher_id')
                            publisher = Publisher.objects.get(publisher_id=publisher_id)
                            book.publisher = publisher
                            updated_fields.append('publisher')
                        except Publisher.DoesNotExist:
                            return Response({
                                "message": "Update failed",
                                "error": f"Publisher with ID {publisher_id} does not exist"
                            }, status=status.HTTP_404_NOT_FOUND)
                    else:
                        setattr(book, field, request.data[field])
                        updated_fields.append(field)

            cover_update_info = None
            if 'cover' in request.FILES:
                cover_file = request.FILES['cover']

                upload_dir = os.path.join(settings.MEDIA_ROOT, 'book_covers')
                os.makedirs(upload_dir, exist_ok=True)

                file_name = f"{book.ISBN.ISBN}_{cover_file.name}"
                file_path = os.path.join(upload_dir, file_name)

                url_relative_path = f"book_covers/{file_name}"

                existing_book_files = BookFile.objects.filter(book=book)
                existing_cover = None
                
                for book_file in existing_book_files:
                    if book_file.file.file_type == 'cover':
                        existing_cover = book_file
                        break

                if existing_cover:
                    old_file_path = os.path.join(settings.MEDIA_ROOT, existing_cover.file.file_path)
                    if os.path.isfile(old_file_path):
                        try:
                            os.remove(old_file_path)
                        except OSError as e:

                            print(f"Error removing old cover file: {str(e)}")

                    old_file = existing_cover.file
                    existing_cover.delete()
                    old_file.delete()
                    
                    cover_update_info = "Replaced existing cover"
                else:
                    cover_update_info = "Added new cover"

                with open(file_path, 'wb+') as destination:
                    for chunk in cover_file.chunks():
                        destination.write(chunk)
                file_obj = File.objects.create(
                    file_path=url_relative_path,
                    file_type='cover'
                )
                BookFile.objects.create(book=book, file=file_obj)
                updated_fields.append('cover')
            if not updated_fields:
                return Response({
                    "message": "No fields to update",
                    "book_id": book_id
                }, status=status.HTTP_400_BAD_REQUEST)

            book.save()
            serialized_book = BookSerializer(book).data
            
            response_data = {
                "message": "Book updated successfully",
                "book_id": book_id,
                "updated_fields": updated_fields,
                "updated_by": operator_username,
                "book_data": serialized_book
            }
            if cover_update_info:
                response_data["cover_update"] = cover_update_info
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "message": "Update failed",
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class BackendUserUpdateAuthorView(APIView):
    def post(self, request):
        try:
            operator_username = request.data.get('operator_username')
            operator_password = request.data.get('operator_password')

            author_id = request.data.get('author_id')
            biography = request.data.get('biography')
            
            if not operator_username or not operator_password:
                return Response({
                    "message": "Authentication failed",
                    "error": "Operator username and password are required"
                }, status=status.HTTP_400_BAD_REQUEST)
                
            if not author_id:
                return Response({
                    "message": "Update failed",
                    "error": "Author ID is required"
                }, status=status.HTTP_400_BAD_REQUEST)
                
            if biography is None:
                return Response({
                    "message": "Update failed",
                    "error": "Biography is required"
                }, status=status.HTTP_400_BAD_REQUEST)

            operator = BackendUser.objects.filter(username=operator_username).first()
            if not operator:
                return Response({
                    "message": "Authentication failed",
                    "error": "Invalid operator credentials"
                }, status=status.HTTP_401_UNAUTHORIZED)
            
            if operator.password != operator_password:
                return Response({
                    "message": "Authentication failed",
                    "error": "Invalid operator credentials"
                }, status=status.HTTP_401_UNAUTHORIZED)
            
            if operator.status != 'active':
                return Response({
                    "message": "Authentication failed",
                    "error": f"Operator account is {operator.status}"
                }, status=status.HTTP_401_UNAUTHORIZED)

            has_permission = Permission.objects.filter(
                backend_user=operator,
                table_name='Author',
                permission_level='admin'
            ).exists()
            
            if not has_permission:
                return Response({
                    "message": "Access denied",
                    "error": "Operator does not have permission to update author information"
                }, status=status.HTTP_403_FORBIDDEN)

            try:
                author = Author.objects.get(author_id=author_id)
            except Author.DoesNotExist:
                return Response({
                    "message": "Update failed",
                    "error": f"Author with ID {author_id} does not exist"
                }, status=status.HTTP_404_NOT_FOUND)

            author.biography = biography
            author.save()
            
            return Response({
                "message": "Author biography updated successfully",
                "author_id": author_id,
                "author_name": author.name,
                "biography": biography,
                "updated_by": operator_username
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "message": "Update failed",
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class BackendUserGetAuthorsView(APIView):
    def post(self, request):
        try:
            operator_username = request.data.get('operator_username')
            
            if not operator_username:
                return Response({
                    "message": "Authentication failed",
                    "error": "Operator username is required"
                }, status=status.HTTP_400_BAD_REQUEST)

            operator = BackendUser.objects.filter(username=operator_username).first()
            if not operator:
                return Response({
                    "message": "Authentication failed",
                    "error": "Invalid operator credentials"
                }, status=status.HTTP_401_UNAUTHORIZED)
            
            has_permission = Permission.objects.filter(
                backend_user=operator,
                table_name='Author',
                permission_level__in=['admin', 'viewer']
            ).exists()
            if not has_permission:
                return Response({
                    "message": "Get failed",
                    "error": "Operator does not have permission to get the information of authors"
                }, status=status.HTTP_403_FORBIDDEN)

            if operator.status != 'active':
                return Response({
                    "message": "Authentication failed",
                    "error": f"Operator account is {operator.status}"
                }, status=status.HTTP_401_UNAUTHORIZED)

            authors = Author.objects.all().order_by('name')
            result = []
            for author in authors:
                result.append({
                    "author_id": author.author_id,
                    "name": author.name,
                    "biography": author.biography,
                    "book_count": BookAuthor.objects.filter(author=author).count()
                })
                
            return Response({
                "message": "Authors retrieved successfully",
                "count": len(result),
                "authors": result
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "message": "Failed to retrieve authors",
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class BackendUserImportBookView(APIView):
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    
    @transaction.atomic
    def post(self, request):
        try:
            operator_username = request.data.get('operator_username')
            operator_password = request.data.get('operator_password')

            if not operator_username or not operator_password:
                return Response({
                    "message": "Import failed",
                    "error": "Operator username and password are required"
                }, status=status.HTTP_400_BAD_REQUEST)

            operator = BackendUser.objects.filter(username=operator_username).first()
            if not operator:
                return Response({
                    "message": "Import failed",
                    "error": "Invalid operator credentials"
                }, status=status.HTTP_401_UNAUTHORIZED)
            
            if operator.password != operator_password:
                return Response({
                    "message": "Import failed",
                    "error": "Invalid operator password"
                }, status=status.HTTP_401_UNAUTHORIZED)
            
            if operator.status != 'active':
                return Response({
                    "message": "Import failed",
                    "error": f"Operator account is {operator.status}"
                }, status=status.HTTP_401_UNAUTHORIZED)

            has_permission = Permission.objects.filter(
                backend_user=operator,
                table_name='Book',
                permission_level='admin'
            ).exists()
            
            if not has_permission:
                return Response({
                    "message": "Import failed",
                    "error": "Operator does not have permission to import books"
                }, status=status.HTTP_403_FORBIDDEN)

            serializer = BookImportSerializer(data=request.data)
            if not serializer.is_valid():
                return Response({
                    "message": "Import failed",
                    "errors": serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
                
            data = serializer.validated_data

            category, _ = Category.objects.get_or_create(
                category_name=data['category_name'],
                defaults={'description': ''}
            )

            publisher, _ = Publisher.objects.get_or_create(
                name=data['publisher_name']
            )

            book_meta, created = BookMeta.objects.get_or_create(
                ISBN=data['ISBN'],
                defaults={'name': data['name']}
            )
            
            if not created and book_meta.name != data['name']:
                return Response({
                    "message": "Import failed",
                    "error": f"ISBN {data['ISBN']} already exists with a different name"
                }, status=status.HTTP_400_BAD_REQUEST)

            book, created = Book.objects.update_or_create(
                ISBN=book_meta,
                defaults={
                    'category': category,
                    'publisher': publisher,
                    'price': data['price'],
                    'stock': data['stock'],
                    'description': data.get('description', ''),
                    'status': data['status']
                }
            )

            author_names = data.get('author_names', [])
            if 'author_name' in data and data['author_name'] and data['author_name'] not in author_names:
                author_names.append(data['author_name'])
            
            if not author_names:
                return Response({
                    "message": "Import failed",
                    "error": "At least one author is required"
                }, status=status.HTTP_400_BAD_REQUEST)
            author_biographies = {}
            single_bio = data.get('author_biography', '')
            if single_bio and len(author_names) == 1:
                author_biographies[0] = single_bio
            
            for key in request.data:
                if key.startswith('author_biographies[') and key.endswith(']'):
                    try:
                        idx_str = key[key.index('[')+1:key.index(']')]
                        idx = int(idx_str)
                        author_biographies[idx] = request.data[key]
                    except (ValueError, IndexError):
                        pass
            BookAuthor.objects.filter(book=book).delete()

            author_data = []
            for i, author_name in enumerate(author_names):
                biography = author_biographies.get(i, '')
                if not biography and i == 0 and single_bio:
                    biography = single_bio
                    
                author, created = Author.objects.get_or_create(
                    name=author_name,
                    defaults={'biography': biography}
                )
                
                if not created and biography:
                    author.biography = biography
                    author.save()
                
                BookAuthor.objects.create(
                    author=author,
                    book=book
                )
                
                author_data.append({
                    "author_id": author.author_id,
                    "name": author.name,
                    "biography": author.biography[:100] + "..." if len(author.biography) > 100 else author.biography
                })
            
            response_data = {
                "message": "Book imported successfully",
                "book_id": book.book_id,
                "ISBN": data['ISBN'],
                "name": data['name'],
                "authors": author_data,
                "created": created,
                "imported_by": operator_username
            }
            
            if 'cover' in data:
                cover_file = data['cover']
                upload_dir = os.path.join(settings.MEDIA_ROOT, 'book_covers')
                os.makedirs(upload_dir, exist_ok=True)
                file_name = f"{data['ISBN']}_{cover_file.name}"
                file_path = os.path.join(upload_dir, file_name)
                relative_path = os.path.relpath(file_path, settings.MEDIA_ROOT)
                
                existing_book_file = None
                try:
                    book_files = BookFile.objects.filter(book=book)
                    for bf in book_files:
                        if os.path.basename(bf.file.file_path) == file_name:
                            existing_book_file = bf
                            break
                except Exception as e:
                    return Response({
                        "message": "Import failed",
                        "error": f"Error checking existing files: {str(e)}"
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
                with open(file_path, 'wb+') as destination:
                    for chunk in cover_file.chunks():
                        destination.write(chunk)
                
                if existing_book_file:
                    existing_file = existing_book_file.file
                    existing_file.file_path = relative_path
                    existing_file.file_type = 'cover'
                    existing_file.save()
                    response_data["cover"] = "Updated existing cover"
                else:
                    file_obj = File.objects.create(
                        file_path=relative_path,
                        file_type='cover'
                    )

                    BookFile.objects.create(book=book, file=file_obj)
                    response_data["cover"] = "Added new cover"
            
            return Response(response_data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({
                "message": "Import failed", 
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class BackendUserGetBooksView(APIView):
    def post(self, request):
        try:
            operator_username = request.data.get('operator_username')
            if not operator_username:
                return Response({
                    "message": "Authentication failed",
                    "error": "Operator username is required"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            operator = BackendUser.objects.filter(username=operator_username).first()
            if not operator:
                return Response({
                    "message": "Authentication failed",
                    "error": "Invalid operator credentials"
                }, status=status.HTTP_401_UNAUTHORIZED)
            
            if operator.status != 'active':
                return Response({
                    "message": "Authentication failed",
                    "error": f"Operator account is {operator.status}"
                }, status=status.HTTP_401_UNAUTHORIZED)
            
            has_permission = Permission.objects.filter(
                backend_user=operator,
                table_name='Book',
                permission_level__in=['admin', 'viewer']
            ).exists()
            
            if not has_permission:
                return Response({
                    "message": "Access denied",
                    "error": "Operator does not have permission to view books"
                }, status=status.HTTP_403_FORBIDDEN)
            filters = {}

            category_name = request.data.get('category_name')
            if category_name:
                filters['category__category_name'] = category_name

            publisher_name = request.data.get('publisher_name')
            if publisher_name:
                filters['publisher__name'] = publisher_name

            book_status = request.data.get('status')
            if book_status:
                filters['status'] = book_status

            isbn = request.data.get('isbn')
            if isbn:
                filters['ISBN__ISBN__icontains'] = isbn

            books = Book.objects.filter(**filters).select_related(
                'ISBN', 'category', 'publisher'
            )

            search_query = request.data.get('search')
            if search_query:
                books = books.filter(
                    Q(ISBN__name__icontains=search_query) | 
                    Q(description__icontains=search_query)
                )
            sort_by = request.data.get('sort_by', 'book_id')
            sort_order = request.data.get('sort_order', 'asc')

            valid_sort_fields = ['book_id', 'price', 'stock', 'status']
            if sort_by not in valid_sort_fields:
                sort_by = 'book_id'

            if sort_order.lower() == 'desc':
                books = books.order_by(f'-{sort_by}')
            else:
                books = books.order_by(sort_by)

            page_size = int(request.data.get('page_size', 20))
            page = int(request.data.get('page', 1))

            start_idx = (page - 1) * page_size
            end_idx = start_idx + page_size

            total_count = books.count()
            books_page = books[start_idx:end_idx]

            serializer = BookSerializer(books_page, many=True)
            
            return Response({
                "message": "Books retrieved successfully",
                "count": total_count,
                "page": page,
                "page_size": page_size,
                "total_pages": (total_count + page_size - 1) // page_size,
                "books": serializer.data,
                "requested_by": operator_username
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "message": "Failed to retrieve books",
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def get(self, request):
        return self.post(request)

class UserPayOrderView(APIView):
    def post(self, request):
        try:
            username = request.data.get('username')
            order_id = request.data.get('order_id')

            if not username or not order_id:
                return Response({
                    "message": "Payment failed",
                    "error": "Username and order_id are required"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if not User.objects.filter(username=username).exists():
                return Response({
                    "message": "Payment failed", 
                    "error": f"User '{username}' does not exist"
                }, status=status.HTTP_404_NOT_FOUND)
            
            user = User.objects.get(username=username)
            
            try:
                order = Order.objects.get(order_id=order_id)
            except Order.DoesNotExist:
                return Response({
                    "message": "Payment failed",
                    "error": f"Order with ID {order_id} does not exist"
                }, status=status.HTTP_404_NOT_FOUND)
            
            if order.user != user:
                return Response({
                    "message": "Payment failed",
                    "error": "This order does not belong to the specified user"
                }, status=status.HTTP_403_FORBIDDEN)

            if order.status != 'pending':
                return Response({
                    "message": "Payment failed",
                    "error": f"Cannot pay for order with status '{order.status}'. Only pending orders can be paid."
                }, status=status.HTTP_400_BAD_REQUEST)
            
            previous_status = order.status
            order.status = 'paid'
            order.save()
            
            return Response({
                "message": "Order paid successfully",
                "order_id": order_id,
                "username": username,
                "previous_status": previous_status,
                "current_status": "paid",
                "total_amount": str(order.total_amount)
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "message": "Payment failed",
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)