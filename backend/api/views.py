from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from .serializers import LoginSerializer

REDIRECTS = {
    "alumno": "http://localhost:4200/alumno/dashboard",
    "docente": "http://localhost:4200/docente/dashboard",
    "coordinador": "http://localhost:4200/coordinacion/inicio",
}

@api_view(["POST"])
@permission_classes([AllowAny])
def login_view(request):
    serializer = LoginSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({"detail": "Credenciales inválidas"}, status=status.HTTP_401_UNAUTHORIZED)

    usuario = serializer.validated_data["usuario"]
    redirect_url = REDIRECTS.get(usuario.rol)

    return Response({
        "status": "success",
        "rol": usuario.rol,
        "redirect_url": redirect_url,
        "nombre": usuario.nombre_completo,
        "correo": usuario.correo,
    }, status=status.HTTP_200_OK)
