import json
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
    PropuestaTemaSerializer,
    PropuestaTemaCreateSerializer,
    PropuestaTemaDecisionSerializer,
    UsuarioResumenSerializer,
    NotificacionSerializer,
)
from .models import (
    TemaDisponible,
    Usuario,
    SolicitudCartaPractica,
    PropuestaTema,
    Notificacion,
)


REDIRECTS = {
    "alumno": "http://localhost:4200/alumno/dashboard",
    "docente": "http://localhost:4200/docente/dashboard",
    "coordinador": "http://localhost:4200/coordinacion/inicio",
}


def _limpiar_rut(valor: str | None) -> str:
    if not valor:
        return ""
    return re.sub(r"[^0-9kK]", "", valor)

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
        "telefono": usuario.telefono,
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


@api_view(["GET", "DELETE"])
@permission_classes([AllowAny])
def tema_disponible_detalle(request, pk: int):
    """Permite obtener o eliminar un tema disponible concreto."""

    tema = get_object_or_404(TemaDisponible, pk=pk)

    if request.method == "DELETE":
        tema.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    serializer = TemaDisponibleSerializer(tema)
    return Response(serializer.data)


class DocenteListView(generics.ListAPIView):
    serializer_class = UsuarioResumenSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = Usuario.objects.filter(rol="docente").order_by("nombre_completo")
        carrera = self.request.query_params.get("carrera")
        if carrera:
            queryset = queryset.filter(carrera__icontains=carrera)
        return queryset


class PropuestaTemaListCreateView(generics.ListCreateAPIView):
    queryset = PropuestaTema.objects.select_related("alumno", "docente")
    permission_classes = [AllowAny]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return PropuestaTemaCreateSerializer
        return PropuestaTemaSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        docente_id = self.request.query_params.get("docente")
        alumno_id = self.request.query_params.get("alumno")
        estado = self.request.query_params.get("estado")

        if docente_id:
            try:
                docente_id_int = int(docente_id)
            except (TypeError, ValueError):
                return queryset.none()

            # Django's JSONField lookups are inconsistent across engines when
            # checking if a simple value exists inside an array. To guarantee
            # that docentes listed en "preferencias_docentes" también puedan
            # ver la propuesta, primero filtramos por coincidencia directa y
            # luego agregamos manualmente los ids cuyo arreglo contiene el
            # docente buscado.
            direct_ids = queryset.filter(docente_id=docente_id_int).values_list(
                "id", flat=True
            )

            preferred_ids = [
                pk
                for pk, preferencias in queryset.values_list(
                    "id", "preferencias_docentes"
                )
                if _docente_en_preferencias(docente_id_int, preferencias)
            ]

            queryset = queryset.filter(
                id__in=set(direct_ids).union(preferred_ids)
            )
        if alumno_id:
            queryset = queryset.filter(alumno_id=alumno_id)
        if estado in {"pendiente", "aceptada", "rechazada"}:
            queryset = queryset.filter(estado=estado)

        return queryset

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        propuesta = serializer.save()
        output_serializer = PropuestaTemaSerializer(propuesta)
        headers = self.get_success_headers(output_serializer.data)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED, headers=headers)


class PropuestaTemaRetrieveUpdateView(generics.RetrieveUpdateAPIView):
    queryset = PropuestaTema.objects.select_related("alumno", "docente")
    permission_classes = [AllowAny]

    def get_serializer_class(self):
        if self.request.method in {"PUT", "PATCH"}:
            return PropuestaTemaDecisionSerializer
        return PropuestaTemaSerializer

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        estado_anterior = instance.estado
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        propuesta = serializer.save()
        if estado_anterior != propuesta.estado:
            _notificar_decision_propuesta(propuesta)
        output_serializer = PropuestaTemaSerializer(propuesta)
        return Response(output_serializer.data)


class NotificacionListView(generics.ListAPIView):
    serializer_class = NotificacionSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = Notificacion.objects.select_related("usuario")
        usuario_id = self.request.query_params.get("usuario")
        if usuario_id:
            try:
                usuario_id_int = int(usuario_id)
            except (TypeError, ValueError):
                return Notificacion.objects.none()
            queryset = queryset.filter(usuario_id=usuario_id_int)

        leida = self.request.query_params.get("leida")
        if leida is not None:
            valor = str(leida).lower()
            if valor in {"true", "1", "false", "0"}:
                queryset = queryset.filter(leida=valor in {"true", "1"})

        return queryset


@api_view(["POST"])
@permission_classes([AllowAny])
def marcar_notificacion_leida(request, pk: int):
    notificacion = get_object_or_404(Notificacion, pk=pk)
    notificacion.leida = True
    notificacion.save(update_fields=["leida"])
    serializer = NotificacionSerializer(notificacion)
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([AllowAny])
def crear_solicitud_carta_practica(request):
    serializer = SolicitudCartaPracticaCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    alumno_data = data.get("alumno", {})
    practica_data = data.get("practica", {})
    destinatario_data = data.get("destinatario", {})
    escuela_data = data.get("escuela", {})
    meta = data.get("meta") or {}

    alumno_rut = alumno_data.get("rut", "").strip()
    alumno_rut_limpio = _limpiar_rut(alumno_rut)

    alumno = None
    if alumno_rut:
        alumno = Usuario.objects.filter(rut__iexact=alumno_rut).first()
        if not alumno and alumno_rut_limpio:
            alumno = (
                Usuario.objects.annotate(
                    rut_sin_formato=Replace(
                        Replace("rut", Value("."), Value("")), Value("-"), Value("")
                    )
                )
                .filter(rut_sin_formato__iexact=alumno_rut_limpio)
                .first()
            )

    coordinador = _buscar_coordinador_por_carrera(alumno_data.get("carrera"))

    solicitud = SolicitudCartaPractica.objects.create(
        alumno=alumno,
        coordinador=coordinador,
        alumno_rut=alumno_rut,
        alumno_nombres=alumno_data.get("nombres", "").strip(),
        alumno_apellidos=alumno_data.get("apellidos", "").strip(),
        alumno_carrera=alumno_data.get("carrera", "").strip(),
        practica_jefe_directo=practica_data.get("jefeDirecto", "").strip(),
        practica_cargo_alumno=practica_data.get("cargoAlumno", "").strip(),
        practica_fecha_inicio=practica_data.get("fechaInicio"),
        practica_empresa_rut=practica_data.get("empresaRut", "").strip(),
        practica_sector=practica_data.get("sectorEmpresa", "").strip(),
        practica_duracion_horas=practica_data.get("duracionHoras"),
        dest_nombres=destinatario_data.get("nombres", "").strip(),
        dest_apellidos=destinatario_data.get("apellidos", "").strip(),
        dest_cargo=destinatario_data.get("cargo", "").strip(),
        dest_empresa=destinatario_data.get("empresa", "").strip(),
        escuela_id=str(escuela_data.get("id", "")).strip(),
        escuela_nombre=escuela_data.get("nombre", "").strip(),
        escuela_direccion=escuela_data.get("direccion", "").strip(),
        escuela_telefono=escuela_data.get("telefono", "").strip(),
        meta=meta,
    )

    output = SolicitudCartaPracticaSerializer(solicitud)
    headers = {"Location": f"/api/practicas/solicitudes-carta/{solicitud.pk}"}
    return Response(output.data, status=status.HTTP_201_CREATED, headers=headers)


@api_view(["GET"])
@permission_classes([AllowAny])
def listar_solicitudes_carta_practica(request):
    queryset = SolicitudCartaPractica.objects.all()

    alumno_rut = (request.query_params.get("alumno_rut") or "").strip()
    if alumno_rut:
        rut_limpio = _limpiar_rut(alumno_rut)
        filtro_rut = Q(alumno_rut__iexact=alumno_rut)
        if rut_limpio:
            queryset = queryset.annotate(
                rut_sin_formato=Replace(
                    Replace("alumno_rut", Value("."), Value("")), Value("-"), Value("")
                )
            ).filter(filtro_rut | Q(rut_sin_formato__iexact=rut_limpio))
        else:
            queryset = queryset.filter(filtro_rut)

    estado = request.query_params.get("estado")
    if estado in {"pendiente", "aprobado", "rechazado"}:
        queryset = queryset.filter(estado=estado)

    termino = (request.query_params.get("q") or "").strip()
    if termino:
        termino_normalizado = unicodedata.normalize("NFKD", termino)
        termino_ascii = termino_normalizado.encode("ascii", "ignore").decode("ascii")
        filtros = Q(alumno_nombres__icontains=termino) | Q(alumno_apellidos__icontains=termino)
        filtros |= Q(alumno_carrera__icontains=termino) | Q(dest_empresa__icontains=termino)
        filtros |= Q(dest_nombres__icontains=termino) | Q(dest_apellidos__icontains=termino)
        filtros |= Q(practica_jefe_directo__icontains=termino) | Q(practica_empresa_rut__icontains=termino)
        filtros |= Q(alumno_rut__icontains=termino)

        if termino_ascii and termino_ascii != termino:
            filtros |= Q(alumno_nombres__icontains=termino_ascii)
            filtros |= Q(alumno_apellidos__icontains=termino_ascii)
            filtros |= Q(alumno_carrera__icontains=termino_ascii)
            filtros |= Q(dest_empresa__icontains=termino_ascii)
            filtros |= Q(dest_nombres__icontains=termino_ascii)
            filtros |= Q(dest_apellidos__icontains=termino_ascii)
            filtros |= Q(practica_jefe_directo__icontains=termino_ascii)
            filtros |= Q(practica_empresa_rut__icontains=termino_ascii)
            filtros |= Q(alumno_rut__icontains=termino_ascii)

        rut_termino = _limpiar_rut(termino)
        if rut_termino:
            queryset = queryset.annotate(
                rut_sin_formato=Replace(
                    Replace("alumno_rut", Value("."), Value("")), Value("-"), Value("")
                )
            )
            filtros |= Q(rut_sin_formato__icontains=rut_termino)

        queryset = queryset.filter(filtros)

    try:
        page = int(request.query_params.get("page", 1))
    except (TypeError, ValueError):
        page = 1
    page = max(page, 1)

    try:
        size = int(request.query_params.get("size", 20))
    except (TypeError, ValueError):
        size = 20
    size = max(1, min(size, 200))

    total = queryset.count()
    offset = (page - 1) * size
    items = queryset[offset : offset + size]

    serializer = SolicitudCartaPracticaSerializer(items, many=True)
    return Response({"items": serializer.data, "total": total})


def _docente_en_preferencias(docente_id: int, preferencias) -> bool:
    """Verifica si un docente aparece en el campo `preferencias_docentes`.

    El campo puede almacenarse como lista de enteros, strings, diccionarios o
    incluso texto serializado como JSON dependiendo del motor de base de
    datos. Para asegurar la compatibilidad convertimos cualquier estructura en
    un conjunto de ids de docentes y comprobamos la pertenencia.
    """

    if not preferencias:
        return False

    ids = _extraer_ids_docentes(preferencias)
    return docente_id in ids


def _extraer_ids_docentes(preferencias) -> set[int]:
    """Normaliza las preferencias convirtiéndolas en ids de docente."""

    encontrados: set[int] = set()

    def agregar(valor):
        if valor in (None, ""):
            return

        if isinstance(valor, bool):
            # Los booleanos son subclase de int; los descartamos explícitamente
            # para evitar tratar True como id 1, por ejemplo.
            return

        if isinstance(valor, int):
            encontrados.add(valor)
            return

        if isinstance(valor, str):
            texto = valor.strip()
            if not texto:
                return
            try:
                encontrados.add(int(texto))
                return
            except (TypeError, ValueError):
                pass

            try:
                datos = json.loads(texto)
            except (TypeError, ValueError, json.JSONDecodeError):
                return
            agregar(datos)
            return

        if isinstance(valor, dict):
            # Intentamos las claves más comunes para almacenar un identificador
            # y luego recorremos recursivamente los valores anidados.
            for clave in ("id", "pk", "docente", "docente_id", "value"):
                if clave in valor:
                    agregar(valor[clave])
            for item in valor.values():
                if isinstance(item, (list, tuple, set, dict)):
                    agregar(item)
            return

        if isinstance(valor, (list, tuple, set)):
            for item in valor:
                agregar(item)
            return

    agregar(preferencias)
    return encontrados


def _notificar_decision_propuesta(propuesta: PropuestaTema) -> None:
    if propuesta.estado not in {"aceptada", "rechazada"}:
        return

    alumno = propuesta.alumno
    if alumno is None:
        return

    if propuesta.estado == "aceptada":
        titulo = "Tu propuesta de tema fue aceptada"
        mensaje_base = (
            "El docente ha aceptado tu propuesta de tema "
            f"\"{propuesta.titulo}\"."
        )
    else:
        titulo = "Tu propuesta de tema fue rechazada"
        mensaje_base = (
            "El docente ha rechazado tu propuesta de tema "
            f"\"{propuesta.titulo}\"."
        )

    comentario = (propuesta.comentario_decision or "").strip()
    if comentario:
        mensaje = f"{mensaje_base} Comentario: {comentario}"
    else:
        mensaje = mensaje_base

    Notificacion.objects.create(
        usuario=alumno,
        titulo=titulo,
        mensaje=mensaje,
        tipo="propuesta",
        meta={
            "propuesta_id": propuesta.id,
            "estado": propuesta.estado,
            "docente_id": propuesta.docente_id,
        },
    )


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
    return None

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