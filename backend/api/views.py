import json
import re
import unicodedata
from django.shortcuts import get_object_or_404
from django.db.models.functions import Replace
from django.db.models import Value, Q
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status, generics
from rest_framework.parsers import MultiPartParser, FormParser

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
    PracticaDocumentoSerializer,
)
from .models import (
    TemaDisponible,
    Usuario,
    SolicitudCartaPractica,
    PropuestaTema,
    Notificacion,
    PracticaDocumento,
)
from .notifications import (
    notificar_cupos_completados,
    notificar_reserva_tema,
    notificar_tema_finalizado,
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


def _parse_int(valor: str | None) -> int | None:
    try:
        return int(valor) if valor is not None else None
    except (TypeError, ValueError):
        return None


def _normalizar_texto(valor: str | None) -> str:
    if not valor:
        return ""
    texto = unicodedata.normalize("NFKD", valor)
    texto = "".join(char for char in texto if not unicodedata.combining(char))
    return texto.casefold().strip()


def _carreras_coinciden(a: str | None, b: str | None) -> bool:
    if not a or not b:
        return False
    return _normalizar_texto(a) == _normalizar_texto(b)


def _filtrar_queryset_por_carrera(queryset, carrera: str | None):
    if not carrera:
        return queryset.none()

    carrera_normalizada = _normalizar_texto(carrera)
    if not carrera_normalizada:
        return queryset.none()

    matching_ids = [
        pk
        for pk, carrera_tema in queryset.values_list("pk", "carrera")
        if _normalizar_texto(carrera_tema) == carrera_normalizada
    ]

    if not matching_ids:
        return queryset.none()

    return queryset.filter(pk__in=matching_ids)


def _obtener_usuario_por_id(valor: str | None) -> Usuario | None:
    usuario_id = _parse_int(valor)
    if usuario_id is None:
        return None
    try:
        return Usuario.objects.get(pk=usuario_id)
    except Usuario.DoesNotExist:
        return None


def _obtener_usuario_para_temas(request) -> Usuario | None:
    usuario = _obtener_usuario_por_id(request.query_params.get("usuario"))
    if usuario:
        return usuario
    return _obtener_usuario_por_id(request.query_params.get("alumno"))

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

    def get_serializer_context(self):
        context = super().get_serializer_context()
        alumno_param = self.request.query_params.get("alumno")
        alumno_id = _parse_int(alumno_param)
        if alumno_id is None:
            usuario = _obtener_usuario_para_temas(self.request)
            if usuario and usuario.rol == "alumno":
                alumno_id = usuario.pk
        context["alumno_id"] = alumno_id
        return context

    def perform_create(self, serializer):
        creador = serializer.validated_data.get("created_by")

        if not creador:
            creador = _obtener_usuario_por_id(self.request.data.get("created_by"))

        if not creador:
            potencial = _obtener_usuario_para_temas(self.request)
            if potencial and potencial.rol in {"docente", "coordinador"}:
                creador = potencial

        if creador:
            serializer.save(created_by=creador)
        else:
            serializer.save()

    def get_queryset(self):
        queryset = super().get_queryset()
        usuario = _obtener_usuario_para_temas(self.request)

        if usuario and usuario.carrera:
            return _filtrar_queryset_por_carrera(queryset, usuario.carrera)

        carrera = self.request.query_params.get("carrera")
        if carrera:
            return _filtrar_queryset_por_carrera(queryset, carrera)

        return queryset.none()

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
        notificar_tema_finalizado(tema)
        tema.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    usuario = _obtener_usuario_para_temas(request)
    carrera_param = request.query_params.get("carrera")

    if usuario and usuario.carrera and not _carreras_coinciden(
        tema.carrera, usuario.carrera
    ):
        return Response(status=status.HTTP_404_NOT_FOUND)

    if carrera_param and not _carreras_coinciden(tema.carrera, carrera_param):
        return Response(status=status.HTTP_404_NOT_FOUND)

    alumno_id = None
    if usuario and usuario.rol == "alumno":
        alumno_id = usuario.pk
    else:
        alumno_id = _parse_int(request.query_params.get("alumno"))

    serializer = TemaDisponibleSerializer(
        tema,
        context={"request": request, "alumno_id": alumno_id},
    )
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([AllowAny])
def reservar_tema(request, pk: int):
    tema = get_object_or_404(TemaDisponible, pk=pk)

    cupos_antes = tema.cupos_disponibles

    alumno_id = request.data.get("alumno")
    if not alumno_id:
        return Response(
            {"detail": "Debe indicar el alumno que solicita el tema."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        alumno_id_int = int(alumno_id)
    except (TypeError, ValueError):
        return Response(
            {"detail": "El identificador de alumno es inválido."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    alumno = get_object_or_404(Usuario, pk=alumno_id_int)
    if alumno.rol != "alumno":
        return Response(
            {"detail": "Solo estudiantes pueden reservar un tema."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if alumno.carrera and not _carreras_coinciden(tema.carrera, alumno.carrera):
        return Response(
            {
                "detail": "Solo puedes reservar temas asociados a tu carrera.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if cupos_antes <= 0:
        return Response(
            {"detail": "Este tema ya no tiene cupos disponibles."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    inscripcion, created = tema.inscripciones.get_or_create(alumno=alumno)

    if not created and inscripcion.activo:
        return Response(
            {"detail": "Ya cuentas con un cupo reservado en este tema."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    reactivada = False
    if not inscripcion.activo:
        inscripcion.activo = True
        inscripcion.save(update_fields=["activo", "updated_at"])
        reactivada = True

    cupos_despues = tema.cupos_disponibles

    notificar_reserva_tema(
        tema,
        alumno,
        cupos_disponibles=cupos_despues,
        reactivada=reactivada,
        inscripcion_id=inscripcion.pk,
    )

    if cupos_antes > 0 and cupos_despues == 0:
        notificar_cupos_completados(tema)

    serializer = TemaDisponibleSerializer(
        tema,
        context={"request": request, "alumno_id": alumno.pk},
    )
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


@api_view(["GET", "POST"])
@permission_classes([AllowAny])
@parser_classes([MultiPartParser, FormParser])
def gestionar_documentos_practica(request):
    queryset = PracticaDocumento.objects.select_related("uploaded_by")

    if request.method == "GET":
        coordinador_param = request.query_params.get("coordinador")
        carrera_param = request.query_params.get("carrera")

        if coordinador_param:
            coordinador = _obtener_usuario_por_id(coordinador_param)
            if not coordinador or coordinador.rol != "coordinador":
                return Response(
                    {"detail": "Coordinador no válido."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            queryset = queryset.filter(uploaded_by=coordinador)
        elif carrera_param:
            queryset = _filtrar_queryset_por_carrera(queryset, carrera_param)
        else:
            queryset = queryset.none()

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

        serializer = PracticaDocumentoSerializer(
            items,
            many=True,
            context={"request": request},
        )
        return Response({"items": serializer.data, "total": total})

    coordinador = _obtener_usuario_por_id(request.data.get("coordinador"))
    if not coordinador or coordinador.rol != "coordinador":
        return Response(
            {"detail": "Coordinador no válido."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    carrera = (coordinador.carrera or "").strip()
    if not carrera:
        return Response(
            {"detail": "El coordinador no tiene una carrera asignada."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    archivo = request.FILES.get("archivo")
    if not archivo:
        return Response(
            {"archivo": ["Este campo es obligatorio."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    nombre = (request.data.get("nombre") or archivo.name or "").strip()
    if not nombre:
        return Response(
            {"nombre": ["Este campo es obligatorio."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    descripcion = (request.data.get("descripcion") or "").strip() or None

    documento = PracticaDocumento.objects.create(
        carrera=carrera,
        nombre=nombre,
        descripcion=descripcion,
        archivo=archivo,
        uploaded_by=coordinador,
    )

    serializer = PracticaDocumentoSerializer(
        documento,
        context={"request": request},
    )
    headers = {"Location": f"/api/coordinacion/practicas/documentos/{documento.pk}/"}
    return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)


@api_view(["DELETE"])
@permission_classes([AllowAny])
def eliminar_documento_practica(request, pk: int):
    documento = get_object_or_404(
        PracticaDocumento.objects.select_related("uploaded_by"), pk=pk
    )

    coordinador_param = request.query_params.get("coordinador") or request.data.get(
        "coordinador"
    )
    coordinador = _obtener_usuario_por_id(coordinador_param)
    if not coordinador or coordinador.rol != "coordinador":
        return Response(
            {"detail": "Coordinador no válido."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if documento.uploaded_by_id != coordinador.pk:
        return Response(
            {"detail": "No tienes permisos para eliminar este documento."},
            status=status.HTTP_403_FORBIDDEN,
        )

    if documento.archivo:
        documento.archivo.delete(save=False)
    documento.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


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