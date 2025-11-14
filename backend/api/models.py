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
    docente_guia = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="alumnos_guia",
        limit_choices_to={"rol": "docente"},
    )
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
    rama = models.CharField(max_length=120, blank=True, default="")
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
    docente_responsable = models.ForeignKey(
        Usuario,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="temas_a_cargo",
    )
    propuesta = models.OneToOneField(
        "PropuestaTema",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="tema_generado",
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
    es_responsable = models.BooleanField(default=False)
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
    documento = models.FileField(
        upload_to="practicas/cartas/%Y/%m/%d",
        blank=True,
        null=True,
    )
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


class SolicitudReunion(models.Model):
    ESTADOS = [
        ("pendiente", "Pendiente"),
        ("aprobada", "Aprobada"),
        ("rechazada", "Rechazada"),
    ]

    alumno = models.ForeignKey(
        Usuario,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="solicitudes_reunion",
    )
    docente = models.ForeignKey(
        Usuario,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="solicitudes_reunion_recibidas",
        limit_choices_to={"rol": "docente"},
    )
    motivo = models.TextField()
    disponibilidad_sugerida = models.CharField(max_length=255, blank=True, null=True)
    estado = models.CharField(max_length=20, choices=ESTADOS, default="pendiente")
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "solicitudes_reunion"
        ordering = ["-creado_en"]

    def __str__(self) -> str:
        alumno = self.alumno.nombre_completo if self.alumno else "Alumno desconocido"
        return f"Solicitud de reunión de {alumno} ({self.estado})"


class Reunion(models.Model):
    ESTADOS = [
        ("aprobada", "Aprobada"),
        ("finalizada", "Finalizada"),
        ("no_realizada", "No realizada"),
        ("reprogramada", "Reprogramada"),
    ]
    MODALIDADES = [
        ("presencial", "Presencial"),
        ("online", "Online"),
    ]

    alumno = models.ForeignKey(
        Usuario,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reuniones_alumno",
    )
    docente = models.ForeignKey(
        Usuario,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reuniones_docente",
        limit_choices_to={"rol": "docente"},
    )
    solicitud = models.OneToOneField(
        SolicitudReunion,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reunion",
    )
    fecha = models.DateField()
    hora_inicio = models.TimeField()
    hora_termino = models.TimeField()
    modalidad = models.CharField(max_length=20, choices=MODALIDADES)
    motivo = models.TextField()
    observaciones = models.TextField(blank=True, null=True)
    estado = models.CharField(max_length=20, choices=ESTADOS, default="aprobada")
    creado_por = models.ForeignKey(
        Usuario,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reuniones_registradas",
    )
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "reuniones"
        ordering = ["-fecha", "-hora_inicio"]
        indexes = [
            models.Index(fields=["docente", "fecha", "hora_inicio", "hora_termino"]),
        ]

    def __str__(self) -> str:
        alumno = self.alumno.nombre_completo if self.alumno else "Alumno"
        fecha = self.fecha.isoformat()
        return f"Reunión {fecha} - {alumno} ({self.estado})"


class TrazabilidadReunion(models.Model):
    TIPOS = [
        ("creacion_solicitud", "Creación de solicitud"),
        ("aprobada_desde_solicitud", "Aprobada desde solicitud"),
        ("agendada_directamente", "Agendada directamente"),
        ("rechazo", "Rechazo"),
        ("cierre_final", "Cierre final"),
    ]

    solicitud = models.ForeignKey(
        SolicitudReunion,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="trazabilidad",
    )
    reunion = models.ForeignKey(
        Reunion,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="trazabilidad",
    )
    usuario = models.ForeignKey(
        Usuario,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    tipo = models.CharField(max_length=40, choices=TIPOS)
    estado_anterior = models.CharField(max_length=20, blank=True, null=True)
    estado_nuevo = models.CharField(max_length=20, blank=True, null=True)
    comentario = models.TextField(blank=True, null=True)
    datos = models.JSONField(default=dict, blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "trazabilidad_reuniones"
        ordering = ["-creado_en"]

    def __str__(self) -> str:
        referencia = "reunión" if self.reunion_id else "solicitud"
        return f"Registro de {referencia} ({self.tipo})"


class PropuestaTema(models.Model):
    ESTADOS = [
        ("pendiente", "Pendiente"),
        ("pendiente_ajuste", "Pendiente ajuste"),
        ("pendiente_aprobacion", "Pendiente aprobación"),
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
    cupos_requeridos = models.PositiveIntegerField(default=1)
    correos_companeros = models.JSONField(default=list, blank=True)
    cupos_maximo_autorizado = models.PositiveIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "propuestas_tema"
        ordering = ["-created_at"]
        verbose_name = "Propuesta tema alumno"
        verbose_name_plural = "Propuestas temas alumno"

    def __str__(self) -> str:
        return f"{self.titulo} ({self.get_estado_display()})"


class PropuestaTemaDocente(PropuestaTema):
    """Proxy model para separar las propuestas creadas por docentes."""

    class Meta:
        proxy = True
        verbose_name = "Propuesta tema docente"
        verbose_name_plural = "Propuestas tema docente"


class Notificacion(models.Model):
    TIPOS = [
        ("propuesta", "Propuesta"),
        ("general", "General"),
        ("tema", "Tema"),
        ("reunion", "Reunión"),
        ("inscripcion", "Inscripción"),
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


class PracticaDocumento(models.Model):
    """Documento oficial compartido para estudiantes de práctica."""

    carrera = models.CharField(
        max_length=120,
        choices=Usuario.CARRERA_CHOICES,
    )
    nombre = models.CharField(max_length=255)
    descripcion = models.TextField(blank=True, null=True)
    archivo = models.FileField(upload_to="practicas/documentos/%Y/%m/%d")
    uploaded_by = models.ForeignKey(
        Usuario,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="documentos_practica",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "practica_documentos"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.nombre} ({self.carrera})"