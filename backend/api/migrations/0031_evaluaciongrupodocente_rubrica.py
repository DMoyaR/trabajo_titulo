from django.db import migrations, models

from api.models import evaluacion_rubrica_upload_to


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0030_evaluaciongrupodocente_comentario'),
    ]

    operations = [
        migrations.AddField(
            model_name='evaluaciongrupodocente',
            name='rubrica',
            field=models.FileField(blank=True, null=True, upload_to=evaluacion_rubrica_upload_to),
        ),
    ]