from django.urls import path

from .views import (
    login_view,
    TemaDisponibleListCreateView,
    TemaDisponibleRetrieveDestroyView,
    crear_solicitud_carta_practica,
    listar_solicitudes_carta_practica,
    aprobar_solicitud_carta_practica,
    rechazar_solicitud_carta_practica,
)

urlpatterns = [
    path("login", login_view, name="login"),
    path("temas/", TemaDisponibleListCreateView.as_view(), name="temas-disponibles"),
    path(
        "temas/<int:pk>/",
        TemaDisponibleRetrieveDestroyView.as_view(),
        name="tema-detalle",
    ),
    path(
        "practicas/solicitudes-carta",
        crear_solicitud_carta_practica,
        name="crear-solicitud-carta-practica",
    ),
    path(
        "coordinacion/solicitudes-carta",
        listar_solicitudes_carta_practica,
        name="listar-solicitudes-carta-practica",
    ),
    path(
        "coordinacion/solicitudes-carta/<int:pk>/aprobar",
        aprobar_solicitud_carta_practica,
        name="aprobar-solicitud-carta-practica",
    ),
    path(
        "coordinacion/solicitudes-carta/<int:pk>/rechazar",
        rechazar_solicitud_carta_practica,
        name="rechazar-solicitud-carta-practica",
    ),
]