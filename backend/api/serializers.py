from rest_framework import serializers
from .models import (
    Usuario,
    TemaDisponible,
    SolicitudCartaPractica,
    PracticaDocumento,
    PropuestaTema,
    Notificacion,
    SolicitudReunion,
    Reunion,
    TrazabilidadReunion,
    EvaluacionGrupoDocente,
)


def _procesar_correos_companeros(
    alumno: Usuario | None,
    correos_companeros: list[str] | None,
    cupos_requeridos: int,
    field_name: str = "correos_companeros",
):
    correos = correos_companeros or []
    cupos = max(int(cupos_requeridos or 1), 1)
    correo_alumno = (alumno.correo or "").strip().lower() if alumno else ""
    correos_limpios: list[str] = []
    correos_unicos: set[str] = set()

    for correo in correos:
        normalizado = (correo or "").strip().lower()
        if not normalizado:
            continue
        if normalizado == correo_alumno:
            raise serializers.ValidationError(
                {
                    field_name: [
                        "No debes ingresar tu propio correo dentro de los cupos.",
                    ]
                }
            )
        if normalizado in correos_unicos:
            raise serializers.ValidationError(
                {
                    field_name: [
                        "Cada correo de compañero debe ser distinto.",
                    ]
                }
            )
        correos_unicos.add(normalizado)
        correos_limpios.append(normalizado)

    max_companeros = max(cupos - 1, 0)
    if len(correos_limpios) > max_companeros:
        raise serializers.ValidationError(
            {
                field_name: [
                    "La cantidad de correos supera los cupos solicitados.",
                ]
            }
        )

    return correos_limpios

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
    docente_responsable = serializers.PrimaryKeyRelatedField(
        queryset=Usuario.objects.all(), required=False, allow_null=True
    )
    docenteACargo = serializers.SerializerMethodField(method_name="get_docente_a_cargo")
    cuposDisponibles = serializers.SerializerMethodField()
    tieneCupoPropio = serializers.SerializerMethodField()
    inscripcionesActivas = serializers.SerializerMethodField()
    objetivo = serializers.CharField(
        required=False,
        allow_blank=True,
        write_only=True,
        help_text="Objetivo general del tema propuesto por el docente.",
    )

    class Meta:
        model = TemaDisponible
        fields = [
            "id",
            "titulo",
            "carrera",
            "rama",
            "descripcion",
            "requisitos",
            "cupos",
            "objetivo",
            "cuposDisponibles",
            "tieneCupoPropio",
            "created_at",
            "created_by",
            "creadoPor",
            "docente_responsable",
            "docenteACargo",
            "inscripcionesActivas",
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

    def get_docente_a_cargo(self, obj):
        docente = obj.docente_responsable
        if not docente:
            docente = obj.created_by if obj.created_by and obj.created_by.rol == "docente" else None
        if not docente:
            return None

        return {
            "nombre": docente.nombre_completo,
            "rol": docente.rol,
            "carrera": docente.carrera,
        }

    def get_cuposDisponibles(self, obj) -> int:
        return obj.cupos_disponibles

    def get_tieneCupoPropio(self, obj) -> bool:
        alumno_id = self.context.get("alumno_id")
        if not alumno_id:
            return False
        return obj.inscripciones.filter(alumno_id=alumno_id, activo=True).exists()

    def get_inscripcionesActivas(self, obj):
        activos = (
            obj.inscripciones.filter(activo=True)
            .select_related("alumno")
            .order_by("created_at")
        )
        resultado = []
        for inscripcion in activos:
            alumno = inscripcion.alumno
            if not alumno:
                continue
            resultado.append(
                {
                    "id": alumno.id,
                    "nombre": alumno.nombre_completo,
                    "correo": alumno.correo,
                    "carrera": alumno.carrera,
                    "rut": alumno.rut,
                    "telefono": alumno.telefono,
                    "reservadoEn": inscripcion.created_at.isoformat(),
                    "esResponsable": inscripcion.es_responsable,
                }
            )
        return resultado

    def validate_created_by(self, usuario: Usuario | None) -> Usuario | None:
        if usuario and usuario.rol not in {"docente", "coordinador"}:
            raise serializers.ValidationError(
                "Solo docentes o coordinación pueden registrarse como creadores del tema."
            )
        return usuario

    def validate_docente_responsable(self, usuario: Usuario | None) -> Usuario | None:
        if usuario and usuario.rol != "docente":
            raise serializers.ValidationError(
                "Solo un docente puede ser asignado como responsable del tema."
            )
        return usuario
    
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
            "documento",
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
        request = self.context.get("request") if isinstance(self.context, dict) else None

        document_url = None
        if instance.documento:
            url = instance.documento.url
            document_url = request.build_absolute_uri(url) if request else url
        else:
            url_documento = base.get("url_documento")
            if url_documento:
                if request and str(url_documento).startswith("/"):
                    document_url = request.build_absolute_uri(url_documento)
                else:
                    document_url = url_documento

        return {
            "id": str(base["id"]),
            "creadoEn": instance.creado_en.isoformat(),
            "estado": base["estado"],
            "url": document_url,
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


class PracticaDocumentoSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()
    uploadedBy = serializers.SerializerMethodField()

    class Meta:
        model = PracticaDocumento
        fields = [
            "id",
            "nombre",
            "descripcion",
            "carrera",
            "created_at",
            "url",
            "uploadedBy",
        ]
        read_only_fields = ["id", "carrera", "created_at", "url", "uploadedBy"]

    def get_url(self, obj: PracticaDocumento) -> str | None:
        request = self.context.get("request") if isinstance(self.context, dict) else None
        if obj.archivo and hasattr(obj.archivo, "url"):
            if request:
                return request.build_absolute_uri(obj.archivo.url)
            return obj.archivo.url
        return None

    def get_uploadedBy(self, obj: PracticaDocumento) -> dict | None:
        usuario = obj.uploaded_by
        if not usuario:
            return None
        return {
            "id": usuario.pk,
            "nombre": usuario.nombre_completo,
            "correo": usuario.correo,
        }


class UsuarioResumenSerializer(serializers.ModelSerializer):
    nombre = serializers.CharField(source="nombre_completo")

    class Meta:
        model = Usuario
        fields = ["id", "nombre", "correo", "carrera", "telefono", "rol"]


class TrazabilidadReunionSerializer(serializers.ModelSerializer):
    usuario = UsuarioResumenSerializer(read_only=True)

    class Meta:
        model = TrazabilidadReunion
        fields = [
            "id",
            "tipo",
            "estado_anterior",
            "estado_nuevo",
            "comentario",
            "datos",
            "creado_en",
            "usuario",
        ]

    def to_representation(self, instance):
        base = super().to_representation(instance)
        usuario = base.get("usuario")
        return {
            "id": base["id"],
            "tipo": base["tipo"],
            "estadoAnterior": base.get("estado_anterior"),
            "estadoNuevo": base.get("estado_nuevo"),
            "comentario": base.get("comentario"),
            "datos": base.get("datos", {}),
            "fecha": instance.creado_en.isoformat(),
            "usuario": usuario,
        }


class SolicitudReunionSerializer(serializers.ModelSerializer):
    alumno = UsuarioResumenSerializer(read_only=True)
    docente = UsuarioResumenSerializer(read_only=True)
    trazabilidad = TrazabilidadReunionSerializer(many=True, read_only=True)

    class Meta:
        model = SolicitudReunion
        fields = [
            "id",
            "alumno",
            "docente",
            "motivo",
            "disponibilidad_sugerida",
            "estado",
            "creado_en",
            "actualizado_en",
            "trazabilidad",
        ]

    def to_representation(self, instance):
        base = super().to_representation(instance)
        return {
            "id": base["id"],
            "estado": base["estado"],
            "motivo": base["motivo"],
            "disponibilidadSugerida": base.get("disponibilidad_sugerida"),
            "creadoEn": instance.creado_en.isoformat(),
            "actualizadoEn": instance.actualizado_en.isoformat(),
            "alumno": base.get("alumno"),
            "docente": base.get("docente"),
            "trazabilidad": base.get("trazabilidad", []),
        }


class SolicitudReunionCreateSerializer(serializers.Serializer):
    alumno = serializers.IntegerField()
    motivo = serializers.CharField()
    disponibilidadSugerida = serializers.CharField(
        required=False, allow_blank=True, allow_null=True
    )


class AprobarSolicitudReunionSerializer(serializers.Serializer):
    docente = serializers.IntegerField()
    fecha = serializers.DateField()
    horaInicio = serializers.TimeField()
    horaTermino = serializers.TimeField()
    modalidad = serializers.ChoiceField(choices=[choice[0] for choice in Reunion.MODALIDADES])
    comentario = serializers.CharField(required=False, allow_blank=True, allow_null=True)


class RechazarSolicitudReunionSerializer(serializers.Serializer):
    docente = serializers.IntegerField()
    comentario = serializers.CharField(required=False, allow_blank=True, allow_null=True)


class ReunionSerializer(serializers.ModelSerializer):
    alumno = UsuarioResumenSerializer(read_only=True)
    docente = UsuarioResumenSerializer(read_only=True)
    trazabilidad = TrazabilidadReunionSerializer(many=True, read_only=True)

    class Meta:
        model = Reunion
        fields = [
            "id",
            "alumno",
            "docente",
            "solicitud",
            "fecha",
            "hora_inicio",
            "hora_termino",
            "modalidad",
            "motivo",
            "observaciones",
            "estado",
            "creado_en",
            "actualizado_en",
            "trazabilidad",
        ]

    def to_representation(self, instance):
        base = super().to_representation(instance)
        return {
            "id": base["id"],
            "estado": base["estado"],
            "motivo": base["motivo"],
            "observaciones": base.get("observaciones"),
            "fecha": instance.fecha.isoformat(),
            "horaInicio": instance.hora_inicio.isoformat(),
            "horaTermino": instance.hora_termino.isoformat(),
            "modalidad": base["modalidad"],
            "creadoEn": instance.creado_en.isoformat(),
            "actualizadoEn": instance.actualizado_en.isoformat(),
            "alumno": base.get("alumno"),
            "docente": base.get("docente"),
            "solicitudId": base.get("solicitud"),
            "trazabilidad": base.get("trazabilidad", []),
        }


class ReunionCreateSerializer(serializers.Serializer):
    alumno = serializers.IntegerField()
    docente = serializers.IntegerField()
    fecha = serializers.DateField()
    horaInicio = serializers.TimeField()
    horaTermino = serializers.TimeField()
    modalidad = serializers.ChoiceField(choices=[choice[0] for choice in Reunion.MODALIDADES])
    motivo = serializers.CharField()
    observaciones = serializers.CharField(required=False, allow_blank=True, allow_null=True)


class ReunionCerrarSerializer(serializers.Serializer):
    docente = serializers.IntegerField()
    estado = serializers.ChoiceField(choices=["finalizada", "no_realizada"])
    comentario = serializers.CharField(required=False, allow_blank=True, allow_null=True)


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
            "cupos_requeridos",
            "cupos_maximo_autorizado",
            "correos_companeros",
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
    cupos_requeridos = serializers.IntegerField(min_value=1, default=1)
    correos_companeros = serializers.ListField(
        child=serializers.EmailField(), required=False, allow_empty=True
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
        cupos_requeridos = attrs.get("cupos_requeridos") or 1
        correos_companeros = attrs.get("correos_companeros") or []

        if cupos_requeridos < 1:
            raise serializers.ValidationError(
                {"cupos_requeridos": "Debes indicar al menos un cupo."}
            )

        correos_limpios = _procesar_correos_companeros(
            alumno,
            correos_companeros,
            cupos_requeridos,
            field_name="correos_companeros",
        )

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
        attrs["correos_companeros"] = correos_limpios
        attrs["cupos_requeridos"] = cupos_requeridos
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


class PropuestaTemaDocenteDecisionSerializer(serializers.Serializer):
    accion = serializers.ChoiceField(
        choices=[
            ("autorizar", "Autorizar cupos"),
            ("solicitar_ajuste", "Solicitar ajuste de cupos"),
            ("rechazar", "Rechazar propuesta"),
            ("aprobar_final", "Aprobar definitivamente"),
        ]
    )
    comentario_decision = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )
    docente_id = serializers.IntegerField(required=False, allow_null=True)
    cupos_autorizados = serializers.IntegerField(
        required=False,
        min_value=1,
    )

    def validate(self, attrs):
        instancia: PropuestaTema = self.instance
        accion = attrs.get("accion")
        cupos_autorizados = attrs.get("cupos_autorizados")
        comentario = attrs.get("comentario_decision")

        if isinstance(comentario, str):
            comentario = comentario.strip()
        if accion == "solicitar_ajuste" and not comentario:
            raise serializers.ValidationError(
                {"comentario_decision": "Debes registrar un comentario con tu decisión."}
            )
        attrs["comentario_decision"] = comentario

        if accion in {"autorizar", "solicitar_ajuste"}:
            if cupos_autorizados is None:
                raise serializers.ValidationError(
                    {"cupos_autorizados": "Debes indicar la cantidad autorizada."}
                )
        if accion == "autorizar":
            if cupos_autorizados is None:
                raise serializers.ValidationError(
                    {"cupos_autorizados": "Debes indicar la cantidad autorizada."}
                )
            if cupos_autorizados < instancia.cupos_requeridos:
                raise serializers.ValidationError(
                    {
                        "cupos_autorizados": "Para autorizar, la cantidad debe ser igual o superior a la solicitada.",
                    }
                )
        if accion == "solicitar_ajuste":
            if cupos_autorizados is None:
                raise serializers.ValidationError(
                    {"cupos_autorizados": "Debes indicar la cantidad máxima permitida."}
                )
            if cupos_autorizados >= instancia.cupos_requeridos:
                raise serializers.ValidationError(
                    {
                        "cupos_autorizados": "El valor debe ser menor a los cupos solicitados por el alumno.",
                    }
                )
        if accion == "aprobar_final" and instancia.estado not in {
            "pendiente_aprobacion",
            "pendiente",
        }:
            raise serializers.ValidationError(
                {
                    "accion": "Solo puedes aprobar definitivamente propuestas pendientes o pendientes de aprobación.",
                }
            )

        docente_id = attrs.get("docente_id")
        docente = None
        if docente_id not in (None, "", 0):
            try:
                docente = Usuario.objects.get(id=int(docente_id), rol="docente")
            except (ValueError, Usuario.DoesNotExist) as exc:
                raise serializers.ValidationError({"docente_id": "Docente no válido."}) from exc

        attrs["docente"] = docente
        return attrs

    def update(self, instance: PropuestaTema, validated_data):
        accion = validated_data.get("accion")
        comentario = validated_data.get("comentario_decision")
        docente = validated_data.get("docente")
        cupos_autorizados = validated_data.get("cupos_autorizados")

        if docente is not None:
            instance.docente = docente

        if comentario is not None:
            instance.comentario_decision = comentario

        update_fields = ["comentario_decision", "estado", "updated_at"]

        if accion == "solicitar_ajuste":
            instance.cupos_maximo_autorizado = cupos_autorizados
            instance.estado = "pendiente_ajuste"
            update_fields.append("cupos_maximo_autorizado")
        elif accion == "autorizar":
            instance.cupos_maximo_autorizado = cupos_autorizados
            instance.estado = "pendiente_aprobacion"
            update_fields.append("cupos_maximo_autorizado")
        elif accion == "rechazar":
            instance.estado = "rechazada"
        elif accion == "aprobar_final":
            if (
                instance.cupos_maximo_autorizado is not None
                and instance.cupos_requeridos > instance.cupos_maximo_autorizado
            ):
                raise serializers.ValidationError(
                    {
                        "accion": "Los cupos solicitados superan el máximo autorizado. Solicita un ajuste antes de aprobar.",
                    }
                )
            if instance.cupos_maximo_autorizado is None:
                instance.cupos_maximo_autorizado = instance.cupos_requeridos
                update_fields.append("cupos_maximo_autorizado")
            instance.estado = "aceptada"

        if docente is not None:
            update_fields.append("docente")

        instance.save(update_fields=update_fields)
        instance.refresh_from_db()
        return instance


class PropuestaTemaAlumnoAjusteSerializer(serializers.Serializer):
    accion = serializers.CharField()
    cupos_requeridos = serializers.IntegerField(min_value=1)
    correos_companeros = serializers.ListField(
        child=serializers.EmailField(), required=False, allow_empty=True
    )

    def validate(self, attrs):
        accion = attrs.get("accion")
        if accion != "confirmar_cupos":
            raise serializers.ValidationError({"accion": "Acción inválida para el alumno."})

        instancia: PropuestaTema = self.instance
        if instancia.estado != "pendiente_ajuste":
            raise serializers.ValidationError(
                {
                    "accion": "Solo puedes confirmar cupos cuando la propuesta está pendiente de ajuste.",
                }
            )

        cupos = attrs.get("cupos_requeridos") or 1
        maximo = instancia.cupos_maximo_autorizado or instancia.cupos_requeridos
        if cupos > maximo:
            raise serializers.ValidationError(
                {
                    "cupos_requeridos": f"Debes ajustar a {maximo} cupos o menos.",
                }
            )

        correos = _procesar_correos_companeros(
            instancia.alumno,
            attrs.get("correos_companeros") or [],
            cupos,
            field_name="correos_companeros",
        )

        attrs["correos_limpios"] = correos
        attrs["cupos_requeridos"] = cupos
        return attrs

    def update(self, instance: PropuestaTema, validated_data):
        instance.cupos_requeridos = validated_data.get("cupos_requeridos", instance.cupos_requeridos)
        instance.correos_companeros = validated_data.get("correos_limpios", [])
        instance.estado = "pendiente_aprobacion"
        instance.save(update_fields=["cupos_requeridos", "correos_companeros", "estado", "updated_at"])
        instance.refresh_from_db()
        return instance


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


class EvaluacionGrupoDocenteSerializer(serializers.ModelSerializer):
    docente = serializers.PrimaryKeyRelatedField(
        queryset=Usuario.objects.filter(rol="docente"),
        required=False,
        allow_null=True,
    )
    tema = serializers.PrimaryKeyRelatedField(
        queryset=TemaDisponible.objects.all(),
        required=True,
        allow_null=False,
    )
    fecha = serializers.DateField(required=False, allow_null=True)
    grupo = serializers.SerializerMethodField()

    class Meta:
        model = EvaluacionGrupoDocente
        fields = [
            "id",
            "docente",
            "tema",
            "grupo_nombre",
            "titulo",
            "fecha",
            "estado",
            "created_at",
            "updated_at",
            "grupo",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "estado", "grupo_nombre"]

    def validate_docente(self, docente: Usuario | None) -> Usuario | None:
        if docente and docente.rol != "docente":
            raise serializers.ValidationError(
                "Solo los docentes pueden registrar evaluaciones."
            )
        return docente

    def validate_estado(self, estado: str) -> str:
        opciones_validas = {choice[0] for choice in EvaluacionGrupoDocente.ESTADOS}
        if estado not in opciones_validas:
            raise serializers.ValidationError("Estado no válido para la evaluación.")
        return estado

    def validate_grupo_nombre(self, nombre: str) -> str:
        nombre_limpio = (nombre or "").strip()
        if not nombre_limpio:
            raise serializers.ValidationError("Debes indicar el nombre del grupo.")
        return nombre_limpio

    def validate_titulo(self, titulo: str) -> str:
        titulo_limpio = (titulo or "").strip()
        if not titulo_limpio:
            raise serializers.ValidationError("Debes indicar el título de la evaluación.")
        return titulo_limpio

    def to_internal_value(self, data):
        data = data.copy()
        if data.get("fecha") in ("", None):
            data["fecha"] = None
        return super().to_internal_value(data)

    def validate(self, attrs):
        attrs = super().validate(attrs)
        tema = attrs.get("tema")
        docente = attrs.get("docente")

        if not tema:
            raise serializers.ValidationError(
                {"tema": "Debes seleccionar un grupo activo."}
            )

        if docente and not self._tema_pertenece_a_docente(tema, docente):
            raise serializers.ValidationError(
                {"tema": "El grupo seleccionado no pertenece al docente."}
            )

        if not tema.inscripciones.filter(activo=True).exists():
            raise serializers.ValidationError(
                {"tema": "Solo puedes registrar evaluaciones para grupos activos."}
            )

        return attrs

    def get_grupo(self, obj):
        tema = obj.tema
        if not tema:
            return None

        inscripciones = getattr(tema, "inscripciones_activas", None)
        if inscripciones is None:
            inscripciones = (
                tema.inscripciones.filter(activo=True)
                .select_related("alumno")
                .order_by("created_at")
            )

        integrantes: list[str] = []
        for inscripcion in inscripciones:
            alumno = getattr(inscripcion, "alumno", None)
            if alumno and alumno.nombre_completo:
                integrantes.append(alumno.nombre_completo)

        return {
            "id": tema.id,
            "nombre": tema.titulo,
            "integrantes": integrantes,
        }

    def _tema_pertenece_a_docente(self, tema: TemaDisponible, docente: Usuario) -> bool:
        return (
            tema.docente_responsable_id == docente.id
            or tema.created_by_id == docente.id
        )


class DocenteGrupoActivoSerializer(serializers.ModelSerializer):
    nombre = serializers.CharField(source="titulo")
    integrantes = serializers.SerializerMethodField()

    class Meta:
        model = TemaDisponible
        fields = ["id", "nombre", "integrantes"]

    def get_integrantes(self, obj: TemaDisponible) -> list[str]:
        inscripciones = getattr(obj, "inscripciones_activas", None)
        if inscripciones is None:
            inscripciones = (
                obj.inscripciones.filter(activo=True)
                .select_related("alumno")
                .order_by("created_at")
            )

        integrantes: list[str] = []
        for inscripcion in inscripciones:
            alumno = getattr(inscripcion, "alumno", None)
            if alumno and alumno.nombre_completo:
                integrantes.append(alumno.nombre_completo)

        return integrantes