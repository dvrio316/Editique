from django.urls import path

from . import views

urlpatterns = [
    path('', views.home, name='home'),

    # JSON API used by the React frontend
    path('api/auth/csrf/', views.csrf),
    path('api/auth/me/', views.me),
    path('api/auth/register/', views.register),
    path('api/auth/login/', views.login_view),
    path('api/auth/logout/', views.logout_view),
    path('api/strips/', views.strips),
    path('api/strips/finish/', views.finish_strip),
    path('api/strips/shared/<str:token>/', views.shared_strip),
    path('api/strips/shared/<str:token>/download/', views.download_shared_strip),
    path('api/strips/<int:pk>/', views.strip_detail),

    # Direct browser URL routes
    path('strip/<str:token>/', views.shared_strip_page, name='shared_strip_page'),
    path('strip/<str:token>/download/', views.download_shared_strip, name='shared_strip_download'),
]
