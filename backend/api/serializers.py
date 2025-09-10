"""Serializadores para la API del proyecto."""

from django.contrib.auth import get_user_model
from django.core.exceptions import FieldDoesNotExist
from rest_framework import serializers

from .models import Task


class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = [
            "id",
            "title",
            "description",
            "completed",
            "created_at",
            "updated_at",
        ]


class LoginSerializer(serializers.Serializer):
    """Serializer para autenticar usuarios mediante correo y contraseña."""

    correo = serializers.EmailField()
    contrasena = serializers.CharField(write_only=True)

    def validate(self, attrs):
        usuario_model = get_user_model()
        correo = attrs.get("correo")
        contrasena = attrs.get("contrasena")

        try:
            usuario_model._meta.get_field("correo")
            lookup = {"correo": correo}
        except FieldDoesNotExist:
            lookup = {"email": correo}

        try:
            usuario = usuario_model.objects.get(**lookup)
        except usuario_model.DoesNotExist:
            raise serializers.ValidationError("Credenciales inválidas")

        if not usuario.check_password(contrasena):
            raise serializers.ValidationError("Credenciales inválidas")

        attrs["usuario"] = usuario
        return attrs
