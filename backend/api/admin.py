# admin.py — versión consolidada

from django import forms
from django.contrib import admin

from .models import (
    Usuario,
    PropuestaTema,
    PropuestaTemaDocente,
    Notificacion,
    PracticaDocumento,
    SolicitudReunion,
    Reunion,
    TrazabilidadReunion,
    EvaluacionGrupoDocente,
)


class UsuarioAdminForm(forms.ModelForm):
    # Campo de password tipo <input type="password">
    contrasena = forms.CharField(
        label="Contraseña",
        required=False,
        widget=forms.PasswordInput(render_value=False),
        help_text="Déjalo en blanco para mantener la contraseña actual."
    )

    class Meta:
        model = Usuario
        fields = "__all__"

    def clean_contrasena(self):
        """
        Si el campo viene vacío, devolvemos la contraseña actual (no tocar).
        Si viene con texto, lo dejamos tal cual: el modelo lo hasheará en save().
        """
        pwd = self.cleaned_data.get("contrasena")
        if not pwd:
            # mantener el valor existente si estamos editando
            if self.instance and self.instance.pk:
                return self.instance.contrasena
        return pwd


@admin.register(Usuario)
class UsuarioAdmin(admin.ModelAdmin):
    form = UsuarioAdminForm
    list_display = ("nombre_completo", "correo", "rol", "carrera", "rut", "telefono")
    search_fields = ("nombre_completo", "correo", "rut", "rol", "carrera")
    list_filter = ("rol", "carrera")


class BasePropuestaTemaAdmin(admin.ModelAdmin):
    list_filter = ("estado", "rama")
    ordering = ("-created_at",)
    readonly_fields = ("created_at", "updated_at")


@admin.register(PropuestaTema)
class PropuestaTemaAlumnoAdmin(BasePropuestaTemaAdmin):
    list_display = (
        "titulo",
        "alumno",
        "docente",
        "estado",
        "created_at",
    )
    search_fields = (
        "titulo",
        "descripcion",
        "alumno__nombre_completo",
        "docente__nombre_completo",
    )
    raw_id_fields = ("alumno", "docente")

    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        return queryset.filter(alumno__isnull=False)


@admin.register(PropuestaTemaDocente)
class PropuestaTemaDocenteAdmin(BasePropuestaTemaAdmin):
    list_display = (
        "titulo",
        "docente",
        "estado",
        "created_at",
    )
    search_fields = (
        "titulo",
        "descripcion",
        "docente__nombre_completo",
    )
    exclude = ("alumno",)
    raw_id_fields = ("docente",)

    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        return queryset.filter(alumno__isnull=True)


@admin.register(Notificacion)
class NotificacionAdmin(admin.ModelAdmin):
    list_display = ("titulo", "usuario", "tipo", "leida", "created_at")
    list_filter = ("tipo", "leida")
    search_fields = ("titulo", "mensaje", "usuario__nombre_completo", "usuario__correo")


@admin.register(EvaluacionGrupoDocente)
class EvaluacionGrupoDocenteAdmin(admin.ModelAdmin):
    list_display = (
        "grupo_nombre",
        "titulo",
        "estado",
        "docente",
        "tema",
        "fecha",
        "updated_at",
    )
    list_filter = ("estado", "docente", "tema")
    search_fields = (
        "grupo_nombre",
        "titulo",
        "docente__nombre_completo",
        "tema__titulo",
    )
    autocomplete_fields = ("docente", "tema")
    readonly_fields = ("created_at", "updated_at")
    ordering = ("grupo_nombre", "-fecha", "-updated_at")


@admin.register(PracticaDocumento)
class PracticaDocumentoAdmin(admin.ModelAdmin):
    list_display = ("nombre", "carrera", "uploaded_by", "created_at")
    list_filter = ("carrera",)
    search_fields = ("nombre", "descripcion", "uploaded_by__nombre_completo")


@admin.register(SolicitudReunion)
class SolicitudReunionAdmin(admin.ModelAdmin):
    list_display = ("id", "alumno", "docente", "estado", "creado_en")
    list_filter = ("estado", "docente")
    search_fields = (
        "alumno__nombre_completo",
        "alumno__correo",
        "docente__nombre_completo",
        "motivo",
    )
    readonly_fields = ("creado_en", "actualizado_en")
    autocomplete_fields = ("alumno", "docente")


@admin.register(Reunion)
class ReunionAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "fecha",
        "hora_inicio",
        "docente",
        "alumno",
        "estado",
    )
    list_filter = ("estado", "modalidad", "docente")
    search_fields = (
        "alumno__nombre_completo",
        "alumno__correo",
        "docente__nombre_completo",
        "motivo",
    )
    readonly_fields = ("creado_en", "actualizado_en")
    autocomplete_fields = ("alumno", "docente", "solicitud", "creado_por")


@admin.register(TrazabilidadReunion)
class TrazabilidadReunionAdmin(admin.ModelAdmin):
    list_display = ("id", "tipo", "solicitud", "reunion", "usuario", "creado_en")
    list_filter = ("tipo",)
    search_fields = (
        "solicitud__alumno__nombre_completo",
        "reunion__docente__nombre_completo",
        "usuario__nombre_completo",
    )
    readonly_fields = ("creado_en",)
    autocomplete_fields = ("solicitud", "reunion", "usuario")