"""Utilities to centralize creation and delivery of notifications."""

from __future__ import annotations

from typing import Iterable

from django.conf import settings
from django.core.mail import send_mail

from .models import Notificacion, TemaDisponible, Usuario


def _default_from_email() -> str:
    """Return a fallback email address when none is configured."""

    return getattr(settings, "DEFAULT_FROM_EMAIL", "no-reply@trabajo-titulo.local")


def registrar_notificacion(
    usuario: Usuario,
    titulo: str,
    mensaje: str,
    *,
    tipo: str = "general",
    meta: dict | None = None,
    enviar_correo: bool = True,
) -> Notificacion:
    """Persist a notification and optionally send it by email."""

    data_meta = dict(meta or {})
    notificacion = Notificacion.objects.create(
        usuario=usuario,
        titulo=titulo,
        mensaje=mensaje,
        tipo=tipo,
        meta=data_meta,
    )

    if enviar_correo and usuario.correo:
        send_mail(
            subject=titulo,
            message=mensaje,
            from_email=_default_from_email(),
            recipient_list=[usuario.correo],
            fail_silently=True,
        )

    return notificacion


def notificar_reserva_tema(
    tema: TemaDisponible,
    alumno: Usuario,
    *,
    cupos_disponibles: int,
    reactivada: bool = False,
    inscripcion_id: int | None = None,
) -> None:
    """Notify the docente and alumno when a reservation is made or reactivated."""

    meta_base = {
        "evento": "reserva_tema",
        "tema_id": tema.id,
        "tema_titulo": tema.titulo,
        "alumno_id": alumno.id,
        "cupos_totales": tema.cupos,
        "cupos_disponibles": cupos_disponibles,
        "reactivada": reactivada,
        "inscripcion_id": inscripcion_id,
    }

    docente = tema.created_by
    if docente:
        accion_docente = (
            "ha reactivado su participación en"
            if reactivada
            else "ha solicitado o tomado"
        )
        titulo_docente = f"{alumno.nombre_completo} reservó el tema \"{tema.titulo}\""
        mensaje_docente = (
            f"El alumno {alumno.nombre_completo} ({alumno.correo}) {accion_docente} "
            f"el tema \"{tema.titulo}\"."
        )
        registrar_notificacion(
            docente,
            titulo_docente,
            mensaje_docente,
            tipo="tema",
            meta={**meta_base, "destinatario": "docente", "docente_id": docente.id},
        )

    if reactivada:
        titulo_alumno = f"Reserva reactivada para \"{tema.titulo}\""
        mensaje_alumno = (
            "Hemos reactivado tu participación en el tema \"{titulo}\". "
            "El docente ha sido notificado."
        ).format(titulo=tema.titulo)
    else:
        titulo_alumno = f"Solicitud del tema \"{tema.titulo}\" registrada"
        mensaje_alumno = (
            "Tu solicitud para participar en el tema \"{titulo}\" fue registrada correctamente. "
            "El docente será notificado para continuar con el proceso."
        ).format(titulo=tema.titulo)

    registrar_notificacion(
        alumno,
        titulo_alumno,
        mensaje_alumno,
        tipo="inscripcion",
        meta={**meta_base, "destinatario": "alumno"},
    )


def _alumnos_activos(tema: TemaDisponible) -> Iterable[Usuario]:
    for inscripcion in tema.inscripciones.filter(activo=True).select_related("alumno"):
        if inscripcion.alumno:
            yield inscripcion.alumno


def notificar_cupos_completados(tema: TemaDisponible) -> None:
    """Inform recipients when a topic is no longer accepting students."""

    meta_base = {
        "evento": "cupos_completados",
        "tema_id": tema.id,
        "tema_titulo": tema.titulo,
        "cupos_totales": tema.cupos,
    }

    docente = tema.created_by
    if docente:
        registrar_notificacion(
            docente,
            f"El tema \"{tema.titulo}\" completó sus cupos",
            (
                f"El tema \"{tema.titulo}\" alcanzó su máximo de {tema.cupos} cupos. "
                "No es posible aceptar nuevos alumnos."
            ),
            tipo="tema",
            meta={**meta_base, "destinatario": "docente", "docente_id": docente.id},
        )

    for alumno in _alumnos_activos(tema):
        registrar_notificacion(
            alumno,
            f"Cupos completos en \"{tema.titulo}\"",
            (
                f"El tema \"{tema.titulo}\" alcanzó su límite de participantes, "
                "por lo que ya no admite más incorporaciones."
            ),
            tipo="inscripcion",
            meta={**meta_base, "destinatario": "alumno", "alumno_id": alumno.id},
        )


def notificar_tema_finalizado(tema: TemaDisponible) -> None:
    """Notify involved users when a topic is closed or removed from the platform."""

    meta_base = {
        "evento": "tema_finalizado",
        "tema_id": tema.id,
        "tema_titulo": tema.titulo,
        "cupos_totales": tema.cupos,
    }

    docente = tema.created_by
    if docente:
        registrar_notificacion(
            docente,
            f"Se cerró el tema \"{tema.titulo}\"",
            (
                f"El tema \"{tema.titulo}\" ha sido marcado como finalizado o eliminado "
                "de la plataforma. Se notificó a los estudiantes asociados."
            ),
            tipo="tema",
            meta={**meta_base, "destinatario": "docente", "docente_id": docente.id},
        )

    for alumno in _alumnos_activos(tema):
        registrar_notificacion(
            alumno,
            f"Estado final del tema \"{tema.titulo}\"",
            (
                f"El proceso asociado al tema \"{tema.titulo}\" finalizó. "
                "Conserva este mensaje como confirmación del estado final."
            ),
            tipo="inscripcion",
            meta={**meta_base, "destinatario": "alumno", "alumno_id": alumno.id},
        )