from django.db import models
from django.contrib.auth.hashers import make_password, check_password as auth_check_password

class Usuario(models.Model):
    ROL_CHOICES = [
        ("alumno", "Alumno"),
        ("docente", "Docente"),
        ("coordinador", "Coordinador"),
    ]
    CARRERA_CHOICES = [
        ("Computación", "Computación"),
        ("Informática", "Informática"),
        ("Industria", "Industria"),
        ("Trabajo Social", "Trabajo Social"),
        ("Mecánica", "Mecánica"),
    ]

    nombre_completo = models.CharField(max_length=100)
    correo = models.EmailField(unique=True, max_length=100)
    carrera = models.CharField(max_length=50, choices=CARRERA_CHOICES, blank=True, null=True)
    rut = models.CharField(max_length=15, unique=True)
    telefono = models.CharField(max_length=20, blank=True, null=True)
    rol = models.CharField(max_length=20, choices=ROL_CHOICES)
    contrasena = models.CharField(max_length=128)

    class Meta:
        db_table = "usuarios"

    def set_password(self, raw_password: str) -> None:
        self.contrasena = make_password(raw_password)

    def check_password(self, raw_password: str) -> bool:
        return auth_check_password(raw_password, self.contrasena)

    def save(self, *args, **kwargs):
        """
        Si 'contrasena' viene en texto plano (no empieza con 'pbkdf2_sha256$'),
        la hasheamos antes de guardar. Si ya es hash, no la tocamos.
        """
        if self.contrasena and not str(self.contrasena).startswith('pbkdf2_sha256$'):
            self.set_password(self.contrasena)
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.nombre_completo} ({self.rol})"