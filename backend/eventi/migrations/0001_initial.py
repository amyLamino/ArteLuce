# (chemin : /backend/eventi/migrations/0001_initial.py)
from django.db import migrations, models
import uuid
import django.db.models.deletion

class Migration(migrations.Migration):
    initial = True
    dependencies = []
    operations = [
        migrations.CreateModel(
            name='Cliente',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('uid', models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
                ('external_id', models.CharField(blank=True, max_length=32, unique=True)),
                ('nome', models.CharField(max_length=200)),
                ('email', models.EmailField(blank=True, max_length=254, null=True)),
                ('telefono', models.CharField(blank=True, max_length=50, null=True)),
            ],
        ),
        migrations.CreateModel(
            name='Luogo',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('uid', models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
                ('external_id', models.CharField(blank=True, max_length=32, unique=True)),
                ('nome', models.CharField(max_length=200)),
                ('indirizzo', models.CharField(blank=True, max_length=300, null=True)),
                ('distanza_km', models.DecimalField(decimal_places=2, default=0, max_digits=8)),
            ],
        ),
        migrations.CreateModel(
            name='Materiale',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('nome', models.CharField(max_length=200)),
                ('prezzo_base', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('categoria', models.CharField(blank=True, max_length=100, null=True)),
                ('sottocategoria', models.CharField(blank=True, max_length=100, null=True)),
                ('is_tecnico', models.BooleanField(default=False)),
                ('is_messo', models.BooleanField(default=False)),
            ],
        ),
        migrations.CreateModel(
            name='Evento',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('gruppo_uid', models.UUIDField(db_index=True, default=uuid.uuid4)),
                ('versione', models.PositiveIntegerField(default=0)),
                ('titolo', models.CharField(default='Offerta', max_length=200)),
                ('data_evento', models.DateField()),
                ('location_index', models.PositiveSmallIntegerField(default=1)),
                ('stato', models.CharField(choices=[('bozza', 'bozza'), ('confermato', 'confermato'), ('annullato', 'annullato'), ('fatturato', 'fatturato')], default='bozza', max_length=20)),
                ('note', models.TextField(blank=True, null=True)),
                ('cliente', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='eventi', to='eventi.cliente')),
                ('luogo', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='eventi', to='eventi.luogo')),
            ],
        ),
        migrations.CreateModel(
            name='MagazzinoItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('qta_disponibile', models.IntegerField(default=0)),
                ('qta_prenotata', models.IntegerField(default=0)),
                ('materiale', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='stock', to='eventi.materiale')),
            ],
        ),
        migrations.CreateModel(
            name='RigaEvento',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('qta', models.IntegerField(default=1)),
                ('prezzo', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('importo', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('is_tecnico', models.BooleanField(default=False)),
                ('is_trasporto', models.BooleanField(default=False)),
                ('evento', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='righe', to='eventi.evento')),
                ('materiale', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to='eventi.materiale')),
            ],
        ),
        migrations.CreateModel(
            name='CalendarioSlot',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('data', models.DateField(db_index=True)),
                ('location_index', models.PositiveSmallIntegerField()),
                ('evento', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='slot', to='eventi.evento')),
            ],
        ),
        migrations.CreateModel(
            name='EventoLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('action', models.CharField(max_length=50)),
                ('version', models.IntegerField(default=0)),
                ('note', models.TextField(blank=True, null=True)),
                ('evento', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='logs', to='eventi.evento')),
            ],
        ),
        migrations.AddConstraint(
            model_name='calendarioslot',
            constraint=models.UniqueConstraint(fields=('data', 'location_index'), name='unique_data_location'),
        ),
    ]
