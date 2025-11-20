from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0029_solicitudcartapractica_practica_correo_encargado"),
    ]

    operations = [
        migrations.AddField(
            model_name="evaluaciongrupodocente",
            name="comentario",
            field=models.TextField(blank=True, null=True),
        ),
    ]
