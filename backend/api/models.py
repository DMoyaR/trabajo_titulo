from django.db import models
from django.contrib.auth.hashers import make_password, check_password as auth_check_password

class Usuario(models.Model):
    ROL_CHOICES = [
        ("alumno", "Alumno"),
        ("docente", "Docente"),
        ("coordinador", "Coordinador"),
    ]

    CARRERA_CHOICES = [
        ("Química y Farmacia", "Química y Farmacia"),
        ("Ing. Civil Biomédica", "Ing. Civil Biomédica"),
        ("Ing. Civil Química", "Ing. Civil Química"),
        ("Ing. Civil Matemática", "Ing. Civil Matemática"),
        ("Bachillerato en Ciencias de la Ing.", "Bachillerato en Ciencias de la Ing."),
        ("Dibujante Proyectista", "Dibujante Proyectista"),
        ("Ing. Civil en Ciencia de Datos", "Ing. Civil en Ciencia de Datos"),
        ("Ing. Civil en Computación mención Informática", "Ing. Civil en Computación mención Informática"),
        ("Ing. Civil Electrónica", "Ing. Civil Electrónica"),
        ("Ing. Civil en Mecánica", "Ing. Civil en Mecánica"),
        ("Ing. Civil Industrial", "Ing. Civil Industrial"),
        ("Ing. en Biotecnología", "Ing. en Biotecnología"),
        ("Ing. en Geomensura", "Ing. en Geomensura"),
        ("Ing. en Alimentos", "Ing. en Alimentos"),
        ("Ing. en Informática", "Ing. en Informática"),
        ("Ing. Industrial", "Ing. Industrial"),
        ("Química Industrial", "Química Industrial"),
        ("Ing. Electrónica", "Ing. Electrónica"),
    ] 

    # Agregar más carreras según sea necesario
    """
    


        CARRERA_CHOICES = [
        ("Computación", "Computación"),
        ("Informática", "Informática"),
        ("Industria", "Industria"),
        ("Trabajo Social", "Trabajo Social"),
        ("Mecánica", "Mecánica"),
    ]

    """


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


class TemaDisponible(models.Model):
    titulo = models.CharField(max_length=160)
    carrera = models.CharField(max_length=100)
    descripcion = models.TextField()
    requisitos = models.JSONField(default=list, blank=True)
    cupos = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        Usuario,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="temas_disponibles",
    )

    class Meta:
        db_table = "temas_disponibles"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.titulo

    @property
    def cupos_disponibles(self) -> int:
        """Cantidad de cupos libres considerando inscripciones activas."""
        inscritos = self.inscripciones.filter(activo=True).count()
        restantes = self.cupos - inscritos
        return restantes if restantes > 0 else 0


class InscripcionTema(models.Model):
    tema = models.ForeignKey(
        TemaDisponible,
        on_delete=models.CASCADE,
        related_name="inscripciones",
    )
    alumno = models.ForeignKey(
        Usuario,
        on_delete=models.CASCADE,
        related_name="inscripciones_tema",
    )
    activo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "inscripciones_tema"
        unique_together = ("tema", "alumno")

    def __str__(self) -> str:
        return f"{self.alumno.nombre_completo} → {self.tema.titulo}"


class SolicitudCartaPractica(models.Model):
    ESTADOS = [
        ("pendiente", "Pendiente"),
        ("aprobado", "Aprobado"),
        ("rechazado", "Rechazado"),
    ]

    alumno = models.ForeignKey(
        Usuario,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="solicitudes_carta",
    )
    coordinador = models.ForeignKey(
        Usuario,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="solicitudes_carta_asignadas",
    )

    alumno_rut = models.CharField(max_length=20)
    alumno_nombres = models.CharField(max_length=120)
    alumno_apellidos = models.CharField(max_length=120)
    alumno_carrera = models.CharField(max_length=120)

    practica_jefe_directo = models.CharField(max_length=120)
    practica_cargo_alumno = models.CharField(max_length=120)
    practica_fecha_inicio = models.DateField()
    practica_empresa_rut = models.CharField(max_length=20)
    practica_sector = models.CharField(max_length=160)
    practica_duracion_horas = models.PositiveIntegerField()

    dest_nombres = models.CharField(max_length=120)
    dest_apellidos = models.CharField(max_length=120)
    dest_cargo = models.CharField(max_length=150)
    dest_empresa = models.CharField(max_length=180)

    escuela_id = models.CharField(max_length=30)
    escuela_nombre = models.CharField(max_length=180)
    escuela_direccion = models.CharField(max_length=255)
    escuela_telefono = models.CharField(max_length=60)

    estado = models.CharField(max_length=20, choices=ESTADOS, default="pendiente")
    url_documento = models.URLField(blank=True, null=True)
    motivo_rechazo = models.TextField(blank=True, null=True)
    meta = models.JSONField(default=dict, blank=True)

    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "solicitudes_carta_practica"
        ordering = ["-creado_en"]

    def __str__(self) -> str:
        return f"Carta práctica de {self.alumno_nombres} {self.alumno_apellidos}"


class PropuestaTema(models.Model):
    ESTADOS = [
        ("pendiente", "Pendiente"),
        ("aceptada", "Aceptada"),
        ("rechazada", "Rechazada"),
    ]

    alumno = models.ForeignKey(
        Usuario,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="propuestas_tema",
    )
    docente = models.ForeignKey(
        Usuario,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="propuestas_revision",
    )
    titulo = models.CharField(max_length=160)
    objetivo = models.CharField(max_length=300)
    descripcion = models.TextField()
    rama = models.CharField(max_length=120)
    estado = models.CharField(max_length=20, choices=ESTADOS, default="pendiente")
    comentario_decision = models.TextField(blank=True, null=True)
    preferencias_docentes = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "propuestas_tema"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.titulo} ({self.get_estado_display()})"


class Notificacion(models.Model):
    TIPOS = [
        ("propuesta", "Propuesta"),
        ("general", "General"),
    ]

    usuario = models.ForeignKey(
        Usuario,
        on_delete=models.CASCADE,
        related_name="notificaciones",
    )
    titulo = models.CharField(max_length=160)
    mensaje = models.TextField()
    tipo = models.CharField(max_length=40, choices=TIPOS, default="general")
    leida = models.BooleanField(default=False)
    meta = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "notificaciones"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.titulo} -> {self.usuario.nombre_completo}"