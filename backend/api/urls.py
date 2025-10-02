from django.urls import path

from .views import (
    login_view,
    TemaDisponibleListCreateView,
    TemaDisponibleRetrieveDestroyView,
)

urlpatterns = [
    path("login", login_view, name="login"),
    path("temas/", TemaDisponibleListCreateView.as_view(), name="temas-disponibles"),
    path(
        "temas/<int:pk>/",
        TemaDisponibleRetrieveDestroyView.as_view(),
        name="tema-detalle",
    ),
]