from rest_framework import serializers
from .models import Usuario, TemaDisponible, SolicitudCartaPractica

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
    created_by = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = TemaDisponible
        fields = [
            "id",
            "titulo",
            "carrera",
            "descripcion",
            "requisitos",
            "cupos",
            "created_at",
            "created_by",
        ]
        read_only_fields = ["id", "created_at", "created_by"]


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