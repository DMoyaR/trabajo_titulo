from django.db import models
from django.contrib.auth.hashers import make_password, check_password as auth_check_password


class Task(models.Model):
    """Simple task model for demo purposes."""

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return self.title


class Usuario(models.Model):
    nombre_completo = models.CharField(max_length=255)
    correo = models.EmailField(unique=True)
    carrera = models.CharField(max_length=255)
    rut = models.CharField(max_length=20)
    telefono = models.CharField(max_length=20)
    rol = models.CharField(max_length=50)
    contrasena = models.CharField(max_length=128)

    def set_password(self, raw_password: str) -> None:
        """Hash and store the provided raw password."""
        self.contrasena = make_password(raw_password)

    def check_password(self, raw_password: str) -> bool:
        """Verify the provided raw password against the stored hash."""
        return auth_check_password(raw_password, self.contrasena)

    def __str__(self) -> str:
        return self.nombre_completo
