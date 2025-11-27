import io
import json
import logging
import re
import textwrap
import unicodedata
import zlib
import importlib
from typing import Any

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage

from django.db import IntegrityError, transaction
from django.db.models import Q, Value, Prefetch, Count, Avg
from django.db.models.functions import Replace
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.text import slugify
from django.http import QueryDict


from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import FormParser, MultiPartParser, JSONParser
from rest_framework.permissions import AllowAny
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
try:  # pragma: no cover - dependencia opcional en tiempo de ejecución
    Image = importlib.import_module("PIL.Image")
except Exception:  # pragma: no cover
    Image = None  # type: ignore
    Image = None  # type: ignore

from .models import (
    InscripcionTema,
    Notificacion,
    PracticaDocumento,
    PracticaFirmaCoordinador,
    PracticaEvaluacion,
    PracticaEvaluacionEntrega,
    PropuestaTema,
    PropuestaTemaDocente,
    SolicitudCartaPractica,
    SolicitudReunion,
    Reunion,
    TrazabilidadReunion,
    TemaDisponible,
    Usuario,
    EvaluacionGrupoDocente,
    EvaluacionEntregaAlumno,
)
from .notifications import (
    notificar_cupos_completados,
    notificar_reserva_tema,
    notificar_tema_finalizado,
)
from .serializers import (
    LoginSerializer,
    NotificacionSerializer,
    PracticaDocumentoSerializer,
    PracticaFirmaCoordinadorSerializer,
    PracticaEvaluacionSerializer,
    PracticaEvaluacionEntregaSerializer,
    PropuestaTemaAlumnoAjusteSerializer,
    PropuestaTemaCreateSerializer,
    PropuestaTemaDocenteDecisionSerializer,
    PropuestaTemaSerializer,
    SolicitudCartaPracticaCreateSerializer,
    SolicitudCartaPracticaSerializer,
    SolicitudReunionSerializer,
    SolicitudReunionCreateSerializer,
    AprobarSolicitudReunionSerializer,
    RechazarSolicitudReunionSerializer,
    ReunionSerializer,
    ReunionCreateSerializer,
    ReunionCerrarSerializer,
    TemaDisponibleSerializer,
    UsuarioResumenSerializer,
    DocenteEvaluacionEntregaUpdateSerializer,
    EvaluacionGrupoDocenteSerializer,
    EvaluacionEntregaAlumnoSerializer,
    DocenteGrupoActivoSerializer,
    PromedioGrupoTituloSerializer,
)


logger = logging.getLogger(__name__)


REDIRECTS = {
    "alumno": "http://localhost:4200/alumno/dashboard",
    "docente": "http://localhost:4200/docente/dashboard",
    "coordinador": "http://localhost:4200/coordinacion/inicio",
}


FIRMA_FALLBACK = {
    "nombre": "Coordinación de Carrera — UTEM",
    "cargo": "",
    "institucion": "Universidad Tecnológica Metropolitana",
}


FIRMAS_POR_CARRERA = {
    "Ingeniería Civil en Computación mención Informática": {
        "nombre": "Víctor Escobar Jeria",
        "cargo": "Director Escuela de Informática y Jefe de Carrera Ingeniería Civil en Computación mención Informática",
        "institucion": "Universidad Tecnológica Metropolitana",
    },
    "Ingeniería en Informática": {
        "nombre": "Patricia Mellado Acevedo",
        "cargo": "Jefa de Carrera Ingeniería en Informática",
        "institucion": "Universidad Tecnológica Metropolitana",
    },
    "Ingeniería Civil en Ciencia de Datos": {
        "nombre": "Jorge Vergara Quezada",
        "cargo": "Jefe de Carrera Ingeniería Civil en Ciencia de Datos",
        "institucion": "Universidad Tecnológica Metropolitana",
    },
    "Ingeniería Civil Industrial": {
        "nombre": "Evelyn Gajardo Gutiérrez",
        "cargo": "Directora Escuela de Industria y Jefa de Carrera Ingeniería Civil Industrial",
        "institucion": "Universidad Tecnológica Metropolitana",
    },
    "Ingeniería Industrial": {
        "nombre": "Alexis Rufatt Zafira",
        "cargo": "Jefe de Carrera Ingeniería Industrial",
        "institucion": "Universidad Tecnológica Metropolitana",
    },
    "Ingeniería Civil Electrónica": {
        "nombre": "Patricio Santos López",
        "cargo": "Director Escuela de Electrónica y Jefe de Carrera Ingeniería Civil Electrónica / Ingeniería Electrónica",
        "institucion": "Universidad Tecnológica Metropolitana",
    },
    "Ingeniería Electrónica": {
        "nombre": "Patricio Santos López",
        "cargo": "Director Escuela de Electrónica y Jefe de Carrera Ingeniería Civil Electrónica / Ingeniería Electrónica",
        "institucion": "Universidad Tecnológica Metropolitana",
    },
    "Ingeniería Civil en Mecánica": {
        "nombre": "Christian Muñoz Valenzuela",
        "cargo": "Director Escuela de Mecánica",
        "institucion": "Universidad Tecnológica Metropolitana",
    },
    "Ingeniería en Geomensura": {
        "nombre": "Juan Toledo Ibarra",
        "cargo": "Director Escuela de Geomensura",
        "institucion": "Universidad Tecnológica Metropolitana",
    },
    "Bachillerato en Ciencias de la Ingeniería": {
        "nombre": "Rafael Loyola Berríos",
        "cargo": "Coordinador del Plan Común de Ingeniería y Jefe de Carrera de Bachillerato en Ciencias de la Ingeniería",
        "institucion": "Universidad Tecnológica Metropolitana",
    },
    "Dibujante Proyectista": {
        "nombre": "Marcelo Borges Quintanilla",
        "cargo": "Jefe de Carrera Dibujante Proyectista",
        "institucion": "Universidad Tecnológica Metropolitana",
    },
    "Ingeniería Civil Biomédica": {
        "nombre": "Raúl Caulier Cisterna",
        "cargo": "Jefe de Carrera Ingeniería Civil Biomédica",
        "institucion": "Universidad Tecnológica Metropolitana",
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


_CARRERA_STOPWORDS = {
    "ing",
    "ingenieria",
    "civil",
    "mencion",
    "en",
    "de",
    "del",
    "la",
    "el",
    "y",
    "para",
}


_CARRERA_EQUIVALENCIAS = [
    {"computacion", "informatica"},
    {"industrial", "industria"},
]


def _expandir_tokens_equivalentes(tokens: set[str]) -> set[str]:
    if not tokens:
        return set()

    resultado = set(tokens)
    for grupo in _CARRERA_EQUIVALENCIAS:
        if resultado & grupo:
            resultado |= grupo
    return resultado


def _tokenizar_carrera(valor: str | None) -> set[str]:
    if not valor:
        return set()

    texto = _normalizar_texto(valor)
    tokens = [
        token
        for token in re.split(r"[^a-z0-9]+", texto)
        if token and token not in _CARRERA_STOPWORDS
    ]

    if not tokens:
        return set()

    return set(tokens)


def _carreras_coinciden(a: str | None, b: str | None) -> bool:
    tokens_a = _tokenizar_carrera(a)
    tokens_b = _tokenizar_carrera(b)

    if not tokens_a or not tokens_b:
        return False

    if tokens_a == tokens_b:
        return True

    if tokens_a.issubset(tokens_b) or tokens_b.issubset(tokens_a):
        return True

    comunes = tokens_a & tokens_b
    return len(comunes) >= 2


def _carreras_equivalentes(a: str | None, b: str | None) -> bool:
    tokens_a = _expandir_tokens_equivalentes(_tokenizar_carrera(a))
    tokens_b = _expandir_tokens_equivalentes(_tokenizar_carrera(b))

    if not tokens_a or not tokens_b:
        return False

    return bool(tokens_a & tokens_b)


def _carreras_compatibles(a: str | None, b: str | None) -> bool:
    return _carreras_coinciden(a, b) or _carreras_equivalentes(a, b)


def _filtrar_queryset_por_carrera(
    queryset,
    carrera: str | None,
    *,
    permitir_equivalencias: bool = True,
):
    if not carrera:
        return queryset

    tokens_objetivo = _tokenizar_carrera(carrera)
    if not tokens_objetivo:
        return queryset

    matching_ids = [
        pk
        for pk, carrera_tema in queryset.values_list("pk", "carrera")
        if (
            _carreras_coinciden(carrera_tema, carrera)
            or (
                permitir_equivalencias
                and _carreras_equivalentes(carrera_tema, carrera)
            )
            or _tokenizar_carrera(carrera_tema) == tokens_objetivo
        )
    ]

    if not matching_ids:
        return queryset.none()

    return queryset.filter(pk__in=matching_ids)


def _sincronizar_propuestas_docentes() -> None:
    propuestas = (
        PropuestaTemaDocente.objects.filter(
            estado="aceptada", tema_generado__isnull=True
        )
        .select_related("docente")
        .order_by("created_at")
    )

    for propuesta in propuestas:
        docente = propuesta.docente
        if not docente or docente.rol != "docente":
            continue

        cupos = int(propuesta.cupos_requeridos or 1)
        if propuesta.cupos_maximo_autorizado:
            cupos = min(cupos, int(propuesta.cupos_maximo_autorizado))
        if cupos < 1:
            cupos = 1

        carrera = (propuesta.rama or "").strip()
        if not carrera:
            carrera = (docente.carrera or "").strip()
        if not carrera:
            carrera = "Carrera no especificada"

        requisitos: list[str] = []
        if propuesta.objetivo:
            requisitos.append(propuesta.objetivo)

        try:
            with transaction.atomic():
                TemaDisponible.objects.create(
                    titulo=propuesta.titulo,
                    carrera=carrera,
                    descripcion=propuesta.descripcion,
                    requisitos=requisitos,
                    cupos=cupos,
                    created_by=docente,
                    docente_responsable=docente,
                    propuesta=propuesta,
                )
        except IntegrityError:
            continue


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


def _validar_docente_asignado(alumno: Usuario | None, docente: Usuario | None) -> bool:
    if not docente or docente.rol != "docente":
        return False
    asignado = _obtener_docente_a_cargo(alumno)
    return bool(asignado and asignado.pk == docente.pk)


def _obtener_docente_a_cargo(alumno: Usuario | None) -> Usuario | None:
    if not alumno or alumno.rol != "alumno":
        return None

    if alumno.docente_guia_id:
        return alumno.docente_guia

    inscripcion = (
        InscripcionTema.objects.filter(
            alumno=alumno,
            activo=True,
            tema__docente_responsable__isnull=False,
        )
        .select_related("tema__docente_responsable")
        .order_by("-created_at")
        .first()
    )
    if inscripcion:
        return inscripcion.tema.docente_responsable

    return None


def _registrar_trazabilidad_reunion(
    *,
    tipo: str,
    usuario: Usuario | None,
    solicitud: SolicitudReunion | None = None,
    reunion: Reunion | None = None,
    estado_anterior: str | None = None,
    estado_nuevo: str | None = None,
    comentario: str | None = None,
    datos: dict | None = None,
) -> TrazabilidadReunion:
    payload = datos or {}
    return TrazabilidadReunion.objects.create(
        solicitud=solicitud,
        reunion=reunion,
        usuario=usuario,
        tipo=tipo,
        estado_anterior=estado_anterior,
        estado_nuevo=estado_nuevo,
        comentario=comentario or None,
        datos=payload,
    )


def _formatear_fecha_humana(valor) -> str:
    if not valor:
        return ""
    try:
        return valor.strftime("%d/%m/%Y")
    except AttributeError:
        return str(valor)


def _formatear_hora_humana(valor) -> str:
    if not valor:
        return ""
    try:
        return valor.strftime("%H:%M")
    except AttributeError:
        return str(valor)


def _notificar_solicitud_reunion_creada(solicitud: SolicitudReunion) -> None:
    docente = solicitud.docente
    if not docente:
        return

    alumno = solicitud.alumno
    if alumno:
        alumno_nombre = alumno.nombre_completo
        alumno_id = alumno.pk
    else:
        alumno_nombre = "Un alumno"
        alumno_id = None

    disponibilidad = (solicitud.disponibilidad_sugerida or "").strip()
    mensaje = (
        f"{alumno_nombre} solicitó una reunión. Motivo: {solicitud.motivo}."
    )
    if disponibilidad:
        mensaje = f"{mensaje} Disponibilidad sugerida: {disponibilidad}."

    Notificacion.objects.create(
        usuario=docente,
        titulo="Nueva solicitud de reunión",
        mensaje=mensaje,
        tipo="reunion",
        meta={
            "evento": "solicitud_creada",
            "solicitudId": solicitud.pk,
            "alumnoId": alumno_id,
            "docenteId": docente.pk,
        },
    )


def _notificar_solicitud_reunion_aprobada(reunion: Reunion) -> None:
    alumno = reunion.alumno
    if not alumno:
        return

    modalidad = (
        reunion.get_modalidad_display()
        if hasattr(reunion, "get_modalidad_display")
        else reunion.modalidad
    )
    fecha = _formatear_fecha_humana(reunion.fecha)
    inicio = _formatear_hora_humana(reunion.hora_inicio)
    termino = _formatear_hora_humana(reunion.hora_termino)

    mensaje = (
        f"Tu docente agendó una reunión para el {fecha} entre {inicio} y {termino} "
        f"({modalidad.lower()})."
    )
    if reunion.motivo:
        mensaje = f"{mensaje} Motivo: {reunion.motivo}."
    if reunion.observaciones:
        mensaje = f"{mensaje} Comentario: {reunion.observaciones}."

    Notificacion.objects.create(
        usuario=alumno,
        titulo="Reunión agendada",
        mensaje=mensaje,
        tipo="reunion",
        meta={
            "evento": "solicitud_aprobada",
            "reunionId": reunion.pk,
            "solicitudId": reunion.solicitud_id,
            "docenteId": reunion.docente_id,
            "alumnoId": alumno.pk,
        },
    )

    docente = reunion.docente
    if docente:
        alumno_nombre = alumno.nombre_completo if alumno else "El alumno"
        docente_mensaje = (
            f"Agendaste con {alumno_nombre} el {fecha} entre {inicio} y {termino} "
            f"({modalidad.lower()})."
        )
        if reunion.motivo:
            docente_mensaje = f"{docente_mensaje} Motivo: {reunion.motivo}."
        if reunion.observaciones:
            docente_mensaje = f"{docente_mensaje} Comentario: {reunion.observaciones}."

        Notificacion.objects.create(
            usuario=docente,
            titulo="Solicitud de reunión aprobada",
            mensaje=docente_mensaje,
            tipo="reunion",
            meta={
                "evento": "solicitud_aprobada_docente",
                "reunionId": reunion.pk,
                "solicitudId": reunion.solicitud_id,
                "docenteId": docente.pk,
                "alumnoId": alumno.pk if alumno else None,
            },
        )


def _notificar_solicitud_reunion_rechazada(
    solicitud: SolicitudReunion, comentario: str | None
) -> None:
    alumno = solicitud.alumno
    if not alumno:
        return

    mensaje = (
        "Tu docente revisó tu solicitud de reunión y la rechazó."
        f" Motivo: {solicitud.motivo}."
    )
    comentario = (comentario or "").strip()
    if comentario:
        mensaje = f"{mensaje} Comentario: {comentario}."

    Notificacion.objects.create(
        usuario=alumno,
        titulo="Solicitud de reunión rechazada",
        mensaje=mensaje,
        tipo="reunion",
        meta={
            "evento": "solicitud_rechazada",
            "solicitudId": solicitud.pk,
            "docenteId": solicitud.docente_id,
            "alumnoId": alumno.pk,
        },
    )

    docente = solicitud.docente
    if docente:
        alumno_nombre = alumno.nombre_completo if alumno else "El alumno"
        docente_mensaje = (
            f"Rechazaste la solicitud de reunión de {alumno_nombre}. "
            f"Motivo: {solicitud.motivo}."
        )
        if comentario:
            docente_mensaje = f"{docente_mensaje} Comentario: {comentario}."

        Notificacion.objects.create(
            usuario=docente,
            titulo="Solicitud de reunión rechazada",
            mensaje=docente_mensaje,
            tipo="reunion",
            meta={
                "evento": "solicitud_rechazada_docente",
                "solicitudId": solicitud.pk,
                "docenteId": docente.pk,
                "alumnoId": alumno.pk if alumno else None,
            },
        )


def _notificar_reunion_agendada_directamente(reunion: Reunion) -> None:
    alumno = reunion.alumno
    if not alumno:
        return

    modalidad = (
        reunion.get_modalidad_display()
        if hasattr(reunion, "get_modalidad_display")
        else reunion.modalidad
    )
    fecha = _formatear_fecha_humana(reunion.fecha)
    inicio = _formatear_hora_humana(reunion.hora_inicio)
    termino = _formatear_hora_humana(reunion.hora_termino)

    mensaje = (
        f"Tu docente agendó directamente una reunión para el {fecha} entre {inicio} y {termino} "
        f"({modalidad.lower()})."
    )
    if reunion.motivo:
        mensaje = f"{mensaje} Motivo: {reunion.motivo}."
    if reunion.observaciones:
        mensaje = f"{mensaje} Comentario: {reunion.observaciones}."

    Notificacion.objects.create(
        usuario=alumno,
        titulo="Nueva reunión agendada",
        mensaje=mensaje,
        tipo="reunion",
        meta={
            "evento": "reunion_agendada",
            "reunionId": reunion.pk,
            "docenteId": reunion.docente_id,
            "alumnoId": alumno.pk,
        },
    )


def _notificar_reunion_cerrada(reunion: Reunion, comentario: str | None) -> None:
    alumno = reunion.alumno
    if not alumno:
        return

    estado = reunion.get_estado_display() if hasattr(reunion, "get_estado_display") else reunion.estado
    fecha = _formatear_fecha_humana(reunion.fecha)

    mensaje = f"Tu reunión del {fecha} fue marcada como {estado.lower()}."
    comentario = (comentario or "").strip()
    if comentario:
        mensaje = f"{mensaje} Comentario: {comentario}."

    Notificacion.objects.create(
        usuario=alumno,
        titulo="Estado de reunión actualizado",
        mensaje=mensaje,
        tipo="reunion",
        meta={
            "evento": "reunion_cerrada",
            "reunionId": reunion.pk,
            "estado": reunion.estado,
            "docenteId": reunion.docente_id,
            "alumnoId": alumno.pk,
        },
    )


def _validar_disponibilidad_docente(
    *,
    docente: Usuario,
    fecha,
    hora_inicio,
    hora_termino,
    excluir: Reunion | None = None,
) -> Reunion | None:
    if hora_termino <= hora_inicio:
        raise ValueError("La hora de término debe ser posterior a la hora de inicio.")

    queryset = Reunion.objects.filter(
        docente=docente,
        fecha=fecha,
        estado__in=["aprobada"],
    )
    if excluir:
        queryset = queryset.exclude(pk=excluir.pk)

    for existente in queryset:
        if hora_inicio < existente.hora_termino and hora_termino > existente.hora_inicio:
            return existente
    return None


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


def _obtener_imagen_firma(carrera: str | None) -> dict[str, Any] | None:
    if not carrera or Image is None:
        return None

    firma = (
        PracticaFirmaCoordinador.objects.filter(carrera__iexact=carrera)
        .order_by("-updated_at")
        .first()
    )
    if not firma or not firma.archivo:
        return None

    try:
        with firma.archivo.open("rb") as archivo:
            imagen = Image.open(archivo)
            imagen.load()
    except Exception:  # pragma: no cover - errores inesperados de lectura
        logger.exception("No se pudo cargar la firma del coordinador para %s", carrera)
        return None

    if imagen.mode in ("RGBA", "LA"):
        fondo = Image.new("RGBA", imagen.size, (255, 255, 255, 255))
        imagen = Image.alpha_composite(fondo, imagen.convert("RGBA"))
    imagen = imagen.convert("RGB")

    ancho, alto = imagen.size
    if ancho <= 0 or alto <= 0:
        return None

    max_ancho = 200.0
    if ancho > max_ancho:
        escala = max_ancho / float(ancho)
        nuevo_ancho = max(1, int(round(ancho * escala)))
        nuevo_alto = max(1, int(round(alto * escala)))
        resampling = getattr(Image, "Resampling", Image)
        filtro = getattr(resampling, "LANCZOS", getattr(Image, "BICUBIC", Image.NEAREST))
        imagen = imagen.resize((nuevo_ancho, nuevo_alto), filtro)
        ancho, alto = imagen.size

    datos = zlib.compress(imagen.tobytes())

    return {
        "tipo": "imagen",
        "width": ancho,
        "height": alto,
        "color_space": "/DeviceRGB",
        "bits": 8,
        "filter": "/FlateDecode",
        "data": datos,
        "display_width": float(ancho),
        "display_height": float(alto),
    }


def _obtener_objetivos(carrera: str | None, escuela_id: str | None) -> list[str]:
    if carrera and carrera in OBJETIVOS_POR_CARRERA:
        return OBJETIVOS_POR_CARRERA[carrera]
    if escuela_id and escuela_id in OBJETIVOS_POR_ESCUELA:
        return OBJETIVOS_POR_ESCUELA[escuela_id]
    return OBJETIVOS_DEFECTO


def _normalizar_texto_pdf(value: str) -> str:
    if not value:
        return ""

    reemplazos = {
        "\u2013": "-",
        "\u2014": "-",
        "\u2015": "-",
        "\u2212": "-",
        "\u2018": "'",
        "\u2019": "'",
        "\u201c": '"',
        "\u201d": '"',
        "\u00b7": "-",
    }

    texto = unicodedata.normalize("NFKC", value)
    texto = "".join(reemplazos.get(ch, ch) for ch in texto)

    try:
        texto.encode("latin-1")
    except UnicodeEncodeError:
        texto = texto.encode("latin-1", "replace").decode("latin-1")

    return texto


def _pdf_justificar_linea(linea: str, ancho: int) -> str:
    if len(linea) >= ancho:
        return linea

    if " " not in linea.strip():
        return linea

    leading = len(linea) - len(linea.lstrip(" "))
    contenido = linea.lstrip(" ")
    palabras = contenido.split(" ")

    huecos = len(palabras) - 1
    if huecos <= 0:
        return linea

    deficit = ancho - len(linea)
    if deficit <= 0:
        return linea

    espacio_base, extra = divmod(deficit, huecos)

    espacios = []
    for indice in range(huecos):
        incremento = espacio_base + (1 if indice < extra else 0)
        espacios.append(" " * (1 + incremento))

    justificado = []
    for palabra, separador in zip(palabras, espacios):
        justificado.append(palabra)
        justificado.append(separador)
    justificado.append(palabras[-1])

    return (" " * leading) + "".join(justificado)


def _pdf_justificar_lineas(lineas: list[str], ancho: int) -> list[str]:
    if len(lineas) <= 1:
        return lineas
    resultado: list[str] = []
    for indice, linea in enumerate(lineas):
        if indice == len(lineas) - 1:
            resultado.append(linea)
            continue
        resultado.append(_pdf_justificar_linea(linea, ancho))
    return resultado


def _pdf_wrap(texto: str, ancho: int = 88, justificar: bool = False) -> list[str]:
    texto = _normalizar_texto_pdf(texto.strip())
    if not texto:
        return []
    lineas = textwrap.wrap(
        texto,
        width=ancho,
        break_long_words=False,
        break_on_hyphens=False,
    )
    if justificar:
        lineas = _pdf_justificar_lineas(lineas, ancho)
    return lineas


def _pdf_wrap_vineta(texto: str, ancho: int = 88, vineta: str = "-") -> list[str]:
    texto = _normalizar_texto_pdf(texto.strip())
    if not texto:
        return []
    prefijo = f"{vineta} "
    return textwrap.wrap(
        texto,
        width=ancho,
        initial_indent=prefijo,
        subsequent_indent=" " * len(prefijo),
        break_long_words=False,
        break_on_hyphens=False,
    )


def _pdf_escape_texto(texto: str) -> str:
    return (
        texto.replace("\\", "\\\\")
        .replace("(", "\\(")
        .replace(")", "\\)")
    )


def _renderizar_pdf_lineas(lineas: list[Any]) -> bytes:
    leading = 16
    inicio_x = 72.0
    inicio_y = 770.0

    items: list[Any] = []
    imagenes_pdf: list[dict[str, Any]] = []
    contador_imagenes = 0
    for elemento in lineas:
        if isinstance(elemento, dict) and elemento.get("tipo") == "imagen":
            contador_imagenes += 1
            item = elemento.copy()
            item["pdf_name"] = f"Im{contador_imagenes}"
            imagenes_pdf.append(item)
            items.append(item)
        else:
            items.append(elemento)

    cursor_y = float(inicio_y)
    texto_ops: list[str] = []
    texto_abierto = False

    def abrir_texto() -> None:
        nonlocal texto_abierto
        if not texto_abierto:
            texto_ops.append("BT")
            texto_ops.append("/F1 12 Tf")
            texto_abierto = True

    for elemento in items:
        if isinstance(elemento, str):
            linea_normalizada = _normalizar_texto_pdf(elemento)
            if linea_normalizada:
                abrir_texto()
                texto_ops.append(f"1 0 0 1 {inicio_x:.2f} {cursor_y:.2f} Tm")
                texto_ops.append(
                    f"({_pdf_escape_texto(linea_normalizada)}) Tj"
                )
            cursor_y -= leading
        elif isinstance(elemento, dict) and elemento.get("tipo") == "imagen":
            if texto_abierto:
                texto_ops.append("ET")
                texto_abierto = False
            ancho = float(elemento.get("display_width") or 0)
            alto = float(elemento.get("display_height") or 0)
            if ancho <= 0 or alto <= 0:
                continue
            imagen_y = cursor_y - alto
            texto_ops.append("q")
            texto_ops.append(
                f"{ancho:.2f} 0 0 {alto:.2f} {inicio_x:.2f} {imagen_y:.2f} cm"
            )
            texto_ops.append(f"/{elemento['pdf_name']} Do")
            texto_ops.append("Q")
            cursor_y = imagen_y - leading
        else:
            cursor_y -= leading

    if texto_abierto:
        texto_ops.append("ET")

    contenido = "\n".join(texto_ops).encode("latin-1")

    buffer = io.BytesIO()
    buffer.write(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")

    offsets: list[int] = []

    def escribir_objeto(data: bytes) -> None:
        offsets.append(buffer.tell())
        buffer.write(data)

    escribir_objeto(b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n")
    escribir_objeto(b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n")

    recursos = ["/Font << /F1 5 0 R >>"]
    if imagenes_pdf:
        refs = " ".join(
            f"/{img['pdf_name']} {indice + 6} 0 R"
            for indice, img in enumerate(imagenes_pdf)
        )
        recursos.append(f"/XObject << {refs} >>")
    recursos_str = " ".join(recursos)

    escribir_objeto(
        (
            "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] "
            f"/Contents 4 0 R /Resources << {recursos_str} >> >>\nendobj\n"
        ).encode("latin-1")
    )

    flujo = (
        b"4 0 obj\n<< /Length "
        + str(len(contenido)).encode("ascii")
        + b" >>\nstream\n"
        + contenido
        + b"\nendstream\nendobj\n"
    )
    escribir_objeto(flujo)

    escribir_objeto(b"5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n")

    for indice, imagen in enumerate(imagenes_pdf):
        cuerpo = (
            f"<< /Type /XObject /Subtype /Image /Width {int(imagen['width'])} /Height {int(imagen['height'])} "
            f"/ColorSpace {imagen['color_space']} /BitsPerComponent {imagen['bits']} "
            f"/Length {len(imagen['data'])} /Filter {imagen['filter']} >>"
        ).encode("latin-1")
        flujo_imagen = (
            f"{indice + 6} 0 obj\n".encode("latin-1")
            + cuerpo
            + b"\nstream\n"
            + imagen["data"]
            + b"\nendstream\nendobj\n"
        )
        escribir_objeto(flujo_imagen)

    xref_pos = buffer.tell()
    buffer.write(f"xref\n0 {len(offsets) + 1}\n".encode("ascii"))
    buffer.write(b"0000000000 65535 f \n")
    for offset in offsets:
        buffer.write(f"{offset:010d} 00000 n \n".encode("ascii"))

    buffer.write(b"trailer\n<< /Size " + str(len(offsets) + 1).encode("ascii") + b" /Root 1 0 R >>\n")
    buffer.write(b"startxref\n" + str(xref_pos).encode("ascii") + b"\n%%EOF")

    return buffer.getvalue()


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
    firma_imagen = _obtener_imagen_firma(solicitud.alumno_carrera)
    objetivos = _obtener_objetivos(solicitud.alumno_carrera, solicitud.escuela_id)

    partes_alumno = [solicitud.alumno_nombres or "", solicitud.alumno_apellidos or ""]
    alumno_nombre = " ".join(parte for parte in partes_alumno if parte).strip() or "Alumno"
    rut_formateado = _formatear_rut(solicitud.alumno_rut) or (solicitud.alumno_rut or "")
    carrera_texto = solicitud.alumno_carrera or "Carrera profesional"

    lineas: list[Any] = []
    lineas.extend(_pdf_wrap("Universidad Tecnológica Metropolitana", ancho=72))
    encabezado = (
        f"{solicitud.escuela_nombre or ''} — "
        f"{solicitud.escuela_direccion or ''} — Tel. {solicitud.escuela_telefono or ''}"
    )
    lineas.extend(_pdf_wrap(encabezado, ancho=72))
    lineas.append("")

    lineas.extend(_pdf_wrap(fecha_texto, ancho=72))
    lineas.append("")

    lineas.extend(_pdf_wrap("Señor"))
    destinatario = " ".join(
        parte
        for parte in [solicitud.dest_nombres or "", solicitud.dest_apellidos or ""]
        if parte
    )
    lineas.extend(_pdf_wrap(destinatario))
    lineas.extend(_pdf_wrap(solicitud.dest_cargo or ""))
    lineas.extend(_pdf_wrap(solicitud.dest_empresa or ""))
    lineas.extend(_pdf_wrap("Presente"))
    lineas.append("")

    cuerpo_1 = (
        "Me permito dirigirme a Ud. para presentar al Sr. "
        f"{alumno_nombre}, RUT {rut_formateado}, alumno regular de la carrera de "
        f"{carrera_texto} de la Universidad Tecnológica Metropolitana, "
        "y solicitar su aceptación en calidad de alumno en práctica."
    )
    lineas.extend(_pdf_wrap(cuerpo_1, justificar=True))
    lineas.append("")

    cuerpo_2 = (
        "Esta práctica tiene una duración de "
        f"{solicitud.practica_duracion_horas} horas cronológicas y sus objetivos son:"
    )
    lineas.extend(_pdf_wrap(cuerpo_2, justificar=True))

    for objetivo in objetivos:
        lineas.extend(_pdf_wrap_vineta(objetivo))

    lineas.append("")

    if firma_imagen:
        lineas.append(firma_imagen)
        lineas.append("")

    cuerpo_3 = (
        "Al término de la práctica, el estudiante deberá reportar sus avances y "
        "aprendizajes a la Coordinación de Carrera, quienes se pondrán en contacto "
        "para conocer los resultados de su desempeño."
    )
    lineas.extend(_pdf_wrap(cuerpo_3, justificar=True))

    lineas.append("")
    lineas.extend(_pdf_wrap("Le saluda atentamente,"))
    lineas.append("")

    if firma.get("nombre"):
        lineas.extend(_pdf_wrap(firma["nombre"]))
    if firma.get("cargo"):
        lineas.extend(_pdf_wrap(firma["cargo"]))
    institucion = firma.get("institucion") or "Universidad Tecnológica Metropolitana"
    lineas.extend(_pdf_wrap(institucion))

    pdf_bytes = _renderizar_pdf_lineas(lineas)

    base_nombre = f"carta {alumno_nombre}".strip()
    slug = slugify(base_nombre) or "carta-practica"
    ruta = f"practicas/cartas/{fecha.year}/carta-{slug}.pdf"
    ruta_antigua_html = f"practicas/cartas/{fecha.year}/carta-{slug}.html"

    if default_storage.exists(ruta):
        default_storage.delete(ruta)
    if default_storage.exists(ruta_antigua_html):
        default_storage.delete(ruta_antigua_html)

    archivo = ContentFile(pdf_bytes)
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
        responsable = serializer.validated_data.get("docente_responsable")
        objetivo = serializer.validated_data.pop("objetivo", None)

        if not creador:
            creador = _obtener_usuario_por_id(self.request.data.get("created_by"))

        if not creador:
            potencial = _obtener_usuario_para_temas(self.request)
            if potencial and potencial.rol in {"docente", "coordinador"}:
                creador = potencial

        if not creador:
            user = getattr(self.request, "user", None)
            if isinstance(user, Usuario):
                creador = user

        if not responsable and creador and creador.rol == "docente":
            responsable = creador

        save_kwargs = {}
        if creador:
            save_kwargs["created_by"] = creador
        if responsable:
            save_kwargs["docente_responsable"] = responsable

        if save_kwargs:
            tema = serializer.save(**save_kwargs)
        else:
            tema = serializer.save()

        docente_propuesta = None
        if responsable and responsable.rol == "docente":
            docente_propuesta = responsable
        elif creador and creador.rol == "docente":
            docente_propuesta = creador

        _registrar_propuesta_docente_desde_tema(
            tema,
            docente_propuesta,
            objetivo,
        )

    def get_queryset(self):
        _sincronizar_propuestas_docentes()
        queryset = super().get_queryset()
        usuario = _obtener_usuario_para_temas(self.request)

        if usuario:
            if usuario.rol == "alumno":
                if usuario.carrera:
                    return _filtrar_queryset_por_carrera(
                        queryset,
                        usuario.carrera,
                        permitir_equivalencias=False,
                    )

                return queryset.none()

        carrera = self.request.query_params.get("carrera")
        if carrera:
            filtrado = _filtrar_queryset_por_carrera(queryset, carrera)
            return filtrado

        return queryset

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

    if (
        usuario
        and usuario.rol == "alumno"
        and usuario.carrera
        and not _carreras_compatibles(tema.carrera, usuario.carrera)
    ):
        return Response(status=status.HTTP_404_NOT_FOUND)

    if carrera_param and not _carreras_compatibles(tema.carrera, carrera_param):
        return Response(status=status.HTTP_404_NOT_FOUND)

    if usuario and usuario.rol == "alumno":
        alumno_id = usuario.pk
    else:
        alumno_id = _parse_int(request.query_params.get("alumno"))

    serializer = TemaDisponibleSerializer(
        tema,
        context={"request": request, "alumno_id": alumno_id},
    )
    return Response(serializer.data)


def _registrar_propuesta_docente_desde_tema(
    tema: TemaDisponible,
    docente: Usuario | None,
    objetivo: str | None,
) -> None:
    if not docente or docente.rol != "docente":
        return

    objetivo_limpio = (objetivo or "").strip() if isinstance(objetivo, str) else ""

    if not objetivo_limpio:
        requisitos = tema.requisitos or []
        if requisitos:
            objetivo_limpio = str(requisitos[0])
        else:
            objetivo_limpio = tema.descripcion or ""

    cupos = tema.cupos or 1

    propuesta = PropuestaTemaDocente.objects.create(
        alumno=None,
        docente=docente,
        titulo=tema.titulo,
        objetivo=objetivo_limpio,
        descripcion=tema.descripcion,
        rama=tema.rama or tema.carrera or "",
        estado="aceptada",
        preferencias_docentes=[docente.pk] if docente.pk else [],
        cupos_requeridos=cupos,
        cupos_maximo_autorizado=cupos,
        correos_companeros=[],
    )

    if tema.propuesta_id != propuesta.pk:
        tema.propuesta = propuesta
        tema.save(update_fields=["propuesta"])


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

    inscripcion_activa = (
        InscripcionTema.objects.filter(alumno=alumno, activo=True)
        .exclude(tema=tema)
        .exists()
    )
    if inscripcion_activa:
        return Response(
            {
                "detail": "Ya cuentas con un tema inscrito. No puedes inscribir otro tema.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if alumno.carrera and not _carreras_compatibles(tema.carrera, alumno.carrera):
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

    inscripcion, created = tema.inscripciones.get_or_create(
        alumno=alumno, defaults={"es_responsable": False}
    )

    if not created and inscripcion.activo:
        return Response(
            {"detail": "Ya cuentas con un cupo reservado en este tema."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    reactivada = False
    campos_actualizados: list[str] = []
    if not inscripcion.activo:
        inscripcion.activo = True
        campos_actualizados.append("activo")
        reactivada = True

    responsable_activo = (
        tema.inscripciones.filter(activo=True, es_responsable=True)
        .exclude(pk=inscripcion.pk)
        .exists()
    )
    if not responsable_activo and not inscripcion.es_responsable:
        inscripcion.es_responsable = True
        campos_actualizados.append("es_responsable")

    if campos_actualizados:
        campos_actualizados.append("updated_at")
        inscripcion.save(update_fields=campos_actualizados)

    cupos_despues = tema.cupos_disponibles

    notificar_reserva_tema(
        tema,
        alumno,
        cupos_disponibles=cupos_despues,
        reactivada=reactivada,
        inscripcion_id=inscripcion.pk,
    )

    cupos_completados_permitido = not (
        tema.created_by
        and tema.created_by.rol == "alumno"
        and tema.docente_responsable_id is not None
    )

    if cupos_antes > 0 and cupos_despues == 0 and cupos_completados_permitido:
        notificar_cupos_completados(tema)

    serializer = TemaDisponibleSerializer(
        tema,
        context={"request": request, "alumno_id": alumno.pk},
    )
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([AllowAny])
def asignar_companeros(request, pk: int):
    tema = get_object_or_404(TemaDisponible, pk=pk)

    cupos_antes = tema.cupos_disponibles

    alumno_id = request.data.get("alumno")
    if not alumno_id:
        return Response(
            {"detail": "Debe indicar el alumno responsable del tema."},
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
            {"detail": "Solo estudiantes pueden gestionar los cupos de un tema."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if alumno.carrera and not _carreras_compatibles(tema.carrera, alumno.carrera):
        return Response(
            {"detail": "Solo puedes gestionar temas asociados a tu carrera."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    inscripcion_alumno = tema.inscripciones.filter(alumno=alumno).first()
    if not inscripcion_alumno or not inscripcion_alumno.activo:
        return Response(
            {
                "detail": "Debes contar con una reserva activa para gestionar los cupos de este tema.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not inscripcion_alumno.es_responsable:
        responsable_activo = (
            tema.inscripciones.filter(activo=True, es_responsable=True)
            .exclude(pk=inscripcion_alumno.pk)
            .exists()
        )
        if responsable_activo:
            return Response(
                {
                    "detail": "Solo el estudiante que postuló al tema puede gestionar los cupos.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        inscripcion_alumno.es_responsable = True
        inscripcion_alumno.save(update_fields=["es_responsable", "updated_at"])

    max_companeros = max(tema.cupos - 1, 0)
    correos = request.data.get("correos") or request.data.get("companeros") or []
    if not isinstance(correos, list):
        return Response(
            {"detail": "Debe proporcionar una lista de correos electrónicos."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    correos_limpios: list[str] = []
    correos_registrados: set[str] = set()
    correo_alumno = alumno.correo.lower() if alumno.correo else ""
    for correo in correos:
        if not isinstance(correo, str):
            continue
        normalizado = correo.strip()
        if not normalizado:
            continue
        normalizado_lower = normalizado.lower()
        if normalizado_lower == correo_alumno:
            continue
        if normalizado_lower in correos_registrados:
            continue
        correos_registrados.add(normalizado_lower)
        correos_limpios.append(normalizado)

    if len(correos_limpios) > max_companeros:
        return Response(
            {
                "detail": (
                    "No hay cupos suficientes para registrar a todos los compañeros."
                )
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    companeros: list[Usuario] = []
    errores: dict[str, str] = {}
    for correo in correos_limpios:
        usuario = Usuario.objects.filter(correo__iexact=correo).first()
        if not usuario:
            errores[correo] = "No se encontró un usuario con este correo electrónico."
            continue
        if usuario.rol != "alumno":
            errores[correo] = "Solo puedes agregar estudiantes a tu grupo."
            continue
        if usuario.carrera and not _carreras_compatibles(tema.carrera, usuario.carrera):
            errores[correo] = "El estudiante no pertenece a la carrera del tema."
            continue
        companeros.append(usuario)

    if errores:
        return Response({"errores": errores}, status=status.HTTP_400_BAD_REQUEST)

    participantes_ids = {alumno.pk}
    participantes_ids.update(usuario.pk for usuario in companeros)

    if len(participantes_ids) > tema.cupos:
        return Response(
            {"detail": "El número total de participantes supera los cupos del tema."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    inscripciones = {
        inscripcion.alumno_id: inscripcion
        for inscripcion in tema.inscripciones.select_related("alumno")
    }

    for inscripcion in list(inscripciones.values()):
        if inscripcion.alumno_id in participantes_ids:
            continue
        campos = []
        if inscripcion.activo:
            inscripcion.activo = False
            campos.append("activo")
        if inscripcion.es_responsable:
            inscripcion.es_responsable = False
            campos.append("es_responsable")
        if campos:
            campos.append("updated_at")
            inscripcion.save(update_fields=campos)

    for usuario in [alumno, *companeros]:
        inscripcion = inscripciones.get(usuario.pk)
        creado = False
        reactivada = False
        if not inscripcion:
            es_responsable = usuario.pk == alumno.pk
            inscripcion = tema.inscripciones.create(
                alumno=usuario,
                activo=True,
                es_responsable=es_responsable,
            )
            inscripciones[usuario.pk] = inscripcion
            creado = True
        else:
            campos_actualizados = []
            if not inscripcion.activo:
                inscripcion.activo = True
                campos_actualizados.append("activo")
                reactivada = True
            es_responsable_objetivo = usuario.pk == alumno.pk
            if inscripcion.es_responsable != es_responsable_objetivo:
                inscripcion.es_responsable = es_responsable_objetivo
                campos_actualizados.append("es_responsable")
            if campos_actualizados:
                campos_actualizados.append("updated_at")
                inscripcion.save(update_fields=campos_actualizados)

        if usuario.pk != alumno.pk and (creado or reactivada):
            notificar_reserva_tema(
                tema,
                usuario,
                cupos_disponibles=tema.cupos_disponibles,
                reactivada=reactivada,
                inscripcion_id=inscripcion.pk,
            )

    cupos_despues = tema.cupos_disponibles
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
            accion = None
            if hasattr(self.request, "data"):
                accion = self.request.data.get("accion")
            if accion == "confirmar_cupos":
                return PropuestaTemaAlumnoAjusteSerializer
            return PropuestaTemaDocenteDecisionSerializer
        return PropuestaTemaSerializer

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        estado_anterior = instance.estado

        serializer_class = self.get_serializer_class()
        serializer = serializer_class(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        propuesta = serializer.save()

        if estado_anterior != propuesta.estado:
            if propuesta.estado == "aceptada" and estado_anterior != "aceptada":
                _crear_tema_desde_propuesta(propuesta)
            if propuesta.estado in {"aceptada", "rechazada"}:
                _notificar_decision_propuesta(propuesta)
            elif propuesta.estado == "pendiente_ajuste":
                _notificar_solicitud_ajuste_cupos(propuesta)
            elif propuesta.estado == "pendiente_aprobacion":
                if estado_anterior == "pendiente_ajuste":
                    _notificar_confirmacion_alumno(propuesta)
                elif estado_anterior == "pendiente":
                    _notificar_autorizacion_cupos(propuesta)

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
        practica_correo_encargado=practica_data.get("correoEncargado", "").strip(),
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

    output = SolicitudCartaPracticaSerializer(solicitud, context={"request": request})
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

    serializer = SolicitudCartaPracticaSerializer(
        items, many=True, context={"request": request}
    )
    return Response({"items": serializer.data, "total": total})


@api_view(["GET", "POST"])
@permission_classes([AllowAny])
def gestionar_solicitudes_reunion(request):
    if request.method == "GET":
        queryset = (
            SolicitudReunion.objects.select_related("alumno", "docente")
            .prefetch_related("trazabilidad__usuario")
            .order_by("-creado_en")
        )

        alumno = _obtener_usuario_por_id(request.query_params.get("alumno"))
        docente = _obtener_usuario_por_id(request.query_params.get("docente"))
        coordinador = _obtener_usuario_por_id(request.query_params.get("coordinador"))

        if alumno:
            if alumno.rol != "alumno":
                return Response(
                    {"alumno": "El identificador no corresponde a un alumno."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            queryset = queryset.filter(alumno=alumno)
        elif docente:
            if docente.rol != "docente":
                return Response(
                    {"docente": "El identificador no corresponde a un docente."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            queryset = queryset.filter(docente=docente)
        elif coordinador:
            if coordinador.rol != "coordinador":
                return Response(
                    {"coordinador": "El identificador no corresponde a coordinación."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            return Response(
                {"detail": "Debe indicar un alumno, docente o coordinador para listar."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        estado = request.query_params.get("estado")
        if estado in {"pendiente", "aprobada", "rechazada"}:
            queryset = queryset.filter(estado=estado)

        serializer = SolicitudReunionSerializer(queryset, many=True)
        return Response(serializer.data)

    serializer = SolicitudReunionCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    alumno = _obtener_usuario_por_id(serializer.validated_data.get("alumno"))
    if not alumno or alumno.rol != "alumno":
        return Response(
            {"alumno": "El identificador de alumno no es válido."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    docente = _obtener_docente_a_cargo(alumno)
    if not docente:
        return Response(
            {
                "detail": (
                    "El alumno no tiene un docente guía ni un trabajo de título a cargo."
                )
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    disponibilidad = serializer.validated_data.get("disponibilidadSugerida")

    solicitud = SolicitudReunion.objects.create(
        alumno=alumno,
        docente=docente,
        motivo=serializer.validated_data["motivo"],
        disponibilidad_sugerida=disponibilidad,
    )

    _registrar_trazabilidad_reunion(
        tipo="creacion_solicitud",
        usuario=alumno,
        solicitud=solicitud,
        estado_nuevo="pendiente",
        datos={
            "motivo": solicitud.motivo,
            "disponibilidadSugerida": disponibilidad,
        },
    )

    _notificar_solicitud_reunion_creada(solicitud)

    output = SolicitudReunionSerializer(solicitud)
    headers = {"Location": f"/api/reuniones/solicitudes/{solicitud.pk}"}
    return Response(output.data, status=status.HTTP_201_CREATED, headers=headers)


@api_view(["POST"])
@permission_classes([AllowAny])
def aprobar_solicitud_reunion(request, pk: int):
    solicitud = get_object_or_404(
        SolicitudReunion.objects.select_related("alumno", "docente"), pk=pk
    )

    if solicitud.estado != "pendiente":
        return Response(
            {"detail": "Solo es posible aprobar solicitudes en estado pendiente."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    serializer = AprobarSolicitudReunionSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    docente = _obtener_usuario_por_id(serializer.validated_data.get("docente"))
    if not docente or docente.rol != "docente":
        return Response(
            {"docente": "El identificador del docente no es válido."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    alumno = solicitud.alumno
    if not _validar_docente_asignado(alumno, docente):
        return Response(
            {"detail": "El docente no está asignado como guía del alumno."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    fecha = serializer.validated_data["fecha"]
    hora_inicio = serializer.validated_data["horaInicio"]
    hora_termino = serializer.validated_data["horaTermino"]

    try:
        conflicto = _validar_disponibilidad_docente(
            docente=docente,
            fecha=fecha,
            hora_inicio=hora_inicio,
            hora_termino=hora_termino,
        )
    except ValueError as exc:
        return Response(
            {"horaTermino": [str(exc)]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if conflicto:
        return Response(
            {
                "detail": "El horario se solapa con otra reunión ya agendada.",
                "reunionConflictoId": conflicto.pk,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    modalidad = serializer.validated_data["modalidad"]
    comentario = serializer.validated_data.get("comentario")

    reunion = Reunion.objects.create(
        alumno=alumno,
        docente=docente,
        solicitud=solicitud,
        fecha=fecha,
        hora_inicio=hora_inicio,
        hora_termino=hora_termino,
        modalidad=modalidad,
        motivo=solicitud.motivo,
        observaciones=comentario or solicitud.disponibilidad_sugerida,
        estado="aprobada",
        creado_por=docente,
    )

    estado_anterior = solicitud.estado
    solicitud.estado = "aprobada"
    if solicitud.docente_id != docente.pk:
        solicitud.docente = docente
    solicitud.save(update_fields=["estado", "docente", "actualizado_en"])

    _registrar_trazabilidad_reunion(
        tipo="aprobada_desde_solicitud",
        usuario=docente,
        solicitud=solicitud,
        reunion=reunion,
        estado_anterior=estado_anterior,
        estado_nuevo="aprobada",
        comentario=comentario,
        datos={
            "fecha": fecha.isoformat(),
            "horaInicio": hora_inicio.isoformat(),
            "horaTermino": hora_termino.isoformat(),
            "modalidad": modalidad,
            "motivoAlumno": solicitud.motivo,
        },
    )

    _notificar_solicitud_reunion_aprobada(reunion)

    output = ReunionSerializer(reunion)
    headers = {"Location": f"/api/reuniones/{reunion.pk}"}
    return Response(output.data, status=status.HTTP_201_CREATED, headers=headers)


@api_view(["POST"])
@permission_classes([AllowAny])
def rechazar_solicitud_reunion(request, pk: int):
    solicitud = get_object_or_404(
        SolicitudReunion.objects.select_related("alumno", "docente"), pk=pk
    )

    if solicitud.estado != "pendiente":
        return Response(
            {"detail": "Solo es posible rechazar solicitudes en estado pendiente."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    serializer = RechazarSolicitudReunionSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    docente = _obtener_usuario_por_id(serializer.validated_data.get("docente"))
    if not docente or docente.rol != "docente":
        return Response(
            {"docente": "El identificador del docente no es válido."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    alumno = solicitud.alumno
    if not _validar_docente_asignado(alumno, docente) and (
        solicitud.docente_id and solicitud.docente_id != docente.pk
    ):
        return Response(
            {"detail": "El docente no está asignado a esta solicitud."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    comentario = serializer.validated_data.get("comentario")

    estado_anterior = solicitud.estado
    solicitud.estado = "rechazada"
    if solicitud.docente_id != docente.pk:
        solicitud.docente = docente
    solicitud.save(update_fields=["estado", "docente", "actualizado_en"])

    _registrar_trazabilidad_reunion(
        tipo="rechazo",
        usuario=docente,
        solicitud=solicitud,
        estado_anterior=estado_anterior,
        estado_nuevo="rechazada",
        comentario=comentario,
        datos={"motivoAlumno": solicitud.motivo},
    )

    _notificar_solicitud_reunion_rechazada(solicitud, comentario)

    output = SolicitudReunionSerializer(solicitud)
    return Response(output.data)


@api_view(["GET", "POST"])
@permission_classes([AllowAny])
def gestionar_reuniones(request):
    if request.method == "GET":
        queryset = (
            Reunion.objects.select_related("alumno", "docente", "solicitud")
            .prefetch_related("trazabilidad__usuario")
            .order_by("-fecha", "-hora_inicio")
        )

        alumno = _obtener_usuario_por_id(request.query_params.get("alumno"))
        docente = _obtener_usuario_por_id(request.query_params.get("docente"))
        coordinador = _obtener_usuario_por_id(request.query_params.get("coordinador"))

        if alumno:
            if alumno.rol != "alumno":
                return Response(
                    {"alumno": "El identificador no corresponde a un alumno."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            queryset = queryset.filter(alumno=alumno)
        elif docente:
            if docente.rol != "docente":
                return Response(
                    {"docente": "El identificador no corresponde a un docente."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            queryset = queryset.filter(docente=docente)
        elif coordinador:
            if coordinador.rol != "coordinador":
                return Response(
                    {"coordinador": "El identificador no corresponde a coordinación."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            return Response(
                {"detail": "Debe indicar un alumno, docente o coordinador para listar."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        estado = request.query_params.get("estado")
        if estado in {"aprobada", "finalizada", "no_realizada", "reprogramada"}:
            queryset = queryset.filter(estado=estado)

        serializer = ReunionSerializer(queryset, many=True)
        return Response(serializer.data)

    serializer = ReunionCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    alumno = _obtener_usuario_por_id(serializer.validated_data.get("alumno"))
    if not alumno or alumno.rol != "alumno":
        return Response(
            {"alumno": "El identificador del alumno no es válido."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    docente = _obtener_usuario_por_id(serializer.validated_data.get("docente"))
    if not docente or docente.rol != "docente":
        return Response(
            {"docente": "El identificador del docente no es válido."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not _validar_docente_asignado(alumno, docente):
        return Response(
            {"detail": "El docente no está asignado como guía del alumno."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    fecha = serializer.validated_data["fecha"]
    hora_inicio = serializer.validated_data["horaInicio"]
    hora_termino = serializer.validated_data["horaTermino"]

    try:
        conflicto = _validar_disponibilidad_docente(
            docente=docente,
            fecha=fecha,
            hora_inicio=hora_inicio,
            hora_termino=hora_termino,
        )
    except ValueError as exc:
        return Response(
            {"horaTermino": [str(exc)]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if conflicto:
        return Response(
            {
                "detail": "El horario se solapa con otra reunión ya agendada.",
                "reunionConflictoId": conflicto.pk,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    reunion = Reunion.objects.create(
        alumno=alumno,
        docente=docente,
        fecha=fecha,
        hora_inicio=hora_inicio,
        hora_termino=hora_termino,
        modalidad=serializer.validated_data["modalidad"],
        motivo=serializer.validated_data["motivo"],
        observaciones=serializer.validated_data.get("observaciones"),
        estado="aprobada",
        creado_por=docente,
    )

    _registrar_trazabilidad_reunion(
        tipo="agendada_directamente",
        usuario=docente,
        reunion=reunion,
        estado_nuevo="aprobada",
        comentario=serializer.validated_data.get("observaciones"),
        datos={
            "fecha": fecha.isoformat(),
            "horaInicio": hora_inicio.isoformat(),
            "horaTermino": hora_termino.isoformat(),
            "modalidad": reunion.modalidad,
            "motivo": reunion.motivo,
        },
    )

    _notificar_reunion_agendada_directamente(reunion)

    output = ReunionSerializer(reunion)
    headers = {"Location": f"/api/reuniones/{reunion.pk}"}
    return Response(output.data, status=status.HTTP_201_CREATED, headers=headers)


@api_view(["POST"])
@permission_classes([AllowAny])
def cerrar_reunion(request, pk: int):
    reunion = get_object_or_404(Reunion.objects.select_related("docente", "alumno"), pk=pk)

    serializer = ReunionCerrarSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    docente = _obtener_usuario_por_id(serializer.validated_data.get("docente"))
    if not docente or docente.rol != "docente":
        return Response(
            {"docente": "El identificador del docente no es válido."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if reunion.docente_id != docente.pk:
        return Response(
            {"detail": "Solo el docente asignado puede cerrar la reunión."},
            status=status.HTTP_403_FORBIDDEN,
        )

    if reunion.estado not in {"aprobada", "reprogramada"}:
        return Response(
            {"detail": "La reunión ya fue cerrada previamente."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    nuevo_estado = serializer.validated_data["estado"]
    comentario = serializer.validated_data.get("comentario")
    estado_anterior = reunion.estado
    reunion.estado = nuevo_estado
    reunion.save(update_fields=["estado", "actualizado_en"])

    _registrar_trazabilidad_reunion(
        tipo="cierre_final",
        usuario=docente,
        reunion=reunion,
        solicitud=reunion.solicitud,
        estado_anterior=estado_anterior,
        estado_nuevo=nuevo_estado,
        comentario=comentario,
        datos={
            "fecha": reunion.fecha.isoformat(),
            "horaInicio": reunion.hora_inicio.isoformat(),
            "horaTermino": reunion.hora_termino.isoformat(),
            "modalidad": reunion.modalidad,
        },
    )

    _notificar_reunion_cerrada(reunion, comentario)

    output = ReunionSerializer(reunion)
    return Response(output.data)


class DocenteGruposActivosListView(generics.ListAPIView):
    serializer_class = DocenteGrupoActivoSerializer

    def get_queryset(self):
        docente_param = self.request.query_params.get("docente")
        if docente_param in (None, "", "null"):
            return TemaDisponible.objects.none()

        try:
            docente_id = int(docente_param)
        except (TypeError, ValueError):
            return TemaDisponible.objects.none()

        queryset = (
            TemaDisponible.objects.filter(
                Q(docente_responsable_id=docente_id)
                | Q(created_by_id=docente_id),
                inscripciones__activo=True,
            )
            .prefetch_related(
                Prefetch(
                    "inscripciones",
                    queryset=InscripcionTema.objects.filter(activo=True)
                    .select_related("alumno")
                    .order_by("created_at"),
                    to_attr="inscripciones_activas",
                )
            )
            .distinct()
            .order_by("titulo")
        )

        return queryset


class DocenteEvaluacionListCreateView(generics.ListCreateAPIView):
    serializer_class = EvaluacionGrupoDocenteSerializer
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def get_queryset(self):
        queryset = (
            EvaluacionGrupoDocente.objects.all()
            .select_related("docente", "tema")
            .prefetch_related(
                Prefetch(
                    "tema__inscripciones",
                    queryset=InscripcionTema.objects.filter(activo=True)
                    .select_related("alumno")
                    .order_by("created_at"),
                    to_attr="inscripciones_activas",
                ),
                Prefetch(
                    "entregas",
                    queryset=EvaluacionEntregaAlumno.objects.select_related("alumno")
                    .order_by("-creado_en"),
                    to_attr="entregas_prefetch",
                )
            )
            .order_by("grupo_nombre", "-fecha", "-created_at")
        )
        docente_id = self.request.query_params.get("docente")
        if docente_id in (None, "", "null"):
            return queryset
        try:
            docente_id_int = int(docente_id)
        except (TypeError, ValueError):
            return queryset.none()
        return queryset.filter(docente_id=docente_id_int)

    def create(self, request, *args, **kwargs):
        # Evitar QueryDict.copy() porque intenta hacer deepcopy de los archivos
        raw_data = request.data

        if isinstance(raw_data, QueryDict):
            # Convierte a dict plano sin deepcopy (mantiene los UploadedFile tal cual)
            data = raw_data.dict()
            # Ojo: .dict() se queda con un solo valor por clave (lo normal en este caso)
            # y sigue incluyendo los archivos como valores cuando corresponda.
            for key in raw_data:
                if key not in data or isinstance(raw_data.get(key), list):
                    # Si hay archivos u otros valores que no quieres perder,
                    # fuerza a tomar directamente el valor original
                    data[key] = raw_data.get(key)
        else:
            data = dict(raw_data)

        if data.get("fecha") in ("", None, "null"):
            data["fecha"] = None

        if not data.get("docente"):
            docente_param = request.query_params.get("docente")
            try:
                docente_id = (
                    int(docente_param)
                    if docente_param not in (None, "", "null")
                    else None
                )
            except (TypeError, ValueError):
                docente_id = None
            if docente_id:
                data["docente"] = docente_id

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)


class CoordinacionPromediosTituloView(generics.ListAPIView):
    serializer_class = PromedioGrupoTituloSerializer

    def get_queryset(self):
        return (
            EvaluacionGrupoDocente.objects.select_related("docente", "tema")
            .prefetch_related(
                Prefetch(
                    "tema__inscripciones",
                    queryset=InscripcionTema.objects.filter(activo=True)
                    .select_related("alumno")
                    .order_by("created_at"),
                    to_attr="inscripciones_activas",
                )
            )
            .annotate(
                promedio_nota=Avg("entregas__nota"),
                entregas_con_nota=Count("entregas__nota"),
            )
            .filter(entregas_con_nota__gt=0)
            .order_by("grupo_nombre")
        )


class AlumnoEvaluacionListView(generics.ListAPIView):
    serializer_class = EvaluacionGrupoDocenteSerializer

    def get_queryset(self):
        alumno_param = self.request.query_params.get("alumno")
        try:
            alumno_id = int(alumno_param)
        except (TypeError, ValueError):
            return EvaluacionGrupoDocente.objects.none()

        queryset = (
            EvaluacionGrupoDocente.objects.filter(
                tema__inscripciones__alumno_id=alumno_id,
                tema__inscripciones__activo=True,
            )
            .select_related("docente", "tema")
            .prefetch_related(
                Prefetch(
                    "tema__inscripciones",
                    queryset=InscripcionTema.objects.filter(activo=True)
                    .select_related("alumno")
                    .order_by("created_at"),
                    to_attr="inscripciones_activas",
                ),
                Prefetch(
                    "entregas",
                    queryset=EvaluacionEntregaAlumno.objects.filter(alumno_id=alumno_id)
                    .select_related("alumno")
                    .order_by("-creado_en"),
                    to_attr="entregas_alumno",
                )
            )
            .distinct()
            .order_by("grupo_nombre", "-fecha", "-created_at")
        )

        return queryset


class AlumnoEvaluacionEntregaListCreateView(generics.ListCreateAPIView):
    serializer_class = EvaluacionEntregaAlumnoSerializer
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [AllowAny]
    authentication_classes: list = []

    def get_queryset(self):
        evaluacion_id = self.kwargs.get("pk")
        alumno_id = self._obtener_alumno_id()
        if not alumno_id:
            return EvaluacionEntregaAlumno.objects.none()

        return (
            EvaluacionEntregaAlumno.objects.filter(
                evaluacion_id=evaluacion_id,
                alumno_id=alumno_id,
            )
            .select_related("alumno", "evaluacion", "evaluacion__tema")
            .order_by("-creado_en")
        )

    def perform_create(self, serializer):
        evaluacion = get_object_or_404(
            EvaluacionGrupoDocente.objects.select_related("tema"),
            pk=self.kwargs.get("pk"),
        )
        alumno_id = self._obtener_alumno_id(usar_post=True)
        if not alumno_id:
            raise ValidationError({"alumno": ["Debes indicar el alumno que realiza la entrega."]})

        if not evaluacion.tema or not evaluacion.tema.inscripciones.filter(
            alumno_id=alumno_id, activo=True
        ).exists():
            raise ValidationError(
                {
                    "evaluacion": [
                        "La evaluación seleccionada no pertenece a tu grupo activo."
                    ]
                }
            )

        indice_bitacora = self._obtener_bitacora_indice(serializer.initial_data)
        if indice_bitacora:
            total_requeridas = evaluacion.bitacoras_requeridas or 0
            if indice_bitacora > total_requeridas:
                raise ValidationError(
                    {
                        "bitacora_indice": [
                            "La bitácora seleccionada no corresponde al plan de esta evaluación.",
                        ]
                    }
                )

        serializer.save(
            evaluacion=evaluacion,
            alumno_id=alumno_id,
            es_bitacora=bool(indice_bitacora),
            bitacora_indice=indice_bitacora,
        )

    def _obtener_bitacora_indice(self, data) -> int | None:
        if not data:
            return None
        indice_param = data.get("bitacora_indice")
        try:
            indice = int(indice_param)
        except (TypeError, ValueError):
            return None
        if indice <= 0:
            return None
        return indice

    def _obtener_alumno_id(self, usar_post: bool = False) -> int | None:
        if usar_post:
            fuente = self.request.data
        else:
            fuente = self.request.query_params

        alumno_param = fuente.get("alumno") if fuente else None

        if alumno_param in (None, "", "null"):
            usuario = getattr(self.request, "user", None)
            if getattr(usuario, "id", None):
                return usuario.id

        try:
            alumno_id = int(alumno_param)
        except (TypeError, ValueError):
            return None
        return alumno_id


class DocenteEvaluacionEntregaUpdateView(generics.UpdateAPIView):
    serializer_class = DocenteEvaluacionEntregaUpdateSerializer
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    queryset = EvaluacionEntregaAlumno.objects.select_related("evaluacion", "alumno")


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


def _notificar_solicitud_ajuste_cupos(propuesta: PropuestaTema) -> None:
    alumno = propuesta.alumno
    if alumno is None:
        return

    maximo = propuesta.cupos_maximo_autorizado or propuesta.cupos_requeridos
    docente = propuesta.docente
    comentario = (propuesta.comentario_decision or "").strip()

    if docente:
        encabezado = f"El docente {docente.nombre_completo} solicitó ajustar los cupos"
    else:
        encabezado = "Se solicitó ajustar los cupos de tu propuesta"

    mensaje = (
        f"{encabezado} del tema \"{propuesta.titulo}\" a un máximo de {maximo} integrante(s)."
    )
    if comentario:
        mensaje = f"{mensaje} Comentario: {comentario}"

    Notificacion.objects.create(
        usuario=alumno,
        titulo="Ajusta los cupos de tu propuesta",
        mensaje=mensaje,
        tipo="propuesta",
        meta={
            "propuesta_id": propuesta.id,
            "estado": propuesta.estado,
            "cupos_maximo_autorizado": maximo,
        },
    )


def _notificar_autorizacion_cupos(propuesta: PropuestaTema) -> None:
    alumno = propuesta.alumno
    if alumno is None:
        return

    docente = propuesta.docente
    comentario = (propuesta.comentario_decision or "").strip()

    if docente:
        encabezado = f"El docente {docente.nombre_completo} autorizó los cupos del grupo"
    else:
        encabezado = "Se autorizaron los cupos solicitados para tu propuesta"

    mensaje = f"{encabezado} del tema \"{propuesta.titulo}\"."
    if comentario:
        mensaje = f"{mensaje} Comentario: {comentario}"

    Notificacion.objects.create(
        usuario=alumno,
        titulo="Cupos autorizados",
        mensaje=mensaje,
        tipo="propuesta",
        meta={
            "propuesta_id": propuesta.id,
            "estado": propuesta.estado,
            "cupos_autorizados": propuesta.cupos_maximo_autorizado,
        },
    )


def _notificar_confirmacion_alumno(propuesta: PropuestaTema) -> None:
    docente = propuesta.docente
    if docente is None:
        return

    alumno = propuesta.alumno
    if alumno:
        alumno_nombre = alumno.nombre_completo
    else:
        alumno_nombre = "El alumno"

    mensaje = (
        f"{alumno_nombre} confirmó los cupos del tema \"{propuesta.titulo}\" y ahora espera tu aprobación definitiva."
    )

    Notificacion.objects.create(
        usuario=docente,
        titulo="Confirmación de cupos recibida",
        mensaje=mensaje,
        tipo="propuesta",
        meta={
            "propuesta_id": propuesta.id,
            "estado": propuesta.estado,
            "cupos_requeridos": propuesta.cupos_requeridos,
        },
    )


def _crear_tema_desde_propuesta(propuesta: PropuestaTema) -> TemaDisponible | None:
    alumno = propuesta.alumno
    if alumno is None:
        return None

    cupos_autorizados = propuesta.cupos_maximo_autorizado or propuesta.cupos_requeridos
    cupos = propuesta.cupos_requeridos or 1
    if cupos_autorizados:
        cupos = min(cupos, cupos_autorizados)
    if cupos < 1:
        cupos = 1

    carrera = alumno.carrera or ""
    if not carrera and propuesta.docente and propuesta.docente.carrera:
        carrera = propuesta.docente.carrera

    requisitos = []
    if propuesta.objetivo:
        requisitos.append(propuesta.objetivo)

    docente_responsable = propuesta.docente
    created_by = alumno if alumno else propuesta.docente
    rama = (propuesta.rama or "").strip()

    with transaction.atomic():
        tema = TemaDisponible.objects.create(
            titulo=propuesta.titulo,
            carrera=carrera,
            rama=rama,
            descripcion=propuesta.descripcion,
            requisitos=requisitos,
            cupos=cupos,
            created_by=created_by,
            docente_responsable=docente_responsable,
            propuesta=propuesta,
        )

        participantes: list[tuple[Usuario, bool]] = [(alumno, True)]

        for correo in propuesta.correos_companeros or []:
            usuario = Usuario.objects.filter(correo__iexact=correo, rol="alumno").first()
            if not usuario:
                continue
            if carrera and usuario.carrera and not _carreras_compatibles(carrera, usuario.carrera):
                continue
            if any(existing.pk == usuario.pk for existing, _ in participantes):
                continue
            participantes.append((usuario, False))

        for usuario, es_responsable in participantes[:cupos]:
            InscripcionTema.objects.create(
                tema=tema,
                alumno=usuario,
                es_responsable=es_responsable,
            )

    return tema


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
    archivo = request.FILES.get("documento")
    url_param = (request.data.get("url") or "").strip()

    if archivo:
        content_type = (archivo.content_type or "").lower()
        if content_type and "pdf" not in content_type:
            return Response(
                {"documento": "El archivo debe estar en formato PDF."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if solicitud.documento:
            solicitud.documento.delete(save=False)

        nombres = " ".join(
            parte
            for parte in [solicitud.alumno_nombres or "", solicitud.alumno_apellidos or ""]
            if parte
        ).strip()
        slug = slugify(nombres or "carta practica") or "carta-practica"
        timestamp = timezone.localtime(timezone.now()).strftime("%Y%m%d%H%M%S")
        filename = f"carta-{slug}-{timestamp}.pdf"

        solicitud.documento.save(filename, archivo, save=False)
        solicitud.url_documento = solicitud.documento.url
    elif url_param:
        if solicitud.documento:
            solicitud.documento.delete(save=False)
        solicitud.documento = None
        solicitud.url_documento = url_param
    else:
        return Response(
            {"documento": "Debe adjuntar el archivo PDF generado."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    solicitud.motivo_rechazo = None
    solicitud.estado = "aprobado"
    solicitud.save()

    serializer = SolicitudCartaPracticaSerializer(solicitud, context={"request": request})
    return Response({"status": "ok", "url": serializer.data.get("url")})


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
    if solicitud.documento:
        solicitud.documento.delete(save=False)
    solicitud.documento = None
    solicitud.estado = "rechazado"
    solicitud.save()
    return Response({"status": "ok"})


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


@api_view(["GET", "POST"])
@permission_classes([AllowAny])
@parser_classes([MultiPartParser, FormParser])
def gestionar_firma_coordinador_practica(request):
    coordinador_param = request.query_params.get("coordinador") or request.data.get(
        "coordinador"
    )
    coordinador = _obtener_usuario_por_id(coordinador_param)
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

    if request.method == "GET":
        firma = (
            PracticaFirmaCoordinador.objects.select_related("uploaded_by")
            .filter(carrera__iexact=carrera)
            .order_by("-updated_at")
            .first()
        )
        if not firma:
            return Response({"item": None})

        serializer = PracticaFirmaCoordinadorSerializer(
            firma, context={"request": request}
        )
        return Response({"item": serializer.data})

    archivo = request.FILES.get("archivo")
    if not archivo:
        return Response(
            {"archivo": ["Este campo es obligatorio."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    content_type = (archivo.content_type or "").lower()
    if content_type and not content_type.startswith("image/"):
        return Response(
            {"archivo": ["Solo se permiten imágenes (PNG, JPG)."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    firma, created = PracticaFirmaCoordinador.objects.get_or_create(
        carrera=carrera,
        defaults={"archivo": archivo, "uploaded_by": coordinador},
    )

    if not created:
        if firma.archivo:
            firma.archivo.delete(save=False)
        firma.archivo = archivo
        firma.uploaded_by = coordinador
        firma.save(update_fields=["archivo", "uploaded_by", "updated_at"])

    serializer = PracticaFirmaCoordinadorSerializer(
        firma, context={"request": request}
    )
    status_code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
    headers = {"Location": f"/api/coordinacion/practicas/firma/"}
    return Response(serializer.data, status=status_code, headers=headers)


@api_view(["GET", "POST"])
@permission_classes([AllowAny])
@parser_classes([MultiPartParser, FormParser])
def gestionar_evaluacion_practica(request):
    coordinador_param = request.query_params.get("coordinador") or request.data.get(
        "coordinador"
    )
    coordinador = _obtener_usuario_por_id(coordinador_param)
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

    if request.method == "GET":
        evaluacion = (
            PracticaEvaluacion.objects.select_related("uploaded_by")
            .filter(carrera__iexact=carrera)
            .order_by("-created_at")
            .first()
        )
        if not evaluacion:
            return Response({"item": None})

        serializer = PracticaEvaluacionSerializer(
            evaluacion, context={"request": request}
        )
        return Response({"item": serializer.data})

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

    descripcion = (request.data.get("descripcion") or "").strip()

    evaluacion = PracticaEvaluacion.objects.create(
        carrera=carrera,
        nombre=nombre,
        descripcion=descripcion,
        archivo=archivo,
        uploaded_by=coordinador,
    )

    serializer = PracticaEvaluacionSerializer(
        evaluacion, context={"request": request}
    )
    headers = {"Location": f"/api/coordinacion/practicas/evaluacion/{evaluacion.pk}/"}
    return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)


@api_view(["GET"])
@permission_classes([AllowAny])
def obtener_evaluacion_practica(request):
    carrera = (request.query_params.get("carrera") or "").strip()
    if not carrera:
        return Response({"item": None})

    evaluacion = (
        PracticaEvaluacion.objects.select_related("uploaded_by")
        .filter(carrera__iexact=carrera)
        .order_by("-created_at")
        .first()
    )
    if not evaluacion:
        return Response({"item": None})

    serializer = PracticaEvaluacionSerializer(
        evaluacion, context={"request": request}
    )
    return Response({"item": serializer.data})


@api_view(["GET", "POST"])
@permission_classes([AllowAny])
@parser_classes([MultiPartParser, FormParser])
def gestionar_entrega_evaluacion_practica(request):
    alumno_param = request.query_params.get("alumno") or request.data.get("alumno")
    alumno = _obtener_usuario_por_id(alumno_param)
    if not alumno or alumno.rol != "alumno":
        return Response(
            {"detail": "Alumno no válido."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    carrera = (alumno.carrera or "").strip()
    if not carrera:
        return Response(
            {"detail": "El alumno no tiene una carrera asignada."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if request.method == "GET":
        entrega = (
            PracticaEvaluacionEntrega.objects.select_related("evaluacion")
            .filter(alumno=alumno)
            .order_by("-created_at")
            .first()
        )
        if not entrega:
            return Response({"item": None})

        serializer = PracticaEvaluacionEntregaSerializer(
            entrega, context={"request": request}
        )
        return Response({"item": serializer.data})

    evaluacion_id = request.data.get("evaluacion") or request.query_params.get(
        "evaluacion"
    )
    if evaluacion_id:
        evaluacion = (
            PracticaEvaluacion.objects.filter(pk=evaluacion_id, carrera__iexact=carrera)
            .order_by("-created_at")
            .first()
        )
    else:
        evaluacion = (
            PracticaEvaluacion.objects.filter(carrera__iexact=carrera)
            .order_by("-created_at")
            .first()
        )

    if not evaluacion:
        return Response(
            {"detail": "No hay una evaluación disponible para tu carrera."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    archivo = request.FILES.get("archivo")
    if not archivo:
        return Response(
            {"archivo": ["Este campo es obligatorio."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    entrega = PracticaEvaluacionEntrega.objects.create(
        evaluacion=evaluacion,
        alumno=alumno,
        archivo=archivo,
    )

    serializer = PracticaEvaluacionEntregaSerializer(
        entrega, context={"request": request}
    )
    headers = {"Location": f"/api/practicas/evaluacion/entregas/{entrega.pk}/"}
    return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)