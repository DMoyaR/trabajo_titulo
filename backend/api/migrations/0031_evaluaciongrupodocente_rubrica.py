from django.db import migrations, models
import backend.api.models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0030_evaluaciongrupodocente_comentario'),
    ]

    operations = [
        migrations.AddField(
            model_name='evaluaciongrupodocente',
            name='rubrica',
            field=models.FileField(blank=True, null=True, upload_to=backend.api.models.evaluacion_rubrica_upload_to),
        ),
    ]
