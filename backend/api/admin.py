# admin.py — versión consolidada

from django import forms
from django.contrib import admin

from .models import Usuario, PropuestaTema, Notificacion, PracticaDocumento


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


@admin.register(PropuestaTema)
class PropuestaTemaAdmin(admin.ModelAdmin):
    list_display = (
        "titulo",
        "alumno",
        "docente",
        "estado",
        "created_at",
    )
    list_filter = ("estado", "rama")
    search_fields = ("titulo", "descripcion", "alumno__nombre_completo", "docente__nombre_completo")


@admin.register(Notificacion)
class NotificacionAdmin(admin.ModelAdmin):
    list_display = ("titulo", "usuario", "tipo", "leida", "created_at")
    list_filter = ("tipo", "leida")
    search_fields = ("titulo", "mensaje", "usuario__nombre_completo", "usuario__correo")


@admin.register(PracticaDocumento)
class PracticaDocumentoAdmin(admin.ModelAdmin):
    list_display = ("nombre", "carrera", "uploaded_by", "created_at")
    list_filter = ("carrera",)
    search_fields = ("nombre", "descripcion", "uploaded_by__nombre_completo")
