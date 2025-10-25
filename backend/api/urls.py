from django.urls import path, re_path

from .views import (
    login_view,
    TemaDisponibleListCreateView,
    TemaDisponibleRetrieveDestroyView,
    crear_solicitud_carta_practica,
    listar_solicitudes_carta_practica,
    aprobar_solicitud_carta_practica,
    rechazar_solicitud_carta_practica,
    PropuestaTemaListCreateView,
    PropuestaTemaRetrieveUpdateView,
    DocenteListView,
    NotificacionListView,
    marcar_notificacion_leida,
)

urlpatterns = [
    path("login", login_view, name="login"),
    path("temas/", TemaDisponibleListCreateView.as_view(), name="temas-disponibles"),
    path(
        "temas/<int:pk>/",
        TemaDisponibleRetrieveDestroyView.as_view(),
        name="tema-detalle",
    ),
     path("docentes/", DocenteListView.as_view(), name="lista-docentes"),
    path("propuestas/", PropuestaTemaListCreateView.as_view(), name="propuestas"),
    path(
        "propuestas/<int:pk>/",
        PropuestaTemaRetrieveUpdateView.as_view(),
        name="detalle-propuesta",
    ),
    path(
        "notificaciones/",
        NotificacionListView.as_view(),
        name="lista-notificaciones",
    ),
    path(
        "notificaciones/<int:pk>/leer/",
        marcar_notificacion_leida,
        name="marcar-notificacion-leida",
    ),
    re_path(
        r"^practicas/solicitudes-carta/?$",
        crear_solicitud_carta_practica,
        name="crear-solicitud-carta-practica",
    ),
    re_path(
        r"^practicas/solicitudes-carta/listar/?$",
        listar_solicitudes_carta_practica,
        name="listar-solicitudes-carta-practica-alumno",
    ),
    re_path(
        r"^coordinacion/solicitudes-carta/?$",
        listar_solicitudes_carta_practica,
        name="listar-solicitudes-carta-practica",
    ),
    re_path(
        r"^coordinacion/solicitudes-carta/(?P<pk>\d+)/aprobar/?$",
        aprobar_solicitud_carta_practica,
        name="aprobar-solicitud-carta-practica",
    ),
    re_path(
        r"^coordinacion/solicitudes-carta/(?P<pk>\d+)/rechazar/?$",
        rechazar_solicitud_carta_practica,
        name="rechazar-solicitud-carta-practica",
    ),
]