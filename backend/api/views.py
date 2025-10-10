import re
import unicodedata

from django.db.models import Q, Value
from django.db.models.functions import Replace
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status, generics

from .serializers import (
    LoginSerializer,
    TemaDisponibleSerializer,
    SolicitudCartaPracticaCreateSerializer,
    SolicitudCartaPracticaSerializer,
)
from .models import TemaDisponible, Usuario, SolicitudCartaPractica


REDIRECTS = {
    "alumno": "http://localhost:4200/alumno/dashboard",
    "docente": "http://localhost:4200/docente/dashboard",
    "coordinador": "http://localhost:4200/coordinacion/inicio",
}

@api_view(["POST"])
@permission_classes([AllowAny])

def login_view(request):
    serializer = LoginSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({"detail": "Credenciales inválidas"}, status=status.HTTP_401_UNAUTHORIZED)

    usuario = serializer.validated_data["usuario"]
    redirect_url = REDIRECTS.get(usuario.rol)

    return Response({
        "status": "success",
        "rol": usuario.rol,
        "redirect_url": redirect_url,
        "nombre": usuario.nombre_completo,
        "correo": usuario.correo,
        "rut": usuario.rut,
        "carrera": usuario.carrera,
        "id": usuario.id,
    }, status=status.HTTP_200_OK)

class TemaDisponibleListCreateView(generics.ListCreateAPIView):
    queryset = TemaDisponible.objects.all()
    serializer_class = TemaDisponibleSerializer
    permission_classes = [AllowAny]

    def perform_create(self, serializer):
        user = getattr(self.request, "user", None)
        if isinstance(user, Usuario):
            serializer.save(created_by=user)
        else:
            serializer.save()


class TemaDisponibleRetrieveDestroyView(generics.RetrieveDestroyAPIView):
    queryset = TemaDisponible.objects.all()
    serializer_class = TemaDisponibleSerializer
    permission_classes = [AllowAny]


def _normalizar_carrera(nombre: str) -> str:
    if not nombre:
        return ""
    texto = unicodedata.normalize("NFKD", nombre)
    texto = texto.encode("ascii", "ignore").decode("ascii")
    texto = texto.lower()
    texto = texto.replace("ingenieria", "ing")
    texto = texto.replace("ing.", "ing")
    texto = re.sub(r"[^a-z0-9]+", " ", texto)
    return " ".join(texto.split())


def _buscar_coordinador_por_carrera(carrera: str):
    if not carrera:
        return None

    qs = Usuario.objects.filter(rol="coordinador")

    exacto = qs.filter(carrera__iexact=carrera).order_by("id").first()
    if exacto:
        return exacto

    normalizada = _normalizar_carrera(carrera)
    if not normalizada:
        return None

    for usuario in qs:
        if _normalizar_carrera(usuario.carrera or "") == normalizada:
            return usuario

    return (
        qs.filter(carrera__icontains=carrera)
        .order_by("id")
        .first()
    )


def _normalizar_rut(rut: str) -> str:
    if not rut:
        return ""
    return re.sub(r"[^0-9Kk]", "", rut).upper()


@api_view(["POST"])
@permission_classes([AllowAny])
def crear_solicitud_carta_practica(request):
    serializer = SolicitudCartaPracticaCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    alumno_data = data["alumno"]
    practica_data = data["practica"]
    destinatario_data = data["destinatario"]
    escuela_data = data["escuela"]

    alumno_usuario = (
        Usuario.objects.filter(rut__iexact=alumno_data["rut"])
        .filter(rol="alumno")
        .first()
    )
    coordinador_usuario = _buscar_coordinador_por_carrera(alumno_data.get("carrera"))

    solicitud = SolicitudCartaPractica.objects.create(
        alumno=alumno_usuario,
        coordinador=coordinador_usuario,
        alumno_rut=alumno_data["rut"],
        alumno_nombres=alumno_data["nombres"],
        alumno_apellidos=alumno_data["apellidos"],
        alumno_carrera=alumno_data["carrera"],
        practica_jefe_directo=practica_data["jefeDirecto"],
        practica_cargo_alumno=practica_data["cargoAlumno"],
        practica_fecha_inicio=practica_data["fechaInicio"],
        practica_empresa_rut=practica_data["empresaRut"],
        practica_sector=practica_data["sectorEmpresa"],
        practica_duracion_horas=practica_data["duracionHoras"],
        dest_nombres=destinatario_data["nombres"],
        dest_apellidos=destinatario_data["apellidos"],
        dest_cargo=destinatario_data["cargo"],
        dest_empresa=destinatario_data["empresa"],
        escuela_id=escuela_data["id"],
        escuela_nombre=escuela_data["nombre"],
        escuela_direccion=escuela_data["direccion"],
        escuela_telefono=escuela_data["telefono"],
        meta=data.get("meta", {}),
    )

    return Response(
        {
            "status": "ok",
            "id": str(solicitud.id),
            "mensaje": "Solicitud registrada correctamente.",
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def listar_solicitudes_carta_practica(request):
    estado = request.query_params.get("estado")
    busqueda = request.query_params.get("q", "").strip()
    try:
        page = max(int(request.query_params.get("page", 1)), 1)
    except (TypeError, ValueError):
        page = 1
    try:
        size = max(int(request.query_params.get("size", 10)), 1)
    except (TypeError, ValueError):
        size = 10
    coordinador_rut = request.query_params.get("coordinador_rut")
    alumno_rut = (request.query_params.get("alumno_rut") or "").strip()

    queryset = SolicitudCartaPractica.objects.all()

    if estado in {"pendiente", "aprobado", "rechazado"}:
        queryset = queryset.filter(estado=estado)

    if coordinador_rut:
        queryset = queryset.filter(coordinador__rut__iexact=coordinador_rut)

    if alumno_rut:
        filtro = Q(alumno_rut__iexact=alumno_rut)
        rut_limpio = _normalizar_rut(alumno_rut)
        if rut_limpio:
            queryset = queryset.annotate(
                alumno_rut_limpio=Replace(
                    Replace(Replace("alumno_rut", Value("."), Value("")), Value("-"), Value("")),
                    Value(" "),
                    Value(""),
                )
            )
            filtro |= Q(alumno_rut_limpio__iexact=rut_limpio)
        queryset = queryset.filter(filtro)

    if busqueda:
        queryset = queryset.filter(
            Q(alumno_nombres__icontains=busqueda)
            | Q(alumno_apellidos__icontains=busqueda)
            | Q(alumno_rut__icontains=busqueda)
            | Q(dest_empresa__icontains=busqueda)
        )

    total = queryset.count()
    start = max((page - 1) * size, 0)
    end = start + size
    items = queryset.order_by("-creado_en")[start:end]

    serializer = SolicitudCartaPracticaSerializer(items, many=True)
    return Response({"items": serializer.data, "total": total})

@api_view(["POST"])
@permission_classes([AllowAny])
def aprobar_solicitud_carta_practica(request, pk: int):
    solicitud = get_object_or_404(SolicitudCartaPractica, pk=pk)
    url = request.data.get("url")
    solicitud.url_documento = url or None
    solicitud.motivo_rechazo = None
    solicitud.estado = "aprobado"
    solicitud.save(update_fields=["estado", "url_documento", "motivo_rechazo", "actualizado_en"])
    return Response({"status": "ok"})


@api_view(["POST"])
@permission_classes([AllowAny])
def rechazar_solicitud_carta_practica(request, pk: int):
    solicitud = get_object_or_404(SolicitudCartaPractica, pk=pk)
    motivo = (request.data.get("motivo") or "").strip()
    if not motivo:
        return Response(
            {"motivo": "Este campo es obligatorio."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    solicitud.motivo_rechazo = motivo
    solicitud.url_documento = None
    solicitud.estado = "rechazado"
    solicitud.save(update_fields=["estado", "url_documento", "motivo_rechazo", "actualizado_en"])
    return Response({"status": "ok"})