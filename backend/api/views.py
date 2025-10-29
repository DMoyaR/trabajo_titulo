import json
import re
import unicodedata

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage

from django.db.models import Q, Value
from django.db.models.functions import Replace
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.html import escape
from django.utils.text import slugify
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status, generics

from .serializers import (
    LoginSerializer,
    TemaDisponibleSerializer,
    SolicitudCartaPracticaCreateSerializer,
    SolicitudCartaPracticaSerializer,
    PracticaDocumentoSerializer,
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
    PracticaDocumento,
    PropuestaTema,
    Notificacion,
)


REDIRECTS = {
    "alumno": "http://localhost:4200/alumno/dashboard",
    "docente": "http://localhost:4200/docente/dashboard",
    "coordinador": "http://localhost:4200/coordinacion/inicio",
}


FIRMA_FALLBACK = {
    "nombre": "Coordinación de Carrera — UTEM",
    "cargo": "",
    "institucion": "Universidad Tecnologica Metropolitana",
}


FIRMAS_POR_CARRERA = {
    "Ingeniería Civil en Computación mención Informática": {
        "nombre": "Víctor Escobar Jeria",
        "cargo": "Director Escuela de Informática y Jefe de Carrera Ingeniería Civil en Computación mención Informática",
        "institucion": "Universidad Tecnologica Metropolitana",
    },
    "Ingeniería en Informática": {
        "nombre": "Patricia Mellado Acevedo",
        "cargo": "Jefa de Carrera Ingeniería en Informática",
        "institucion": "Universidad Tecnologica Metropolitana",
    },
    "Ingeniería Civil en Ciencia de Datos": {
        "nombre": "Jorge Vergara Quezada",
        "cargo": "Jefe de Carrera Ingeniería Civil en Ciencia de Datos",
        "institucion": "Universidad Tecnologica Metropolitana",
    },
    "Ingeniería Civil Industrial": {
        "nombre": "Evelyn Gajardo Gutiérrez",
        "cargo": "Directora Escuela de Industria y Jefa de Carrera Ingeniería Civil Industrial",
        "institucion": "Universidad Tecnologica Metropolitana",
    },
    "Ingeniería Industrial": {
        "nombre": "Alexis Rufatt Zafira",
        "cargo": "Jefe de Carrera Ingeniería Industrial",
        "institucion": "Universidad Tecnologica Metropolitana",
    },
    "Ingeniería Civil Electrónica": {
        "nombre": "Patricio Santos López",
        "cargo": "Director Escuela de Electrónica y Jefe de Carrera Ingeniería Civil Electrónica / Ingeniería Electrónica",
        "institucion": "Universidad Tecnologica Metropolitana",
    },
    "Ingeniería Electrónica": {
        "nombre": "Patricio Santos López",
        "cargo": "Director Escuela de Electrónica y Jefe de Carrera Ingeniería Civil Electrónica / Ingeniería Electrónica",
        "institucion": "Universidad Tecnologica Metropolitana",
    },
    "Ingeniería Civil en Mecánica": {
        "nombre": "Christian Muñoz Valenzuela",
        "cargo": "Director Escuela de Mecánica",
        "institucion": "Universidad Tecnologica Metropolitana",
    },
    "Ingeniería en Geomensura": {
        "nombre": "Juan Toledo Ibarra",
        "cargo": "Director Escuela de Geomensura",
        "institucion": "Universidad Tecnologica Metropolitana",
    },
    "Bachillerato en Ciencias de la Ingeniería": {
        "nombre": "Rafael Loyola Berríos",
        "cargo": "Coordinador del Plan Común de Ingeniería y Jefe de Carrera de Bachillerato en Ciencias de la Ingeniería",
        "institucion": "Universidad Tecnologica Metropolitana",
    },
    "Dibujante Proyectista": {
        "nombre": "Marcelo Borges Quintanilla",
        "cargo": "Jefe de Carrera Dibujante Proyectista",
        "institucion": "Universidad Tecnologica Metropolitana",
    },
    "Ingeniería Civil Biomédica": {
        "nombre": "Raúl Caulier Cisterna",
        "cargo": "Jefe de Carrera Ingeniería Civil Biomédica",
        "institucion": "Universidad Tecnologica Metropolitana",
    },
}


OBJETIVOS_DEFECTO = [
    "Aplicar conocimientos disciplinares en un contexto profesional real.",
    "Integrarse a equipos de trabajo, comunicando avances y resultados.",
    "Cumplir con normas de seguridad, calidad y medioambiente vigentes.",
    "Elaborar informes técnicos con conclusiones basadas en evidencia.",
]


OBJETIVOS_POR_ESCUELA = {
    "inf": [
        "Interactuar con profesionales del área informática y con otros de áreas relacionadas.",
        "Desarrollar capacidades informáticas que le permitan desenvolverse en el ámbito profesional.",
        "Comprobar empíricamente la importancia de las tecnologías de información.",
        "Participar en el diseño y/o implementación de soluciones informáticas.",
    ],
    "ind": [
        "Aplicar metodologías de mejora continua (Lean/Seis Sigma) en procesos productivos o de servicios.",
        "Levantar y analizar indicadores de gestión (KPI), costos y productividad.",
        "Participar en la planificación de la cadena de suministro, logística y gestión de inventarios.",
        "Colaborar en sistemas de gestión de calidad y seguridad industrial.",
    ],
    "elec": [
        "Apoyar el diseño, simulación y pruebas de circuitos electrónicos y sistemas embebidos.",
        "Implementar e integrar instrumentación, sensores y adquisición de datos.",
        "Participar en el diseño/ensamble de PCB y protocolos de comunicación.",
        "Aplicar normas de seguridad y estándares eléctricos en laboratorio y terreno.",
    ],
    "mec": [
        "Apoyar el diseño y análisis mecánico mediante herramientas CAD/CAE.",
        "Participar en procesos de manufactura, mantenimiento y confiabilidad.",
        "Realizar análisis térmico y de fluidos en equipos/sistemas cuando aplique.",
        "Aplicar normas de seguridad industrial en talleres y plantas.",
    ],
    "geo": [
        "Realizar levantamientos topográficos con equipos GNSS/estación total.",
        "Procesar y validar datos geoespaciales para generar planos y modelos.",
        "Aplicar técnicas de georreferenciación, nivelación y replanteo.",
        "Elaborar cartografía y reportes técnicos utilizando SIG.",
    ],
    "trans": [
        "Apoyar estudios de tránsito: aforos, velocidad y nivel de servicio.",
        "Analizar y modelar la demanda de transporte para la planificación de rutas.",
        "Colaborar en medidas de seguridad vial e infraestructura asociada.",
        "Contribuir a la gestión operativa del transporte público/privado.",
    ],
}


OBJETIVOS_POR_CARRERA = {
    "Ingeniería Civil Biomédica": [
        "Apoyar la integración y validación de equipos biomédicos en entornos clínicos.",
        "Aplicar normas y estándares de seguridad (IEC/ISO) y gestión de riesgos clínicos.",
        "Desarrollar y/o mantener sistemas de bioinstrumentación y monitoreo.",
        "Colaborar en interoperabilidad de sistemas de información en salud.",
    ],
    "Ingeniería en Alimentos": [
        "Apoyar el control de calidad bajo BPM y sistema HACCP.",
        "Realizar análisis fisicoquímicos y/o microbiológicos según protocolos.",
        "Participar en mejora de procesos y trazabilidad en planta.",
        "Colaborar en desarrollo o reformulación de productos alimentarios.",
    ],
    "Ingeniería Civil Química": [
        "Participar en operaciones unitarias y control de procesos químicos.",
        "Apoyar en control de calidad y cumplimiento normativo ambiental.",
        "Realizar balances de materia y energía y análisis de datos de planta.",
        "Contribuir a seguridad de procesos y gestión de residuos.",
    ],
    "Química Industrial": [
        "Apoyar en control de calidad y análisis químico instrumental.",
        "Participar en operación/optimización de procesos y seguridad industrial.",
        "Gestionar documentación técnica y cumplimiento normativo.",
        "Colaborar en implementación de mejoras de proceso.",
    ],
    "Ingeniería Civil Matemática": [
        "Aplicar modelamiento matemático a problemas de ingeniería.",
        "Desarrollar análisis estadístico y métodos de optimización.",
        "Implementar soluciones computacionales para simulación numérica.",
        "Elaborar reportes técnicos con interpretación de resultados.",
    ],
    "Ingeniería Civil en Ciencia de Datos": [
        "Adquirir, depurar y preparar datos desde fuentes heterogéneas.",
        "Construir modelos de analítica/aprendizaje supervisado y no supervisado.",
        "Validar y evaluar modelos; comunicar hallazgos con visualizaciones.",
        "Apoyar el despliegue y monitoreo de soluciones de data science.",
    ],
    "Ingeniería en Biotecnología": [
        "Apoyar cultivos, bioprocesos y análisis en laboratorio biotecnológico.",
        "Aplicar normas de bioseguridad y buenas prácticas de laboratorio.",
        "Procesar y analizar datos experimentales para toma de decisiones.",
        "Colaborar en escalamiento o transferencia tecnológica cuando aplique.",
    ],
    "Ingeniería en Geomensura": [
        "Realizar levantamientos topográficos con equipos GNSS/estación total.",
        "Procesar y validar datos geoespaciales para generar planos y modelos.",
        "Aplicar técnicas de georreferenciación, nivelación y replanteo.",
        "Elaborar cartografía y reportes técnicos utilizando SIG.",
    ],
}


def _limpiar_rut(valor: str | None) -> str:
    if not valor:
        return ""
    return re.sub(r"[^0-9kK]", "", valor)


def _formatear_rut(valor: str | None) -> str:
    limpio = _limpiar_rut(valor)
    if not limpio:
        return valor or ""

    cuerpo, dv = limpio[:-1], limpio[-1].upper()
    if not cuerpo:
        return dv

    partes = []
    while len(cuerpo) > 3:
        partes.insert(0, cuerpo[-3:])
        cuerpo = cuerpo[:-3]
    if cuerpo:
        partes.insert(0, cuerpo)
    cuerpo_formateado = ".".join(partes)
    return f"{cuerpo_formateado}-{dv}"


def _obtener_firma(carrera: str | None) -> dict[str, str]:
    if carrera and carrera in FIRMAS_POR_CARRERA:
        return FIRMAS_POR_CARRERA[carrera]
    return FIRMA_FALLBACK


def _obtener_objetivos(carrera: str | None, escuela_id: str | None) -> list[str]:
    if carrera and carrera in OBJETIVOS_POR_CARRERA:
        return OBJETIVOS_POR_CARRERA[carrera]
    if escuela_id and escuela_id in OBJETIVOS_POR_ESCUELA:
        return OBJETIVOS_POR_ESCUELA[escuela_id]
    return OBJETIVOS_DEFECTO


def _generar_documento_carta(solicitud: SolicitudCartaPractica) -> str:
    fecha = timezone.localtime(timezone.now())
    meses = [
        "Enero",
        "Febrero",
        "Marzo",
        "Abril",
        "Mayo",
        "Junio",
        "Julio",
        "Agosto",
        "Septiembre",
        "Octubre",
        "Noviembre",
        "Diciembre",
    ]
    fecha_texto = f"Santiago, {meses[fecha.month - 1]} {fecha.day} del {fecha.year}."

    firma = _obtener_firma(solicitud.alumno_carrera)
    objetivos = _obtener_objetivos(solicitud.alumno_carrera, solicitud.escuela_id)

    objetivos_html = "".join(f"<li>{escape(obj)}</li>" for obj in objetivos)

    alumno_nombre = f"{solicitud.alumno_nombres} {solicitud.alumno_apellidos}".strip()
    rut_formateado = _formatear_rut(solicitud.alumno_rut)

    html = f"""<!DOCTYPE html>
<html lang=\"es\">
<head>
    <meta charset=\"utf-8\">
    <title>Carta {escape(alumno_nombre)}</title>
    <style>
        body {{ font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background: #f3f4f6; color: #111827; }}
        .carta {{ max-width: 680px; margin: 32px auto; background: #ffffff; padding: 48px 56px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08); border-radius: 18px; line-height: 1.6; }}
        header {{ text-align: center; margin-bottom: 28px; }}
        .c-uni {{ text-transform: uppercase; letter-spacing: 0.12em; font-size: 0.75rem; font-weight: 700; color: #0f172a; }}
        .c-addr {{ font-size: 0.9rem; margin-top: 6px; color: #475569; }}
        .c-fecha {{ text-align: right; font-size: 0.95rem; color: #1f2937; margin-bottom: 32px; }}
        .c-dest div {{ margin: 0; }}
        .c-dest {{ margin-bottom: 28px; font-size: 0.95rem; }}
        .c-dest-name {{ font-weight: 600; font-size: 1.05rem; color: #0f172a; }}
        .c-body p {{ margin: 18px 0; text-align: justify; }}
        .c-body ul {{ margin: 12px 0 12px 22px; }}
        .c-body li {{ margin-bottom: 6px; }}
        .c-sign {{ margin-top: 48px; font-size: 0.95rem; color: #0f172a; }}
        .c-firma-nombre {{ font-weight: 600; font-size: 1rem; }}
        .c-firma-cargo {{ color: #475569; }}
        .c-web {{ margin-top: 6px; color: #0ea5e9; font-size: 0.9rem; }}
    </style>
</head>
<body>
    <div class=\"carta\">
        <header>
            <div class=\"c-uni\">Universidad Tecnológica Metropolitana</div>
            <div class=\"c-addr\">{escape(solicitud.escuela_nombre)} — {escape(solicitud.escuela_direccion)} — Tel. {escape(solicitud.escuela_telefono)}</div>
        </header>
        <div class=\"c-fecha\">{escape(fecha_texto)}</div>
        <section class=\"c-dest\">
            <div>Señor</div>
            <div class=\"c-dest-name\">{escape(solicitud.dest_nombres)} {escape(solicitud.dest_apellidos)}</div>
            <div class=\"c-dest-cargo\">{escape(solicitud.dest_cargo)}</div>
            <div class=\"c-dest-emp\">{escape(solicitud.dest_empresa)}</div>
            <div>Presente</div>
        </section>
        <section class=\"c-body\">
            <p>
                Me permito dirigirme a Ud. para presentar al Sr. <b>{escape(alumno_nombre)}</b>,
                RUT <b>{escape(rut_formateado)}</b>, alumno regular de la carrera de <b>{escape(solicitud.alumno_carrera)}</b>
                de la Universidad Tecnológica Metropolitana, y solicitar su aceptación en calidad de alumno en práctica.
            </p>
            <p>
                Esta práctica tiene una duración de <b>{solicitud.practica_duracion_horas}</b> horas cronológicas y sus objetivos son:
            </p>
            <ul>{objetivos_html}</ul>
            <p>Le saluda atentamente,</p>
        </section>
        <footer class=\"c-sign\">
            <div class=\"c-firma-nombre\">{escape(firma.get('nombre', ''))}</div>
            <div class=\"c-firma-cargo\">{escape(firma.get('cargo', ''))}</div>
            <div class=\"c-web\">{escape(firma.get('institucion') or 'Universidad Tecnologica Metropolitana')}</div>
        </footer>
    </div>
</body>
</html>
"""

    base_nombre = f"carta {alumno_nombre}".strip()
    slug = slugify(base_nombre) or "carta-practica"
    ruta = f"practicas/cartas/{fecha.year}/carta-{slug}.html"

    if default_storage.exists(ruta):
        default_storage.delete(ruta)

    archivo = ContentFile(html.encode("utf-8"))
    path = default_storage.save(ruta, archivo)
    return default_storage.url(path)


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
        alumno = self.request.query_params.get("alumno")
        try:
            context["alumno_id"] = int(alumno) if alumno is not None else None
        except (TypeError, ValueError):
            context["alumno_id"] = None
        return context

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

    alumno = request.query_params.get("alumno")
    try:
        alumno_id = int(alumno) if alumno is not None else None
    except (TypeError, ValueError):
        alumno_id = None

    serializer = TemaDisponibleSerializer(
        tema,
        context={"request": request, "alumno_id": alumno_id},
    )
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([AllowAny])
def reservar_tema(request, pk: int):
    tema = get_object_or_404(TemaDisponible, pk=pk)

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

    if tema.cupos_disponibles <= 0:
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

    if not inscripcion.activo:
        inscripcion.activo = True
        inscripcion.save(update_fields=["activo", "updated_at"])

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

    coordinador_param = request.query_params.get("coordinador")
    if coordinador_param not in (None, ""):
        try:
            coordinador_id = int(coordinador_param)
        except (TypeError, ValueError):
            return Response(
                {"coordinador": "Identificador de coordinador inválido."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        queryset = queryset.filter(coordinador_id=coordinador_id)

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
    url_param = (request.data.get("url") or "").strip()

    if url_param:
        documento_url = url_param
    else:
        documento_url = _generar_documento_carta(solicitud)

    solicitud.url_documento = documento_url or None
    solicitud.motivo_rechazo = None
    solicitud.estado = "aprobado"
    solicitud.save(update_fields=["estado", "url_documento", "motivo_rechazo", "actualizado_en"])
    return Response({"status": "ok", "url": solicitud.url_documento})


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


@api_view(["GET", "POST"])
@permission_classes([AllowAny])
def gestionar_documentos_practica(request):
    if request.method == "GET":
        carrera_param = (request.query_params.get("carrera") or "").strip()
        coordinador_param = request.query_params.get("coordinador")

        carrera = None
        if coordinador_param not in (None, ""):
            try:
                coordinador_id = int(coordinador_param)
            except (TypeError, ValueError):
                return Response(
                    {"coordinador": "Identificador de coordinador inválido."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            coordinador = Usuario.objects.filter(pk=coordinador_id, rol="coordinador").first()
            if not coordinador:
                return Response(
                    {"coordinador": "Coordinador no encontrado."},
                    status=status.HTTP_404_NOT_FOUND,
                )
            carrera = coordinador.carrera
        elif carrera_param:
            carrera = carrera_param
        else:
            return Response(
                {"detail": "Debe indicar una carrera o coordinador."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        documentos = PracticaDocumento.objects.filter(carrera=carrera).order_by("-created_at")
        serializer = PracticaDocumentoSerializer(
            documentos,
            many=True,
            context={"request": request},
        )
        data = serializer.data
        return Response({"items": data, "total": len(data)})

    coordinador_param = request.data.get("coordinador")
    if coordinador_param in (None, ""):
        return Response(
            {"coordinador": "Debe indicar el coordinador que sube el archivo."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        coordinador_id = int(coordinador_param)
    except (TypeError, ValueError):
        return Response(
            {"coordinador": "Identificador de coordinador inválido."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    coordinador = Usuario.objects.filter(pk=coordinador_id, rol="coordinador").first()
    if not coordinador:
        return Response(
            {"coordinador": "Coordinador no encontrado."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if not coordinador.carrera:
        return Response(
            {"coordinador": "El coordinador no tiene una carrera asociada."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    archivo = request.FILES.get("archivo")
    if not archivo:
        return Response(
            {"archivo": "Debe adjuntar un archivo."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    nombre = (request.data.get("nombre") or archivo.name).strip()
    if not nombre:
        nombre = archivo.name

    descripcion = (request.data.get("descripcion") or "").strip() or None

    documento = PracticaDocumento.objects.create(
        carrera=coordinador.carrera,
        nombre=nombre,
        descripcion=descripcion,
        archivo=archivo,
        uploaded_by=coordinador,
    )

    serializer = PracticaDocumentoSerializer(documento, context={"request": request})
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(["DELETE"])
@permission_classes([AllowAny])
def eliminar_documento_practica(request, pk: int):
    coordinador_param = request.query_params.get("coordinador")
    if coordinador_param in (None, ""):
        return Response(
            {"coordinador": "Debe indicar el coordinador."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        coordinador_id = int(coordinador_param)
    except (TypeError, ValueError):
        return Response(
            {"coordinador": "Identificador de coordinador inválido."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    coordinador = Usuario.objects.filter(pk=coordinador_id, rol="coordinador").first()
    if not coordinador:
        return Response(
            {"coordinador": "Coordinador no encontrado."},
            status=status.HTTP_404_NOT_FOUND,
        )

    documento = get_object_or_404(PracticaDocumento, pk=pk)
    if documento.carrera != coordinador.carrera:
        return Response(
            {"detail": "No tiene permisos para eliminar este archivo."},
            status=status.HTTP_403_FORBIDDEN,
        )

    if documento.archivo:
        documento.archivo.delete(save=False)
    documento.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)