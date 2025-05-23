"""
URL configuration for backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib.auth.views import LoginView
# from django.contrib import admin
from django.urls import path, include
from demo.views import *
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    #    path("admin/", admin.site.urls),
    path('api/books/recommend/import/', RecommendBooksImportVIEW.as_view(), name='recommend-import'),
    path('api/books/all/', BookListALLAPIVIEW.as_view(), name='book-list'),
    path('api/books/random/', RandomBooksView.as_view(), name='random-books'),
    path('api/books/recommend/', RecommendBooksListAPIVIEW.as_view(), name='recommend-list'),
    path('api/books/categorylist/', CategoryListVIEW.as_view(), name='category-list'),
    path('api/books/categorydetail/', CategoryDetailListVIEW.as_view(), name='category-detail'),
    path('api/books/search/', BookSearchAPIView.as_view(), name='book-search'),
    path('api/books/everyday/', BookEveryDayAPIView.as_view(), name='book-every-day'),

    path('api/user/register/', UserRegistrationView.as_view(), name='user-registration'),
    path('api/user/login/', UserLoginView.as_view(), name='user-login'),
    path('api/user/close/', UserCloseView.as_view(), name='user-close'),
    path('api/user/modify/', UserUpdateView.as_view(), name='user-update'),

    path('api/chart/all/', ChartListView.as_view(), name='chart-list'),
    path('api/chart/add/', ChartAddView.as_view(), name='chart-add'),

    path('api/admin/register/', BackendUserRegistrationView.as_view(), name='backend-user-registration'),
    path('api/admin/update_backenduser/', BackendUserUpdateView.as_view(), name='backend-user-update'),
    path('api/admin/register_admin/', BackendUserRegistrationView_without_permission.as_view(), name='backend-user-registration-admin'),
    path('api/admin/login/', BackendUserLoginView.as_view(), name='backend-user-login'),
    path('api/admin/delete/', BackendUserDeleteView.as_view(), name='backend-user-delete'),
    path('api/admin/get_backusers/', BackendUserGetBackendUserListView.as_view(), name='backend-user-get-backend-users'),
    path('api/admin/get_users/', BackendUserGetUserListView.as_view(), name='backend-user-get-users'),
    path('api/admin/update_user/', BackendUserUpdateUserView.as_view(), name='backend-user-update-user'),
    path('api/admin/get_orders/', BackendUserGetOrdersView.as_view(), name='backend-user-get-orders'),
    path('api/admin/update_order/', BackendUserUpdateOrderView.as_view(), name='backend-user-update-order'),
    path('api/admin/update_book/', BackendUserUpdateBookView.as_view(), name='backend-user-update-book'),
    path('api/admin/get_authors/', BackendUserGetAuthorsView.as_view(), name='backend-user-get-authors'),
    path('api/admin/update_author/', BackendUserUpdateAuthorView.as_view(), name='backend-user-update-author'),
    path('api/admin/import_book/', BackendUserImportBookView.as_view(), name='backend-user-import-book'),
    path('api/admin/get_books/', BackendUserGetBooksView.as_view(), name='backend-user-get-books'),

    path('api/order/user_create/', CreateOrderView.as_view(), name='user-create-order'),
    path('api/order/user_detail/', GetUserOrderDetailsView.as_view(), name='user-order-details'),
    path('api/order/user_cancel/', UserCancelOrderView.as_view(), name='user-cancel-order'),
    path('api/order/user_pay/', UserPayOrderView.as_view(), name='user-pay-order'),

    path('api/history/user_browse/', UserBrowseHistoryView.as_view(), name='user-browse-history'),
    path('api/history/user_history/', GetUserBrowseHistoryView.as_view(), name='user-browse-history-list'),


] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
