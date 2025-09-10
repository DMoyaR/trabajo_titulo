from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import TaskViewSet, login_view


router = DefaultRouter()
router.register(r"tasks", TaskViewSet)


urlpatterns = [
    path("login", login_view),
]


urlpatterns += router.urls