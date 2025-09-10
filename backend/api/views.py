from django.contrib.auth import authenticate
from rest_framework import status, viewsets
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Task
from .serializers import TaskSerializer


REDIRECTS = {
    "alumno": "/alumno",
    "docente": "/docente",
    "coordinacion": "/coordinacion/inicio",
}


class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer


@api_view(["POST"])
def login_view(request):
    """Authenticate a user and return their role and redirect URL."""

    email = request.data.get("email")
    password = request.data.get("password")

    user = authenticate(request, username=email, email=email, password=password)
    if not user:
        return Response(status=status.HTTP_401_UNAUTHORIZED)

    role = user.groups.first().name if user.groups.exists() else None
    redirect_url = REDIRECTS.get(role)
    if not redirect_url:
        return Response(status=status.HTTP_401_UNAUTHORIZED)

    return Response({"role": role, "url": redirect_url})