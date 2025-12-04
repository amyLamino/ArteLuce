# chemin : backend/backend/views.py

from django.http import HttpResponse


def root(request):
    return HttpResponse(
        """
        <h1>Backend ArteLuce</h1>
        <p>Le serveur Django tourne.</p>
        <p>Utilise l'interface graphique sur <code>http://localhost:3000/</code> (frontend Next.js).</p>
        <p>L'API est disponible sous <code>/api/</code>.</p>
        """,
        content_type="text/html",
    )

