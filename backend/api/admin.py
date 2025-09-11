from django.contrib import admin
from .models import Usuario

@admin.register(Usuario)
class UsuarioAdmin(admin.ModelAdmin):
    list_display = ("nombre_completo", "correo", "rol", "carrera", "rut", "telefono")
    search_fields = ("nombre_completo", "correo", "rut", "rol", "carrera")
    list_filter = ("rol", "carrera")
