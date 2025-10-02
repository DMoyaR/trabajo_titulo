from django.urls import path
from .views import login_view, TemaDisponibleListCreateView

urlpatterns = [
    path("login", login_view, name="login"),
    path("temas/", TemaDisponibleListCreateView.as_view(), name="temas-disponibles"),
]