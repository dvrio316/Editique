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
    path('api/strips/<int:pk>/', views.strip_detail),
]
