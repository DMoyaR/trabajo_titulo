from django.db import migrations, models
import api.models


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0031_evaluaciongrupodocente_rubrica"),
    ]

    operations = [
        migrations.AddField(
            model_name="evaluacionentregaalumno",
            name="informe_corregido",
            field=models.FileField(
                blank=True,
                null=True,
                upload_to=api.models.evaluacion_entrega_upload_to,
            ),
        ),
        migrations.AddField(
            model_name="evaluacionentregaalumno",
            name="rubrica_docente",
            field=models.FileField(
                blank=True,
                null=True,
                upload_to=api.models.evaluacion_entrega_upload_to,
            ),
        ),
    ]
