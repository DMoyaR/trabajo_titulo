from rest_framework import serializers
from .models import (
    Usuario,
    TemaDisponible,
    SolicitudCartaPractica,
    PropuestaTema,
    Notificacion,
)

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()

    def validate(self, attrs):
        email = attrs.get("email")
        password = attrs.get("password")

        try:
            usuario = Usuario.objects.get(correo=email)
        except Usuario.DoesNotExist:
            raise serializers.ValidationError("Credenciales inválidas")

        if not usuario.check_password(password):
            raise serializers.ValidationError("Credenciales inválidas")

        attrs["usuario"] = usuario
        return attrs


class TemaDisponibleSerializer(serializers.ModelSerializer):
    created_by = serializers.PrimaryKeyRelatedField(
        queryset=Usuario.objects.all(), required=False, allow_null=True
    )
    creadoPor = serializers.SerializerMethodField(method_name="get_creado_por")
    cuposDisponibles = serializers.SerializerMethodField()
    tieneCupoPropio = serializers.SerializerMethodField()

    class Meta:
        model = TemaDisponible
        fields = [
            "id",
            "titulo",
            "carrera",
            "descripcion",
            "requisitos",
            "cupos",
            "cuposDisponibles",
            "tieneCupoPropio",
            "created_at",
            "created_by",
            "creadoPor",
        ]
        read_only_fields = ["id", "created_at"]

    def get_creado_por(self, obj):
        usuario = obj.created_by
        if not usuario:
            return None

        return {
            "nombre": usuario.nombre_completo,
            "rol": usuario.rol,
            "carrera": usuario.carrera,
        }

    def get_cuposDisponibles(self, obj) -> int:
        return obj.cupos_disponibles

    def get_tieneCupoPropio(self, obj) -> bool:
        alumno_id = self.context.get("alumno_id")
        if not alumno_id:
            return False
        return obj.inscripciones.filter(alumno_id=alumno_id, activo=True).exists()

class AlumnoCartaSerializer(serializers.Serializer):
    rut = serializers.CharField(max_length=20)
    nombres = serializers.CharField(max_length=120)
    apellidos = serializers.CharField(max_length=120)
    carrera = serializers.CharField(max_length=120)


class PracticaCartaSerializer(serializers.Serializer):
    jefeDirecto = serializers.CharField(max_length=120)
    cargoAlumno = serializers.CharField(max_length=120)
    fechaInicio = serializers.DateField()
    empresaRut = serializers.CharField(max_length=20)
    sectorEmpresa = serializers.CharField(max_length=160)
    duracionHoras = serializers.IntegerField(min_value=1)


class DestinatarioCartaSerializer(serializers.Serializer):
    nombres = serializers.CharField(max_length=120)
    apellidos = serializers.CharField(max_length=120)
    cargo = serializers.CharField(max_length=150)
    empresa = serializers.CharField(max_length=180)


class EscuelaCartaSerializer(serializers.Serializer):
    id = serializers.CharField(max_length=30)
    nombre = serializers.CharField(max_length=180)
    direccion = serializers.CharField(max_length=255)
    telefono = serializers.CharField(max_length=60)


class SolicitudCartaPracticaCreateSerializer(serializers.Serializer):
    alumno = AlumnoCartaSerializer()
    practica = PracticaCartaSerializer()
    destinatario = DestinatarioCartaSerializer()
    escuela = EscuelaCartaSerializer()
    meta = serializers.DictField(child=serializers.CharField(), required=False)

    def validate(self, attrs):
        practica = attrs.get("practica", {})
        sector = practica.get("sectorEmpresa")
        if not sector or not str(sector).strip():
            raise serializers.ValidationError({"practica": {"sectorEmpresa": "Este campo es obligatorio."}})
        return attrs


class SolicitudCartaPracticaSerializer(serializers.ModelSerializer):
    class Meta:
        model = SolicitudCartaPractica
        fields = [
            "id",
            "creado_en",
            "estado",
            "url_documento",
            "motivo_rechazo",
            "alumno_rut",
            "alumno_nombres",
            "alumno_apellidos",
            "alumno_carrera",
            "practica_jefe_directo",
            "practica_cargo_alumno",
            "practica_fecha_inicio",
            "practica_empresa_rut",
            "practica_sector",
            "practica_duracion_horas",
            "dest_nombres",
            "dest_apellidos",
            "dest_cargo",
            "dest_empresa",
            "escuela_id",
            "escuela_nombre",
            "escuela_direccion",
            "escuela_telefono",
            "meta",
        ]

    def to_representation(self, instance):
        base = super().to_representation(instance)
        return {
            "id": str(base["id"]),
            "creadoEn": instance.creado_en.isoformat(),
            "estado": base["estado"],
            "url": base["url_documento"],
            "motivoRechazo": base["motivo_rechazo"],
            "alumno": {
                "rut": base["alumno_rut"],
                "nombres": base["alumno_nombres"],
                "apellidos": base["alumno_apellidos"],
                "carrera": base["alumno_carrera"],
            },
            "practica": {
                "jefeDirecto": base["practica_jefe_directo"],
                "cargoAlumno": base["practica_cargo_alumno"],
                "fechaInicio": instance.practica_fecha_inicio.isoformat(),
                "empresaRut": base["practica_empresa_rut"],
                "sectorEmpresa": base["practica_sector"],
                "duracionHoras": base["practica_duracion_horas"],
            },
            "destinatario": {
                "nombres": base["dest_nombres"],
                "apellidos": base["dest_apellidos"],
                "cargo": base["dest_cargo"],
                "empresa": base["dest_empresa"],
            },
            "escuela": {
                "id": base["escuela_id"],
                "nombre": base["escuela_nombre"],
                "direccion": base["escuela_direccion"],
                "telefono": base["escuela_telefono"],
            },
            "meta": base.get("meta", {}),
        }


class UsuarioResumenSerializer(serializers.ModelSerializer):
    nombre = serializers.CharField(source="nombre_completo")

    class Meta:
        model = Usuario
        fields = ["id", "nombre", "correo", "carrera", "telefono", "rol"]


class PropuestaTemaSerializer(serializers.ModelSerializer):
    alumno = UsuarioResumenSerializer(read_only=True)
    docente = UsuarioResumenSerializer(read_only=True)

    class Meta:
        model = PropuestaTema
        fields = [
            "id",
            "titulo",
            "objetivo",
            "descripcion",
            "rama",
            "estado",
            "comentario_decision",
            "preferencias_docentes",
            "alumno",
            "docente",
            "created_at",
            "updated_at",
        ]


class PropuestaTemaCreateSerializer(serializers.Serializer):
    alumno_id = serializers.IntegerField(required=False, allow_null=True)
    docente_id = serializers.IntegerField(required=False, allow_null=True)
    titulo = serializers.CharField(max_length=160)
    objetivo = serializers.CharField(max_length=300)
    descripcion = serializers.CharField()
    rama = serializers.CharField(max_length=120)
    preferencias_docentes = serializers.ListField(
        child=serializers.IntegerField(), required=False, allow_empty=True
    )

    def _obtener_usuario(self, usuario_id, rol, field_name):
        if usuario_id in (None, "", 0):
            return None

        try:
            usuario_id_int = int(usuario_id)
        except (TypeError, ValueError) as exc:
            raise serializers.ValidationError(
                {field_name: f"El identificador {usuario_id!r} no es válido."}
            ) from exc

        usuario = Usuario.objects.filter(id=usuario_id_int).first()
        if not usuario:
            raise serializers.ValidationError(
                {field_name: f"No existe un usuario con id {usuario_id_int}."}
            )

        rol_normalizado = (usuario.rol or "").strip().lower()
        if rol_normalizado != rol.strip().lower():
            raise serializers.ValidationError(
                {field_name: f"El usuario con id {usuario_id_int} no es un {rol}."}
            )

        return usuario

    def validate(self, attrs):
        alumno = self._obtener_usuario(attrs.get("alumno_id"), "alumno", "alumno_id")
        docente = self._obtener_usuario(attrs.get("docente_id"), "docente", "docente_id")

        preferencias = attrs.get("preferencias_docentes") or []
        if preferencias:
            docentes = Usuario.objects.filter(id__in=preferencias, rol="docente")
            encontrados = {d.id for d in docentes}
            faltantes = [pk for pk in preferencias if pk not in encontrados]
            if faltantes:
                raise serializers.ValidationError(
                    {
                        "preferencias_docentes": [
                            f"Los siguientes docentes no existen: {', '.join(map(str, faltantes))}"
                        ]
                    }
                )
            if docente is None:
                docente = next((d for d in docentes if d.id == preferencias[0]), None)

        attrs["alumno"] = alumno
        attrs["docente"] = docente
        attrs["preferencias_docentes"] = preferencias
        return attrs

    def create(self, validated_data):
        alumno = validated_data.pop("alumno", None)
        docente = validated_data.pop("docente", None)
        validated_data.pop("alumno_id", None)
        validated_data.pop("docente_id", None)
        preferencias = validated_data.pop("preferencias_docentes", [])

        propuesta = PropuestaTema.objects.create(
            alumno=alumno,
            docente=docente,
            preferencias_docentes=preferencias,
            **validated_data,
        )
        return propuesta


class PropuestaTemaDecisionSerializer(serializers.ModelSerializer):
    docente_id = serializers.IntegerField(required=False, allow_null=True)

    class Meta:
        model = PropuestaTema
        fields = ["estado", "comentario_decision", "docente_id"]

    def validate_docente_id(self, value):
        if value in (None, "", 0):
            return None
        try:
            return Usuario.objects.get(id=value, rol="docente")
        except Usuario.DoesNotExist as exc:
            raise serializers.ValidationError("Docente no válido") from exc

    def update(self, instance, validated_data):
        docente = validated_data.pop("docente_id", None)
        if docente is not None:
            instance.docente = docente
        return super().update(instance, validated_data)


class NotificacionSerializer(serializers.ModelSerializer):
    usuario = UsuarioResumenSerializer(read_only=True)

    class Meta:
        model = Notificacion
        fields = [
            "id",
            "titulo",
            "mensaje",
            "tipo",
            "leida",
            "meta",
            "created_at",
            "usuario",
        ]