from rest_framework import serializers
from .models import Usuario, TemaDisponible

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
