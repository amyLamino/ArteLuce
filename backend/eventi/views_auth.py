# chemin : backend/eventi/views_auth.py

from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.authtoken.models import Token


class LoginView(APIView):
    """
    POST /api/auth/login
    body: { "username": "...", "password": "..." }
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        # On accepte soit "username", soit "utente"
        username = request.data.get("username") or request.data.get("utente")
        password = request.data.get("password")

        # DEBUG (tu pourras supprimer plus tard)
        print("### LOGIN DEBUG ###")
        print("username reçu :", repr(username))
        print("password reçu (longueur) :", len(password) if password else None)

        if not username or not password:
            return Response(
                {
                    "detail": "Username e password sono obbligatori.",
                    "debug": {
                        "username": username,
                        "password_present": bool(password),
                    },
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = authenticate(request, username=username, password=password)

        if user is None:
            return Response(
                {
                    "detail": "Credenziali non valide.",
                    "debug": {
                        "username": username,
                        "password_present": bool(password),
                    },
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        token, _ = Token.objects.get_or_create(user=user)

        return Response(
            {
                "token": token.key,
                "username": user.username,
                "first_name": user.first_name,
                "last_name": user.last_name,
            }
        )


class MeView(APIView):
    """
    GET /api/auth/me
    → infos sur l'utilisateur connecté
    Header: Authorization: Token <token>
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user: User = request.user
        return Response(
            {
                "username": user.username,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "email": user.email,
            }
        )
